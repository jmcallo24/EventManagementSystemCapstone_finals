const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Gmail SMTP configuration using your NEW credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'schoolmanagementsystemii@gmail.com',
    pass: 'btbs anzh sjfi hnyn'  // Your NEW Gmail app password
  }
});

// OTP Email sending endpoint
app.post('/send-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    console.log(`📧 Sending OTP to: ${email}`);
    
    const mailOptions = {
      from: 'schoolmanagementsystemii@gmail.com',
      to: email,
      subject: 'School Event Manager - Login Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">School Event Manager</h2>
          <p>Hello!</p>
          <p>Your verification code is:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 8px;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">School Event Management System</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    console.log(`✅ OTP sent successfully to ${email}`);
    res.json({ success: true, message: 'OTP sent successfully' });
    
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 OTP Email Server running on http://localhost:${PORT}`);
  console.log(`📧 Using email: schoolmanagementsystemii@gmail.com`);
});