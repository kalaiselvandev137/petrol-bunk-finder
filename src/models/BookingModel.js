    import mongoose from 'mongoose';
    import db from '../config/db.js';

    const bookingSchema = new mongoose.Schema({
    name: {type: String,required: true,trim: true},
    phone: {type: String,required: true,trim: true},
    email: {type: String,required: true,trim: true,lowercase: true },
    address1: { type: String, required: true, trim: true},
    address2: {type: String,trim: true,default: ''},
    state: {type: String,required: true, trim: true},
    pincode: { type: String, required: true, trim: true},
    bookingId:String,
    bookingDay: {type: String,required: true },
    bookingDate: {type: Date, required: true },
    slotTime: {type: String,required: true},
    baseCharge: { type: Number, required: true },
    gstAmount: { type: Number, required: true},
    totalAmount: { type: Number, required: true },
    paymentId: { type: String,default: null},
    paymentStatus: {type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    bookingStatus: { type: String,enum: ['draft', 'confirmed', 'cancelled', 'completed'],default: 'draft' },
    status: { type: String,enum: ['active', 'inactive'], default: 'active'}
    }, {
    timestamps: true
    });

    const Booking = db.model('Booking', bookingSchema);

    export default Booking;