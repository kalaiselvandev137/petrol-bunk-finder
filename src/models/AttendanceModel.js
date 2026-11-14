import mongoose from 'mongoose';
import db from '../config/db.js';

const PointSchema = new mongoose.Schema(
  { latitude: Number, longitude: Number },
  { _id: false }
);

const AttendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'employees',required: true},
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  status: {
    type: String,
    required: true,
    default:"Not Marked"
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
   // ---- self check-in / check-out from the mobile app ----
  checkInAt: { type: Date },
  checkOutAt: { type: Date },
  checkInLocation: { type: PointSchema },
  checkOutLocation: { type: PointSchema },
  faceVerified: Boolean,
  faceSimilarity: Number,
  checkInSelfie: Array,
  source: { type: String, default: 'admin' }
}, {
  timestamps: true
});

// Compound index to ensure one record per employee per day
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const Attendance = db.model('attendances', AttendanceSchema)
export { Attendance }