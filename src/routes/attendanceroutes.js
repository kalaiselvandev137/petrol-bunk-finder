// import express from 'express';
// import multer from 'multer';
// import authMiddleware from '../middleware/authMiddleware.js';

// import { getAttendanceByDate, getAttendanceByEmployee, getMonthlyReport,  markAttendance, bulkMarkAttendance, deleteAttendance, getAttendanceStats, getEmployeeAttendanceHistory
// } from '../controllers/AttendanceController.js';

// const attendanceRouter = express.Router();

// // Mark or update attendance (single employee)
// attendanceRouter.post('/apimarkattendance', authMiddleware(['Admin', 'Sales_Man']), markAttendance);

// // Get attendance by date (using query params)
// attendanceRouter.get('/apigetattendancebydate', authMiddleware(['Admin', 'Sales_Man']), getAttendanceByDate);

// // Get attendance by employee (using query params)
// attendanceRouter.get('/apigetattendancebyemployee', authMiddleware(['Admin', 'Sales_Man']), getAttendanceByEmployee);

// // Get monthly report (using query params)
// attendanceRouter.get('/apigetattendancemonthlyreport', authMiddleware(['Admin', 'Sales_Man']), getMonthlyReport);

// // Bulk mark attendance (optional)
// attendanceRouter.post('/apibulkmarkattendance', authMiddleware(['Admin', 'Sales_Man']), bulkMarkAttendance);

// // Delete attendance record (using query params)
// attendanceRouter.delete('/apideleteattendance', authMiddleware(['Admin', 'Sales_Man']), deleteAttendance);

// // Get attendance statistics (using query params)
// attendanceRouter.get('/apigetattendancestats', authMiddleware(['Admin', 'Sales_Man']), getAttendanceStats);

// attendanceRouter.get('/apigetemployeeattendancehistory', authMiddleware(['Admin', 'Sales_Man']), getEmployeeAttendanceHistory);

// export default attendanceRouter;

import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware.js';

import { 
  getAttendanceByDate, 
  getAttendanceByEmployee, 
  getMonthlyReport,  
  markAttendance, 
  bulkMarkAttendance, 
  deleteAttendance, 
  getAttendanceStats, 
  getEmployeeAttendanceHistory,
  getFilteredReportData
} from '../controllers/AttendanceController.js';
import { checkIn, checkOut, getMyAttendanceToday } from '../controllers/AttendanceSelfController.js';

const storage = multer.memoryStorage()
const upload = multer({ storage })
const attendanceRouter = express.Router();

// Mark or update attendance (single employee)
attendanceRouter.post('/apimarkattendance', authMiddleware(['Admin', 'Sales_Man']), markAttendance);

// Get attendance by date (using query params)
attendanceRouter.get('/apigetattendancebydate', authMiddleware(['Admin', 'Sales_Man']), getAttendanceByDate);

// Get attendance by employee (using query params)
attendanceRouter.get('/apigetattendancebyemployee', authMiddleware(['Admin', 'Sales_Man']), getAttendanceByEmployee);

// Get monthly report (using query params)
attendanceRouter.get('/apigetattendancemonthlyreport', authMiddleware(['Admin', 'Sales_Man']), getMonthlyReport);

// Bulk mark attendance (optional)
attendanceRouter.post('/apibulkmarkattendance', authMiddleware(['Admin', 'Sales_Man']), bulkMarkAttendance);

// Delete attendance record (using query params)
attendanceRouter.delete('/apideleteattendance', authMiddleware(['Admin', 'Sales_Man']), deleteAttendance);

// Get attendance statistics (using query params)
attendanceRouter.get('/apigetattendancestats', authMiddleware(['Admin', 'Sales_Man']), getAttendanceStats);

// Get employee attendance history
attendanceRouter.get('/apigetemployeeattendancehistory', authMiddleware(['Admin', 'Sales_Man']), getEmployeeAttendanceHistory);

// NEW: Get filtered report data for export
attendanceRouter.get('/apigetfilteredreport', authMiddleware(['Admin', 'Sales_Man']), getFilteredReportData);

attendanceRouter.post('/apicheckin', authMiddleware(['Admin', 'Sales_Man']),upload.single('selfie'), checkIn);
attendanceRouter.post('/apicheckout', authMiddleware(['Admin', 'Sales_Man']), checkOut);
attendanceRouter.get('/apigetmyattendancetoday', authMiddleware(['Admin', 'Sales_Man']), getMyAttendanceToday);

export default attendanceRouter;