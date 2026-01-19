require("dotenv").config();

const express = require("express");
const jwt = require("jsonwebtoken");
const PassengerOTP = require("../models/PassengerOTP");
const { sendOTPEmail } = require("../utils/emailSender");

const {
  otpSendLimiter,
  otpVerifyLimiter
} = require("../middleware/rateLimiter");

const router = express.Router();

/* =============================
   REGEX HELPERS
   ============================= */
const phoneRegex = /^[0-9]{10}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const otpRegex = /^[0-9]{6}$/;

/* =============================
   SEND OTP (EMAIL OR PHONE)
   ============================= */
router.post("/send-otp", otpSendLimiter, async (req, res) => {
  try {
    const { contact } = req.body;

    /* ===== BASIC SAFETY CHECK ===== */
    if (
      typeof contact !== "string" ||
      contact.trim().length === 0 ||
      contact.length > 100
    ) {
      return res.status(400).json({
        message: "Invalid contact input"
      });
    }

    const value = contact.trim();
    const isPhone = phoneRegex.test(value);
    const isEmail = emailRegex.test(value);

    /* ===== FORMAT VALIDATION ===== */
    if (!isPhone && !isEmail) {
      return res.status(400).json({
        message:
          "Enter a valid 10-digit phone number or valid email address"
      });
    }

    /* ===== GENERATE OTP ===== */
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    /* ===== REMOVE OLD OTPs ===== */
    await PassengerOTP.deleteMany({ contact: value });

    /* ===== SAVE OTP ===== */
    await PassengerOTP.create({
      contact: value,
      otp,
      expiresAt
    });

    /* ===== DELIVERY METHOD ===== */
    if (isEmail) {
      // 📧 REAL EMAIL OTP
      await sendOTPEmail(value, otp);
      console.log("📧 Email OTP sent to:", value);
    } else {
      // 📱 PHONE OTP (DEV MODE ONLY)
      console.log("📱 Passenger OTP (DEV MODE):", otp);
    }

    res.json({
      message: "OTP sent successfully"
    });

  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({
      message: "Failed to send OTP"
    });
  }
});

/* =============================
   VERIFY OTP
   ============================= */
router.post("/verify-otp", otpVerifyLimiter, async (req, res) => {
  try {
    const { contact, otp } = req.body;

    /* ===== BASIC SAFETY CHECK ===== */
    if (
      typeof contact !== "string" ||
      typeof otp !== "string" ||
      contact.length > 100 ||
      !otpRegex.test(otp)
    ) {
      return res.status(400).json({
        message: "Invalid OTP request"
      });
    }

    const record = await PassengerOTP.findOne({
      contact: contact.trim(),
      otp
    });

    if (!record || record.expiresAt < new Date()) {
      return res.status(401).json({
        message: "Invalid or expired OTP"
      });
    }

    /* ===== OTP SINGLE USE ===== */
    await PassengerOTP.deleteMany({
      contact: contact.trim()
    });

    /* ===== ISSUE JWT ===== */
    const token = jwt.sign(
      {
        contact: contact.trim(),
        role: "PASSENGER"
      },
      process.env.JWT_PASSENGER_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "OTP verified successfully",
      token
    });

  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({
      message: "OTP verification failed"
    });
  }
});

module.exports = router;
