const express = require('express');
const router = express.Router();

// Add CORS middleware for this route
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Return user profile data
    res.json({
      name: req.user.name,
      email: req.user.email,
      employeeId: req.user.employeeId,
      department: req.user.department,
      picture: req.user.picture
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});