import mongoose from 'mongoose'
import { Dealer } from '../models/DealerModel.js'
import { DealerVisit, VISIT_OUTCOMES } from '../models/DealerVisitModel.js'
import { Employee } from '../models/EmployeeModel.js'
import { Saveimages } from '../services/Imageservice.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ON_SITE_RADIUS_M = 200 // keep in sync with the app (DealerVisitModal.jsx)

// ---- helpers ---------------------------------------------------------------

// Today's calendar date in India as 'YYYY-MM-DD' (don't trust the phone's clock)
const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

// 'YYYY-MM-DD' -> explicit UTC day range, so results don't depend on the server's timezone
const dayRange = (dateStr) => ({
  start: new Date(`${dateStr}T00:00:00.000Z`),
  end: new Date(`${dateStr}T23:59:59.999Z`),
})

const toRad = (v) => (v * Math.PI) / 180
const distanceMeters = (aLat, aLng, bLat, bLng) => {
  const R = 6371000
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const summarize = (visits) => ({
  totalVisits: visits.length,
  dealersVisited: new Set(visits.map((v) => String(v.Dealer_ID))).size,
  onboarded: visits.filter((v) => v.Outcome === 'Onboarded').length,
  interested: visits.filter((v) => v.Outcome === 'Interested').length,
  followUps: visits.filter((v) => v.Outcome === 'Follow-up').length,
  notInterested: visits.filter((v) => v.Outcome === 'Not Interested').length,
  notAvailable: visits.filter((v) => v.Outcome === 'Not Available').length,
  offSite: visits.filter((v) => v.On_Site === false).length,
})

// ---- Save a visit (Sales_Man / Admin) --------------------------------------

export const saveDealerVisit = async (req, res, next) => {
  try {
    const b = req.body
    const userId = req.user.id
    const userName = req.user.Name
    const userRole = req.user.Role

    // --- validation ---
    if (!mongoose.isValidObjectId(b.Dealer_ID)) {
      return res.status(400).send({ success: false, message: 'Invalid dealer' })
    }
    if (!VISIT_OUTCOMES.includes(b.Outcome)) {
      return res.status(400).send({ success: false, message: 'Invalid outcome' })
    }
    if (b.Outcome === 'Follow-up' && !DATE_RE.test(b.Follow_Up_Date || '')) {
      return res.status(400).send({ success: false, message: 'Follow-up date is required' })
    }
    if (b.Outcome === 'Not Interested' && !(b.Notes || '').trim()) {
      return res.status(400).send({ success: false, message: 'Reason is required' })
    }
    const lat = parseFloat(b.Latitude)
    const lng = parseFloat(b.Longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).send({ success: false, message: 'Location is required' })
    }

    // --- dealer lookup (also gives us the dealer's saved location) ---
    const dealer = await Dealer.findById(b.Dealer_ID).lean()
    if (!dealer) {
      return res.status(404).send({ success: false, message: 'Dealer not found' })
    }

    // A salesman may only log visits for dealers allocated to him
    // (same rule getdealersbysalesman uses: Employee_ID === the token's id)
    if (userRole === 'Sales_Man' && String(dealer.Employee_ID) !== String(userId)) {
      return res.status(403).send({ success: false, message: 'This dealer is not allocated to you' })
    }

    // --- on-site check, recomputed on the server when the dealer has a location ---
    let distance = b.Distance_From_Dealer !== '' && b.Distance_From_Dealer != null ? Number(b.Distance_From_Dealer) : undefined
    let onSite = b.On_Site === '' || b.On_Site == null ? undefined : b.On_Site === 'true'

    const dLat = parseFloat(dealer?.latitude)
    const dLng = parseFloat(dealer?.longitude)
    if (Number.isFinite(dLat) && Number.isFinite(dLng)) {
      distance = Math.round(distanceMeters(lat, lng, dLat, dLng))
      onSite = distance <= ON_SITE_RADIUS_M
    }

    // --- ignore accidental double-taps (same dealer + outcome within 60 seconds) ---
    const duplicate = await DealerVisit.findOne({
      Employee_ID: userId,
      Dealer_ID: b.Dealer_ID,
      Outcome: b.Outcome,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
    }).lean()
    if (duplicate) {
      return res.send({ success: true, message: 'Visit already saved', data: duplicate })
    }

    // --- optional photo ---
    let visitImage = ''
    if (req.file) {
      visitImage = await Saveimages(req.file, 'DealerVisits')
    }

    const saved = await new DealerVisit({
      Employee_ID: userId, // from the token, never from the request body
      Employee_Name: userName,
      Dealer_ID: b.Dealer_ID,
      Lead_ID: b.Lead_ID || dealer?.Lead_ID || '',
      Dealer_Name: b.Dealer_Name || dealer?.Business_Name || '',
      OMC: b.OMC || dealer?.OMC || '',
      Visit_Date: new Date(`${todayIST()}T00:00:00.000Z`), // server-side IST day
      Outcome: b.Outcome,
      Notes: (b.Notes || '').trim(),
      Follow_Up_Date: b.Outcome === 'Follow-up' ? b.Follow_Up_Date : '',
      GPS_Latitude: lat,
      GPS_Longitude: lng,
      Distance_From_Dealer: distance,
      On_Site: onSite,
      Visit_Image: visitImage,
    }).save()

    // Keep the dealer record in step with its latest visit (so the app can show "last visited" / follow-ups due).
    // Dealer.Status (Active/Inactive) is deliberately NOT touched — it means something else in your data.
    await Dealer.updateOne(
      { _id: b.Dealer_ID },
      {
        $set: {
          Last_Visit_Date: saved.createdAt,
          Last_Visit_Outcome: b.Outcome,
          Next_Follow_Up_Date: b.Outcome === 'Follow-up' ? b.Follow_Up_Date : '',
        },
      }
    )

    res.send({ success: true, message: 'Visit saved', data: saved })
  } catch (err) {
    console.error('Error saving dealer visit:', err)
    res.status(500).send({ success: false, message: 'Error saving dealer visit', error: err.message })
  }
}

// ---- Salesperson: own visits for a date ------------------------------------
// query: selectedDate=YYYY-MM-DD, first, rows, globalfilter

export const getSalespersonDealerVisits = async (req, res, next) => {
  try {
    const { first = 0, rows = 100, globalfilter = '', selectedDate } = req.query
    const userId = req.user?.id

    const date = selectedDate || todayIST()
    if (!DATE_RE.test(date)) {
      return res.status(400).send({ success: false, message: 'Invalid date' })
    }
    const { start, end } = dayRange(date)

    const filter = { Employee_ID: userId, Visit_Date: { $gte: start, $lte: end } }
    if (globalfilter.trim()) {
      const rx = { $regex: escapeRegex(globalfilter.trim()), $options: 'i' }
      filter.$or = [{ Dealer_Name: rx }, { Lead_ID: rx }, { Notes: rx }, { OMC: rx }]
    }

    const skip = Math.max(parseInt(first) || 0, 0)
    const limit = Math.min(Math.max(parseInt(rows) || 100, 1), 200)

    const [resdata, totallength] = await Promise.all([
      DealerVisit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      DealerVisit.countDocuments(filter),
    ])

    res.send({ success: true, resdata, totallength, userRole: req.user?.Role, filterDate: date })
  } catch (err) {
    console.error('Error fetching salesperson dealer visits:', err)
    res.status(500).send({ success: false, message: 'Failed to fetch dealer visits', error: err.message })
  }
}

// ---- Admin: every active salesman with their visits + counts ---------------
// query: selectedDate=YYYY-MM-DD   OR   startDate & endDate   (+ globalfilter, first, rows)
// Same shape as getAdminFieldupdates, so the admin screen can follow the same pattern.
// Salesmen with no visits come back with an empty `visits` array (so you can see who didn't visit).

export const getAdminDealerVisits = async (req, res, next) => {
  try {
    const userRole = req.user?.Role
    if (userRole === 'Sales_Man') {
      return res.status(403).send({ success: false, message: 'Access denied. Admin only.' })
    }

    const { startDate, endDate, selectedDate, globalfilter = '', first, rows } = req.query

    let from, to
    if (startDate && endDate) {
      if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
        return res.status(400).send({ success: false, message: 'Invalid date' })
      }
      from = dayRange(startDate).start
      to = dayRange(endDate).end
    } else {
      const date = selectedDate || todayIST()
      if (!DATE_RE.test(date)) {
        return res.status(400).send({ success: false, message: 'Invalid date' })
      }
      ;({ start: from, end: to } = dayRange(date))
    }

    const visits = await DealerVisit.find({ Visit_Date: { $gte: from, $lte: to } })
      .sort({ createdAt: -1 })
      .lean()

    const byEmployee = {}
    visits.forEach((v) => {
      const key = String(v.Employee_ID)
      if (!byEmployee[key]) byEmployee[key] = []
      byEmployee[key].push(v)
    })

    const employeeFilter = { Role: 'Sales_Man', Status: 'Active' }
    if (globalfilter) {
      const rx = { $regex: escapeRegex(globalfilter), $options: 'i' }
      employeeFilter.$or = [{ First_Name: rx }, { Last_Name: rx }, { Email: rx }, { Employee_ID: rx }]
    }

    const salesmen = await Employee.find(employeeFilter)
      .select('Image First_Name Last_Name Employee_ID Email Role')
      .sort({ First_Name: 1 })

    const combined = salesmen.map((emp) => {
      const empVisits = byEmployee[emp._id.toString()] || []
      return {
        employeeId: emp._id.toString(),
        employeeName: `${emp.First_Name || ''} ${emp.Last_Name || ''}`.trim(),
        employeeEmail: emp.Email || '',
        employeeData: emp,
        summary: summarize(empVisits),
        visits: empVisits,
      }
    })

    const totallength = combined.length
    const paged =
      first !== undefined && rows !== undefined
        ? combined.slice(parseInt(first) || 0, (parseInt(first) || 0) + (parseInt(rows) || 10))
        : combined

    res.send({
      success: true,
      resdata: paged,
      totallength,
      userRole,
      rangeStart: from.toISOString().split('T')[0],
      rangeEnd: to.toISOString().split('T')[0],
    })
  } catch (err) {
    console.error('Error fetching admin dealer visits:', err)
    res.status(500).send({ success: false, message: 'Failed to fetch dealer visits', error: err.message })
  }
}