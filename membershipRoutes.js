const express = require('express');
const router = express.Router();
const Membership = require('../models/Membership');
const MembershipPlan = require('../models/MembershipPlan');
const Payment = require('../models/Payment');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

/**
 * Helper function to calculate new end date in months
 */
function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * @route   GET /api/memberships/my
 * @desc    Get logged in member's active membership and history
 * @access  Private (Member)
 */
router.get('/my', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const now = new Date();

    // Find all memberships for this user
    const memberships = await Membership.find({ user: userId })
      .populate('plan')
      .populate('payment')
      .sort({ createdAt: -1 });

    // Auto-update expired records if date passed
    for (const mem of memberships) {
      if (mem.status === 'active' && new Date(mem.endDate) < now) {
        mem.status = 'expired';
        await mem.save();
      }
    }

    // Active membership is the most recent active one with future end date
    const activeMembership = memberships.find(
      m => m.status === 'active' && new Date(m.endDate) > now
    );

    let daysRemaining = 0;
    if (activeMembership) {
      const diffTime = new Date(activeMembership.endDate) - now;
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return res.status(200).json({
      success: true,
      activeMembership: activeMembership || null,
      daysRemaining,
      history: memberships
    });
  } catch (error) {
    console.error('Error fetching member memberships:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve membership information.'
    });
  }
});

/**
 * @route   POST /api/memberships/subscribe
 * @desc    Purchase / Renew a membership plan with simulated Demo Payment
 * @access  Private (Member)
 */
router.post('/subscribe', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { planId, paymentMethod } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan selection is required.'
      });
    }

    // Always fetch plan directly from the database to prevent client price tampering
    const plan = await MembershipPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Selected membership plan is invalid or no longer active.'
      });
    }

    const now = new Date();

    // Check if user has an ongoing active membership to extend
    const existingActive = await Membership.findOne({
      user: userId,
      status: 'active',
      endDate: { $gt: now }
    }).sort({ endDate: -1 });

    let startDate;
    let endDate;

    if (existingActive) {
      // Extend seamlessly from current end date
      startDate = existingActive.endDate;
      endDate = addMonths(startDate, plan.durationMonths);
    } else {
      // Fresh membership starting today
      startDate = now;
      endDate = addMonths(startDate, plan.durationMonths);
    }

    // Generate unique demo transaction ID
    const demoTransactionRef = `DEMO-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create payment record
    const payment = new Payment({
      user: userId,
      plan: plan._id,
      amount: plan.price,
      paymentMethod: paymentMethod || 'Demo UPI',
      transactionRef: demoTransactionRef,
      status: 'Success',
      isDemo: true,
      notes: `Demo payment for ${plan.name} (${plan.durationMonths} month(s))`
    });

    await payment.save();

    // Create membership record
    const newMembership = new Membership({
      user: userId,
      plan: plan._id,
      startDate,
      endDate,
      status: 'active',
      payment: payment._id
    });

    await newMembership.save();

    // Associate membership with payment
    payment.membership = newMembership._id;
    await payment.save();

    // Populate plan for clean return
    await newMembership.populate('plan');

    return res.status(201).json({
      success: true,
      message: `Membership successfully activated! Plan: ${plan.name}`,
      membership: newMembership,
      payment
    });
  } catch (error) {
    console.error('Subscribe membership error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process membership subscription.'
    });
  }
});

module.exports = router;
