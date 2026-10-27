require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await connectDB();
    console.log('👑 Checking administrator account setup...');

    const adminName = process.env.ADMIN_NAME || 'GymCare Administrator';
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gymcare.com').toLowerCase().trim();
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

    let admin = await User.findOne({
      $or: [{ username: adminUsername }, { email: adminEmail }]
    });

    if (!admin) {
      admin = new User({
        fullName: adminName,
        username: adminUsername,
        email: adminEmail,
        phone: '9876543210',
        address: 'GymCare Headquarters, Suite 101, Fitness Blvd',
        password: adminPassword,
        role: 'admin',
        status: 'active'
      });
      await admin.save();
      console.log('✅ Initial Administrator created successfully!');
    } else {
      admin.role = 'admin';
      admin.password = adminPassword; // Triggers pre-save hashing
      admin.status = 'active';
      await admin.save();
      console.log('✅ Administrator account credentials updated successfully!');
    }

    console.log('----------------------------------------------------');
    console.log(`👤 Admin Username : ${adminUsername}`);
    console.log(`📧 Admin Email    : ${adminEmail}`);
    console.log(`🔑 Admin Password : ${adminPassword}`);
    console.log('----------------------------------------------------');
    console.log('👉 You can log in via the Admin Login page at: http://localhost:5000/admin-login.html');
  } catch (error) {
    console.error('❌ Error setting up admin:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seedAdmin();
