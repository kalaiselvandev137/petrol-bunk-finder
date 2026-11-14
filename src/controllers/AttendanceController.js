// import mongoose from 'mongoose';
// import { Attendance } from '../models/AttendanceModel.js';
// import { Employee } from '../models/EmployeeModel.js';

// // Mark or Update attendance
// export const markAttendance = async (req, res) => {
//   try {
//     const { employeeId, date, status, markedAt, notes } = req.body;

//     // Validate required fields
//     if (!employeeId || !date || !status) {
//       return res.status(400).send({ 
//         error: 'Missing required fields: employeeId, date, and status are required' 
//       });
//     }

//     // Check if attendance already exists for this employee and date
//     let attendance = await Attendance.findOne({ employeeId, date });

//     if (attendance) {
//       // Update existing record
//       attendance.status = status;
//       attendance.markedAt = markedAt || new Date();
//       if (notes) attendance.notes = notes;
//       await attendance.save();
//     } else {
//       // Create new record
//       attendance = await Attendance.create({
//         employeeId,
//         date,
//         status,
//         markedAt: markedAt || new Date(),
//         notes: notes || ''
//       });
//     }

//     res.send(attendance);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ error: 'Failed to mark attendance' });
//   }
// };

// // Get attendance by date
// // export const getAttendanceByDate = async (req, res) => {
// //   try {
// //     const { date } = req.query;

// //     if (!date) {
// //       return res.status(400).send({ error: 'Date parameter is required' });
// //     }

// //     const attendance = await Attendance.find({ date })
// //       .populate('employeeId', 'First_Name Last_Name Email Employee_ID Role Department Image');
    
// //     res.send(attendance);
// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).send({ error: 'Failed to fetch attendance' });
// //   }
// // };

// // export const getAttendanceByDate = async (req, res) => {
// //   try {
// //     const { selectedDate, first, rows , globalfilter = '', filterStatus = 'all' } = req.query;

// //     if (!selectedDate) {
// //       return res.status(400).send({ error: 'Date parameter is required' });
// //     }

// //     // Parse first and rows as integers
// //     const skip = parseInt(first);
// //     const limit = parseInt(rows);

// //     // Build the base query for the date
// //     let attendanceQuery = { date: selectedDate };

// //     // Add status filter if provided
// //     if (filterStatus && filterStatus !== 'all') {
// //       if (filterStatus === 'leave') {
// //         attendanceQuery.status = { $regex: '^leave', $options: 'i' };
// //       } else {
// //         attendanceQuery.status = filterStatus;
// //       }
// //     }

// //     let resdata = [];
// //     let totallength = 0;

// //     if (filterStatus === 'not-marked') {
// //       // Handle "not-marked" filter - find employees without attendance
      
// //       // Get all employees who have attendance marked for this date
// //       const markedAttendance = await Attendance.find({ date: selectedDate });
// //       const markedEmployeeIds = markedAttendance.map(record => record.employeeId?.toString()).filter(Boolean);

// //       // Build employee filter for those NOT marked
// //       let employeeFilter = {
// //         _id: { $nin: markedEmployeeIds }
// //       };

// //       // Add global search filter if provided
// //       if (globalfilter) {
// //         const searchRegex = { $regex: globalfilter, $options: 'i' };
// //         employeeFilter.$or = [
// //           { First_Name: searchRegex },
// //           { Last_Name: searchRegex },
// //           { Email: searchRegex },
// //           { Employee_ID: searchRegex },
// //           { Role: searchRegex }
// //         ];
// //       }

// //       // Get total count of not-marked employees
// //       totallength = await Employee.countDocuments(employeeFilter);

// //       // Get paginated not-marked employees
// //       const notMarkedEmployees = await Employee.find(employeeFilter)
// //         .skip(skip)
// //         .limit(limit);

// //       // Format response with null attendance data
// //       resdata = notMarkedEmployees.map(emp => ({
// //         _id: null,
// //         employeeId: emp,
// //         date: selectedDate,
// //         status: null,
// //         markedAt: null
// //       }));

// //     } else {
// //       // Handle all other filters (all, present, absent, half-day, leave)
      
// //       // Get attendance records with populated employee data
// //       const attendanceRecords = await Attendance.find(attendanceQuery)
// //         .populate({
// //           path: 'employeeId',
// //           select: 'First_Name Last_Name Email Employee_ID Role Department Image'
// //         });

// //       // Filter by employee search if globalfilter is provided
// //       let filteredAttendance = attendanceRecords;

// //       if (globalfilter) {
// //         const searchLower = globalfilter.toLowerCase();
// //         filteredAttendance = attendanceRecords.filter(record => {
// //           if (!record.employeeId) return false;
          
// //           const emp = record.employeeId;
// //           return (
// //             emp.First_Name?.toLowerCase().includes(searchLower) ||
// //             emp.Last_Name?.toLowerCase().includes(searchLower) ||
// //             emp.Email?.toLowerCase().includes(searchLower) ||
// //             emp.Employee_ID?.toLowerCase().includes(searchLower) ||
// //             emp.Role?.toLowerCase().includes(searchLower)
// //           );
// //         });
// //       }

// //       // Get total length after filtering
// //       totallength = filteredAttendance.length;

// //       // Apply pagination
// //       resdata = filteredAttendance.slice(skip, skip + limit);
// //     }

// //     // Return data in the same format as employee API
// //     res.send({ 
// //       resdata, 
// //       totallength 
// //     });

// //   } catch (error) {
// //     console.error('Error in getAttendanceByDate:', error);
// //     res.status(500).send({ error: 'Failed to fetch attendance' });
// //   }
// // };



// export const getAttendanceByDate = async (req, res) => {
//   try {
//     const { selectedDate, first , rows , globalfilter = '', filterStatus = 'all' } = req.query;
//     if (!selectedDate) { return res.send({ error: 'Date parameter is required' });}
//     const skip = parseInt(first);
//     const limit = parseInt(rows);
//     // Fetch attendance records for the selected date
//     const attendanceRecords = await Attendance.find({ date: selectedDate }).populate({path: 'employeeId',select: 'First_Name Last_Name Email Employee_ID Role Department Image'});
//     // Create a map of attendance by employee ID for quick lookup
//     const attendanceMap = {};
//     attendanceRecords.forEach(record => {
//       if (record.employeeId?._id) {attendanceMap[record.employeeId._id.toString()] = record;}
//     });
//     // Build employee search filter
//     let employeeFilter = {};
//     if (globalfilter) {
//       const searchRegex = { $regex: globalfilter, $options: 'i' };
//       employeeFilter.$or = [ { First_Name: searchRegex }, { Last_Name: searchRegex }, { Email: searchRegex }, { Employee_ID: searchRegex }, { Role: searchRegex } ];
//     }
//     // Get all employees matching the search
//     const allEmployees = await Employee.find(employeeFilter)
//     // Combine employees with their attendance status
//     let combinedData = allEmployees.map(emp => {
//       const attendance = attendanceMap[emp._id.toString()];
//       return {
//         _id: attendance?._id || null,
//         employeeId: emp,
//         date: selectedDate,
//         status: attendance?.status || null,
//         markedAt: attendance?.markedAt || null
//       };
//     });

//     // Apply status filter
//     if (filterStatus && filterStatus !== 'all') {
//       combinedData = combinedData.filter(record => {
//         if (filterStatus === 'not-marked') {
//           return !record.status;
//         } else if (filterStatus === 'leave') {
//           return record.status === 'leave' || record.status?.startsWith('leave-');
//         } else {
//           return record.status === filterStatus;
//         }
//       });
//     }
//     // Get total length after filtering
//     const totallength = combinedData.length;
//     // Apply pagination
//     const resdata = combinedData.slice(skip, skip + limit);

//     // Return data
//     res.send({ resdata, totallength  });

//   } catch (error) {
//     console.error('Error in getAttendanceByDate:', error);
//     res.status(500).send({ error: 'Failed to fetch attendance' });
//   }
// };

// // Get attendance by employee and date range
// export const getAttendanceByEmployee = async (req, res) => {
//   try {
//     const { employeeId, startDate, endDate } = req.query;

//     if (!employeeId) {
//       return res.status(400).send({ error: 'Employee ID is required' });
//     }

//     const query = { employeeId };
    
//     if (startDate && endDate) {
//       query.date = { $gte: startDate, $lte: endDate };
//     } else if (startDate) {
//       query.date = { $gte: startDate };
//     } else if (endDate) {
//       query.date = { $lte: endDate };
//     }

//     const attendance = await Attendance.find(query).sort({ date: -1 });
//     res.send(attendance);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ error: 'Failed to fetch attendance' });
//   }
// };

// // Add this new controller function
// export const getEmployeeAttendanceHistory = async (req, res) => {
//   try {
//     const { employeeId, startDate, endDate } = req.query;

//     if (!employeeId) {
//       return res.status(400).send({ error: 'Employee ID is required' });
//     }

//     // Build query
//     let query = { employeeId };

//     // Add date range if provided
//     if (startDate && endDate) {
//       query.date = {
//         $gte: startDate,
//         $lte: endDate
//       };
//     }

//     // Fetch attendance records
//     const attendanceRecords = await Attendance.find(query)
//       .populate({
//         path: 'employeeId',
//         select: 'First_Name Last_Name Email Employee_ID Role Department Image'
//       })
//       .sort({ date: -1 }); // Most recent first

//     // Calculate statistics
//     const stats = {
//       total: attendanceRecords.length,
//       present: attendanceRecords.filter(r => r.status === 'present').length,
//       absent: attendanceRecords.filter(r => r.status === 'absent').length,
//       halfDay: attendanceRecords.filter(r => r.status === 'half-day').length,
//       leave: attendanceRecords.filter(r => r.status === 'leave').length,
//       lop: attendanceRecords.filter(r => r.status === 'leave-lop').length,
//       sickLeave: attendanceRecords.filter(r => r.status === 'leave-sick').length,
//       casualLeave: attendanceRecords.filter(r => r.status === 'leave-casual').length,
//     };

//     res.send({
//       employee: attendanceRecords[0]?.employeeId || null,
//       records: attendanceRecords,
//       stats
//     });

//   } catch (error) {
//     console.error('Error fetching employee attendance history:', error);
//     res.status(500).send({ error: 'Failed to fetch attendance history' });
//   }
// };

// // Get monthly attendance report
// export const getMonthlyReport = async (req, res) => {
//   try {
//     const { year, month } = req.query;

//     if (!year || !month) {
//       return res.status(400).send({ error: 'Year and month are required' });
//     }

//     const startDate = `${year}-${month.padStart(2, '0')}-01`;
//     const lastDay = new Date(year, parseInt(month), 0).getDate();
//     const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;

//     const attendance = await Attendance.find({
//       date: { $gte: startDate, $lte: endDate }
//     }).populate('employeeId', 'First_Name Last_Name Employee_ID');

//     // Group by employee
//     const report = {};
//     attendance.forEach(record => {
//       const empId = record.employeeId._id.toString();
      
//       if (!report[empId]) {
//         report[empId] = {
//           employeeId: empId,
//           employeeName: `${record.employeeId.First_Name} ${record.employeeId.Last_Name}`,
//           employeeCode: record.employeeId.Employee_ID,
//           present: 0,
//           absent: 0,
//           halfDay: 0,
//           leave: 0,
//           lop: 0,
//           sickLeave: 0,
//           casualLeave: 0,
//           totalDays: 0
//         };
//       }

//       report[empId].totalDays++;

//       // Handle different status types
//       if (record.status === 'present') {
//         report[empId].present++;
//       } else if (record.status === 'absent') {
//         report[empId].absent++;
//       } else if (record.status === 'half-day') {
//         report[empId].halfDay++;
//       } else if (record.status === 'leave' || record.status.startsWith('leave-')) {
//         report[empId].leave++;
        
//         // Count specific leave types
//         if (record.status === 'leave-lop') {
//           report[empId].lop++;
//         } else if (record.status === 'leave-sick') {
//           report[empId].sickLeave++;
//         } else if (record.status === 'leave-casual') {
//           report[empId].casualLeave++;
//         }
//       }
//     });

//     res.send(report);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ error: 'Failed to generate report' });
//   }
// };

// // Bulk mark attendance
// export const bulkMarkAttendance = async (req, res) => {
//   try {
//     const { attendanceRecords } = req.body;

//     if (!attendanceRecords || !Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
//       return res.status(400).send({ error: 'attendanceRecords array is required' });
//     }

//     const results = {
//       success: [],
//       failed: []
//     };

//     for (const record of attendanceRecords) {
//       try {
//         const { employeeId, date, status, markedAt, notes } = record;

//         if (!employeeId || !date || !status) {
//           results.failed.push({
//             employeeId,
//             error: 'Missing required fields'
//           });
//           continue;
//         }

//         // Check if attendance exists
//         let attendance = await Attendance.findOne({ employeeId, date });

//         if (attendance) {
//           attendance.status = status;
//           attendance.markedAt = markedAt || new Date();
//           if (notes) attendance.notes = notes;
//           await attendance.save();
//         } else {
//           attendance = await Attendance.create({
//             employeeId,
//             date,
//             status,
//             markedAt: markedAt || new Date(),
//             notes: notes || ''
//           });
//         }

//         results.success.push({
//           employeeId,
//           status: 'saved'
//         });
//       } catch (error) {
//         results.failed.push({
//           employeeId: record.employeeId,
//           error: error.message
//         });
//       }
//     }

//     res.send({
//       message: 'Bulk attendance processing completed',
//       results
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ 
//       error: 'Failed to process bulk attendance'
//     });
//   }
// };

// // Delete attendance record
// export const deleteAttendance = async (req, res) => {
//   try {
//     const { id } = req.query;

//     if (!id) {
//       return res.status(400).send({ error: 'Attendance ID is required' });
//     }

//     const attendance = await Attendance.findByIdAndDelete(id);

//     if (!attendance) {
//       return res.status(404).send({ error: 'Attendance record not found' });
//     }

//     res.send({
//       message: 'Attendance deleted successfully',
//       data: attendance
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ error: 'Failed to delete attendance' });
//   }
// };

// // Get attendance statistics
// export const getAttendanceStats = async (req, res) => {
//   try {
//     const { date } = req.query;
//     const targetDate = date || new Date().toISOString().split('T')[0];

//     const attendance = await Attendance.find({ date: targetDate });
//     const totalEmployees = await Employee.countDocuments();

//     const stats = {
//       date: targetDate,
//       total: totalEmployees,
//       present: 0,
//       absent: 0,
//       halfDay: 0,
//       leave: 0,
//       lop: 0,
//       sickLeave: 0,
//       casualLeave: 0,
//       notMarked: totalEmployees - attendance.length
//     };

//     attendance.forEach(record => {
//       if (record.status === 'present') {
//         stats.present++;
//       } else if (record.status === 'absent') {
//         stats.absent++;
//       } else if (record.status === 'half-day') {
//         stats.halfDay++;
//       } else if (record.status === 'leave' || record.status.startsWith('leave-')) {
//         stats.leave++;
//         if (record.status === 'leave-lop') stats.lop++;
//         else if (record.status === 'leave-sick') stats.sickLeave++;
//         else if (record.status === 'leave-casual') stats.casualLeave++;
//       }
//     });

//     res.send(stats);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ error: 'Failed to fetch statistics' });
//   }
// };

import mongoose from 'mongoose';
import { Attendance } from '../models/AttendanceModel.js';
import { Employee } from '../models/EmployeeModel.js';

// Mark or Update attendance
export const markAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, markedAt, notes } = req.body;

    if (!employeeId || !date || !status) {
      return res.status(400).send({ 
        error: 'Missing required fields: employeeId, date, and status are required' 
      });
    }

    let attendance = await Attendance.findOne({ employeeId, date });

    if (attendance) {
      attendance.status = status;
      attendance.markedAt = markedAt || new Date();
      if (notes) attendance.notes = notes;
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        employeeId,
        date,
        status,
        markedAt: markedAt || new Date(),
        notes: notes || ''
      });
    }

    res.send(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to mark attendance' });
  }
};

export const getAttendanceByDate = async (req, res) => {
  try {
    const { selectedDate, first , rows , globalfilter = '', filterStatus = 'all' } = req.query;
    if (!selectedDate) { return res.send({ error: 'Date parameter is required' });}
    const skip = parseInt(first);
    const limit = parseInt(rows);
    
    const attendanceRecords = await Attendance.find({ date: selectedDate }).populate({path: 'employeeId',select: 'First_Name Last_Name Email Employee_ID Role Department Image'});
    
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      if (record.employeeId?._id) {attendanceMap[record.employeeId._id.toString()] = record;}
    });
    
    let employeeFilter = {};
    if (globalfilter) {
      const searchRegex = { $regex: globalfilter, $options: 'i' };
      employeeFilter.$or = [ { First_Name: searchRegex }, { Last_Name: searchRegex }, { Email: searchRegex }, { Employee_ID: searchRegex }, { Role: searchRegex } ];
    }
    
    const allEmployees = await Employee.find({...employeeFilter,  Status: 'Active'})
    
    let combinedData = allEmployees.map(emp => {
      const attendance = attendanceMap[emp._id.toString()];
      return {
        _id: attendance?._id || null,
        employeeId: emp,
        date: selectedDate,
        status: attendance?.status || null,
        markedAt: attendance?.markedAt || null,
        checkInAt: attendance?.checkInAt || null,
        checkOutAt: attendance?.checkOutAt || null,
      };
    });

    if (filterStatus && filterStatus !== 'all') {
      combinedData = combinedData.filter(record => {
        if (filterStatus === 'not-marked') {
          return !record.status;
        } else if (filterStatus === 'leave') {
          return record.status === 'leave' || record.status?.startsWith('leave-');
        } else {
          return record.status === filterStatus;
        }
      });
    }
    
    const totallength = combinedData.length;
    const resdata = combinedData.slice(skip, skip + limit);

    res.send({ resdata, totallength  });

  } catch (error) {
    console.error('Error in getAttendanceByDate:', error);
    res.status(500).send({ error: 'Failed to fetch attendance' });
  }
};

export const getAttendanceByEmployee = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    if (!employeeId) {
      return res.status(400).send({ error: 'Employee ID is required' });
    }

    const query = { employeeId };
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    const attendance = await Attendance.find(query).sort({ date: -1 });
    res.send(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to fetch attendance' });
  }
};

export const getEmployeeAttendanceHistory = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    if (!employeeId) {
      return res.status(400).send({ error: 'Employee ID is required' });
    }

    let query = { employeeId };

    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const attendanceRecords = await Attendance.find(query)
      .populate({
        path: 'employeeId',
        select: 'First_Name Last_Name Email Employee_ID Role Department Image'
      })
      .sort({ date: -1 });

    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(r => r.status === 'present').length,
      absent: attendanceRecords.filter(r => r.status === 'absent').length,
      halfDay: attendanceRecords.filter(r => r.status === 'half-day').length,
      leave: attendanceRecords.filter(r => r.status === 'leave').length,
      lop: attendanceRecords.filter(r => r.status === 'leave-lop').length,
      sickLeave: attendanceRecords.filter(r => r.status === 'leave-sick').length,
      casualLeave: attendanceRecords.filter(r => r.status === 'leave-casual').length,
    };

    res.send({
      employee: attendanceRecords[0]?.employeeId || null,
      records: attendanceRecords,
      stats
    });

  } catch (error) {
    console.error('Error fetching employee attendance history:', error);
    res.status(500).send({ error: 'Failed to fetch attendance history' });
  }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).send({ error: 'Year and month are required' });
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const lastDay = new Date(year, parseInt(month), 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;

    const attendance = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('employeeId', 'First_Name Last_Name Employee_ID Role Department');

    const report = {};
    attendance.forEach(record => {
      const empId = record.employeeId._id.toString();
      
      if (!report[empId]) {
        report[empId] = {
          employeeId: empId,
          employeeName: `${record.employeeId.First_Name} ${record.employeeId.Last_Name}`,
          employeeCode: record.employeeId.Employee_ID,
          role: record.employeeId.Role,
          department: record.employeeId.Department,
          present: 0,
          absent: 0,
          halfDay: 0,
          leave: 0,
          lop: 0,
          sickLeave: 0,
          casualLeave: 0,
          totalDays: 0
        };
      }

      report[empId].totalDays++;

      if (record.status === 'present') {
        report[empId].present++;
      } else if (record.status === 'absent') {
        report[empId].absent++;
      } else if (record.status === 'half-day') {
        report[empId].halfDay++;
      } else if (record.status === 'leave' || record.status.startsWith('leave-')) {
        report[empId].leave++;
        
        if (record.status === 'leave-lop') {
          report[empId].lop++;
        } else if (record.status === 'leave-sick') {
          report[empId].sickLeave++;
        } else if (record.status === 'leave-casual') {
          report[empId].casualLeave++;
        }
      }
    });

    res.send(report);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to generate report' });
  }
};

// NEW: Enhanced Report Export with Multiple Filters
export const getFilteredReportData = async (req, res) => {
  try {
    const { 
      reportType, // 'daily', 'monthly', 'employee', 'date-range'
      startDate, 
      endDate,
      selectedDate,
      year,
      month,
      employeeId,
      filterStatus, // 'all', 'present', 'absent', 'half-day', 'leave', 'not-marked'
      globalfilter
    } = req.query;

    let query = {};
    let dateLabel = '';

    // Build date query based on report type
    if (reportType === 'daily' && selectedDate) {
      query.date = selectedDate;
      dateLabel = selectedDate;
    } else if (reportType === 'monthly' && year && month) {
      const startOfMonth = `${year}-${month.padStart(2, '0')}-01`;
      const lastDay = new Date(year, parseInt(month), 0).getDate();
      const endOfMonth = `${year}-${month.padStart(2, '0')}-${lastDay}`;
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
      dateLabel = `${year}-${month}`;
    } else if (reportType === 'date-range' && startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
      dateLabel = `${startDate} to ${endDate}`;
    } else if (reportType === 'employee' && employeeId) {
      query.employeeId = employeeId;
      if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
        dateLabel = `${startDate} to ${endDate}`;
      }
    }

    // Fetch attendance records
    const attendanceRecords = await Attendance.find(query)
      .populate({
        path: 'employeeId',
        select: 'First_Name Last_Name Email Employee_ID Role Department'
      })
      .sort({ date: -1, 'employeeId.First_Name': 1 });

    // Get all employees for not-marked status
    let allEmployees = [];
    if (reportType === 'daily' || reportType === 'monthly') {
      allEmployees = await Employee.find({});
    }

    // Build employee filter if search provided
    let employeeFilter = {};
    if (globalfilter) {
      const searchRegex = { $regex: globalfilter, $options: 'i' };
      employeeFilter.$or = [
        { First_Name: searchRegex },
        { Last_Name: searchRegex },
        { Email: searchRegex },
        { Employee_ID: searchRegex },
        { Role: searchRegex }
      ];
      
      if (allEmployees.length > 0) {
        allEmployees = await Employee.find(employeeFilter);
      }
    }

    // Process data based on report type
    let reportData = [];

    if (reportType === 'employee') {
      // Employee-specific report
      reportData = attendanceRecords.map(record => ({
        date: record.date,
        employeeName: `${record.employeeId.First_Name} ${record.employeeId.Last_Name}`,
        employeeId: record.employeeId.Employee_ID,
        role: record.employeeId.Role,
        department: record.employeeId.Department,
        status: record.status || 'Not Marked',
        markedAt: record.markedAt
      }));
    } else {
      // Daily/Monthly/Date-range reports
      const attendanceMap = {};
      attendanceRecords.forEach(record => {
        const key = `${record.employeeId._id}_${record.date}`;
        attendanceMap[key] = record;
      });

      // Get unique dates in the range
      let dates = [];
      if (reportType === 'daily') {
        dates = [selectedDate];
      } else if (reportType === 'monthly') {
        const daysInMonth = new Date(year, parseInt(month), 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          dates.push(`${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
        }
      } else if (reportType === 'date-range') {
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]);
        }
      }

      // Combine employees with attendance for each date
      const employeesToProcess = allEmployees.length > 0 ? allEmployees : 
        [...new Set(attendanceRecords.map(r => r.employeeId._id.toString()))]
          .map(id => attendanceRecords.find(r => r.employeeId._id.toString() === id)?.employeeId);

      employeesToProcess.forEach(emp => {
        if (!emp) return;
        
        dates.forEach(date => {
          const key = `${emp._id}_${date}`;
          const attendance = attendanceMap[key];
          
          reportData.push({
            date,
            employeeName: `${emp.First_Name} ${emp.Last_Name}`,
            employeeId: emp.Employee_ID,
            role: emp.Role,
            department: emp.Department,
            status: attendance?.status || 'Not Marked',
            markedAt: attendance?.markedAt || null
          });
        });
      });
    }

    // Apply status filter
    if (filterStatus && filterStatus !== 'all') {
      reportData = reportData.filter(record => {
        if (filterStatus === 'not-marked') {
          return record.status === 'Not Marked' || !record.status;
        } else if (filterStatus === 'leave') {
          return record.status === 'leave' || record.status?.startsWith('leave-');
        } else {
          return record.status === filterStatus;
        }
      });
    }

    // Calculate summary statistics
    const stats = {
      totalRecords: reportData.length,
      present: reportData.filter(r => r.status === 'present').length,
      absent: reportData.filter(r => r.status === 'absent').length,
      halfDay: reportData.filter(r => r.status === 'half-day').length,
      leave: reportData.filter(r => r.status === 'leave' || r.status?.startsWith('leave-')).length,
      notMarked: reportData.filter(r => r.status === 'Not Marked' || !r.status).length,
      lop: reportData.filter(r => r.status === 'leave-lop').length,
      sickLeave: reportData.filter(r => r.status === 'leave-sick').length,
      casualLeave: reportData.filter(r => r.status === 'leave-casual').length
    };

    res.send({
      reportType,
      dateLabel,
      data: reportData,
      stats
    });

  } catch (error) {
    console.error('Error generating filtered report:', error);
    res.status(500).send({ error: 'Failed to generate report' });
  }
};

export const bulkMarkAttendance = async (req, res) => {
  try {
    const { attendanceRecords } = req.body;

    if (!attendanceRecords || !Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return res.status(400).send({ error: 'attendanceRecords array is required' });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const record of attendanceRecords) {
      try {
        const { employeeId, date, status, markedAt, notes } = record;

        if (!employeeId || !date || !status) {
          results.failed.push({
            employeeId,
            error: 'Missing required fields'
          });
          continue;
        }

        let attendance = await Attendance.findOne({ employeeId, date });

        if (attendance) {
          attendance.status = status;
          attendance.markedAt = markedAt || new Date();
          if (notes) attendance.notes = notes;
          await attendance.save();
        } else {
          attendance = await Attendance.create({
            employeeId,
            date,
            status,
            markedAt: markedAt || new Date(),
            notes: notes || ''
          });
        }

        results.success.push({
          employeeId,
          status: 'saved'
        });
      } catch (error) {
        results.failed.push({
          employeeId: record.employeeId,
          error: error.message
        });
      }
    }

    res.send({
      message: 'Bulk attendance processing completed',
      results
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ 
      error: 'Failed to process bulk attendance'
    });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).send({ error: 'Attendance ID is required' });
    }

    const attendance = await Attendance.findByIdAndDelete(id);

    if (!attendance) {
      return res.status(404).send({ error: 'Attendance record not found' });
    }

    res.send({
      message: 'Attendance deleted successfully',
      data: attendance
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to delete attendance' });
  }
};

export const getAttendanceStats = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const attendance = await Attendance.find({ date: targetDate });
    const totalEmployees = await Employee.countDocuments();

    const stats = {
      date: targetDate,
      total: totalEmployees,
      present: 0,
      absent: 0,
      halfDay: 0,
      leave: 0,
      lop: 0,
      sickLeave: 0,
      casualLeave: 0,
      notMarked: totalEmployees - attendance.length
    };

    attendance.forEach(record => {
      if (record.status === 'present') {
        stats.present++;
      } else if (record.status === 'absent') {
        stats.absent++;
      } else if (record.status === 'half-day') {
        stats.halfDay++;
      } else if (record.status === 'leave' || record.status.startsWith('leave-')) {
        stats.leave++;
        if (record.status === 'leave-lop') stats.lop++;
        else if (record.status === 'leave-sick') stats.sickLeave++;
        else if (record.status === 'leave-casual') stats.casualLeave++;
      }
    });

    res.send(stats);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to fetch statistics' });
  }
};