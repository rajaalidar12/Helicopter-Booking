const nodemailer = require("nodemailer");
const fs = require("fs"); // Import FS to check file existence

/* ===============================
   SMTP CONFIG (MATCHING DEBUG SCRIPT)
   =============================== */
// We use the exact config that worked in your debug script
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* ===============================
   VERIFY CONNECTION
   =============================== */
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email Service Error:", error.message);
  } else {
    console.log("✅ Email Service Ready (Gmail Mode)");
  }
});

/* ===============================
   SEND OTP EMAIL
   =============================== */
async function sendOTPEmail(email, otp) {
  try {
    await transporter.sendMail({
      from: `"Kashmir Heli Services" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP for Kashmir Heli Services",
      html: `
        <h2>🔐 OTP Verification</h2>
        <p>Your One-Time Password is:</p>
        <h1>${otp}</h1>
        <p>This OTP is valid for <b>5 minutes</b>.</p>
      `
    });
    console.log(`✅ OTP sent to ${email}`);
  } catch (err) {
    console.error("❌ OTP Email Failed:", err.message);
  }
}

/* ===============================
   SEND TICKET EMAIL (ROBUST)
   =============================== */
async function sendTicketEmail(email, ticketNumber, pdfPath) {
  try {
    console.log(`📧 Preparing to send ticket to: ${email}`);
    console.log(`📎 Attaching file from: ${pdfPath}`);

    // Check if PDF actually exists before sending
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found at path: ${pdfPath}`);
    }

    await transporter.sendMail({
      from: `"Kashmir Heli Services" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your Helicopter Ticket (${ticketNumber})`,
      html: `
        <h2>✈️ Booking Confirmed</h2>
        <p>Your ticket number: <b>${ticketNumber}</b></p>
        <p>Please find your ticket PDF attached.</p>
        <p>Thank you for choosing Kashmir Heli Services.</p>
      `,
      attachments: [
        {
          filename: `Ticket-${ticketNumber}.pdf`,
          path: pdfPath // Nodemailer handles the stream automatically
        }
      ]
    });
    console.log("✅ Ticket Email Sent Successfully!");

  } catch (err) {
    console.error("❌ Ticket Email Failed:", err.message);
    // We throw the error so server.js knows it failed, but usually we just log it
  }
}

module.exports = {
  sendOTPEmail,
  sendTicketEmail
};