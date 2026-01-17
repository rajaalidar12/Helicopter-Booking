const express = require("express");
const jwt = require("jsonwebtoken");
const PassengerOTP = require("../models/PassengerOTP");

const { sendOTPEmail } = require("../utils/emailSender");



const router = express.Router();

/* =============================
   SEND OTP (EMAIL OR PHONE)
   ============================= */
router.post("/send-otp", async (req, res) => {
  try {
    const { contact } = req.body;

    if (!contact) {
      return res.status(400).json({ message: "Contact required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Remove old OTPs for this contact
    await PassengerOTP.deleteMany({ contact });

    // Save new OTP
    await PassengerOTP.create({
      contact,
      otp,
      expiresAt
    });

    /* =============================
       DECIDE DELIVERY METHOD
       ============================= */
    if (contact.includes("@")) {
      // 📧 REAL EMAIL OTP
      await sendOTPEmail(contact, otp);
      console.log("📧 Email OTP sent to:", contact);
    } else {
      // 📱 PHONE OTP (DEV MODE)
      console.log("📱 Passenger OTP:", otp);
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
router.post("/verify-otp", async (req, res) => {
  try {
    const { contact, otp } = req.body;

    const record = await PassengerOTP.findOne({ contact, otp });

    if (!record || record.expiresAt < new Date()) {
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }

    // OTP can be used only once
    await PassengerOTP.deleteMany({ contact });

    const token = jwt.sign(
      { contact, role: "PASSENGER" },
      "PASSENGER_SECRET",
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
