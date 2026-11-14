
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


export const generateOTPExpiry = (minutes = 10) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};


export const isOTPExpired = (expiryDate) => {
  return new Date() > expiryDate;
};


export const isValidOTPFormat = (otp) => {
  return /^\d{6}$/.test(otp);
};


export const verifyOTPMatch = (inputOTP, storedOTP) => {
  return inputOTP === storedOTP;
};


export const generateOTPData = (minutes = 10) => {
  return {
    otp: generateOTP(),
    otpExpiry: generateOTPExpiry(minutes)
  };
};