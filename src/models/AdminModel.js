import mongoose from "mongoose";
import db from "../config/db.js";

const AdminSchema = new mongoose.Schema({
    User_Name: { type: String},
    Email: { type: String},
    Password: { type: String},
    Role: { type: String ,default:"Admin"},
    Status: { type: String, default: "Active" }
});
const Admin = db.model('admins', AdminSchema);
export default Admin;
