// import Booking from "../models/BookingModel.js";


// export const generateBookingId = async () => {
//   try {
//     const now = new Date();
//     const year = now.getFullYear();
//     const month = String(now.getMonth() + 1).padStart(2, '0');
//     const day = String(now.getDate()).padStart(2, '0');
//     const datePrefix = `${year}${month}${day}`;
//     const prefix = `BK-${datePrefix}-`;
//     const latestBooking = await Booking.findOne({ bookingId: { $regex: `^${prefix}` }}).sort({ bookingId: -1 }).select('bookingId').lean();
//     let sequence = 1;
//     if (latestBooking && latestBooking.bookingId) {
//       const lastSequence = latestBooking.bookingId.split('-')[2];
//       sequence = parseInt(lastSequence) + 1;
//     }
//     const sequenceStr = String(sequence).padStart(5, '0');
//     return `BK-${datePrefix}-${sequenceStr}`;
//   } catch (error) {
//     console.error('Error generating booking ID:', error);
//     throw new Error('Failed to generate booking ID');
//   }
// };


// export const isValidBookingIdFormat = (bookingId) => {
//   if (!bookingId) return false;
//   const regex = /^BK-\d{8}-\d{5}$/;
//   return regex.test(bookingId);
// };


// export const bookingIdExists = async (bookingId) => {
//   try {
//     const count = await Booking.countDocuments({ bookingId });
//     return count > 0;
//   } catch (error) {
//     console.error('Error checking booking ID:', error);
//     throw error;
//   }
// };


// export const generateUniqueBookingId = async (maxRetries = 5) => {
//   let attempts = 0;
//   while (attempts < maxRetries) {
//     try {
//       const bookingId = await generateBookingId();
//       const exists = await bookingIdExists(bookingId);
      
//       if (!exists) {
//         return bookingId;
//       }
//       attempts++;
//       await new Promise(resolve => setTimeout(resolve, 10));
//     } catch (error) {
//       attempts++;
//       if (attempts >= maxRetries) {
//         throw error;
//       }
//     }
//   }
  
//   throw new Error('Failed to generate unique booking ID after multiple attempts');
// };


import Booking from "../models/BookingModel.js";

/**
 * Get the financial year string based on the current date
 * Financial Year: April to March
 * Example: If current date is Nov 2024, FY is 2024-25
 *          If current date is Feb 2024, FY is 2023-24
 */
export const getFinancialYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (0 = January, 3 = April)
  
  // Financial year starts in April (month 3)
  if (currentMonth >= 3) {
    // April to December: FY is current year to next year
    return `${currentYear}-${String(currentYear + 1).slice(-2)}`;
  } else {
    // January to March: FY is previous year to current year
    return `${currentYear - 1}-${String(currentYear).slice(-2)}`;
  }
};

/**
 * Generate a new booking ID in financial year format
 * Format: BK-YYYY-YY-NNNNN
 * Example: BK-2024-25-00001, BK-2024-25-00002, etc.
 */
export const generateBookingId = async () => {
  try {
    const financialYear = getFinancialYear();
    const prefix = `BK-${financialYear}-`;
    
    // Find the latest booking for this financial year
    const latestBooking = await Booking.findOne({ 
      bookingId: { $regex: `^${prefix}` }
    })
    .sort({ bookingId: -1 })
    .select('bookingId')
    .lean();
    
    let sequence = 1;
    
    if (latestBooking && latestBooking.bookingId) {
      // Extract the sequence number from the last booking ID
      const parts = latestBooking.bookingId.split('-');
      const lastSequence = parts[parts.length - 1];
      sequence = parseInt(lastSequence) + 1;
    }
    
    // Format sequence with 5 digits (00001, 00002, etc.)
    const sequenceStr = String(sequence).padStart(5, '0');
    
    return `${prefix}${sequenceStr}`;
  } catch (error) {
    console.error('Error generating booking ID:', error);
    throw new Error('Failed to generate booking ID');
  }
};

/**
 * Validate booking ID format
 * Format: BK-YYYY-YY-NNNNN
 */
export const isValidBookingIdFormat = (bookingId) => {
  if (!bookingId) return false;
  
  // Updated regex for financial year format: BK-YYYY-YY-NNNNN
  const regex = /^BK-\d{4}-\d{2}-\d{5}$/;
  return regex.test(bookingId);
};

/**
 * Check if a booking ID already exists in the database
 */
export const bookingIdExists = async (bookingId) => {
  try {
    const count = await Booking.countDocuments({ bookingId });
    return count > 0;
  } catch (error) {
    console.error('Error checking booking ID:', error);
    throw error;
  }
};

/**
 * Generate a unique booking ID with retry logic
 */
export const generateUniqueBookingId = async (maxRetries = 5) => {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      const bookingId = await generateBookingId();
      const exists = await bookingIdExists(bookingId);
      
      if (!exists) {
        return bookingId;
      }
      
      attempts++;
      // Small delay before retry
      await new Promise(resolve => setTimeout(resolve, 10));
    } catch (error) {
      attempts++;
      if (attempts >= maxRetries) {
        throw error;
      }
    }
  }
  
  throw new Error('Failed to generate unique booking ID after multiple attempts');
};