/********************************************************************
 * KASHMIR HELI SERVICES - FINAL BACKEND
 * Admin + Passenger OTP Auth + Quota + Reports + PDF Ticket + Email
 * SECURITY HARDENED (STEP 0.5 – STABLE)
 ********************************************************************/

require("dotenv").config();

/* ================= CORE ================= */
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

/* ================= SECURITY ================= */
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");


/* ================= FILE UPLOAD ================= */
const multer = require("multer");

/* ================= MODELS ================= */
const Booking = require("./models/Booking");
const FlightQuota = require("./models/FlightQuota");

/* ================= UTILS ================= */
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

/* ================= RATE LIMITERS (STEP 0.6) ================= */

// General API protection
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                // 300 requests / IP
  message: { message: "Too many requests, slow down" }
});

// Booking abuse protection
const bookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,                 // max 10 bookings per IP
  message: { message: "Booking limit exceeded. Try later." }
});

// OTP verification brute-force protection
const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,                  // 5 OTP attempts
  message: { message: "Too many OTP attempts. Try later." }
});

// Admin login brute-force protection
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many admin login attempts" }
});






/* ================= SECURITY HEADERS ================= */
app.use(helmet());

/* =====================================================
   SAFE MANUAL INPUT SANITIZATION (NO req.query TOUCH)
   ===================================================== */
function sanitize(obj) {
  if (!obj || typeof obj !== "object") return;

  for (const key in obj) {
    // Block NoSQL operators
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      continue;
    }

    if (typeof obj[key] === "string") {
      obj[key] = obj[key]
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
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
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

/* ================= HEALTH CHECK ================= */
app.get("/", (req, res) => {
  res.send("🚁 Kashmir Heli Services backend running");
});

/* =================================================
   FILE UPLOAD CONFIG (MULTER – HARDENED)
   ================================================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "idDocument") {
      cb(null, "uploads/idDocs/");
    } else if (file.fieldname === "supportingDocument") {
      cb(null, "uploads/supportingDocs/");
    } else {
      cb(null, "uploads/");
    }
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowedMime = [
      "image/jpeg",
      "image/png",
      "application/pdf"
    ];

    if (!allowedMime.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"), false);
    }

    cb(null, true);
  }
});

/* =================================================
   PASSENGER BOOK FLIGHT (OTP PROTECTED)
   ================================================= */
app.post(
  "/book",
  bookingLimiter,
  passengerAuth,
  upload.fields([
    { name: "idDocument", maxCount: 1 },
    { name: "supportingDocument", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        passengerName,
        age,
        date,
        phone,
        email,
        address,
        from,
        to,
        idType,
        idNumber,
        emergencyName,
        emergencyRelation,
        emergencyPhone
      } = req.body;

      if (!passengerName || !date || !phone || !from || !to) {
        return res.status(400).json({
          message: "Missing required booking details"
        });
      }

      /* ===== QUOTA CHECK ===== */
      const quota = await FlightQuota.findOne({ date });
      if (!quota || quota.availableSeats <= 0) {
        return res.status(400).json({
          message: "No seats available for selected date"
        });
      }

      const ticketNumber =
        "HC-" + Math.floor(100000 + Math.random() * 900000);

      const booking = new Booking({
        passengerName,
        age,
        date,
        phone,
        email,
        address,
        from,
        to,
        idType,
        idNumber,
        emergencyName,
        emergencyRelation,
        emergencyPhone,
        idDocumentPath: req.files?.idDocument?.[0]?.path,
        supportingDocumentPath: req.files?.supportingDocument?.[0]?.path,
        passengerContact: req.passenger.contact,
        ticketNumber,
        status: "CONFIRMED"
      });

      await booking.save();

      quota.bookedSeats += 1;
      quota.availableSeats -= 1;
      await quota.save();

      const pdfPath = await generateTicketPDF(booking);
      if (email) {
        await sendTicketEmail(email, ticketNumber, pdfPath);
      }

      res.json({
        message: "Booking successful",
        ticketNumber
      });

    } catch (err) {
      console.error("❌ Booking error:", err);
      res.status(500).json({
        message: "Server error while booking"
      });
    }
  }
);

/* =================================================
   ADMIN DAILY QUOTA
   ================================================= */
app.post("/admin/set-quota", adminAuth, async (req, res) => {
  try {
    const { date, sorties, seatsPerSortie } = req.body;

    if (!date || sorties <= 0 || seatsPerSortie <= 0) {
      return res.status(400).json({ message: "Invalid quota values" });
    }

    const totalSeats = sorties * seatsPerSortie;
    let quota = await FlightQuota.findOne({ date });

    if (!quota) {
      quota = new FlightQuota({
        date,
        sorties,
        seatsPerSortie,
        totalSeats,
        bookedSeats: 0,
        availableSeats: totalSeats
      });
    } else {
      quota.sorties = sorties;
      quota.seatsPerSortie = seatsPerSortie;
      quota.totalSeats = totalSeats;
      quota.availableSeats = totalSeats - quota.bookedSeats;
    }

    await quota.save();

    res.json({
      message: "Quota updated successfully",
      quota
    });

  } catch (err) {
    console.error("Quota error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= ROUTE REGISTRATION ================= */
app.use("/admin", generalLimiter,adminAuthRoutes);
app.use("/admin", generalLimiter,adminBookingRoutes);
app.use("/passenger-auth", passengerAuthRoutes);
app.use("/passenger", generalLimiter,passengerBookingRoutes);

/* ================= GLOBAL ERROR HANDLER ================= */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    message: err.message || "Unexpected server error"
  });
});

/* ================= START SERVER ================= */
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
});
