const express = require("express");
const jwt = require("jsonwebtoken");
const PassengerOTP = require("../models/PassengerOTP");

const router = express.Router();

/* =============================
   SEND OTP
   ============================= */
router.post("/send-otp", async (req, res) => {
  const { contact } = req.body;

  if (!contact) {
    return res.status(400).json({ message: "Contact required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  await PassengerOTP.deleteMany({ contact });

  await PassengerOTP.create({
    contact,
    otp,
    expiresAt
  });

  // DEVELOPMENT MODE ONLY
  console.log("🔐 Passenger OTP:", otp);

  res.json({ message: "OTP sent successfully" });
});

/* =============================
   VERIFY OTP
   ============================= */
router.post("/verify-otp", async (req, res) => {
  const { contact, otp } = req.body;

  const record = await PassengerOTP.findOne({ contact, otp });

  if (!record || record.expiresAt < new Date()) {
    return res.status(401).json({ message: "Invalid or expired OTP" });
  }

  await PassengerOTP.deleteMany({ contact });

  const token = jwt.sign(
    { contact, role: "PASSENGER" },
    "PASSENGER_SECRET",
    { expiresIn: "2h" }
  );

  res.json({
    message: "OTP verified",
    token
  });
});

module.exports = router;
