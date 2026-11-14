import mongoose from 'mongoose'
import db from "../config/db.js";

const Employeeschema = mongoose.Schema({
  Image:Array,
  face_verify_reference_image: Array,
  First_Name: String,
  Last_Name: String,
  Email: String,
  Password: String,
  Mobilenumber: String,
  Address: String,
  Role: { type: String, default: 'Sales_Man' },
  Status: { type: String, default: 'Inactive' }
}, { timestamps: true })

const Employee = db.model('employees', Employeeschema)
export { Employee }
