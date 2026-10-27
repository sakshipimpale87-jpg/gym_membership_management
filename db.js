const mongoose = require('mongoose');

/**
 * Connect to MongoDB using Mongoose
 * Handles both local MongoDB and hosted MongoDB Atlas URIs.
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gymcare';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000 // Fast timeout if MongoDB is not running locally
    });
    console.log(`✅ [MongoDB] Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ [MongoDB] Connection Failed: ${error.message}`);
    console.error(`💡 Tip: Make sure MongoDB service is running locally, or configure MONGODB_URI in your .env file with a free MongoDB Atlas connection string.`);
    return null;
  }
};

module.exports = connectDB;
