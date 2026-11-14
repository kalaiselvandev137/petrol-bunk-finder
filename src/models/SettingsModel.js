import mongoose from 'mongoose';
import db from '../config/db.js';

const slotSchema = new mongoose.Schema({
  timeSlot: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const daySettingsSchema = new mongoose.Schema({
  isActive: {
    type: Boolean,
    default: true
  },
  useGlobalSettings: {
    type: Boolean,
    default: true
  },
  customSlots: [slotSchema]
}, { _id: false });

const dateSpecificSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  useGlobalSettings: {
    type: Boolean,
    default: false
  },
  slots: [slotSchema]
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  slotSettings: {
    globalSlots: [slotSchema],
    dayWiseSettings: {
      type: Map,
      of: daySettingsSchema
    },
    dateSpecificSettings: [dateSpecificSchema]
  },
  pricingSettings: {
    baseCharge: {
      type: Number,
      required: true,
      min: 0
    },
    gstRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    gstAmount: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

const Settings = db.model('Settings', settingsSchema);

export default Settings;