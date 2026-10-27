const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/feedback
 * @desc    Submit member feedback/suggestion
 * @access  Private (Member)
 */
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { subject, message, rating } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required.'
      });
    }

    const feedback = new Feedback({
      user: req.session.userId,
      subject: subject.trim(),
      message: message.trim(),
      rating: rating ? Number(rating) : 5,
      status: 'Pending'
    });

    await feedback.save();

    return res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! The gym team will review it shortly.',
      feedback
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit feedback.'
    });
  }
});

/**
 * @route   GET /api/feedback/my
 * @desc    Get member's own feedback history and admin replies
 * @access  Private (Member)
 */
router.get('/my', isAuthenticated, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ user: req.session.userId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      feedbacks
    });
  } catch (error) {
    console.error('Get my feedback error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve feedback history.'
    });
  }
});

/**
 * @route   GET /api/feedback/all
 * @desc    Get all feedback records (Admin only)
 * @access  Private (Admin)
 */
router.get('/all', isAdmin, async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate('user', 'fullName username email phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      feedbacks
    });
  } catch (error) {
    console.error('Get all feedback error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve feedback list.'
    });
  }
});

/**
 * @route   PUT /api/feedback/:id/reply
 * @desc    Admin reply and resolve feedback
 * @access  Private (Admin)
 */
router.put('/:id/reply', isAdmin, async (req, res) => {
  try {
    const { adminResponse, status } = req.body;
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback entry not found.'
      });
    }

    if (adminResponse !== undefined) {
      feedback.adminResponse = adminResponse.trim();
      feedback.respondedAt = new Date();
    }
    if (status) {
      feedback.status = status;
    }

    await feedback.save();

    return res.status(200).json({
      success: true,
      message: 'Feedback response saved successfully.',
      feedback
    });
  } catch (error) {
    console.error('Reply feedback error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update feedback response.'
    });
  }
});

module.exports = router;
