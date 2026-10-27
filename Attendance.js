const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for attendance log']
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Excused'],
      default: 'Present'
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Index to easily query user attendance by date
attendanceSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
