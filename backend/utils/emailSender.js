const nodemailer = require("nodemailer");

/* ===============================
   SMTP CONFIG (PORT 587 - SAFE)
   =============================== */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,              // ✅ IMPORTANT
  secure: false,          // ❌ must be false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

/* ===============================
   VERIFY CONNECTION ON START
   =============================== */
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email server connection failed:", error.message);
  } else {
    console.log("✅ Email server ready (SMTP 587)");
  }
});

/* ===============================
   SEND OTP EMAIL
   =============================== */
async function sendOTPEmail(email, otp) {
  await transporter.sendMail({
    from: `"Kashmir Heli Services" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your OTP for Kashmir Heli Services",
    html: `
      <h2>🔐 OTP Verification</h2>
      <p>Your One-Time Password is:</p>
      <h1>${otp}</h1>
      <p>This OTP is valid for <b>5 minutes</b>.</p>
      <p>Do not share this OTP with anyone.</p>
    `
  });
}

/* ===============================
   SEND TICKET EMAIL (PDF)
   =============================== */
async function sendTicketEmail(email, ticketNumber, pdfPath) {
  await transporter.sendMail({
    from: `"Kashmir Heli Services" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Your Helicopter Ticket (${ticketNumber})`,
    html: `
      <h2>✈️ Booking Confirmed</h2>
      <p>Your ticket number: <b>${ticketNumber}</b></p>
      <p>Please find your ticket PDF attached.</p>
    `,
    attachments: [
      {
        filename: `Ticket-${ticketNumber}.pdf`,
        path: pdfPath
      }
    ]
  });
}

/* ===============================
   EXPORTS
   =============================== */
module.exports = {
  sendOTPEmail,
  sendTicketEmail
};
