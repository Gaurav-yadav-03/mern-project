const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Set the upload directory
    const uploadDir = path.join(__dirname, '../uploads');
    
    // Log the upload directory for debugging
    console.log('Upload directory:', uploadDir);
    
    // Ensure the upload directory exists
    if (!fs.existsSync(uploadDir)) {
      console.log('Creating upload directory...');
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', fileName);
    cb(null, fileName);
  }
});

// File filter to accept only images and PDFs
const fileFilter = (req, file, cb) => {
  console.log('Received file:', file.originalname, 'mimetype:', file.mimetype);
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.log('Rejected file type:', file.mimetype);
    cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, GIF and PDF files are allowed.`), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Handle file upload
router.post('/upload', upload.single('bill'), (req, res) => {
  try {
    console.log('Upload request received');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Return the file URL with the correct server URL prefix
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log(`File uploaded successfully: ${fileUrl}`);
    res.json({ 
      fileUrl,
      fileName: req.file.originalname,
      success: true
    });
  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({ error: `Failed to process file upload: ${error.message}` });
  }
});

// Error handling middleware for upload endpoint
router.use((error, req, res, next) => {
  console.error('Upload error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: `Multer error: ${error.message}` });
  }
  
  if (error) {
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
  
  next();
});

module.exports = router;