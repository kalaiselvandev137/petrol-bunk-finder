import nodemailer from 'nodemailer';


const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

export const sendOTPEmail = async (email, otp, customerName, bookingsCount) => {
  try {
    const transporter = getTransporter();
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Booking Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #000000; padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">Booking Verification</h1>
          </div>
          <div style="background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #000000; margin-bottom: 20px;">
              Hello <strong>${customerName}</strong>,
            </p>
            <p style="font-size: 16px; color: #000000; margin-bottom: 20px;">
              Your verification code is:
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #000000;">
              <h1 style="color: #000000; font-size: 42px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            <p style="font-size: 14px; color: #333333;">
              This code will expire in <strong>10 minutes</strong>.
            </p>
            <p style="font-size: 14px; color: #333333; margin-top: 20px;">
              You have <strong>${bookingsCount}</strong> booking(s) associated with this email.
            </p>
            <p style="font-size: 14px; color: #333333; margin-top: 20px;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
        </div>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};


export const sendResendOTPEmail = async (email, otp, customerName) => {
  try {
    const transporter = getTransporter();
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your New Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #000000; padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">New Verification Code</h1>
          </div>
          <div style="background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #000000; margin-bottom: 20px;">
              Hello <strong>${customerName}</strong>,
            </p>
            <p style="font-size: 16px; color: #000000; margin-bottom: 20px;">
              Your new verification code is:
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #000000;">
              <h1 style="color: #000000; font-size: 42px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            <p style="font-size: 14px; color: #333333;">
              This code will expire in <strong>10 minutes</strong>.
            </p>
          </div>
        </div>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};


export const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = getTransporter();
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: htmlContent
    });

    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};