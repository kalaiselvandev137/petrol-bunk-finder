import mongoose from 'mongoose'
import db from '../config/db.js'

export const VISIT_OUTCOMES = ['Onboarded', 'Interested', 'Follow-up', 'Not Interested', 'Not Available']

const DealerVisitSchema = mongoose.Schema({
    // Who visited / which dealer
    Employee_ID: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', required: true },
    Employee_Name: String,
    Dealer_ID: { type: mongoose.Schema.Types.ObjectId, required: true },
    Lead_ID: String,
    Dealer_Name: String,
    OMC: String,

    // When — stored as UTC midnight of the visit's IST calendar day (same Date type as Fieldupdate.Visit_Date)
    Visit_Date: { type: Date, required: true },

    // Result of the visit
    Outcome: { type: String, enum: VISIT_OUTCOMES, required: true },
    Notes: { type: String, default: '' },
    Follow_Up_Date: { type: String, default: '' }, // 'YYYY-MM-DD' or ''

    // Location proof
    GPS_Latitude: Number,
    GPS_Longitude: Number,
    Distance_From_Dealer: Number, // meters; undefined when the dealer has no saved location
    On_Site: Boolean,

    // Optional photo (relative path from Saveimages, e.g. uploads/DealerVisits/xxx.jpg)
    Visit_Image: { type: String, default: '' },
}, { timestamps: true })

DealerVisitSchema.index({ Employee_ID: 1, Visit_Date: 1, createdAt: -1 })
DealerVisitSchema.index({ Visit_Date: 1, Outcome: 1 })

const DealerVisit = db.model('dealervisits', DealerVisitSchema)
export { DealerVisit }