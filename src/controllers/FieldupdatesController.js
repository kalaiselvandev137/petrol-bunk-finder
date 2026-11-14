import mongoose from 'mongoose';
import { Fieldupdate } from "../models/FieldupdateModel.js";
import { Saveimages } from "../services/Imageservice.js";
import { Employee } from '../models/EmployeeModel.js';
import { compareFaces, loadReference } from '../services/faceVerifyService.js';

// Admin: Get all field updates grouped by employee
// export const getAdminFieldupdates = async (req, res, next) => {
//   try {
//     const { first = 0, rows = 10, globalfilter = '', selectedDate } = req.query;

//     let matchStage = {};

//     // Date filter
//     if (selectedDate) {
//       const startDate = new Date(selectedDate);
//       startDate.setHours(0, 0, 0, 0);
//       const endDate = new Date(selectedDate);
//       endDate.setHours(23, 59, 59, 999);
      
//       matchStage.Visit_Date = {
//         $gte: startDate,
//         $lte: endDate
//       };
//     }

//     // Global search filter
//     if (globalfilter) {
//       matchStage.$or = [
//         { Employee_Name: { $regex: globalfilter, $options: 'i' } },
//         { Bunk_Name: { $regex: globalfilter, $options: 'i' } },
//         { City_Name: { $regex: globalfilter, $options: 'i' } },
//         { State_Name: { $regex: globalfilter, $options: 'i' } },
//         { Dealer_Name: { $regex: globalfilter, $options: 'i' } },
//         { Oil_Company: { $regex: globalfilter, $options: 'i' } }
//       ];
//     }

//     // Aggregation to group by employee
//     const aggregation = [
//       { $match: matchStage },
//       {
//         $lookup: {
//           from: 'employees',
//           localField: 'Employee_ID',
//           foreignField: '_id',
//           as: 'employeeDetails'
//         }
//       },
//       { $unwind: { path: '$employeeDetails', preserveNullAndEmptyArrays: true } },
//       {
//         $group: {
//           _id: '$Employee_ID',
//           employeeName: { $first: '$Employee_Name' },
//           employeeEmail: { $first: '$employeeDetails.Email' },
//           visits: { $push: '$$ROOT' }
//         }
//       },
//       {
//         $project: {
//           employeeId: '$_id',
//           employeeName: 1,
//           employeeEmail: 1,
//           visits: 1
//         }
//       },
//       { $sort: { employeeName: 1 } }
//     ];

//     // Get total count of unique employees
//     const countAggregation = [
//       { $match: matchStage },
//       {
//         $group: {
//           _id: '$Employee_ID'
//         }
//       },
//       {
//         $count: 'total'
//       }
//     ];

//     const countResult = await Fieldupdate.aggregate(countAggregation);
//     const totallength = countResult.length > 0 ? countResult[0].total : 0;

//     // Add pagination
//     aggregation.push({ $skip: parseInt(first) });
//     aggregation.push({ $limit: parseInt(rows) });

//     const resdata = await Fieldupdate.aggregate(aggregation);

//     res.send({
//       resdata,
//       totallength,
//       userRole: 'Admin'
//     });
//   } catch (err) {
//     console.error('Error fetching admin field updates:', err);
//     res.status(500).send({ 
//       message: 'Error fetching field updates', 
//       error: err.message 
//     });
//   }
// };

const getDateRange = (dateString) => {
  const date = new Date(dateString);
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));
  return { startOfDay, endOfDay };
};

const getTodayRange = () => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  return { startOfDay, endOfDay };
};
export const getAdminFieldupdates = async (req, res, next) => {
  try {
    const { first, rows , globalfilter = '', selectedDate } = req.query;

    // Get user info from token
    const userRole = req.user?.Role;
    
    // Only allow admins to access this endpoint
    if (userRole === 'Sales_Man') {
      return res.status(403).send({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    // Get date range - either selected date or today
    let startOfDay, endOfDay;
    if (selectedDate) {
      const range = getDateRange(selectedDate);
      startOfDay = range.startOfDay;
      endOfDay = range.endOfDay;
    } else {
      const range = getTodayRange();
      startOfDay = range.startOfDay;
      endOfDay = range.endOfDay;
    }

    // Fetch all field updates for the selected date
    const dateFieldUpdates = await Fieldupdate.find({
      Visit_Date: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate('Employee_ID', 'Image First_Name Last_Name Employee_ID Email Role')
      .sort({ createdAt: -1 });

    // Create a map of field updates by employee ID for quick lookup
    const fieldUpdatesByEmployee = {};
    
    dateFieldUpdates.forEach(fieldUpdate => {
      const employeeId = fieldUpdate.Employee_ID?._id?.toString() || fieldUpdate.Employee_ID?.toString();
      
      if (!fieldUpdatesByEmployee[employeeId]) {
        fieldUpdatesByEmployee[employeeId] = {
          employeeId: employeeId,
          employeeName: fieldUpdate.Employee_Name || 
                       (fieldUpdate.Employee_ID?.First_Name && fieldUpdate.Employee_ID?.Last_Name 
                         ? `${fieldUpdate.Employee_ID.First_Name} ${fieldUpdate.Employee_ID.Last_Name}`
                         : 'Unknown'),
          employeeEmail: fieldUpdate.Employee_ID?.Email || '',
          employeeData: fieldUpdate.Employee_ID,
          visits: []
        };
      }
      
      fieldUpdatesByEmployee[employeeId].visits.push(fieldUpdate);
    });

    // Build employee search filter (for Sales_Man role only)
    let employeeFilter = { Role: 'Sales_Man' };
    
    if (globalfilter) {
      const searchRegex = { $regex: globalfilter, $options: 'i' };
      employeeFilter.$or = [
        { First_Name: searchRegex },
        { Last_Name: searchRegex },
        { Email: searchRegex },
        { Employee_ID: searchRegex }
      ];
    }

    // Get all salesmen matching the search
    const allSalesmen = await Employee.find({...employeeFilter, Status: 'Active'})
      .select('Image First_Name Last_Name Employee_ID Email Role')
      .sort({ First_Name: 1 });

    // Combine employees with their field updates (or without)
    let combinedData = allSalesmen.map(emp => {
      const employeeId = emp._id.toString();
      const employeeFieldUpdates = fieldUpdatesByEmployee[employeeId];

      if (employeeFieldUpdates) {
        // Employee has field updates for this date
        return employeeFieldUpdates;
      } else {
        // Employee has no field updates for this date
        return {
          employeeId: employeeId,
          employeeName: `${emp.First_Name || ''} ${emp.Last_Name || ''}`.trim(),
          employeeEmail: emp.Email || '',
          employeeData: emp,
          visits: [] // Empty array indicates no field updates for this date
        };
      }
    });

    // Calculate total length
    const totallength = combinedData.length;
    
    // Apply pagination
    const skip = parseInt(first);
    const limit = parseInt(rows);
    const paginatedEmployees = combinedData.slice(skip, skip + limit);

    res.send({
      success: true,
      resdata: paginatedEmployees,
      totallength,
      userRole,
      filterDate: startOfDay.toISOString().split('T')[0]
    });
  } catch (err) {
    console.error('Error fetching admin field updates:', err);
    res.status(500).send({
      success: false,
      message: 'Failed to fetch field updates',
      error: err.message
    });
  }
};

// Salesperson: Get only their own field updates
// export const getSalespersonFieldupdates = async (req, res, next) => {
//   try {
//     const { first, rows , globalfilter = '', selectedDate } = req.query;
//     const userId = req.user.id;

//     const fieldArray = Object.keys(Fieldupdate.schema.obj);
//     const globalFilter = globalfilter 
//       ? {
//           $or: fieldArray
//             .filter((field) => Fieldupdate.schema.path(field) instanceof mongoose.Schema.Types.String)
//             .map((field) => ({ [field]: { $regex: globalfilter, $options: 'i' } }))
//         }
//       : {};
    
//     // Build filter for salesperson's own visits
//     let filter = {
//       ...globalFilter,
//       Employee_ID: userId
//     };

//     // Date filter
//     if (selectedDate) {
//       const startDate = new Date(selectedDate);
//       startDate.setHours(0, 0, 0, 0);
//       const endDate = new Date(selectedDate);
//       endDate.setHours(23, 59, 59, 999);
      
//       filter.Visit_Date = {
//         $gte: startDate,
//         $lte: endDate
//       };
//     }

//     // Get total count
//     const totallength = await Fieldupdate.countDocuments(filter);

//     // Fetch data with pagination
//     const resdata = await Fieldupdate.find(filter)
//       .populate('Employee_ID', 'First_Name Last_Name Email Role')
//       .sort({ Visit_Date: -1, createdAt: -1 })
//       .skip(parseInt(first))
//       .limit(parseInt(rows));

//     res.send({
//       resdata,
//       totallength,
//       userRole: 'Sales_Man'
//     });
//   } catch (err) {
//     console.error('Error fetching salesperson field updates:', err);
//     res.status(500).send({ 
//       message: 'Error fetching field updates', 
//       error: err.message 
//     });
//   }
// };

export const getSalespersonFieldupdates = async (req, res, next) => {
  try {
    const { first = 0, rows = 10, globalfilter = '', selectedDate } = req.query;
    const userRole = req.user?.Role;
    const userId = req.user?.id;
    // Determine date range: use selectedDate if provided, otherwise today
    let startOfDay, endOfDay;
    let usedFilterDate;

    if (selectedDate) {
      const range = getDateRange(selectedDate);
      startOfDay = range.startOfDay;
      endOfDay = range.endOfDay;
      usedFilterDate = selectedDate; // Use the provided date string
    } else {
      const range = getTodayRange();
      startOfDay = range.startOfDay;
      endOfDay = range.endOfDay;
      usedFilterDate = startOfDay.toISOString().split('T')[0]; // Today in YYYY-MM-DD
    }

    // Build filter for current salesperson and the selected date
    const filter = { 
      Employee_ID: userId,
      Visit_Date: { $gte: startOfDay, $lte: endOfDay }
    };

    // Fetch field updates for the selected date
    const fieldUpdates = await Fieldupdate.find(filter)
      .populate('Employee_ID', 'Image First_Name Last_Name Employee_ID Email')
      .sort({ Visit_Date: -1, createdAt: -1 })
      .lean();

    // Apply global search filter on visit fields
    let filteredUpdates = fieldUpdates;
    
    if (globalfilter) {
      const searchLower = globalfilter.toLowerCase();
      filteredUpdates = fieldUpdates.filter(visit => 
        (visit.Employee_Name && visit.Employee_Name.toLowerCase().includes(searchLower)) ||
        (visit.Bunk_Name && visit.Bunk_Name.toLowerCase().includes(searchLower)) ||
        (visit.City_Name && visit.City_Name.toLowerCase().includes(searchLower)) ||
        (visit.State_Name && visit.State_Name.toLowerCase().includes(searchLower)) ||
        (visit.Dealer_Name && visit.Dealer_Name.toLowerCase().includes(searchLower)) ||
        (visit.Oil_Company && visit.Oil_Company.toLowerCase().includes(searchLower)) ||
        (visit.Contact_No && String(visit.Contact_No).includes(searchLower)) ||
        (visit.Remarks && visit.Remarks.toLowerCase().includes(searchLower))
      );
    }

    // Pagination
    const totallength = filteredUpdates.length;
    const skip = parseInt(first);
    const limit = parseInt(rows);
    const paginatedVisits = filteredUpdates.slice(skip, skip + limit);

    // Send response
    res.send({
      success: true,
      resdata: paginatedVisits,
      totallength,
      userRole,
      filterDate: usedFilterDate
    });

  } catch (err) {
    console.error('Error fetching salesperson field updates:', err);
    res.status(500).send({
      success: false,
      message: 'Failed to fetch field updates',
      error: err.message
    });
  }
};

// Combined get method (for backward compatibility)
export const getallFieldupdates = async (req, res, next) => {
  try {
    const userRole = req.user.Role;
    
    // Route to appropriate method based on role
    if (userRole === 'Sales_Man') {
      return getSalespersonFieldupdates(req, res, next);
    } else {
      return getAdminFieldupdates(req, res, next);
    }
  } catch (err) {
    console.error('Error in getallFieldupdates:', err);
    res.status(500).send({ 
      message: 'Error fetching field updates', 
      error: err.message 
    });
  }
};

// export const saveFieldupdates = async (req, res, next) => {
//   try {
//     // Get user info from token
//     const userId = req.user.id;
//     const userName = req.user.Name;
    
//     // Add Employee_ID and Employee_Name from token
//     req.body.Employee_ID = userId;
//     req.body.Employee_Name = userName;
    
//     // Handle image upload
//     if (req.file) {
//       req.body.Visit_Image = await Saveimages(req.file, 'Fieldupdates');
//     }
    
//     console.log("Request body after adding employee info:", req.body);
    
//     const resdata = await new Fieldupdate(req.body).save();
    
//     // Populate employee details before sending response
//     await resdata.populate('Employee_ID', 'First_Name Last_Name Email Role');
    
//     res.send(resdata);
//   } catch (err) {
//     console.error("Error saving Fieldupdate:", err);
//     res.status(500).send({ message: 'Error saving Fieldupdate', error: err.message });
//   }
// };

// ------------- this includes mobile face verify------------------

// export const saveFieldupdates = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const userName = req.user.Name;

//     // never trust face fields coming from the client
//     delete req.body.faceVerified;
//     delete req.body.faceSimilarity;

//     req.body.Employee_ID = userId;
//     req.body.Employee_Name = userName;

//     // ---- face verification ----
//     if (!req.file) {
//       return res.status(400).send({ success: false, message: 'A live selfie is required' });
//     }

//     const emp = await Employee.findById(userId).select('face_verify_reference_image');
//     const refPath = emp?.face_verify_reference_image?.[0];
//     if (!refPath) {
//       return res.status(412).send({
//         success: false, code: 'NO_REFERENCE',
//         message: 'Face reference photo is not set. Please contact your admin.',
//       });
//     }

//     const result = await compareFaces(req.file.buffer, await loadReference(refPath));

//     if (!result.matched) {
//       console.warn(`Face mismatch (field update) for employee ${userId} at ${new Date().toISOString()}`, result);
//       return res.status(403).send({
//         success: false, code: 'FACE_MISMATCH',
//         message: result.noFace
//           ? 'No clear face detected. Retake the photo in good light.'
//           : 'Face verification failed. Please retake the selfie.',
//       });
//     }

//     // only reached when the face matched, so nothing is stored for failed attempts
//     req.body.Visit_Image = await Saveimages(req.file, 'Fieldupdates');
//     req.body.faceVerified = true;
//     req.body.faceSimilarity = result.similarity;

//     const resdata = await new Fieldupdate(req.body).save();
//     await resdata.populate('Employee_ID', 'First_Name Last_Name Email Role');

//     res.send({ success: true, ...resdata.toObject() });
//   } catch (err) {
//     console.error('Error saving Fieldupdate:', err);
//     res.status(500).send({ success: false, message: 'Error saving Fieldupdate', error: err.message });
//   }
// };


export const saveFieldupdates = async (req, res, next) => {
  try {
    // Get user info from token
    const userId = req.user.id;
    const userName = req.user.Name;
    
    // Add Employee_ID and Employee_Name from token
    req.body.Employee_ID = userId;
    req.body.Employee_Name = userName;
    
    // Handle image upload
    if (req.file) {
      req.body.Visit_Image = await Saveimages(req.file, 'Fieldupdates');
    }
    
    console.log("Request body after adding employee info:", req.body);
    
    const resdata = await new Fieldupdate(req.body).save();
    
    // Populate employee details before sending response
    await resdata.populate('Employee_ID', 'First_Name Last_Name Email Role');
    
    res.send(resdata);
  } catch (err) {
    console.error("Error saving Fieldupdate:", err);
    res.status(500).send({ message: 'Error saving Fieldupdate', error: err.message });
  }
};


export const updateFieldupdates = async (req, res, next) => {
  try {
    const { _id } = req.query;
    
    // Get user info from token
    const userRole = req.user.Role;
    const userId = req.user.id;
    
    // Find the daily update first
    const existingUpdate = await Fieldupdate.findById(_id);
    
    if (!existingUpdate) {
      return res.status(404).send({ message: 'Daily update not found' });
    }
    
    // Check permission: Sales_Man can only update their own updates, Admin can update all
    if (userRole === 'Sales_Man' && existingUpdate.Employee_ID.toString() !== userId.toString()) {
      return res.status(403).send({ message: 'You can only update your own daily updates' });
    }
    
    if (req.file) {
      req.body.Image = await Saveimages(req.file, 'Fieldupdates');
    }
    
    const updatedFieldupdate = await Fieldupdate.findOneAndUpdate(
      { _id },
      { $set: req.body },
      { new: true }
    ).populate('Employee_ID', 'First_Name Last_Name Email Role');
    
    if (!updatedFieldupdate) {
      return res.status(404).send({ message: 'Daily update not found' });
    }

    res.send(updatedFieldupdate);
  } catch (err) {
    console.error("Error updating Fieldupdate:", err);
    res.status(500).send({ message: 'Error updating Fieldupdate', error: err.message });
  }
};

export const deleteFieldupdates = async (req, res, next) => {
  try {
    const { _id } = req.query;
    
    // Get user info from token
    const userRole = req.user.Role;
    const userId = req.user.id;
    
    // Find the daily update first
    const existingUpdate = await Fieldupdate.findById(_id);
    
    if (!existingUpdate) {
      return res.status(404).send({ message: 'Daily update not found' });
    }
    
    // Check permission: Sales_Man can only delete their own updates, Admin can delete all
    if (userRole === 'Sales_Man' && existingUpdate.Employee_ID.toString() !== userId.toString()) {
      return res.status(403).send({ message: 'You can only delete your own daily updates' });
    }
    
    const resdata = await Fieldupdate.deleteOne({ _id });
    res.send(resdata);
  } catch (err) {
    console.error("Error deleting Fieldupdate:", err);
    res.status(500).send({ message: 'Error deleting Fieldupdate', error: err.message });
  }
};

export const getAdminFieldupdatesRange = async (req, res, next) => {
  try {
    const { startDate, endDate, globalfilter = '' } = req.query;
 
    // Get user info from token
    const userRole = req.user?.Role;
 
    // Only allow admins to access this endpoint
    if (userRole === 'Sales_Man') {
      return res.status(403).send({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
 
    if (!startDate || !endDate) {
      return res.status(400).send({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
 
    const rangeStart = new Date(startDate);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(endDate);
    rangeEnd.setHours(23, 59, 59, 999);
 
    // Fetch all field updates within the whole range in one query
    const rangeFieldUpdates = await Fieldupdate.find({
      Visit_Date: { $gte: rangeStart, $lte: rangeEnd }
    })
      .populate('Employee_ID', 'Image First_Name Last_Name Employee_ID Email Role')
      .sort({ createdAt: -1 });
 
    // Create a map of field updates by employee ID for quick lookup
    const fieldUpdatesByEmployee = {};
 
    rangeFieldUpdates.forEach(fieldUpdate => {
      const employeeId = fieldUpdate.Employee_ID?._id?.toString() || fieldUpdate.Employee_ID?.toString();
 
      if (!fieldUpdatesByEmployee[employeeId]) {
        fieldUpdatesByEmployee[employeeId] = {
          employeeId: employeeId,
          employeeName: fieldUpdate.Employee_Name ||
                       (fieldUpdate.Employee_ID?.First_Name && fieldUpdate.Employee_ID?.Last_Name
                         ? `${fieldUpdate.Employee_ID.First_Name} ${fieldUpdate.Employee_ID.Last_Name}`
                         : 'Unknown'),
          employeeEmail: fieldUpdate.Employee_ID?.Email || '',
          employeeData: fieldUpdate.Employee_ID,
          visits: []
        };
      }
 
      fieldUpdatesByEmployee[employeeId].visits.push(fieldUpdate);
    });
 
    // Build employee search filter (for Sales_Man role only)
    let employeeFilter = { Role: 'Sales_Man' };
 
    if (globalfilter) {
      const searchRegex = { $regex: globalfilter, $options: 'i' };
      employeeFilter.$or = [
        { First_Name: searchRegex },
        { Last_Name: searchRegex },
        { Email: searchRegex },
        { Employee_ID: searchRegex }
      ];
    }
 
    // Get all salesmen matching the search
    const allSalesmen = await Employee.find({ ...employeeFilter, Status: 'Active' })
      .select('Image First_Name Last_Name Employee_ID Email Role')
      .sort({ First_Name: 1 });
 
    // Combine employees with their field updates across the whole range (or empty array if none)
    const combinedData = allSalesmen.map(emp => {
      const employeeId = emp._id.toString();
      const employeeFieldUpdates = fieldUpdatesByEmployee[employeeId];
 
      if (employeeFieldUpdates) {
        return employeeFieldUpdates;
      } else {
        return {
          employeeId: employeeId,
          employeeName: `${emp.First_Name || ''} ${emp.Last_Name || ''}`.trim(),
          employeeEmail: emp.Email || '',
          employeeData: emp,
          visits: []
        };
      }
    });
 
    res.send({
      success: true,
      resdata: combinedData,
      totallength: combinedData.length,
      userRole,
      rangeStart: rangeStart.toISOString().split('T')[0],
      rangeEnd: rangeEnd.toISOString().split('T')[0]
    });
  } catch (err) {
    console.error('Error fetching admin field updates range:', err);
    res.status(500).send({
      success: false,
      message: 'Failed to fetch field updates for range',
      error: err.message
    });
  }
};