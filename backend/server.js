/********************************************************************
 * KASHMIR HELI SERVICES - FINAL BACKEND (REPORTS + QUOTA STABLE)
 ********************************************************************/

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

/* ================= MODELS ================= */
const Booking = require("./models/Booking");
const FlightQuota = require("./models/FlightQuota");

/* ================= ROUTES ================= */
const adminAuthRoutes = require("./routes/adminAuth");
const adminBookingRoutes = require("./routes/adminBookings");
const passengerBookingRoutes = require("./routes/passengerBookings");

/* ================= MIDDLEWARE ================= */
const adminAuth = require("./middleware/adminAuth");

/* ================= APP ================= */
const app = express();
app.use(cors());
app.use(express.json());

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
   FILE UPLOAD CONFIG (MULTER)
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|pdf/i;
    if (!allowed.test(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, PDF files allowed"));
    }
    cb(null, true);
  }
});

/* =================================================
   PASSENGER BOOK FLIGHT
   ================================================= */
app.post(
  "/book",
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
        ticketNumber,
        status: "CONFIRMED"
      });

      await booking.save();

      quota.bookedSeats += 1;
      quota.availableSeats -= 1;
      await quota.save();

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
   ADMIN DAILY QUOTA (PROTECTED)
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

/* ================= ADMIN ROUTES ================= */
app.use("/admin", adminAuthRoutes);
app.use("/admin", adminBookingRoutes);

/* ================= PASSENGER ROUTES ================= */
app.use("/passenger", passengerBookingRoutes);

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
