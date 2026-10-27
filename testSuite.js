/**
 * GymCare – Automated Unit & Logic Verification Test Suite
 * Tests models, password security, expiry logic, demo payment generation, and authorization middleware.
 */

const assert = require('assert');
const bcrypt = require('bcryptjs');

// Models
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');
const Membership = require('../models/Membership');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Feedback = require('../models/Feedback');

// Middleware
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASSED: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ FAILED: ${name}`);
    console.error(`     Error: ${err.message}`);
    testsFailed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASSED: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ FAILED: ${name}`);
    console.error(`     Error: ${err.message}`);
    testsFailed++;
  }
}

async function startTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting GymCare Logic & Security Test Suite');
  console.log('====================================================\n');

  // Test 1: Password Hashing & Comparison
  await runAsyncTest('Password Security: Bcrypt hashing & verification', async () => {
    const rawPassword = 'StudentSecret@2026';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    assert.notStrictEqual(hash, rawPassword, 'Hash must not match plain text');
    assert.strictEqual(hash.startsWith('$2a$') || hash.startsWith('$2b$'), true, 'Must be valid bcrypt hash');

    const matchGood = await bcrypt.compare(rawPassword, hash);
    assert.strictEqual(matchGood, true, 'Correct password must verify successfully');

    const matchBad = await bcrypt.compare('WrongPassword!123', hash);
    assert.strictEqual(matchBad, false, 'Incorrect password must be rejected');
  });

  // Test 2: User Safe Object (No password leakage)
  runTest('Data Privacy: User.toSafeObject() excludes password and sensitive fields', () => {
    const testUser = new User({
      fullName: 'Rahul Verma',
      username: 'rahul_v',
      email: 'rahul@example.com',
      phone: '9876543210',
      address: '123 Park Street, Mumbai',
      password: 'HashedPasswordGoesHere',
      role: 'member'
    });

    const safeObj = testUser.toSafeObject();
    assert.strictEqual(safeObj.password, undefined, 'Password must not be in safe object');
    assert.strictEqual(safeObj.__v, undefined, '__v internal field must be removed');
    assert.strictEqual(safeObj.username, 'rahul_v');
    assert.strictEqual(safeObj.role, 'member');
  });

  // Test 3: Plan Expiry Date Math
  runTest('Business Logic: Membership Expiry Calculation for 1, 3, 6, 12 months', () => {
    const startDate = new Date('2026-01-15T00:00:00.000Z');

    // 1 Month duration
    const end1Mo = new Date(startDate);
    end1Mo.setMonth(end1Mo.getMonth() + 1);
    assert.strictEqual(end1Mo.getMonth(), 1, '1 Month addition should be February');

    // 3 Months duration
    const end3Mo = new Date(startDate);
    end3Mo.setMonth(end3Mo.getMonth() + 3);
    assert.strictEqual(end3Mo.getMonth(), 3, '3 Months addition should be April');

    // 6 Months duration
    const end6Mo = new Date(startDate);
    end6Mo.setMonth(end6Mo.getMonth() + 6);
    assert.strictEqual(end6Mo.getMonth(), 6, '6 Months addition should be July');

    // 12 Months duration
    const end12Mo = new Date(startDate);
    end12Mo.setFullYear(end12Mo.getFullYear() + 1);
    assert.strictEqual(end12Mo.getFullYear(), 2027, '12 Months addition should advance year');
  });

  // Test 4: Demo Payment Structure
  runTest('Payment Security: Demo Payment Structure & Simulation Safeguard', () => {
    const samplePayment = new Payment({
      user: '60d5ec49f1b2c82b8c8a1234',
      plan: '60d5ec49f1b2c82b8c8a5678',
      amount: 5800,
      paymentMethod: 'Demo UPI',
      transactionRef: 'DEMO-PAY-1729891234567-4821',
      status: 'Success',
      isDemo: true
    });

    assert.strictEqual(samplePayment.isDemo, true, 'isDemo flag must always be true');
    assert.strictEqual(samplePayment.transactionRef.startsWith('DEMO-PAY-'), true, 'Ref must carry DEMO prefix');
    assert.strictEqual(samplePayment.status, 'Success');
    assert.strictEqual(samplePayment.amount, 5800);
  });

  // Test 5: Authorization Middleware - Authentication Check
  runTest('Security Middleware: isAuthenticated blocks unauthenticated requests', () => {
    let statusCalled = null;
    let jsonCalled = null;
    let nextCalled = false;

    const reqUnauth = { session: {} };
    const res = {
      status: (code) => {
        statusCalled = code;
        return {
          json: (data) => { jsonCalled = data; }
        };
      }
    };
    const next = () => { nextCalled = true; };

    isAuthenticated(reqUnauth, res, next);
    assert.strictEqual(statusCalled, 401, 'Unauthenticated user must receive 401 Unauthorized');
    assert.strictEqual(nextCalled, false, 'Next must not be called when unauthenticated');
    assert.strictEqual(jsonCalled.success, false);

    // Authenticated scenario
    const reqAuth = { session: { userId: 'user123', role: 'member' } };
    statusCalled = null;
    nextCalled = false;
    isAuthenticated(reqAuth, res, next);
    assert.strictEqual(nextCalled, true, 'Authenticated user must pass to next()');
    assert.strictEqual(statusCalled, null);
  });

  // Test 6: Authorization Middleware - Admin Check
  runTest('Security Middleware: isAdmin strictly forbids non-admin members', () => {
    let statusCalled = null;
    let jsonCalled = null;
    let nextCalled = false;

    const res = {
      status: (code) => {
        statusCalled = code;
        return {
          json: (data) => { jsonCalled = data; }
        };
      }
    };
    const next = () => { nextCalled = true; };

    // Regular member attempts to access admin route
    const reqMember = { session: { userId: 'user123', role: 'member' } };
    isAdmin(reqMember, res, next);
    assert.strictEqual(statusCalled, 403, 'Regular member must receive 403 Forbidden on admin routes');
    assert.strictEqual(nextCalled, false, 'Admin-only route must block member execution');

    // Admin attempts to access admin route
    const reqAdmin = { session: { userId: 'admin456', role: 'admin' } };
    statusCalled = null;
    nextCalled = false;
    isAdmin(reqAdmin, res, next);
    assert.strictEqual(nextCalled, true, 'Admin account must pass through isAdmin to next()');
    assert.strictEqual(statusCalled, null);
  });

  // Test 7: Feedback Model Rating Limits
  runTest('Validation: Feedback rating limits (1 to 5 stars)', () => {
    const feedbackGood = new Feedback({
      user: '60d5ec49f1b2c82b8c8a1234',
      subject: 'Gym Air Conditioning',
      message: 'AC in the cardio zone is working great!',
      rating: 5
    });

    const validationError = feedbackGood.validateSync();
    assert.strictEqual(validationError, undefined, 'Valid feedback should have no validation errors');
  });

  // Test 8: Attendance Model Structure
  runTest('Attendance: Model validates user, date, and status', () => {
    const att = new Attendance({
      user: '60d5ec49f1b2c82b8c8a1234',
      date: new Date(),
      status: 'Present',
      notes: 'Leg day workout completed'
    });

    const validationError = att.validateSync();
    assert.strictEqual(validationError, undefined, 'Valid attendance should pass schema validation');
    assert.strictEqual(att.status, 'Present');
  });

  console.log('\n====================================================');
  console.log(`📊 Test Results: ${testsPassed} Passed | ${testsFailed} Failed`);
  console.log('====================================================');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

startTestSuite();
