require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');

const connectDB = require('./config/db');

// Models
const User = require('./models/User');
const MembershipPlan = require('./models/MembershipPlan');

// Route imports
const authRoutes = require('./routes/authRoutes');
const planRoutes = require('./routes/planRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Basic Middleware
app.use(morgan('dev'));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Safe Session Configuration linked to Mongoose client
const clientPromise = new Promise((resolve) => {
  if (mongoose.connection.readyState === 1) {
    return resolve(mongoose.connection.getClient());
  }
  mongoose.connection.once('connected', () => {
    resolve(mongoose.connection.getClient());
  });
});

const sessionStore = MongoStore.create({
  clientPromise,
  collectionName: 'sessions',
  ttl: 60 * 60 * 24 * 7, // 7 days
  autoRemove: 'native'
});

const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'gymcare_session_secret_college_project_2026',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
};

app.use(session(sessionOptions));

// 3. Serve Frontend Static Assets
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// 4. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint with DB status
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'healthy',
    application: 'GymCare – Gym Membership Management System',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Fallback routing for frontend pages
app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin-dashboard.html'));
});

app.get('/user-dashboard', (req, res) => {
  res.sendFile(path.join(frontendPath, 'user-dashboard.html'));
});

// 5. Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Helper function to auto-seed essential data if collections are empty
async function autoSeedDefaults() {
  try {
    const plansCount = await MembershipPlan.countDocuments();
    if (plansCount === 0) {
      console.log('🌱 No membership plans detected. Creating default starter plans...');
      await MembershipPlan.insertMany([
        {
          name: '1 Month Starter Plan',
          durationMonths: 1,
          price: 1200,
          description: 'Access to cardio and strength floor with locker facilities.',
          features: ['Gym floor access', 'Free posture analysis', 'Locker & shower facilities', 'Open 7 days/week'],
          popular: false,
          isActive: true
        },
        {
          name: '3 Months Pro Plan',
          durationMonths: 3,
          price: 3200,
          description: 'Solid routine builder with 1 personal trainer session.',
          features: ['Full gym access', '1 personal trainer session', 'Yoga & aerobics access', 'Towel & locker service'],
          popular: false,
          isActive: true
        },
        {
          name: '6 Months Elite Plan',
          durationMonths: 6,
          price: 5800,
          description: 'Our most popular fitness package for sustained results.',
          features: ['Full gym & cardio access', '3 personal training sessions', 'Unlimited group fitness classes', 'Custom diet guidance', 'Monthly body scan', 'Steam room access'],
          popular: true,
          isActive: true
        },
        {
          name: '12 Months Champion Plan',
          durationMonths: 12,
          price: 10500,
          description: 'All-inclusive annual VIP membership with premium coaching perks.',
          features: ['365 days VIP gym floor access', '6 personal training sessions', 'Dedicated locker & towel', 'Diet & macro consultation', 'Steam & sauna access', '1 monthly guest pass'],
          popular: false,
          isActive: true
        }
      ]);
      console.log('✅ Default membership plans created.');
    }

    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('👑 No administrator account detected. Seeding default admin...');
      const admin = new User({
        fullName: process.env.ADMIN_NAME || 'GymCare Administrator',
        username: (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim(),
        email: (process.env.ADMIN_EMAIL || 'admin@gymcare.com').toLowerCase().trim(),
        phone: '9876543210',
        address: '104 Fitness Boulevard, GymCare Central',
        password: process.env.ADMIN_PASSWORD || 'Admin@12345',
        role: 'admin',
        status: 'active'
      });
      await admin.save();
      console.log(`✅ Default admin created (User: ${admin.username} / Pass: ${process.env.ADMIN_PASSWORD || 'Admin@12345'})`);
    }
  } catch (seedErr) {
    console.warn('⚠️ Auto-seed notice:', seedErr.message);
  }
}

// 6. Connect Database & Start Server
const startServer = async () => {
  const conn = await connectDB();
  if (conn && mongoose.connection.readyState === 1) {
    await autoSeedDefaults();
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 [GymCare] Server running on: http://localhost:${PORT}`);
    console.log(`🏋️ Member Portal : http://localhost:${PORT}/login.html`);
    console.log(`🛡️ Admin Portal  : http://localhost:${PORT}/admin-login.html`);
  });

  return server;
};

// Start if executed directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
