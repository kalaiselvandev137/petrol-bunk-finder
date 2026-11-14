import mongoose from 'mongoose'
import { Employee } from '../models/EmployeeModel.js'
import {
  TrackingSession, LocationPoint, TrackingConsent,
} from '../models/TrackingModel.js'

// ---- helpers ---------------------------------------------------------------

const fullName = (e) => [e.First_Name, e.Last_Name].filter(Boolean).join(' ')

const getEmployee = async (req) => {
  const u = req.user?.user || req.user?.employee || req.user || {}
  const id = u._id || u.id || u.userId || u.Id || u.employeeId || u.user_id || u.sub
  const select = 'First_Name Last_Name Address Role'

  if (id && mongoose.isValidObjectId(id)) {
    const e = await Employee.findById(id).select(select)
    if (e) return e
  }
  const email = u.Email || u.email
  if (email) {
    const e = await Employee.findOne({ Email: email }).select(select)
    if (e) return e
  }
  console.log('Tracking: employee not found for JWT payload:', req.user) // remove once it works
  return null
}

const fail = (res, e) => {
  console.error('tracking error:', e)
  res.status(500).json({ success: false, message: 'Server error' })
}

// salesman endpoints: the employee must be found
const handle = (fn) => async (req, res) => {
  try {
    const emp = await getEmployee(req)
    if (!emp) return res.status(401).json({ success: false, message: 'Employee not found' })
    await fn(req, res, emp)
  } catch (e) { fail(res, e) }
}

// admin endpoints: the role is already checked by authMiddleware
const adminHandle = (fn) => async (req, res) => {
  try {
    await fn(req, res)
  } catch (e) { fail(res, e) }
}

const istDate = (d = new Date()) =>
  new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10)

const toRad = (x) => (x * Math.PI) / 180
const haversineKm = (a, b) => {
  const h =
    Math.sin(toRad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) *
      Math.sin(toRad(b.longitude - a.longitude) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

const closeSession = async (s) => {
  const end = new Date()
  s.endTime = end
  s.status = 'Completed'
  s.durationSeconds = Math.round((end - s.startTime) / 1000)
  await s.save()
}

// ---- consent (Sales_Man) ---------------------------------------------------

export const getConsent = handle(async (req, res, emp) => {
  const accepted = !!(await TrackingConsent.exists({ employeeId: emp._id }))
  res.json({ success: true, accepted })
})

export const saveConsent = handle(async (req, res, emp) => {
  await TrackingConsent.updateOne(
    { employeeId: emp._id },
    { $set: { noticeVersion: Number(req.body.noticeVersion) || 1, acceptedAt: new Date() } },
    { upsert: true }
  )
  res.json({ success: true })
})

// ---- write endpoints (Sales_Man) ------------------------------------------

// Idempotent: returns today's active session, or creates one
export const startSession = handle(async (req, res, emp) => {
  if (!(await TrackingConsent.exists({ employeeId: emp._id }))) {
    return res.status(403).json({ success: false, message: 'Consent required' })
  }
  const today = istDate()
  let s = await TrackingSession.findOne({ employeeId: emp._id, status: 'Active' }).sort({ startTime: -1 })
  if (s && s.date !== today) { await closeSession(s); s = null } // stale session from an earlier day
  if (!s) {
    s = await TrackingSession.create({
      employeeId: emp._id,
      employeeName: fullName(emp),
      address: emp.Address || '',
      date: today,
    })
  }
  res.json({ success: true, session: s })
})

export const saveLocationPoints = handle(async (req, res, emp) => {
  const { sessionId, points } = req.body
  if (!mongoose.isValidObjectId(sessionId) || !Array.isArray(points) || !points.length || points.length > 300) {
    return res.status(400).json({ success: false, message: 'Invalid request' })
  }
  const s = await TrackingSession.findOne({ _id: sessionId, employeeId: emp._id })
  if (!s) return res.status(404).json({ success: false, message: 'Session not found' })
  if (s.status !== 'Active') return res.status(409).json({ success: false, message: 'Session ended' })

  const lastTs = s.lastPoint?.timestamp ? s.lastPoint.timestamp.getTime() : 0
  const clean = points
    .map((p) => ({
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      accuracy: p.accuracy == null ? null : Number(p.accuracy),
      speed: p.speed == null ? null : Number(p.speed),
      timestamp: new Date(Number(p.timestamp)),
    }))
    .filter((p) =>
      Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 &&
      Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180 &&
      !isNaN(p.timestamp.getTime()) && p.timestamp.getTime() > lastTs // drops retried duplicates
    )
    .sort((a, b) => a.timestamp - b.timestamp)

  if (!clean.length) return res.json({ success: true, saved: 0 })

  let prev = s.lastPoint?.latitude != null ? s.lastPoint : null
  let added = 0
  for (const p of clean) {
    if (prev) {
      const d = haversineKm(prev, p)
      if (d > 0.005) added += d // ignore GPS jitter under 5 m
    }
    prev = p
  }

  try {
    await LocationPoint.insertMany(
      clean.map((p) => ({ ...p, sessionId: s._id, employeeId: emp._id })),
      { ordered: false }
    )
  } catch (e) {
    if (e.code !== 11000) throw e // duplicate timestamps are fine
  }

  const last = clean[clean.length - 1]
  await TrackingSession.updateOne(
    { _id: s._id },
    {
      $inc: { totalPoints: clean.length, totalDistanceKm: Number(added.toFixed(3)) },
      $set: { lastPoint: { latitude: last.latitude, longitude: last.longitude, timestamp: last.timestamp } },
    }
  )
  res.json({ success: true, saved: clean.length })
})

export const endSession = handle(async (req, res, emp) => {
  const { sessionId } = req.body
  const s = mongoose.isValidObjectId(sessionId)
    ? await TrackingSession.findOne({ _id: sessionId, employeeId: emp._id })
    : null
  if (!s) return res.status(404).json({ success: false, message: 'Session not found' })
  if (s.status === 'Active') await closeSession(s)
  res.json({ success: true, session: s })
})

// ---- read endpoints (Admin / Management only) -----------------------------

export const getTrackingSessions = adminHandle(async (req, res) => {
  const { date, employeeId } = req.query
  const q = {}
  if (date) q.date = date
  if (employeeId && mongoose.isValidObjectId(employeeId)) q.employeeId = employeeId

  const resdata = await TrackingSession.find(q).sort({ startTime: -1 }).limit(500).lean()
  res.json({ success: true, resdata })
})

export const getSessionPoints = adminHandle(async (req, res) => {
  const { sessionId } = req.query
  if (!mongoose.isValidObjectId(sessionId)) {
    return res.status(400).json({ success: false, message: 'Invalid sessionId' })
  }
  const [session, resdata] = await Promise.all([
    TrackingSession.findById(sessionId).lean(),
    LocationPoint.find({ sessionId }).sort({ timestamp: 1 })
      .select('latitude longitude accuracy speed timestamp -_id').lean(),
  ])
  res.json({ success: true, session, resdata })
})