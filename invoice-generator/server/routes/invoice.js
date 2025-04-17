const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');

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

// Create new invoice - no auth required
router.post('/', async (req, res) => {
  try {
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

// Get all invoices - no auth required
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

// Get specific invoice - no auth required
router.get('/:id', async (req, res) => {
  try {
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

// Delete invoice - no auth required
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await handleMongoOperation(
      Invoice.findByIdAndDelete(req.params.id)
    );
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
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