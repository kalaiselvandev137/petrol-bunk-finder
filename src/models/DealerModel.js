import mongoose from 'mongoose'
import db from "../config/db.js";

const Dealerschema = mongoose.Schema({
  Lead_ID: String,
  Business_Name: String,
  OMC: String,
  Primary_Mobile: String,
  Current_Address_Line: String,
  Current_Address_Locality: String,
  Current_Address_State: String,
  District: String,
  Approved_Line_Amount: String,
  Active_Line_Amount: String,
  Line_Activation_Date: String,
  Employee_ID: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  Employee_Name: { type: String },
  Status: { type: String, default: 'Active' },

  // NEW — dealer location (used by the Navigate button and the on-site check for visits)
  latitude: Number,
  longitude: Number,
  Location_Updated_At: Date,

  // NEW — kept up to date by every dealer visit (lets the app show "last visited" / follow-ups due)
  Last_Visit_Date: Date,
  Last_Visit_Outcome: String,
  Next_Follow_Up_Date: String // 'YYYY-MM-DD' or ''
}, { timestamps: true })

const Dealer = db.model('dealers', Dealerschema)
export { Dealer }