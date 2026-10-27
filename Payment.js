const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    membership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Membership'
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      required: [true, 'Membership plan is required']
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    paymentMethod: {
      type: String,
      enum: ['Demo UPI', 'Demo NetBanking', 'Demo Card', 'Demo Cash / Front Desk'],
      default: 'Demo UPI'
    },
    transactionRef: {
      type: String,
      required: [true, 'Transaction reference is required'],
      unique: true
    },
    status: {
      type: String,
      enum: ['Success', 'Pending', 'Failed'],
      default: 'Success'
    },
    isDemo: {
      type: Boolean,
      default: true
    },
    notes: {
      type: String,
      default: 'College project simulated demo payment. No real currency processed.'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
