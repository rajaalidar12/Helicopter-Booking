const express = require("express");
console.log("✅ adminBookings.js LOADED");

const Booking = require("../models/Booking");
const FlightQuota = require("../models/FlightQuota");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

/* ==========================================
   1. SET DAILY QUOTA (Fixes "Server Failed")
   ========================================== */
router.post("/set-quota", adminAuth, async (req, res) => {
  try {
    const { date, totalSorties, seatsPerSortie } = req.body;

    if (!date || !totalSorties || !seatsPerSortie) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const totalSeats = totalSorties * seatsPerSortie;
    let quota = await FlightQuota.findOne({ date });

    if (quota) {
      // Prevent reducing seats below what is already booked
      if (totalSeats < quota.bookedSeats) {
        return res.status(400).json({ 
          message: `Cannot reduce seats to ${totalSeats}. ${quota.bookedSeats} are already booked.` 
        });
      }
      quota.totalSorties = totalSorties;
      quota.seatsPerSortie = seatsPerSortie;
      quota.totalSeats = totalSeats;
      quota.availableSeats = totalSeats - quota.bookedSeats;
      await quota.save();
    } else {
      quota = new FlightQuota({
        date,
        totalSorties,
        seatsPerSortie,
        totalSeats,
        bookedSeats: 0,
        availableSeats: totalSeats
      });
      await quota.save();
    }

    res.json({ message: "Daily Quota updated successfully" });
  } catch (err) {
    console.error("Set Quota Error:", err);
    res.status(500).json({ message: "Server error setting quota" });
  }
});

/* ==========================================
   2. VIEW ALL BOOKINGS (ADMIN)
   ========================================== */
router.get("/bookings", adminAuth, async (req, res) => {
  // Sort by newest first
  const bookings = await Booking.find().sort({ createdAt: -1 });
  res.json(bookings);
});

/* ==========================================
   3. CANCEL BOOKING (FIXED LOGIC)
   ========================================== */
router.post("/cancel-booking/:ticketNumber", adminAuth, async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    console.log(`📝 Processing Cancel Request for: ${ticketNumber}`);

    // 🔥 FIX: Search by 'ticketNumber', NOT '_id'
    const booking = await Booking.findOne({ ticketNumber });

    if (!booking) {
      console.log("❌ Booking not found in DB");
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status === "CANCELLED") {
      return res.json({ message: "Already cancelled" });
    }

    // 1. Mark as Cancelled
    booking.status = "CANCELLED";
    booking.cancelledBy = "ADMIN";
    await booking.save();

    // 2. Restore Seat to Quota
    const quota = await FlightQuota.findOne({ date: booking.date });
    if (quota) {
      quota.bookedSeats = Math.max(0, quota.bookedSeats - 1);
      quota.availableSeats += 1;
      await quota.save();
      console.log(`✅ Seat restored for ${booking.date}`);
    }

    res.json({ message: "Booking cancelled and seat restored" });
    
  } catch (err) {
    console.error("Cancellation Error:", err);
    res.status(500).json({ message: "Server error during cancellation" });
  }
});

/* ==========================================
   4. SET MONTHLY QUOTA (ADMIN)
   ========================================== */
router.post("/set-monthly-quota", adminAuth, async (req, res) => {
  try {
    // We map 'sorties' from frontend to 'totalSorties' in DB
    const { year, month, sorties, seatsPerSortie } = req.body;

    if (!year || !month || sorties <= 0 || seatsPerSortie <= 0) {
      return res.status(400).json({ message: "Invalid monthly quota data" });
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    let daysUpdated = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const totalSeats = sorties * seatsPerSortie;

      let quota = await FlightQuota.findOne({ date });

      if (!quota) {
        quota = new FlightQuota({
          date,
          totalSorties: sorties,
          seatsPerSortie,
          totalSeats,
          bookedSeats: 0,
          availableSeats: totalSeats
        });
        await quota.save();
        daysUpdated++;
      } else {
        if (totalSeats >= quota.bookedSeats) {
          quota.totalSorties = sorties;
          quota.seatsPerSortie = seatsPerSortie;
          quota.totalSeats = totalSeats;
          quota.availableSeats = totalSeats - quota.bookedSeats;
          await quota.save();
          daysUpdated++;
        }
      }
    }

    res.json({ message: `Monthly quota updated for ${daysUpdated} days`, daysUpdated });

  } catch (err) {
    console.error("Monthly quota error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   5. REPORTS SUMMARY (ADMIN)
   ========================================== */
router.get("/reports/summary", adminAuth, async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: "CONFIRMED" });
    const cancelledBookings = await Booking.countDocuments({ status: "CANCELLED" });

    const quotas = await FlightQuota.find();
    const totalSeats = quotas.reduce((s, q) => s + q.totalSeats, 0);
    const availableSeats = quotas.reduce((s, q) => s + q.availableSeats, 0);

    res.json({
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      totalSeats,
      availableSeats
    });
  } catch (err) {
    res.status(500).json({ message: "Error loading summary" });
  }
});

/* ==========================================
   6. DATE-WISE REPORT (ADMIN)
   ========================================== */
router.get("/reports/date/:date", adminAuth, async (req, res) => {
  try {
    const date = req.params.date;
    const bookings = await Booking.find({ date });
    const quota = await FlightQuota.findOne({ date });

    res.json({
      date,
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === "CONFIRMED").length,
      cancelledBookings: bookings.filter(b => b.status === "CANCELLED").length,
      quota
    });
  } catch (err) {
    res.status(500).json({ message: "Error loading report" });
  }
});


/* ==========================================
   7. PUBLIC LIVE STATS (For Landing Page)
   ========================================== */
router.get("/stats/live", async (req, res) => {
  try {
    // 1. Count Bookings
    const totalBookings = await Booking.countDocuments();
    const confirmed = await Booking.countDocuments({ status: "CONFIRMED" });
    
    // 2. Count Seats from Quotas
    const quotas = await FlightQuota.find();
    const totalSeats = quotas.reduce((sum, q) => sum + q.totalSeats, 0);
    const availableSeats = quotas.reduce((sum, q) => sum + q.availableSeats, 0);

    // 3. Send Public Data (No sensitive info)
    res.json({
      totalBookings,
      confirmed,
      totalSeats,
      availableSeats
    });

  } catch (err) {
    console.error("Live stats error:", err);
    res.status(500).json({ message: "Stats unavailable" });
  }
});

module.exports = router;