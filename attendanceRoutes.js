const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/attendance/my
 * @desc    Get logged in member's attendance history
 * @access  Private (Member)
 */
router.get('/my', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const records = await Attendance.find({ user: userId })
      .sort({ date: -1 })
      .limit(60);

    return res.status(200).json({
      success: true,
      count: records.length,
      records
    });
  } catch (error) {
    console.error('Error fetching member attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance history.'
    });
  }
});

/**
 * @route   GET /api/attendance/all
 * @desc    Get all attendance records (Admin only)
 * @access  Private (Admin)
 */
router.get('/all', isAdmin, async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate('user', 'fullName username email phone')
      .populate('markedBy', 'fullName username')
      .sort({ date: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: records.length,
      records
    });
  } catch (error) {
    console.error('Error fetching all attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance logs.'
    });
  }
});

/**
 * @route   POST /api/attendance/mark
 * @desc    Mark attendance for a gym member (Admin only)
 * @access  Private (Admin)
 */
router.post('/mark', isAdmin, async (req, res) => {
  try {
    const { userId, date, status, notes } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Member selection is required.'
      });
    }

    const member = await User.findById(userId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found.'
      });
    }

    const attendanceDate = date ? new Date(date) : new Date();

    const record = new Attendance({
      user: userId,
      date: attendanceDate,
      status: status || 'Present',
      notes: notes ? notes.trim() : '',
      markedBy: req.session.userId
    });

    await record.save();
    await record.populate('user', 'fullName username');

    return res.status(201).json({
      success: true,
      message: `Attendance marked as ${record.status} for ${member.fullName}.`,
      record
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record attendance.'
    });
  }
});

module.exports = router;
