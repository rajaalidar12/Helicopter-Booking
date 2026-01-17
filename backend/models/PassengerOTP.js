const mongoose = require("mongoose");

const passengerOTPSchema = new mongoose.Schema({
  contact: { type: String, required: true }, // phone or email
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model("PassengerOTP", passengerOTPSchema);
