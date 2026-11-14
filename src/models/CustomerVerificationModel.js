// models/CustomerVerificationModel.js

import mongoose from 'mongoose';
import db from '../config/db.js';

const customerVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true},
  name: {type: String,trim: true},
  phone: { type: String, trim: true},
  bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking'}],
  lastOTP: {type: String},
  otpExpiry: { type: Date },
  verifications: [{verifiedAt: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String
  }],
  lastVerifiedAt: {type: Date },
  totalBookings: {type: Number,default: 0},
  status: {type: String, enum: ['active', 'blocked'],default: 'active'}
}, {
  timestamps: true
});


customerVerificationSchema.index({ email: 1, status: 1 });
customerVerificationSchema.index({ createdAt: -1 });

const CustomerVerification = db.model('CustomerVerification', customerVerificationSchema);

export default CustomerVerification;