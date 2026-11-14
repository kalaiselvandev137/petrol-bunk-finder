// import mongoose from 'mongoose'
// import db from "../config/db.js";

// const Fieldupdateschema = mongoose.Schema({
//     Employee_ID: { type: mongoose.Schema.Types.ObjectId,ref: 'employees',},
//     Employee_Name:  String,
//     Visit_Date:  Date,
//     // Location Details (Updated with new fields)
//     Country_ID:String,
//     Country_Name:String,
//     State_ID: String,
//     State_Name:String,
//     City_ID:String,
//     City_Name:String,
//     Region: String,
//     Pincode:  String,
//     Complete_Address:String,
//     Bunk_Name: String,
//     Oil_Company:String,
//     Dealer_Name: String,
//     Dealer_Contact:String,
//     // Visit Notes
//     Visit_Notes:  String,
//     // Visit Verification
//     Visit_Image: String,
//     Status: { 
//       type: String, 
//       default: 'Submitted',
//       enum: ['Submitted', 'In Review', 'Approved', 'Needs Clarification']
//     }
// }, { timestamps: true })

// const Fieldupdate = db.model('fieldupdates', Fieldupdateschema)
// export { Fieldupdate }


import mongoose from 'mongoose'
import db from "../config/db.js";

const Fieldupdateschema = mongoose.Schema({
    Employee_ID: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
    Employee_Name: String,
    Visit_Date: Date,
    
    // Location Details
    Country_ID: String,
    Country_Name: String,
    State_ID: String,
    State_Name: String,
    City_ID: String,
    City_Name: String,
    District_Name: String,
    Region: String,
    Pincode: String,
    Complete_Address: String,
    
    // GPS Coordinates (NEW - Add these fields)
    GPS_Latitude: Number,
    GPS_Longitude: Number,
    GPS_Accuracy: Number,
    GPS_Timestamp: String,
    Location_Verified: Boolean,
    Detected_City: String,
    Detected_State: String,
    
    // Petrol Bunk Details
    Bunk_Name: String,
    Oil_Company: String,
    
    // Dealer Information
    Dealer_Name: String,
    Dealer_Contact: String,
    
    // Visit Notes
    Visit_Notes: String,
    Purpose_of_Visit: String,
    
    // Visit Verification
    Visit_Image: String,
    faceVerified: { type: Boolean, default: false },
    faceSimilarity: Number,
    
    Status: { 
      type: String, 
      default: 'Submitted',
      enum: ['Submitted', 'In Review', 'Approved', 'Needs Clarification']
    }
}, { timestamps: true })

const Fieldupdate = db.model('fieldupdates', Fieldupdateschema)
export { Fieldupdate }