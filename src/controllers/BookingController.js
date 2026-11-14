
import mongoose from "mongoose";
import Booking from "../models/BookingModel.js";
import Notification from "../models/NotificationModel.js";
import Settings from "../models/SettingsModel.js";
import nodemailer from 'nodemailer';
import CustomerVerification from "../models/CustomerVerificationModel.js";
import { sendOTPEmail, sendResendOTPEmail } from "../services/emailService.js";
import { generateOTPData, isOTPExpired, verifyOTPMatch, isValidOTPFormat } from "../services/otpService.js";
import { generateSessionToken } from "../services/sessionService.js";
import { generateUniqueBookingId } from "../services/bookingIdService.js";

const getSlotCapacity = async (date, slotTime) => {
  const settings = await Settings.findOne().sort({ updatedAt: -1 });
  
  if (!settings) {
    throw new Error('Settings not found');
  }

  const dateObj = new Date(date);
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];
  
  // Check for date-specific settings first
  const dateSpecific = settings.slotSettings.dateSpecificSettings.find(
    ds => new Date(ds.date).toISOString().split('T')[0] === date
  );

  if (dateSpecific) {
    const slot = dateSpecific.slots.find(s => s.timeSlot === slotTime && s.isActive);
    return slot ? slot.capacity : 0;
  }

  // Check day-wise settings
  const daySettings = settings.slotSettings.dayWiseSettings.get(dayOfWeek);
  
  if (!daySettings || !daySettings.isActive) {
    return 0; // Day is not active
  }

  if (daySettings.useGlobalSettings) {
    // Use global settings
    const slot = settings.slotSettings.globalSlots.find(s => s.timeSlot === slotTime && s.isActive);
    return slot ? slot.capacity : 0;
  } else {
    // Use day-specific custom settings
    const slot = daySettings.customSlots.find(s => s.timeSlot === slotTime && s.isActive);
    return slot ? slot.capacity : 0;
  }
};

// Check if slot is available
const checkSlotAvailability = async (date, slotTime) => {
  try {
    // Get slot capacity from settings
    const capacity = await getSlotCapacity(date, slotTime);
    
    if (capacity === 0) {
      return { available: false, message: 'This slot is not available' };
    }

    // Count existing confirmed bookings for this slot
    const bookedCount = await Booking.countDocuments({
      bookingDate: new Date(date),
      slotTime: slotTime,
      bookingStatus: 'confirmed'
    });

    const availableSpots = capacity - bookedCount;

    if (availableSpots <= 0) {
      return { available: false, message: 'This slot is fully booked' };
    }

    return { 
      available: true, 
      capacity, 
      booked: bookedCount, 
      availableSpots 
    };
  } catch (error) {
    console.error('Error checking slot availability:', error);
    throw error;
  }
};

export const saveBooking = async (req, res) => {
  try {
    const { bookingId, ...bookingData } = req.body;
    
    // Validate required fields for new bookings
    if (!bookingId) {
      const requiredFields = ['name', 'phone', 'email', 'address1', 'state', 'pincode', 
                              'bookingDay', 'bookingDate', 'slotTime', 'baseCharge', 
                              'gstAmount', 'totalAmount'];
      
      const missingFields = requiredFields.filter(field => {
        const value = bookingData[field];
        return value === undefined || value === null || value === '';
      });
      
      if (missingFields.length > 0) {
        return res.send({
          message: `Missing required fields: ${missingFields.join(', ')}`,
          success: false,
          missingFields
        });
      }
    }
    
    if (bookingId) {
      // Update existing booking
      const updatedBooking = await Booking.findByIdAndUpdate(
        bookingId,
        bookingData,
        { new: true, runValidators: true }
      );
      
      if (!updatedBooking) {
        return res.send({ message: "Booking not found", success: false });
      }
      
      return res.send({
        message: "Booking updated successfully",
        success: true,
        booking: updatedBooking
      });
    } else {
      // Check if a draft booking already exists for this email, date, and slot
      const existingDraft = await Booking.findOne({
        email: bookingData.email.toLowerCase(),
        bookingDate: new Date(bookingData.bookingDate),
        slotTime: bookingData.slotTime,
        bookingStatus: 'draft'
      }).sort({ createdAt: -1 });
      
      if (existingDraft) {
        // Update the existing draft instead of creating a new one
        Object.assign(existingDraft, bookingData);
        await existingDraft.save();
        
        return res.send({
          message: "Draft booking updated successfully",
          success: true,
          booking: existingDraft,
          bookingId: existingDraft.bookingId,
          isExisting: true
        });
      }
      
      // Create new booking
      
      // Check slot availability for confirmed bookings
      if (bookingData.bookingStatus === 'confirmed') {
        const availability = await checkSlotAvailability(
          bookingData.bookingDate,
          bookingData.slotTime
        );
        
        if (!availability.available) {
          return res.send({
            message: availability.message,
            success: false,
            available: false
          });
        }
      }
      
      // Generate unique booking ID
      const uniqueBookingId = await generateUniqueBookingId();
      bookingData.bookingId = uniqueBookingId;
      
      const newBooking = await new Booking(bookingData).save();
      
      // Create notification
      try {
        const existingNotification = await Notification.findOne({
          bookingId: newBooking._id
        });
        
        if (!existingNotification) {
          await new Notification({
            type: 'booking',
            message: `New booking from ${newBooking.name} (${uniqueBookingId})`,
            bookingId: newBooking._id
          }).save();
        }
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
      }
      
      return res.send({
        message: "Booking saved successfully",
        success: true,
        booking: newBooking,
        bookingId: uniqueBookingId,
        isExisting: false
      });
    }
  } catch (error) {
    console.error('Error saving booking:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.send({
        message: "Validation error",
        success: false,
        errors: validationErrors
      });
    }
    
    return res.send({
      message: "Server error",
      success: false,
      error: error.message
    });
  }
};

export const confirmBooking = async (req, res) => {
  try {
    const { bookingId, paymentId, email, bookingDate, slotTime } = req.body;
    
    let booking;
    
    // If bookingId is provided, find by ID
    if (bookingId) {
      booking = await Booking.findById(bookingId);
    } 
    // If no bookingId but email, date, and slot provided, find draft booking
    else if (email && bookingDate && slotTime) {
      booking = await Booking.findOne({
        email: email.toLowerCase(),
        bookingDate: new Date(bookingDate),
        slotTime: slotTime,
        bookingStatus: 'draft'
      }).sort({ createdAt: -1 }); // Get the most recent draft
    }
    
    if (!booking) {
      return res.send({ 
        message: "Booking not found",
        success: false 
      });
    }
    
    // Check slot availability
    const availability = await checkSlotAvailability(
      booking.bookingDate.toISOString().split('T')[0],
      booking.slotTime
    );
    
    if (!availability.available) {
      return res.send({
        message: availability.message,
        success: false,
        available: false
      });
    }
    
    // Update booking to confirmed
    booking.paymentId = paymentId;
    booking.paymentStatus = 'completed';
    booking.bookingStatus = 'confirmed';
    await booking.save();
    
    // Update notification
    try {
      await Notification.findOneAndUpdate(
        { bookingId: booking._id },
        {
          message: `Booking confirmed for ${booking.name} (${booking.bookingId})`,
          type: 'booking_confirmed'
        },
        { upsert: true }
      );
    } catch (notificationError) {
      console.error('Failed to update notification:', notificationError);
    }
    
    return res.send({
      message: "Booking confirmed successfully",
      success: true,
      booking,
      availability: {
        remainingSpots: availability.availableSpots - 1
      }
    });
  } catch (error) {
    console.error('Error confirming booking:', error);
    return res.send({
      message: "Server error",
      success: false,
      error: error.message
    });
  }
};

export const getBookingsForDate = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.send({ message: "Date is required" });
    }
    
    const bookings = await Booking.find({
      bookingDate: new Date(date),
      bookingStatus: { $in: ['confirmed', 'draft'] }
    }).sort({ slotTime: 1 });

    const bookingsBySlot = {};
    bookings.forEach(booking => {
      if (!bookingsBySlot[booking.slotTime]) {
        bookingsBySlot[booking.slotTime] = [];
      }
      bookingsBySlot[booking.slotTime].push(booking);
    });
    
    return res.send({
      message: "Bookings retrieved successfully",
      date,
      bookings,
      bookingsBySlot,
      totalBookings: bookings.length
    });
  } catch (error) {
    console.error('Error getting bookings:', error);
    return res.status(500).send({
      message: "Server error",
      error: error.message
    });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    if (!bookingId) {
      return res.send({ message: "Booking ID is required" });
    }
    
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { bookingStatus: 'cancelled' },
      { new: true }
    );
    
    if (!booking) {
      return res.send({ message: "Booking not found" });
    }
    
    try {
      await new Notification({
        type: 'booking_cancelled',
        message: `Booking cancelled for ${booking.name} (${booking.bookingId})`,
        bookingId: booking._id
      }).save();
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
    }
    
    return res.send({
      message: "Booking cancelled successfully",
      booking
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return res.send({
      message: "Server error",
      error: error.message
    });
  }
};

export const getallbookings = async (req, res, next) => {
  try {
    const { first, rows, globalfilter, colfilter, sort, filterDate } = req.query;
    const sortObj = sort ? JSON.parse(sort) : { createdAt: -1 };
    const fieldArray = Object.keys(Booking.schema.obj);
    
    const globalFilter = globalfilter
      ? {
          $or: fieldArray
            .filter((field) => Booking.schema.path(field) instanceof mongoose.Schema.Types.String)
            .map((field) => ({
              [field]: { $regex: globalfilter, $options: 'i' }
            }))
        }
      : {};
    
    const columnFilter = colfilter ? JSON.parse(colfilter) : {};
    let dateFilter = {};
    
    if (filterDate) {
      const startDate = new Date(filterDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filterDate);
      endDate.setHours(23, 59, 59, 999);
      dateFilter = {
        bookingDate: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }
    
    const filter = { ...globalFilter, ...columnFilter, ...dateFilter };
    const bookings = await Booking.find(filter)
      .sort(sortObj)
      .skip(parseInt(first))
      .limit(parseInt(rows));
    
    const totallength = await Booking.countDocuments(filter);
    
    res.send({ bookings, totallength });
  } catch (err) {
    console.error('Error in getallbookings:', err);
    res.send({ error: 'Internal Server Error', message: err.message });
  }
};

export const getBookingStats = async (req, res, next) => {
  try {
    const stats = await Booking.aggregate([
      {
        $facet: {
          totalCount: [{ $count: 'count' }],
          statusCounts: [
            {
              $group: {
                _id: '$bookingStatus',
                count: { $sum: 1 }
              }
            }
          ],
          revenue: [
            {
              $match: { paymentStatus: 'completed' }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' }
              }
            }
          ]
        }
      }
    ]);
    
    const result = stats[0];
    const statusMap = result.statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    
    const formattedStats = {
      total: result.totalCount[0]?.count || 0,
      confirmed: statusMap.confirmed || 0,
      pending: statusMap.pending || 0,
      draft: statusMap.draft || 0,
      cancelled: statusMap.cancelled || 0,
      revenue: result.revenue[0]?.total || 0
    };
    
    res.send({ stats: formattedStats });
  } catch (err) {
    console.error('Error in getBookingStats:', err);
    res.send({ error: 'Internal Server Error', message: err.message });
  }
};

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
     if (!email) { return res.send({ message: "Email is required" });}
    const emailLower = email.toLowerCase();
    const bookings = await Booking.find({ email: emailLower,bookingStatus: { $in: ['confirmed', 'completed', 'draft','cancelled'] }});
    if (bookings.length === 0) {return res.send({ message: "No bookings found for this email" });}
    const { otp, otpExpiry } = generateOTPData(10);
    const firstBooking = bookings[0];
    const bookingIds = bookings.map(b => b._id);
    await CustomerVerification.findOneAndUpdate({ email: emailLower },
      {
        email: emailLower,
        name: firstBooking.name,
        phone: firstBooking.phone,
        bookingIds: bookingIds,
        lastOTP: otp,
        otpExpiry: otpExpiry,
        totalBookings: bookings.length,
        status: 'active'
      },
      { upsert: true, new: true }
    );
    await sendOTPEmail(email, otp, firstBooking.name, bookings.length);
    return res.send({ message: "OTP sent successfully",bookingsCount: bookings.length });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.send({ message: "Failed to send OTP" });
  }
};


export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {return res.send({ message: "Email and OTP required" });}
    if (!isValidOTPFormat(otp)) {return res.send({ message: "Invalid OTP format. Must be 6 digits." });}
    const emailLower = email.toLowerCase();
    const customer = await CustomerVerification.findOne({ email: emailLower,status: 'active'});
    if (!customer) {return res.send({ message: "Verification record not found" });}
    if (isOTPExpired(customer.otpExpiry)) {return res.send({ message: "OTP has expired. Please request a new one." });}
    if (!verifyOTPMatch(otp, customer.lastOTP)) {return res.send({ message: "Invalid OTP. Please try again." });}
    customer.lastVerifiedAt = new Date();
    customer.verifications.push({verifiedAt: new Date(),ipAddress: req.ip || req.connection.remoteAddress,userAgent: req.headers['user-agent']});
    customer.lastOTP = null; 
    await customer.save();
    const sessionToken = generateSessionToken(emailLower, customer._id.toString());
    const bookings = await Booking.find({ email: emailLower,bookingStatus: { $in: ['confirmed', 'completed', 'draft','cancelled'] }}).sort({ createdAt: -1 });
    return res.send({ message: "Verified successfully",sessionToken,bookings,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        totalBookings: customer.totalBookings
      }
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.send({ message: "Verification failed" });
  }
};


export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body; 
    if (!email) {return res.send({ message: "Email is required" });}
    const emailLower = email.toLowerCase();
    const customer = await CustomerVerification.findOne({ email: emailLower,status: 'active'});
    if (!customer) {return res.send({ message: "No bookings found" });}
    const { otp, otpExpiry } = generateOTPData(10);
    customer.lastOTP = otp;
    customer.otpExpiry = otpExpiry;
    await customer.save();
    await sendResendOTPEmail(email, otp, customer.name);
    return res.send({ message: "New OTP sent" });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    return res.send({ message: "Failed to resend OTP" });
  }
};




export const getMyBookings = async (req, res) => {
  try {
    const { email } = req.customer;
    const customer = await CustomerVerification.findOne({
      email,
      status: 'active'
    });
    
    if (!customer) {
      return res.send({ message: "Customer not found" });
    }
    
    const bookings = await Booking.find({
      email,
      bookingStatus: { $in: ['confirmed', 'completed', 'draft','cancelled'] }
    }).sort({ createdAt: -1 });
    
    return res.send({
      bookings,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        totalBookings: customer.totalBookings
      }
    });
  } catch (error) {
    console.error('Get Bookings Error:', error);
    return res.send({ message: "Failed to fetch bookings" });
  }
};


export const updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const updateData = req.body;
    if (!bookingId) { return res.send({ message: "Booking ID is required",success: false });}
    const existingBooking = await Booking.findById(bookingId);
    if (!existingBooking) {return res.send({ message: "Booking not found",success: false }); }
    const isChangingSchedule = 
      updateData.bookingDate !== existingBooking.bookingDate.toISOString().split('T')[0] ||
      updateData.slotTime !== existingBooking.slotTime;
    
    const isConfirming = 
      updateData.bookingStatus === 'confirmed' && 
      existingBooking.bookingStatus !== 'confirmed';

    if ((isChangingSchedule || isConfirming) && updateData.bookingStatus === 'confirmed') {
      const dateToCheck = updateData.bookingDate || existingBooking.bookingDate.toISOString().split('T')[0];
      const slotToCheck = updateData.slotTime || existingBooking.slotTime;
      
      const availability = await checkSlotAvailability(dateToCheck, slotToCheck);
      
      if (!availability.available) {
        return res.send({ message: availability.message, success: false, available: false });
      }
    }
    const updatedBooking = await Booking.findByIdAndUpdate(bookingId,{ ...updateData,updatedAt: new Date()},{ new: true, runValidators: true });
    if (updateData.bookingStatus && updateData.bookingStatus !== existingBooking.bookingStatus) {
          try {await new Notification({type: 'booking_updated',message: `Booking status changed to ${updateData.bookingStatus} (${updatedBooking.bookingId}) `,bookingId: updatedBooking._id}).save();
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
      }
    }

    return res.send({ message: "Booking updated successfully", success: true, booking: updatedBooking});
  } catch (error) {
    console.error('Error updating booking:', error);

  }
};