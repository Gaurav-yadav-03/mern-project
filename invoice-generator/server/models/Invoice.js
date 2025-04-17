const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  invoiceNumber: String,
  employee: {
    employeeName: String,
    department: String,
    tourPeriod: String,
    destination: String,
    fromDate: String,
    toDate: String
  },
  tourSummary: {
    tourDetails: [{
      fromDate: String,
      toDate: String,
      modeOfTravel: String,
      from: String,
      to: String,
      purpose: String
    }]
  },
  bills: [{
    name: String,
    place: String,
    billNo: String,
    billDate: String,
    amount: Number,
    fileUrl: String
  }],
  expenses: [{
    date: String,
    modeOfTravel: String,
    from: String,
    to: String,
    amount: Number,
    details: String,
    class: String
  }],
  dailyAllowance: {
    onFor: String,
    hotelBillDays: String,
    daDays: String,
    daAmount: String
  },
  totalBillAmount: Number,
  totalExpenses: Number,
  totalAmount: Number,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending'
  },
  remarks: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Invoice', invoiceSchema);