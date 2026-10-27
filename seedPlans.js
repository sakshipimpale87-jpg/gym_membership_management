require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const MembershipPlan = require('../models/MembershipPlan');

const defaultPlans = [
  {
    name: '1 Month Starter Plan',
    durationMonths: 1,
    price: 1200,
    description: 'Perfect for beginners who want to try out our premium fitness equipment.',
    features: [
      'Full access to cardio & weight training zones',
      'Free fitness assessment & posture check',
      'Locker room & shower access',
      'Open 7 days a week'
    ],
    popular: false,
    isActive: true
  },
  {
    name: '3 Months Pro Plan',
    durationMonths: 3,
    price: 3200,
    description: 'Ideal for fitness enthusiasts building a solid habit and seeing real progress.',
    features: [
      'Full gym & strength area access',
      '1 complimentary personal trainer session',
      'Access to weekend group yoga & aerobics',
      'Locker room & clean towel service',
      'Basic workout routine guidance'
    ],
    popular: false,
    isActive: true
  },
  {
    name: '6 Months Elite Plan',
    durationMonths: 6,
    price: 5800,
    description: 'Our most popular fitness package for committed transformations.',
    features: [
      'Unlimited gym floor & cardio access',
      '3 one-on-one personal training sessions',
      'Full access to all group classes (Zumba, Yoga, HIIT)',
      'Customized nutrition & meal guidance',
      'Monthly body composition scan & progress report',
      'Steam & sauna room access'
    ],
    popular: true,
    isActive: true
  },
  {
    name: '12 Months Champion Plan',
    durationMonths: 12,
    price: 10500,
    description: 'All-inclusive annual VIP membership with maximum savings and premium perks.',
    features: [
      'Full VIP access 365 days a year',
      '6 one-on-one personal training sessions',
      'Dedicated locker & laundry service',
      'Unlimited group fitness classes & workshops',
      'Personalized monthly diet & macro coaching',
      'Steam, sauna & wellness lounge access',
      '1 free guest pass every month'
    ],
    popular: false,
    isActive: true
  }
];

const seedPlans = async () => {
  try {
    await connectDB();
    console.log('🌱 Seeding default membership plans...');

    for (const planData of defaultPlans) {
      const existing = await MembershipPlan.findOne({ name: planData.name });
      if (!existing) {
        await MembershipPlan.create(planData);
        console.log(`  ➕ Created plan: "${planData.name}" (₹${planData.price} / ${planData.durationMonths} mo)`);
      } else {
        console.log(`  ✓ Plan already exists: "${planData.name}"`);
      }
    }

    console.log('✅ Membership plans seeding complete.');
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seedPlans();
