import mongoose from 'mongoose'
import db from '../config/db.js'

const sessionSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, required: true },
  employeeName: String,
  address: String, // copied from Employee.Address when the session starts
  date: { type: String, required: true }, // YYYY-MM-DD (IST)
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  status: { type: String, enum: ['Active', 'Completed'], default: 'Active' },
  totalPoints: { type: Number, default: 0 },
  totalDistanceKm: { type: Number, default: 0 },
  durationSeconds: { type: Number, default: 0 },
  lastPoint: { latitude: Number, longitude: Number, timestamp: Date },
}, { timestamps: true })
sessionSchema.index({ employeeId: 1, status: 1 })
sessionSchema.index({ date: 1, employeeId: 1 })

const pointSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, required: true },
  latitude: Number,
  longitude: Number,
  accuracy: Number,
  speed: Number,
  timestamp: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 }, // auto-delete after 90 days
})
pointSchema.index({ sessionId: 1, timestamp: 1 }, { unique: true })

const consentSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  noticeVersion: Number,
  acceptedAt: { type: Date, default: Date.now },
})


const TrackingSession = db.model('tracking_sessions', sessionSchema)
const LocationPoint = db.model('tracking_points', pointSchema)
const TrackingConsent = db.model('tracking_consents', consentSchema)

export { TrackingSession, LocationPoint, TrackingConsent }