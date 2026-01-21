/********************************************************************
 * KASHMIR HELI SERVICES - STABLE BACKEND
 * Admin + Passenger OTP Auth + Booking + Quota
 * SECURITY HARDENED (STABLE BASELINE)
 ********************************************************************/

require("dotenv").config();

/* ================= CORE ================= */
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs"); // Added fs for file checking

/* ================= SECURITY ================= */
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

/* ================= FILE UPLOAD ================= */
const multer = require("multer");

/* ================= MODELS ================= */
const Booking = require("./models/Booking");
const FlightQuota = require("./models/FlightQuota");

const generateTicketPDF = require("./utils/ticketPDF");
const { sendTicketEmail } = require("./utils/emailSender");


/* ================= ROUTES ================= */
const adminAuthRoutes = require("./routes/adminAuth");
const adminBookingRoutes = require("./routes/adminBookings");
const passengerAuthRoutes = require("./routes/passengerAuth");
const passengerBookingRoutes = require("./routes/passengerBookings");

/* ================= AUTH MIDDLEWARE ================= */
const adminAuth = require("./middleware/adminAuth");
const passengerAuth = require("./middleware/passengerAuth");

/* ================= APP INIT ================= */
const app = express();

/* ================= BASIC MIDDLEWARE ================= */
app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(helmet());

/* ================= RATE LIMITERS ================= */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300
});

const bookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { message: "Too many bookings, try later" }
});


/* ================= SAFE SANITIZATION ================= */
function sanitize(obj) {
  if (!obj || typeof obj !== "object") return;

  for (const key in obj) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      continue;
    }

    if (typeof obj[key] === "string") {
      obj[key] = obj[key].replace(/</g, "&lt;").replace(/>/g, "&gt;");
    } else if (typeof obj[key] === "object") {
      sanitize(obj[key]);
    }
  }
}

app.use((req, res, next) => {
  sanitize(req.body);
  sanitize(req.params);
  next();
});

/* ================= STATIC FILES ================= */
app.use("/uploads", express.static("uploads"));

/* ================= DATABASE ================= */
mongoose
  .connect("mongodb://127.0.0.1:27017/helicopterDB")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  });

/* ================= HEALTH CHECK ================= */
app.get("/", (req, res) => {
  res.send("🚁 Kashmir Heli Services backend running");
});

/* =================================================
   MULTER CONFIG (SAFE)
   ================================================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "idDocument") cb(null, "uploads/idDocs/");
    else if (file.fieldname === "supportingDocument") cb(null, "uploads/supportingDocs/");
    else cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"));
    }
    cb(null, true);
  }
});

/* =================================================
   HELPER: WAIT FUNCTION (Fixes Race Condition)
   ================================================= */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* =================================================
   PASSENGER BOOK FLIGHT (FIXED & STABLE)
   ================================================= */
app.post(
  "/book",
  bookingLimiter,

  // 🔐 AUTH MUST COME FIRST
  passengerAuth,

  // 📎 FILE UPLOAD AFTER AUTH
  upload.fields([
    { name: "idDocument", maxCount: 1 },
    { name: "supportingDocument", maxCount: 1 }
  ]),

  async (req, res) => {
    try {
      if (!req.passenger || !req.passenger.contact) {
        return res.status(401).json({ message: "Passenger not authenticated" });
      }

      const {
        passengerName,
        age,
        date,
        from,
        to,
        idType,
        idNumber,
        emergencyName,
        emergencyRelation,
        emergencyPhone,
        email: formEmail, 
        phone: formPhone
      } = req.body;

      if (!passengerName || !date || !from || !to) {
        return res.status(400).json({ message: "Missing required booking details" });
      }

      const quota = await FlightQuota.findOne({ date });
      if (!quota || quota.availableSeats <= 0) {
        return res.status(400).json({ message: "No seats available" });
      }

      const contact = req.passenger.contact;
      const isEmailLogin = contact.includes("@");
      
      const phone = isEmailLogin ? (formPhone || undefined) : contact;
      const email = isEmailLogin ? contact : (formEmail || undefined);

      const ticketNumber = "HC-" + Math.floor(100000 + Math.random() * 900000);

      const booking = new Booking({
        passengerName,
        age,
        date,
        phone,
        email,
        from,
        to,
        idType,
        idNumber,
        ownerContact: contact,
        emergencyContact: {
          name: emergencyName,
          relation: emergencyRelation,
          phone: emergencyPhone
        },
        idDocumentPath: req.files?.idDocument?.[0]?.path,
        supportingDocumentPath: req.files?.supportingDocument?.[0]?.path,
        ticketNumber,
        status: "CONFIRMED"
      });
      
      await booking.save();

      quota.bookedSeats += 1;
      quota.availableSeats -= 1;
      await quota.save();

      /* ===== GENERATE PDF & EMAIL (WITH DELAY FIX) ===== */
      
      // 1. Generate PDF
      const relativePdfPath = await generateTicketPDF(booking);
      const absolutePdfPath = path.resolve(relativePdfPath);

      // 2. ⏳ SAFETY DELAY: Wait 2 seconds for file to save completely
      console.log("⏳ Waiting for PDF to save...");
      await wait(2000); 

      // 3. Verify existence before sending
      if (email) {
        if (fs.existsSync(absolutePdfPath)) {
            console.log(`📧 Sending ticket to: ${email}`);
            try {
                await sendTicketEmail(email, ticketNumber, absolutePdfPath);
                console.log("✅ Email sent successfully");
            } catch (emailErr) {
                console.error("❌ Email failed:", emailErr.message);
            }
        } else {
            console.error("❌ ERROR: PDF File not found on disk even after waiting!");
            console.error("   Path checked:", absolutePdfPath);
        }
      } else {
          console.log("⚠️ No email provided. Skipping email send.");
      }

      res.json({
        message: "Booking successful",
        ticketNumber
      });

    } catch (err) {
      console.error("❌ Booking error:", err);
      if (err.name === "ValidationError") {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: "Server error while booking" });
    }
  }
);

/* ================= ROUTES ================= */
app.use("/admin", generalLimiter, adminAuthRoutes);
app.use("/admin", generalLimiter, adminBookingRoutes);
app.use("/passenger-auth", generalLimiter, passengerAuthRoutes);
app.use("/passenger", passengerBookingRoutes); 

/* ================= GLOBAL ERROR ================= */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Unexpected server error" });
});

/* ================= START ================= */
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});