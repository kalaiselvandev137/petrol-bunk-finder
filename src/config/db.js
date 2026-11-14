import mongoose from "mongoose";

// @ becomes %40, $ becomes %24
// const connectionString = "mongodb://Petromoney:Petro%40%24_2025@127.0.0.1:27017/EmployeeWorktrack?authSource=admin";
const connectionString = "mongodb://127.0.0.1:27017/EmployeeWorktrack";

console.log("Connecting to MongoDB..."); // Debug log

const db = mongoose.createConnection(connectionString);

db.once('open', () => console.log("Database successfully connected"));
db.on('error', (err) => console.log(`Database not connected: ${err.message}`));

export default db;