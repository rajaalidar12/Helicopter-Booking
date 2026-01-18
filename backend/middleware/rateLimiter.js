const rateLimit = require("express-rate-limit");

/* ===== ADMIN LOGIN LIMIT ===== */
const adminLoginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,                  // 5 attempts
  message: {
    message: "Too many admin login attempts. Try again after 10 minutes."
  }
});

/* ===== PASSENGER OTP SEND LIMIT ===== */
const otpSendLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,                 // 3 OTPs
  message: {
    message: "Too many OTP requests. Please wait 5 minutes."
  }
});

/* ===== PASSENGER OTP VERIFY LIMIT ===== */
const otpVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many OTP verification attempts."
  }
});

module.exports = {
  adminLoginLimiter,
  otpSendLimiter,
  otpVerifyLimiter
};
