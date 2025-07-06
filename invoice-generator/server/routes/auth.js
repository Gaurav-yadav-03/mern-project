const express = require('express');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const router = express.Router();

// Example protected route
router.get('/protected', ClerkExpressRequireAuth(), (req, res) => {
  res.json({ message: 'You are authenticated!', userId: req.auth.userId });
});

module.exports = router;