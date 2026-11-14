import mongoose from 'mongoose'
import { Dealer } from '../models/DealerModel.js'
import { DealerVisit } from '../models/DealerVisitModel.js'


const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

// Same convention as saveDealerVisit: Visit_Date is UTC midnight of the IST day
const dayRange = (dateStr) => ({
  start: new Date(`${dateStr}T00:00:00.000Z`),
  end: new Date(`${dateStr}T23:59:59.999Z`),
})

// ---- Admin: one salesman's visits for a day, shaped for map markers --------
// GET /apigetvisitmarkers?employeeId=<id>&selectedDate=YYYY-MM-DD
// Each marker is placed at the DEALER's saved location. If the dealer has no
// saved location it falls back to where the salesman actually logged the visit.

export const getVisitMarkers = async (req, res) => {
  try {
    if (req.user?.Role === 'Sales_Man') {
      return res.status(403).send({ success: false, message: 'Access denied. Admin only.' })
    }

    const { employeeId } = req.query
    const date = req.query.selectedDate || todayIST()

    if (!mongoose.isValidObjectId(employeeId)) {
      return res.status(400).send({ success: false, message: 'Invalid employee' })
    }
    if (!DATE_RE.test(date)) {
      return res.status(400).send({ success: false, message: 'Invalid date' })
    }
    const { start, end } = dayRange(date)

    const visits = await DealerVisit.find({
      Employee_ID: employeeId,
      Visit_Date: { $gte: start, $lte: end },
    })
      .sort({ createdAt: 1 }) // oldest first so the map numbers follow the day's route
      .lean()

    const dealerIds = [...new Set(visits.map((v) => String(v.Dealer_ID)))]
    const dealers = await Dealer.find({ _id: { $in: dealerIds } })
      .select('Business_Name Lead_ID latitude longitude Current_Address_Locality')
      .lean()
    const dealerById = new Map(dealers.map((d) => [String(d._id), d]))

    const markers = visits
      .map((v, i) => {
        const d = dealerById.get(String(v.Dealer_ID))
        const dLat = parseFloat(d?.latitude)
        const dLng = parseFloat(d?.longitude)
        const hasDealerLoc = Number.isFinite(dLat) && Number.isFinite(dLng)

        const latitude = hasDealerLoc ? dLat : v.GPS_Latitude
        const longitude = hasDealerLoc ? dLng : v.GPS_Longitude
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

        return {
          seq: i + 1,
          visitId: String(v._id),
          dealerId: String(v.Dealer_ID),
          dealerName: v.Dealer_Name || d?.Business_Name || '',
          leadId: v.Lead_ID || d?.Lead_ID || '',
          omc: v.OMC || '',
          locality: d?.Current_Address_Locality || '',
          outcome: v.Outcome,
          notes: v.Notes || '',
          followUpDate: v.Follow_Up_Date || '',
          visitedAt: v.createdAt,
          latitude,
          longitude,
          source: hasDealerLoc ? 'dealer' : 'visit', // where the pin came from
          visitLatitude: v.GPS_Latitude ?? null,    // where the salesman actually was
          visitLongitude: v.GPS_Longitude ?? null,
          onSite: v.On_Site ?? null,
          distanceFromDealer: v.Distance_From_Dealer ?? null,
          image: v.Visit_Image || '',
        }
      })
      .filter(Boolean)

    res.send({ success: true, date, markers, totallength: markers.length })
  } catch (err) {
    console.error('Error fetching visit markers:', err)
    res.status(500).send({ success: false, message: 'Failed to fetch visit markers', error: err.message })
  }
}
