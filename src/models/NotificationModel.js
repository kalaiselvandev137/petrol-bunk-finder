import mongoose from 'mongoose';
import db from '../config/db.js';

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'booking'
  },
  message: {
    type: String,
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    // unique: true,
    sparse: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Notification = db.model('Notification', notificationSchema);

export default Notification;