const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/payments/my
 * @desc    Get logged in user's demo payment history
 * @access  Private (Member)
 */
router.get('/my', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const payments = await Payment.find({ user: userId })
      .populate('plan', 'name durationMonths price')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment records.'
    });
  }
});

/**
 * @route   GET /api/payments/all
 * @desc    Get all demo payment records (Admin only)
 * @access  Private (Admin)
 */
router.get('/all', isAdmin, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('user', 'fullName username email phone')
      .populate('plan', 'name durationMonths price')
      .sort({ createdAt: -1 });

    const totalRevenue = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return res.status(200).json({
      success: true,
      count: payments.length,
      totalRevenue,
      payments
    });
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment list.'
    });
  }
});

module.exports = router;
