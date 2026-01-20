import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";

const app = express();
app.use(cors());
app.use(express.json());

let otpStore = {}; // temp in-memory storage

app.post("/api/send-otp", (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;

  // send OTP via nodemailer...
  console.log(`OTP for ${email}: ${otp}`);
  res.json({ success: true });
});

app.post("/api/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (otpStore[email] && otpStore[email] === otp) {
    delete otpStore[email];
    return res.json({ success: true });
  }
  res.json({ success: false });
});

app.listen(4000, () => console.log("Server running on port 4000"));
