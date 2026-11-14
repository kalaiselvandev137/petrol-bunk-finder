import mongoose from 'mongoose';
import db from '../config/db.js';

const DPDCollectionSchema = mongoose.Schema({
  Employee_ID: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  Employee_Name: String,
  Date: Date,
  Upload_Method: String,
  Entries: Array,
  Status: { type: String, default: 'Pending' }
}, { timestamps: true });

const DPDCollection = db.model('dpdcollections', DPDCollectionSchema);

export { DPDCollection };