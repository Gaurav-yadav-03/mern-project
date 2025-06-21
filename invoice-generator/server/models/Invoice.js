const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invoiceNumber: String,
  employee: {
    employeeName: String,
    department: String,
    designation: String,
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
      purpose: String,
      contactNumber: String
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
    ticketAmount: Number,
    details: String,
    class: String,
    fileUrl: String
  }],
  conveyances: [{
    date: String,
    place: String,
    from: String,
    to: String,
    mode: String,
    amount: Number,
    fileUrl: String
  }],
  agendaItems: [{
    agendaItem: String,
    fromDate: String,
    toDate: String,
    actionTaken: String
  }],
  dailyAllowance: {
    onFor: String,
    hotelBillDays: String,
    daDays: String,
    daAmount: String,
    ratePerDay: { type: Number, default: 400 }
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