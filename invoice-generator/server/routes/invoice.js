const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const mongoose = require('mongoose');

// Utility function to handle MongoDB operations with timeout
const handleMongoOperation = async (operation) => {
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database operation timed out')), 8000)
      )
    ]);
  } catch (error) {
    if (error.message === 'Database operation timed out') {
      console.error('Operation timed out. Database might be unresponsive.');
    }
    throw error;
  }
};

// Create new invoice
router.post('/', async (req, res) => {
  try {
    // Enhanced validation for required fields
    if (!req.body.userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Validate userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
      return res.status(400).json({ error: 'Invalid User ID format' });
    }
    
    const invoice = new Invoice(req.body);
    await handleMongoOperation(invoice.save());
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ 
      error: 'Failed to create invoice',
      details: error.message 
    });
  }
});

// Get all invoices - admin only (to be enforced by middleware)
router.get('/all', async (req, res) => {
  console.log('Fetching invoices...');
  try {
    const invoices = await handleMongoOperation(
      Invoice.find().sort({ createdAt: -1 })
    );
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch invoices',
      details: error.message 
    });
  }
});

// Get invoices for a specific user
router.get('/user/:userId', async (req, res) => {
  console.log(`Fetching invoices for user: ${req.params.userId}`);
  try {
    const userId = req.params.userId;
    
    // Validate userId
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Validate userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid User ID format' });
    }
    
    const invoices = await handleMongoOperation(
      Invoice.find({ userId: userId }).sort({ createdAt: -1 })
    );
    
    console.log(`Found ${invoices.length} invoices for user ${userId}`);
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching user invoices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user invoices',
      details: error.message 
    });
  }
});

// Get specific invoice
router.get('/:id', async (req, res) => {
  try {
    // Validate id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid invoice ID format' });
    }
    
    const invoice = await handleMongoOperation(
      Invoice.findById(req.params.id)
    );
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ 
      error: 'Failed to fetch invoice',
      details: error.message 
    });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    // Validate id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid invoice ID format' });
    }
    
    // Find the invoice first to check ownership
    const invoice = await handleMongoOperation(
      Invoice.findById(req.params.id)
    );
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Delete the invoice
    await handleMongoOperation(
      Invoice.findByIdAndDelete(req.params.id)
    );
    
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ 
      error: 'Failed to delete invoice',
      details: error.message 
    });
  }
});

module.exports = router;