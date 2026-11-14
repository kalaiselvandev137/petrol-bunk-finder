import { Attendance } from '../models/AttendanceModel.js'
import { Employee } from '../models/EmployeeModel.js'
import { compareFaces, loadReference } from '../services/faceVerifyService.js'
import { Saveimages } from '../services/Imageservice.js'

// Today's calendar date in India as 'YYYY-MM-DD' (don't trust the phone's clock)
const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

const readPoint = (b) => {
  const latitude = parseFloat(b?.latitude)
  const longitude = parseFloat(b?.longitude)
  const ok =
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
  return ok ? { latitude, longitude } : undefined
}

const isLeave = (status) => String(status || '').toLowerCase().startsWith('leave')

// ---- POST /apicheckin  { latitude, longitude } ------------------------------
// Employee identity comes from the token, never from the body.

export const checkIn = async (req, res) => {
  try {
    const employeeId = req.user.id
    const date = todayIST()
    const point = readPoint(req.body)
    const now = new Date()

    let rec = await Attendance.findOne({ employeeId, date })

    if (rec && isLeave(rec.status)) {
      return res.status(409).send({ success: false, message: 'You are marked on leave today' })
    }

    const alreadyIn = !!(rec?.checkInAt && !rec?.checkOutAt)
    let face = {}

    // ---- face verification (skipped only for the idempotent "already checked in" case) ----
    if (!alreadyIn) {
      if (!req.file) {
        return res.status(400).send({ success: false, message: 'A live selfie is required to check in' })
      }

      const emp = await Employee.findById(employeeId).select('face_verify_reference_image')
      const refPath = emp?.face_verify_reference_image?.[0]
      if (!refPath) {
        return res.status(412).send({
          success: false, code: 'NO_REFERENCE',
          message: 'Face reference photo is not set. Please contact your admin.',
        })
      }

      const result = await compareFaces(req.file.buffer, await loadReference(refPath))

      if (!result.matched) {
        console.warn(`Face mismatch for employee ${employeeId} at ${now.toISOString()}`, result)
        return res.status(403).send({
          success: false, code: 'FACE_MISMATCH',
          message: result.noFace
            ? 'No clear face detected. Retake the photo in good light.'
            : 'Face verification failed. Check-in denied.',
        })
      }

      face = {
        faceVerified: true,
        faceSimilarity: result.similarity,
        checkInSelfie: await Saveimages(req.file, 'CheckinSelfies'), // audit trail; remove if you don't want to store selfies
      }
    }

    // ---- your existing logic, with the face fields added ----
    if (!rec) {
      try {
        rec = await Attendance.create({
          employeeId, date, status: 'present', markedAt: now,
          checkInAt: now, checkInLocation: point, source: 'self', ...face,
        })
      } catch (e) {
        if (e?.code !== 11000) throw e
        rec = await Attendance.findOne({ employeeId, date })
      }
    } else if (!alreadyIn) {
      if (!rec.checkInAt) {
        rec.checkInAt = now
        rec.checkInLocation = point
        rec.markedAt = now
        rec.source = 'self'
      }
      rec.checkOutAt = undefined
      rec.checkOutLocation = undefined
      if (rec.status !== 'half-day') rec.status = 'present'
      Object.assign(rec, face)
      await rec.save()
    }

    res.send({ success: true, message: 'Checked in', attendance: rec })
  } catch (err) {
    console.error('Error checking in:', err)
    res.status(500).send({ success: false, message: 'Failed to check in', error: err.message })
  }
}

// ---- POST /apicheckout  { latitude?, longitude? } ---------------------------

export const checkOut = async (req, res) => {
  try {
    const employeeId = req.user.id
    const date = todayIST()

    const rec = await Attendance.findOne({ employeeId, date })
    if (!rec || !rec.checkInAt) {
      return res.status(409).send({ success: false, message: 'You have not checked in today' })
    }

    if (!rec.checkOutAt) {
      rec.checkOutAt = new Date()
      rec.checkOutLocation = readPoint(req.body)
      await rec.save()
    }

    res.send({ success: true, message: 'Checked out', attendance: rec })
  } catch (err) {
    console.error('Error checking out:', err)
    res.status(500).send({ success: false, message: 'Failed to check out', error: err.message })
  }
}

// ---- GET /apigetmyattendancetoday -------------------------------------------

export const getMyAttendanceToday = async (req, res) => {
  try {
    const date = todayIST()
    const attendance = await Attendance.findOne({ employeeId: req.user.id, date }).lean()
    res.send({ success: true, date, attendance: attendance || null })
  } catch (err) {
    console.error('Error fetching today attendance:', err)
    res.status(500).send({ success: false, message: 'Failed to fetch attendance', error: err.message })
  }
}
