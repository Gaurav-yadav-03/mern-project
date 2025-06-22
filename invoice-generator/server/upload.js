const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const billsDir = path.join(uploadsDir, 'bills');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(billsDir)) {
  fs.mkdirSync(billsDir);
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine the destination based on the upload type
    const dest = req.path.includes('bill') ? billsDir : uploadsDir;
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Allow images and PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const BACKEND_URL = process.env.BACKEND_URL || '';

// Handle bill uploads
router.post('/bill', upload.single('bill'), (req, res) => {
  console.log('Received bill upload request');
  console.log('Request path:', req.path);
  console.log('Request file:', req.file);
  
  try {
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create absolute URL for the file
    const fileUrl = `${BACKEND_URL}/uploads/bills/${req.file.filename}`;
    console.log('File uploaded successfully:', fileUrl);
    res.json({ 
      success: true, 
      fileUrl,
      fileName: req.file.originalname
    });
  } catch (error) {
    console.error('Error uploading bill:', error);
    res.status(500).json({ error: 'Error uploading file' });
  }
});

// Handle other uploads (like tour summary images)
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create absolute URL for the file
    const fileUrl = `${BACKEND_URL}/uploads/${req.file.filename}`;
    res.json({ 
      success: true, 
      fileUrl,
      fileName: req.file.originalname
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Error uploading file' });
  }
});

module.exports = router; 