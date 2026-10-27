const express = require('express');
const router = express.Router();
const MembershipPlan = require('../models/MembershipPlan');
const { isAdmin } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/plans
 * @desc    Fetch all available (active) membership plans
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // If admin is requesting, they can see all plans including inactive ones
    const query = req.session && req.session.role === 'admin' ? {} : { isActive: true };
    const plans = await MembershipPlan.find(query).sort({ durationMonths: 1 });
    return res.status(200).json({
      success: true,
      count: plans.length,
      plans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch membership plans.'
    });
  }
});

/**
 * @route   GET /api/plans/:id
 * @desc    Get single plan by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Membership plan not found.' });
    }
    return res.status(200).json({ success: true, plan });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error retrieving plan details.' });
  }
});

/**
 * @route   POST /api/plans
 * @desc    Create new membership plan (Admin only)
 * @access  Private (Admin)
 */
router.post('/', isAdmin, async (req, res) => {
  try {
    const { name, durationMonths, price, description, features, popular } = req.body;

    if (!name || !durationMonths || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, duration (in months), and price are required.'
      });
    }

    const planExists = await MembershipPlan.findOne({ name: name.trim() });
    if (planExists) {
      return res.status(409).json({
        success: false,
        message: 'A plan with this name already exists.'
      });
    }

    const newPlan = new MembershipPlan({
      name: name.trim(),
      durationMonths: Number(durationMonths),
      price: Number(price),
      description: description ? description.trim() : '',
      features: Array.isArray(features) ? features : (features ? features.split('\n').filter(Boolean) : []),
      popular: Boolean(popular),
      isActive: true
    });

    await newPlan.save();

    return res.status(201).json({
      success: true,
      message: 'Membership plan created successfully.',
      plan: newPlan
    });
  } catch (error) {
    console.error('Create plan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating membership plan.'
    });
  }
});

/**
 * @route   PUT /api/plans/:id
 * @desc    Update an existing membership plan (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { name, durationMonths, price, description, features, popular, isActive } = req.body;
    const plan = await MembershipPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found.' });
    }

    if (name) plan.name = name.trim();
    if (durationMonths !== undefined) plan.durationMonths = Number(durationMonths);
    if (price !== undefined) plan.price = Number(price);
    if (description !== undefined) plan.description = description.trim();
    if (features !== undefined) {
      plan.features = Array.isArray(features) ? features : features.split('\n').filter(Boolean);
    }
    if (popular !== undefined) plan.popular = Boolean(popular);
    if (isActive !== undefined) plan.isActive = Boolean(isActive);

    await plan.save();

    return res.status(200).json({
      success: true,
      message: 'Plan updated successfully.',
      plan
    });
  } catch (error) {
    console.error('Update plan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating membership plan.'
    });
  }
});

/**
 * @route   DELETE /api/plans/:id
 * @desc    Delete or deactivate a membership plan (Admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found.' });
    }

    // Soft delete by deactivating to preserve historical memberships
    plan.isActive = false;
    await plan.save();

    return res.status(200).json({
      success: true,
      message: `Plan "${plan.name}" has been deactivated.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error deactivating plan.' });
  }
});

module.exports = router;
