import express from 'express';
import { confirmBooking,getallbookings,getBookingStats,getMyBookings,resendOTP,saveBooking, sendOTP, updateBooking, verifyOTP } from '../controllers/BookingController.js';
import { verifyCustomerSession } from '../services/sessionService.js';
import authMiddleware from '../middleware/authMiddleware.js';


const bookingRouter = express.Router();

bookingRouter.post('/apisavebooking', saveBooking);
bookingRouter.post('/apiconfirmbooking', confirmBooking);
bookingRouter.get('/apigetadminallbookings', getallbookings);
bookingRouter.get('/apigetbookingstats', getBookingStats);
bookingRouter.post('/send-otp', sendOTP);
bookingRouter.post('/verify-otp', verifyOTP);
bookingRouter.post('/resend-otp', resendOTP);


bookingRouter.get('/my-bookings', verifyCustomerSession, getMyBookings);
bookingRouter.put('/apiupdatebooking/:bookingId',authMiddleware("Admin"), updateBooking);
export default bookingRouter;