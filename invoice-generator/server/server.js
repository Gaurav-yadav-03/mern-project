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
  console.log('=== Generating Invoice ===');
  
  try {
    const data = req.body;
    
    // Log crucial parts of the data for debugging
    console.log('Generation request received:', {
      userId: data.userId,
      hasEmployee: !!data.employee,
      hasTourSummary: !!data.tourSummary,
      hasBills: Array.isArray(data.bills),
      hasExpenses: Array.isArray(data.expenses)
    });

    // Basic validation only - detailed validation happens in the validation endpoint
    if (!data.userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required data: user ID is required'
      });
    }

    if (!data.employee || !data.tourSummary) {
      return res.status(400).json({
        success: false,
        message: 'Missing required data: employee and tour summary are required'
      });
    }

    // Generate invoice PDF
    try {
      const pdfPath = await generateInvoice(data);
      console.log('Invoice generated at:', pdfPath);
      
      // Check if file exists
      if (!fs.existsSync(pdfPath)) {
        console.error('Generated PDF file not found at path:', pdfPath);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate PDF file'
        });
      }
      
      // Send the PDF file
      res.download(pdfPath, `invoice_${Date.now()}.pdf`, (err) => {
        if (err) {
          console.error('Error sending PDF:', err);
          return res.status(500).json({
            success: false,
            message: 'Error sending PDF',
            error: err.message
          });
        }
        
        // Delete the file after sending
        try {
          fs.unlinkSync(pdfPath);
          console.log('Temporary PDF file deleted:', pdfPath);
        } catch (deleteErr) {
          console.error('Error deleting temporary PDF file:', deleteErr);
        }
      });
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      return res.status(500).json({
        success: false,
        message: 'Error generating PDF invoice',
        error: pdfError.message
      });
    }
  } catch (error) {
    console.error('Error in /generate-invoice endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Validation endpoint
app.post('/generate-invoice/validate', async (req, res) => {
  console.log('=== Validating Invoice Data ===');
  
  try {
    const data = req.body;
    
    // Log crucial parts of the data for debugging
    console.log('Validation request received:', {
      userId: data.userId,
      hasEmployee: !!data.employee,
      hasTourSummary: !!data.tourSummary,
      hasBills: Array.isArray(data.bills),
      hasExpenses: Array.isArray(data.expenses),
      billsLength: data.bills?.length,
      expensesLength: data.expenses?.length,
      hasDailyAllowance: !!data.dailyAllowance
    });

    // More detailed checks
    const errors = [];
    
    // Check userId
    if (!data.userId) {
      errors.push('User ID is required');
    }
    
    // Check employee data
    if (!data.employee) {
      errors.push('Employee data is missing');
    } else {
      if (!data.employee.employeeName) errors.push('Employee name is required');
      if (!data.employee.department) errors.push('Department is required');
      if (!data.employee.tourPeriod) errors.push('Tour period is required');
    }
    
    // Check tour summary data
    if (!data.tourSummary) {
      errors.push('Tour summary is missing');
    } else {
      if (!data.tourSummary.tourDetails || !Array.isArray(data.tourSummary.tourDetails)) {
        errors.push('Tour details should be an array');
        console.log('Tour summary structure:', JSON.stringify(data.tourSummary, null, 2));
      } else if (data.tourSummary.tourDetails.length === 0) {
        errors.push('Tour details array is empty');
      } else {
        // Log the first tour detail for debugging
        console.log('First tour detail:', JSON.stringify(data.tourSummary.tourDetails[0], null, 2));
      }
    }
    
    // Check bills
    if (!Array.isArray(data.bills)) {
      errors.push('Bills should be an array');
      console.log('Bills data type:', typeof data.bills);
    } else if (data.bills.length === 0) {
      console.log('Bills array is empty');
      // Optional validation - may not be required
      // errors.push('At least one bill is required');
    } else {
      // Log the first bill for debugging
      console.log('First bill:', JSON.stringify(data.bills[0], null, 2));
    }
    
    // Check expenses
    if (!Array.isArray(data.expenses)) {
      errors.push('Expenses should be an array');
      console.log('Expenses data type:', typeof data.expenses);
    } else if (data.expenses.length === 0) {
      console.log('Expenses array is empty');
      // Optional validation - may not be required
      // errors.push('At least one expense is required');
    } else {
      // Log the first expense for debugging
      console.log('First expense:', JSON.stringify(data.expenses[0], null, 2));
    }
    
    // Check daily allowance
    if (!data.dailyAllowance) {
      errors.push('Daily allowance data is missing');
    } else {
      if (isNaN(data.dailyAllowance.totalDays)) errors.push('Total days should be a number');
      if (isNaN(data.dailyAllowance.ratePerDay)) errors.push('Rate per day should be a number');
      
      // Log the daily allowance data
      console.log('Daily allowance:', JSON.stringify(data.dailyAllowance, null, 2));
    }
    
    // Check total amounts
    if (isNaN(data.totalBillAmount)) {
      console.log('Total bill amount is not a number:', data.totalBillAmount);
      errors.push('Total bill amount should be a number');
    }
    
    if (isNaN(data.totalExpenses)) {
      console.log('Total expenses is not a number:', data.totalExpenses);
      errors.push('Total expenses should be a number');
    }
    
    if (isNaN(data.totalAmount)) {
      console.log('Total amount is not a number:', data.totalAmount);
      errors.push('Total amount should be a number');
    }
    
    // Return validation result
    if (errors.length > 0) {
      console.log('Validation failed with errors:', errors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    console.log('Validation successful');
    return res.status(200).json({
      success: true,
      message: 'Data validated successfully'
    });
  } catch (error) {
    console.error('Error during validation:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during validation',
      error: error.message
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