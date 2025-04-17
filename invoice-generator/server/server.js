const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MongoStore = require('connect-mongo');
require('dotenv').config();
const { generateInvoice } = require('./invoice');
const Invoice = require('./models/Invoice');

// Import routes
const uploadRoutes = require('./routes/upload');
const invoiceRoutes = require('./routes/invoice');
const authRoutes = require('./routes/auth');

const app = express();

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Apply CORS with options
app.use(cors(corsOptions));

// Body parser middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  },
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice-generator',
    ttl: 24 * 60 * 60 // 1 day
  })
}));

// Passport middleware
// Add after your existing require statements
require('./config/passport');

// Add after your express session middleware
app.use(passport.initialize());
app.use(passport.session());

// Create necessary directories
const dirs = ['uploads', 'bills', 'generated'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/upload', uploadRoutes);
app.use('/invoice', invoiceRoutes);

// Add this line to include your admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Serve static files from the React app
// Replace the existing static file serving code with this
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
} else {
  app.use(express.static(path.join(__dirname, 'public')));
  // Handle React routing in development
  app.get('*', (req, res) => {
    res.redirect('http://localhost:5173');
  });
}

// Root route - Move this above the catch-all route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Invoice generation endpoint
app.post('/generate-invoice', async (req, res) => {
  try {
    console.log('=== Invoice Generation Request Debug ===');
    console.log('Request body type:', typeof req.body);
    
    // Validate required fields
    if (!req.body) {
      return res.status(400).json({ error: 'No data provided' });
    }

    // Validate required nested objects
    if (!req.body.employee) {
      return res.status(400).json({ error: 'Employee details are required' });
    }

    if (!req.body.tourSummary || !req.body.tourSummary.tourDetails) {
      return res.status(400).json({ error: 'Tour summary details are required' });
    }

    // Log important data before generation
    console.log('Tour Summary:', {
      hasDetails: Boolean(req.body.tourSummary?.tourDetails),
      detailsLength: req.body.tourSummary?.tourDetails?.length
    });
    
    try {
      // Generate the invoice PDF
      const filePath = await generateInvoice(req.body);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(500).json({ error: 'Generated invoice file not found' });
      }

      console.log('PDF generated successfully, sending to client:', filePath);
      
      // Set appropriate headers to force download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
      
      // Stream the file directly to the client
      const fileStream = fs.createReadStream(filePath);
      
      // Handle file streaming errors
      fileStream.on('error', (err) => {
        console.error('Error streaming file:', err);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Failed to stream invoice file',
            details: err.message
          });
        }
      });
      
      // Clean up after streaming is complete
      fileStream.on('end', () => {
        console.log('File streaming completed, cleaning up');
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting file:', unlinkErr);
        });
      });
      
      // Pipe the file to the response
      fileStream.pipe(res);
      
    } catch (genError) {
      console.error('Error in invoice generation:', genError);
      return res.status(500).json({ 
        error: 'Failed to generate invoice',
        details: genError.message,
        stack: process.env.NODE_ENV === 'development' ? genError.stack : undefined
      });
    }
  } catch (error) {
    console.error('Error in invoice generation endpoint:', error);
    return res.status(500).json({ 
      error: 'Failed to process invoice request',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Validation endpoint for invoice generation
app.post('/generate-invoice/validate', async (req, res) => {
  try {
    console.log('=== Validation Request Debug ===');
    console.log('Request body type:', typeof req.body);
    console.log('Request body keys:', Object.keys(req.body));
    
    // Check if request body exists and is not empty
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('Empty request body detected');
      return res.status(400).json({
        error: 'Validation failed',
        details: 'No data provided',
        debug: { bodyType: typeof req.body, keys: Object.keys(req.body) }
      });
    }

    const validationErrors = [];

    // Validate employee details
    console.log('Employee validation:', {
      exists: Boolean(req.body.employee),
      name: req.body.employee?.employeeName,
      department: req.body.employee?.department
    });
    
    if (!req.body.employee) {
      validationErrors.push('Employee details are required');
    } else {
      const { employee } = req.body;
      if (!employee.employeeName) validationErrors.push('Employee name is required');
      if (!employee.department) validationErrors.push('Department is required');
    }

    // Validate tour summary
    console.log('Tour Summary validation:', {
      exists: Boolean(req.body.tourSummary),
      hasDetails: Boolean(req.body.tourSummary?.tourDetails),
      detailsLength: req.body.tourSummary?.tourDetails?.length
    });
    
    if (!req.body.tourSummary || !req.body.tourSummary.tourDetails) {
      validationErrors.push('Tour summary details are required');
    } else {
      const { tourDetails } = req.body.tourSummary;
      if (!Array.isArray(tourDetails)) {
        validationErrors.push('Tour details must be an array');
      } else if (tourDetails.length === 0) {
        validationErrors.push('At least one tour detail is required');
      } else {
        tourDetails.forEach((detail, index) => {
          const missingFields = [];
          if (!detail.fromDate) missingFields.push('From date');
          if (!detail.toDate) missingFields.push('To date');
          if (!detail.from) missingFields.push('From location');
          if (!detail.to) missingFields.push('To location');
          
          if (missingFields.length > 0) {
            validationErrors.push(`Tour detail ${index + 1} missing: ${missingFields.join(', ')}`);
          }
        });
      }
    }

    // Validate daily allowance if present
    console.log('Daily Allowance validation:', {
      exists: Boolean(req.body.dailyAllowance),
      daDays: req.body.dailyAllowance?.daDays,
      daAmount: req.body.dailyAllowance?.daAmount
    });

    if (req.body.dailyAllowance) {
      const { dailyAllowance } = req.body;
      const hasAnyValue = Object.values(dailyAllowance).some(value => 
        value && value.toString().trim() !== '' && value !== '0' && value !== 0
      );
      
      if (hasAnyValue) {
        if (!dailyAllowance.daDays || dailyAllowance.daDays.toString().trim() === '') {
          validationErrors.push('Daily Allowance: Number of days is required');
        }
        if (!dailyAllowance.daAmount || dailyAllowance.daAmount.toString().trim() === '') {
          validationErrors.push('Daily Allowance: Amount is required');
        }
      }
    }

    // Check if there are any validation errors
    if (validationErrors.length > 0) {
      console.error('Validation errors found:', validationErrors);
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors.join('; '),
        validationErrors: validationErrors,
        debug: {
          employee: req.body.employee,
          tourSummary: {
            exists: Boolean(req.body.tourSummary),
            hasDetails: Boolean(req.body.tourSummary?.tourDetails),
            detailsLength: req.body.tourSummary?.tourDetails?.length
          },
          dailyAllowance: {
            exists: Boolean(req.body.dailyAllowance),
            daDays: req.body.dailyAllowance?.daDays,
            daAmount: req.body.dailyAllowance?.daAmount
          }
        }
      });
    }

    // If all validations pass
    console.log('Validation successful');
    res.json({ message: 'Data validation successful' });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    // Perform a simple database operation to verify connection
    if (dbState === 1) {
      await mongoose.connection.db.admin().ping();
    }

    res.json({
      status: 'ok',
      timestamp: new Date(),
      database: {
        state: dbStatus[dbState],
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date(),
      error: error.message,
      database: {
        state: 'error',
        details: error.message
      }
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
  console.log('Upload directory:', path.join(__dirname, 'uploads'));
  console.log('Bills directory:', path.join(__dirname, 'bills'));
  console.log('Generated directory:', path.join(__dirname, 'generated'));
});

// Add these passport serialize/deserialize functions
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Add after your existing middleware
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// MongoDB connection configuration
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle initial connection errors
    conn.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });

    // Handle disconnection
    conn.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
    });

    // Handle reconnection
    conn.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

// Initialize MongoDB connection
connectDB();

// Direct PDF generation endpoint - with database save
app.post('/direct-generate-pdf', async (req, res) => {
  try {
    console.log('=== Direct PDF Generation Request ===');
    
    // Validate required fields
    if (!req.body) {
      return res.status(400).json({ error: 'No data provided' });
    }

    // Validate required nested objects
    if (!req.body.employee) {
      return res.status(400).json({ error: 'Employee details are required' });
    }

    if (!req.body.tourSummary || !req.body.tourSummary.tourDetails) {
      return res.status(400).json({ error: 'Tour summary details are required' });
    }

    // Generate the invoice PDF
    const filePath = await generateInvoice(req.body);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(500).json({ error: 'Generated invoice file not found' });
    }

    console.log('PDF generated successfully, sending to client:', filePath);
    
    // Set appropriate headers for direct download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="invoice.pdf"');
    
    // Save to database in background (don't wait for it)
    try {
      // Generate invoice number (timestamp-based)
      const invoiceNumber = `INV-${Date.now()}`;
      
      // Create a new invoice document with minimal fields
      const newInvoice = new Invoice({
        invoiceNumber,
        employee: req.body.employee,
        tourSummary: req.body.tourSummary,
        bills: req.body.bills || [],
        expenses: req.body.expenses || [],
        dailyAllowance: req.body.dailyAllowance || {},
        totalAmount: req.body.grandTotal || 0,
        status: 'pending',
        createdAt: new Date()
      });

      // If user is authenticated, add userId
      if (req.user && req.user._id) {
        newInvoice.userId = req.user._id;
      }

      // Save to database without waiting for completion
      newInvoice.save()
        .then(() => console.log('Invoice saved to database:', invoiceNumber))
        .catch(err => console.error('Error saving invoice to database:', err));
    } catch (dbError) {
      // Just log database errors but continue with PDF download
      console.error('Database save error (non-blocking):', dbError);
    }
    
    // Send the file directly
    fs.createReadStream(filePath).pipe(res);
    
    // Clean up the file after sending
    res.on('finish', () => {
      console.log('Response finished, cleaning up file');
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    });
    
  } catch (error) {
    console.error('Error in direct PDF generation:', error);
    return res.status(500).json({ 
      error: 'Failed to generate PDF',
      details: error.message
    });
  }
});

// Debug endpoint to help locate bill images
app.get('/debug-file-paths', (req, res) => {
  try {
    const paths = {
      currentDirectory: __dirname,
      serverRoot: path.join(__dirname, '..'),
      uploadsDirectory: path.join(__dirname, 'uploads'),
      billsDirectory: path.join(__dirname, 'bills'),
      generatedDirectory: path.join(__dirname, 'generated'),
      currentWorkingDirectory: process.cwd(),
      existingDirectories: {}
    };
    
    // Check which directories exist
    const dirsToCheck = [
      paths.uploadsDirectory, 
      paths.billsDirectory, 
      paths.generatedDirectory,
      path.join(__dirname, '..', 'uploads'),
      path.join(__dirname, '..', 'bills')
    ];
    
    dirsToCheck.forEach(dir => {
      paths.existingDirectories[dir] = fs.existsSync(dir);
      
      // If directory exists, list some files
      if (fs.existsSync(dir)) {
        try {
          paths.existingDirectories[dir + '_files'] = fs.readdirSync(dir).slice(0, 10);
        } catch (err) {
          paths.existingDirectories[dir + '_error'] = err.message;
        }
      }
    });
    
    res.json(paths);
  } catch (error) {
    res.status(500).json({ error: 'Error checking paths', details: error.message });
  }
});