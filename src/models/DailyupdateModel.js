// import mongoose from 'mongoose'
// import db from "../config/db.js";

// const Dailyupdateschema = mongoose.Schema({
//   // Employee Information (from token)
//   Employee_ID: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'employees',
//     required: true
//   },
  
//   Employee_Name: {
//     type: String,
//     required: true
//   },
  
//   // Date of the plan
//   Date: {
//     type: Date,
//     required: true,
//     default: Date.now
//   },
  
//   // Work Plan Details
//   Work_Title: {
//     type: String,
//     required: true
//   },
  
//   Work_Description: {
//     type: String,
//     required: true
//   },
  
//   Work_Category: {
//     type: String,
//     required: true,
//     enum: ['Client Meeting', 'Sales Activity', 'Documentation', 'Follow-up', 'Training', 'Field Visit', 'Administrative', 'Other']
//   },
  
//   Hours_Worked: {
//     type: Number,
//     required: true,
//     min: 0,
//     max: 24
//   },
  
//   // Planning Fields
//   Achievements: {
//     type: String,
//     default: ''
//   },
  
//   Challenges: {
//     type: String,
//     default: ''
//   },
  
//   Next_Day_Plan: {
//     type: String,
//     default: ''
//   },
  
//   // Attachments
//   Image: {
//     type: Array,
//     default: []
//   },
  
//   // Status
//   Status: {
//     type: String,
//     default: 'Submitted',
//     enum: ['Submitted', 'In Review', 'Approved', 'Needs Clarification']
//   }
// }, { timestamps: true })

// // Indexes for faster queries
// Dailyupdateschema.index({ Date: -1, Employee_ID: 1 });
// Dailyupdateschema.index({ Employee_Name: 1, Date: -1 });

// const Dailyupdate = db.model('dailyupdates', Dailyupdateschema)
// export { Dailyupdate }


import mongoose from 'mongoose'
import db from "../config/db.js";

const Dailyupdateschema = mongoose.Schema({
  // Employee Information (from token)
  Employee_ID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employees',
    required: true
  },
  
  Employee_Name: {
    type: String,
    required: true
  },
  
  // Date of the work
  Date: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Work Type - Planned (Start of Day) or Actual (End of Day)
  Work_Type: {
    type: String,
    required: true,
    enum: ['Planned', 'Actual'],
    default: 'Planned'
  },
  
  // Common Fields
  Work_Title: {
    type: String,
    required: true
  },
  
  Work_Description: {
    type: String,
    required: true
  },
  
  Work_Category: {
    type: String,
    required: true,
    enum: ['Client Meeting', 'Sales Activity', 'Documentation', 'Follow-up', 'Training', 'Field Visit', 'Administrative', 'Other']
  },
  
  Hours_Worked: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  
  // Planned Work Fields (Start of Day)
  Planned_Goals: {
    type: String,
    default: ''
  },
  
  Expected_Challenges: {
    type: String,
    default: ''
  },
  
  Key_Tasks: {
    type: String,
    default: ''
  },
  
  // Actual Work Fields (End of Day)
  Achievements: {
    type: String,
    default: ''
  },
  
  Challenges: {
    type: String,
    default: ''
  },
  
  Tasks_Completed: {
    type: String,
    default: ''
  },
  
  Pending_Tasks: {
    type: String,
    default: ''
  },
  
  Next_Day_Plan: {
    type: String,
    default: ''
  },
  
  Client_Name: {
    type: String,
    default: ''
  },
  
  Location_Visited: {
    type: String,
    default: ''
  },
  
  // Attachments
  Image: {
    type: Array,
    default: []
  },
  
  // Status
  Status: {
    type: String,
    default: 'Submitted',
    enum: ['Submitted', 'In Review', 'Approved', 'Needs Clarification']
  }
}, { timestamps: true })

// Indexes for faster queries
Dailyupdateschema.index({ Date: -1, Employee_ID: 1 });
Dailyupdateschema.index({ Employee_Name: 1, Date: -1 });
Dailyupdateschema.index({ Work_Type: 1, Date: -1 });
Dailyupdateschema.index({ Employee_ID: 1, Work_Type: 1, Date: -1 });

const Dailyupdate = db.model('dailyupdates', Dailyupdateschema)
export { Dailyupdate }