const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new gym member
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { fullName, username, email, phone, address, password, confirmPassword } = req.body;

    // Field presence validation
    if (!fullName || !username || !email || !phone || !address || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required. Please fill in all information.'
      });
    }

    // Passwords match validation
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match. Please re-enter your password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Clean inputs
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check for existing username
    const existingUsername = await User.findOne({ username: cleanUsername });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'Username is already taken. Please choose another username.'
      });
    }

    // Check for existing email
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Create user (Public registration ALWAYS sets role to 'member')
    const newUser = new User({
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      phone: phone.trim(),
      address: address.trim(),
      password,
      role: 'member',
      status: 'active'
    });

    await newUser.save();

    // Automatically establish session for the newly registered member
    req.session.userId = newUser._id.toString();
    req.session.role = newUser.role;
    req.session.username = newUser.username;

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to GymCare.',
      user: newUser.toSafeObject()
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again later.'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user (member or admin) and start session
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/email and password.'
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Query by username OR email, including password for verification
    const user = await User.findOne({
      $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact gym administration.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    // Set session data
    req.session.userId = user._id.toString();
    req.session.role = user.role;
    req.session.username = user.username;

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.fullName}!`,
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.'
    });
  }
});

/**
 * @route   POST /api/auth/admin-login
 * @desc    Dedicated administrator login with role verification
 * @access  Public
 */
router.post('/admin-login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Admin identifier and password are required.'
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found.'
      });
    }

    // Enforce role check on backend
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This account does not possess administrator rights.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator password.'
      });
    }

    req.session.userId = user._id.toString();
    req.session.role = user.role;
    req.session.username = user.username;

    return res.status(200).json({
      success: true,
      message: `Welcome, Administrator ${user.fullName}!`,
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during admin login.'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and destroy session
 * @access  Private
 */
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error logging out. Please try again.'
        });
      }
      res.clearCookie('connect.sid');
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    });
  } else {
    return res.status(200).json({
      success: true,
      message: 'Already logged out.'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user details
 * @access  Private
 */
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }
    return res.status(200).json({
      success: true,
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching profile.'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current member's personal profile (name, phone, address)
 * @access  Private
 */
router.put('/profile', isAuthenticated, async (req, res) => {
  try {
    const { fullName, phone, address } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (fullName) user.fullName = fullName.trim();
    if (phone) user.phone = phone.trim();
    if (address) user.address = address.trim();

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating profile.'
    });
  }
});

module.exports = router;
