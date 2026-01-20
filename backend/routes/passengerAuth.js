const express = require("express");
const jwt = require("jsonwebtoken");
const PassengerOTP = require("../models/PassengerOTP");

const { sendOTPEmail } = require("../utils/emailSender");
const {
  otpSendLimiter,
  otpVerifyLimiter
} = require("../middleware/rateLimiter");

const router = express.Router();

/* =====================================================
   REGEX (SINGLE SOURCE OF TRUTH)
   ===================================================== */
const phoneRegex = /^[0-9]{10}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* =============================
   SEND OTP (EMAIL OR PHONE)
   ============================= */
router.post("/send-otp", otpSendLimiter, async (req, res) => {
  try {
    const { contact } = req.body;

    /* ---------- BASIC CHECK ---------- */
    if (!contact || typeof contact !== "string") {
      return res.status(400).json({
        message: "Email or phone number is required"
      });
    }

    const value = contact.trim();

    const isPhone = phoneRegex.test(value);
    const isEmail = emailRegex.test(value);

    /* ---------- STRICT VALIDATION ---------- */
    if (!isPhone && !isEmail) {
      return res.status(400).json({
        message: "Enter a valid 10-digit phone number or email address"
      });
    }

    /* ---------- GENERATE OTP ---------- */
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    /* ---------- REMOVE OLD OTPs ---------- */
    await PassengerOTP.deleteMany({ contact: value });

    /* ---------- SAVE OTP ---------- */
    await PassengerOTP.create({
      contact: value,
      otp,
      expiresAt
    });

    /* ---------- SEND OTP ---------- */
    if (isEmail) {
      await sendOTPEmail(value, otp);
      console.log("📧 Email OTP sent to:", value);
    } else {
      // 📱 DEV MODE SMS
      console.log("📱 Passenger OTP (DEV MODE):", otp);
    }

    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

/* =============================
   VERIFY OTP
   ============================= */
router.post("/verify-otp", otpVerifyLimiter, async (req, res) => {
  try {
    const { contact, otp } = req.body;

    if (!contact || !otp) {
      return res.status(400).json({
        message: "Contact and OTP required"
      });
    }

    const value = contact.trim();

    const record = await PassengerOTP.findOne({
      contact: value,
      otp
    });

    if (!record || record.expiresAt < new Date()) {
      return res.status(401).json({
        message: "Invalid or expired OTP"
      });
    }

    /* ---------- OTP CAN BE USED ONLY ONCE ---------- */
    await PassengerOTP.deleteMany({ contact: value });

    /* ---------- ISSUE JWT ---------- */
    const token = jwt.sign(
      { contact: value, role: "PASSENGER" },
      process.env.JWT_PASSENGER_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "OTP verified successfully",
      token
    });

  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ message: "OTP verification failed" });
  }
});

module.exports = router;
