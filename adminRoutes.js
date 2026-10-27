const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Membership = require('../models/Membership');
const MembershipPlan = require('../models/MembershipPlan');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Feedback = require('../models/Feedback');
const { isAdmin } = require('../middleware/authMiddleware');

// Enforce admin privileges on all routes in this router
router.use(isAdmin);

/**
 * @route   GET /api/admin/stats
 * @desc    Get aggregated overview statistics for admin dashboard
 * @access  Private (Admin)
 */
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalMembers = await User.countDocuments({ role: 'member' });
    const activeMemberships = await Membership.countDocuments({
      status: 'active',
      endDate: { $gt: now }
    });
    const expiredMemberships = await Membership.countDocuments({
      $or: [{ status: 'expired' }, { endDate: { $lte: now } }]
    });

    const paymentsAgg = await Payment.aggregate([
      { $match: { status: 'Success' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalRevenue = paymentsAgg.length > 0 ? paymentsAgg[0].total : 0;
    const totalPaymentsCount = paymentsAgg.length > 0 ? paymentsAgg[0].count : 0;

    const pendingFeedbacks = await Feedback.countDocuments({ status: 'Pending' });
    const todayAttendance = await Attendance.countDocuments({
      date: { $gte: startOfToday }
    });
    const totalPlans = await MembershipPlan.countDocuments();

    return res.status(200).json({
      success: true,
      stats: {
        totalMembers,
        activeMemberships,
        expiredMemberships,
        totalRevenue,
        totalPaymentsCount,
        pendingFeedbacks,
        todayAttendance,
        totalPlans
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute dashboard metrics.'
    });
  }
});

/**
 * @route   GET /api/admin/members
 * @desc    Get all registered members with optional search
 * @access  Private (Admin)
 */
router.get('/members', async (req, res) => {
  try {
    const { search } = req.query;
    let filter = { role: 'member' };

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { fullName: regex },
        { username: regex },
        { email: regex },
        { phone: regex }
      ];
    }

    const members = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    // Attach active membership info for each member
    const now = new Date();
    const membersWithDetails = await Promise.all(
      members.map(async member => {
        const activeMembership = await Membership.findOne({
          user: member._id,
          status: 'active',
          endDate: { $gt: now }
        }).populate('plan', 'name durationMonths');

        const totalPayments = await Payment.countDocuments({ user: member._id });
        const totalAttendance = await Attendance.countDocuments({ user: member._id });

        return {
          ...member.toObject(),
          activeMembership: activeMembership || null,
          totalPayments,
          totalAttendance
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: membersWithDetails.length,
      members: membersWithDetails
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve member list.'
    });
  }
});

/**
 * @route   GET /api/admin/members/:id
 * @desc    Get detailed individual profile for a member
 * @access  Private (Admin)
 */
router.get('/members/:id', async (req, res) => {
  try {
    const member = await User.findById(req.params.id).select('-password');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const memberships = await Membership.find({ user: member._id })
      .populate('plan')
      .sort({ createdAt: -1 });
    const payments = await Payment.find({ user: member._id })
      .populate('plan')
      .sort({ createdAt: -1 });
    const attendance = await Attendance.find({ user: member._id })
      .sort({ date: -1 })
      .limit(30);
    const feedbacks = await Feedback.find({ user: member._id })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      member,
      memberships,
      payments,
      attendance,
      feedbacks
    });
  } catch (error) {
    console.error('Error fetching member details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve member details.'
    });
  }
});

/**
 * @route   PUT /api/admin/members/:id/status
 * @desc    Update a member's account status (active/suspended)
 * @access  Private (Admin)
 */
router.put('/members/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, inactive, or suspended.'
      });
    }

    const member = await User.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    // Safety: prevent admin from accidentally suspending other admins
    if (member.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot alter status of administrator accounts.'
      });
    }

    member.status = status;
    await member.save();

    return res.status(200).json({
      success: true,
      message: `Member status successfully updated to "${status}".`,
      member: member.toSafeObject()
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update member status.' });
  }
});

/**
 * @route   GET /api/admin/memberships
 * @desc    Get all memberships across the gym
 * @access  Private (Admin)
 */
router.get('/memberships', async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status) {
      filter.status = status;
    }

    const memberships = await Membership.find(filter)
      .populate('user', 'fullName username email phone')
      .populate('plan', 'name durationMonths price')
      .populate('payment', 'transactionRef amount paymentMethod')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: memberships.length,
      memberships
    });
  } catch (error) {
    console.error('Error fetching memberships:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve memberships.'
    });
  }
});

/**
 * @route   PUT /api/admin/memberships/:id
 * @desc    Manually update membership status or extend end date
 * @access  Private (Admin)
 */
router.put('/memberships/:id', async (req, res) => {
  try {
    const { status, extendMonths, newEndDate } = req.body;
    const membership = await Membership.findById(req.params.id);

    if (!membership) {
      return res.status(404).json({ success: false, message: 'Membership not found.' });
    }

    if (status) {
      membership.status = status;
    }

    if (extendMonths) {
      const currentEnd = new Date(membership.endDate);
      currentEnd.setMonth(currentEnd.getMonth() + Number(extendMonths));
      membership.endDate = currentEnd;
      membership.status = 'active';
    } else if (newEndDate) {
      membership.endDate = new Date(newEndDate);
    }

    await membership.save();
    await membership.populate('user', 'fullName username');
    await membership.populate('plan', 'name durationMonths');

    return res.status(200).json({
      success: true,
      message: 'Membership successfully updated.',
      membership
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update membership.' });
  }
});

module.exports = router;
