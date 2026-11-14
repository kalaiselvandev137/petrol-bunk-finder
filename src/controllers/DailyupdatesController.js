import mongoose from 'mongoose';
import { Dailyupdate } from "../models/DailyupdateModel.js";
import { Saveimages } from "../services/Imageservice.js";

export const getallDailyupdates = async (req, res, next) => {
  try {
    const { first, rows, globalfilter, colfilter } = req.query;
    
    // Get user info from token
    const userRole = req.user.Role;
    const userId = req.user.id;
    
    const fieldArray = Object.keys(Dailyupdate.schema.obj);
    const globalFilter = globalfilter 
      ? {
          $or: fieldArray
            .filter((field) => Dailyupdate.schema.path(field) instanceof mongoose.Schema.Types.String)
            .map((field) => ({ [field]: { $regex: globalfilter, $options: 'i' } }))
        }
      : {};
    
    // Build base filter
    let filter = colfilter ? { ...globalFilter, ...colfilter } : globalFilter;
    
    // If user is Sales_Man, only show their own daily updates
    if (userRole === 'Sales_Man') {
      filter = {
        ...filter,
        Employee_ID: userId
      };
    }
    // If Admin, show all daily updates
    
    const resdata = await Dailyupdate.find(filter)
      .populate('Employee_ID', 'First_Name Last_Name Email Role')
      .skip(first)
      .limit(rows)
      .sort({ Date: -1, createdAt: -1 });
      
    const totallength = await Dailyupdate.countDocuments(filter);
    
    res.send({ resdata, totallength });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Internal Server Error' });
  }
};

export const saveDailyupdates = async (req, res, next) => {
  try {
    // Get user info from token
    const userId = req.user.id;
    const userName = req.user.Name;
    
    // Add Employee_ID and Employee_Name from token
    req.body.Employee_ID = userId;
    req.body.Employee_Name = userName;
    
    if (req.file) {
      req.body.Image = await Saveimages(req.file, 'Dailyupdates');
    }
    
    console.log("Request body after adding employee info:", req.body);
    
    const resdata = await new Dailyupdate(req.body).save();
    
    // Populate employee details before sending response
    await resdata.populate('Employee_ID', 'First_Name Last_Name Email Role');
    
    res.send(resdata);
  } catch (err) {
    console.error("Error saving Dailyupdate:", err);
    res.status(500).send({ message: 'Error saving Dailyupdate', error: err.message });
  }
};

export const updateDailyupdates = async (req, res, next) => {
  try {
    const { _id } = req.query;
    
    // Get user info from token
    const userRole = req.user.Role;
    const userId = req.user.id;
    
    // Find the daily update first
    const existingUpdate = await Dailyupdate.findById(_id);
    
    if (!existingUpdate) {
      return res.status(404).send({ message: 'Daily update not found' });
    }
    
    // Check permission: Sales_Man can only update their own updates, Admin can update all
    if (userRole === 'Sales_Man' && existingUpdate.Employee_ID.toString() !== userId.toString()) {
      return res.status(403).send({ message: 'You can only update your own daily updates' });
    }
    
    if (req.file) {
      req.body.Image = await Saveimages(req.file, 'Dailyupdates');
    }
    
    const updatedDailyupdate = await Dailyupdate.findOneAndUpdate(
      { _id },
      { $set: req.body },
      { new: true }
    ).populate('Employee_ID', 'First_Name Last_Name Email Role');
    
    if (!updatedDailyupdate) {
      return res.status(404).send({ message: 'Daily update not found' });
    }

    res.send(updatedDailyupdate);
  } catch (err) {
    console.error("Error updating Dailyupdate:", err);
    res.status(500).send({ message: 'Error updating Dailyupdate', error: err.message });
  }
};

export const deleteDailyupdates = async (req, res, next) => {
  try {
    const { _id } = req.query;
    
    // Get user info from token
    const userRole = req.user.Role;
    const userId = req.user.id;
    
    // Find the daily update first
    const existingUpdate = await Dailyupdate.findById(_id);
    
    if (!existingUpdate) {
      return res.status(404).send({ message: 'Daily update not found' });
    }
    
    // Check permission: Sales_Man can only delete their own updates, Admin can delete all
    if (userRole === 'Sales_Man' && existingUpdate.Employee_ID.toString() !== userId.toString()) {
      return res.status(403).send({ message: 'You can only delete your own daily updates' });
    }
    
    const resdata = await Dailyupdate.deleteOne({ _id });
    res.send(resdata);
  } catch (err) {
    console.error("Error deleting Dailyupdate:", err);
    res.status(500).send({ message: 'Error deleting Dailyupdate', error: err.message });
  }
};