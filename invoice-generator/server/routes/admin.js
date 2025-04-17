const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Invoice = require('../models/Invoice');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  console.log('Auth check:', req.isAuthenticated());
  console.log('User:', req.user);
  console.log('Is admin?', req.user?.isAdmin);
  
  if (req.isAuthenticated() && req.user && req.user.isAdmin) {
    console.log('Admin access granted');
    next();
  } else {
    console.log('Admin access denied');
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
};

// Get all employees
router.get('/employees', isAdmin, async (req, res) => {
  try {
    const employees = await User.find({}, { password: 0 });
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Get all invoices
router.get('/invoices', isAdmin, async (req, res) => {
  try {
    const invoices = await Invoice.find().populate('userId', 'name email');
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Update invoice status
router.put('/invoices/:id/status', isAdmin, async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status, remarks, updatedAt: Date.now() },
      { new: true }
    );
    res.json(invoice);
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

module.exports = router;