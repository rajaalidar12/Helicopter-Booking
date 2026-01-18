const express = require("express");
console.log("✅ adminBookings.js LOADED");

const Booking = require("../models/Booking");
const FlightQuota = require("../models/FlightQuota");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

/* ==========================================
   VIEW ALL BOOKINGS (ADMIN)
   ========================================== */
router.get("/bookings", adminAuth, async (req, res) => {
  const bookings = await Booking.find().sort({ createdAt: -1 });
  res.json(bookings);
});

/* ==========================================
   CANCEL BOOKING (ADMIN)
   ========================================== */
router.post("/cancel-booking/:id", adminAuth, async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  if (booking.status === "CANCELLED") {
    return res.json({ message: "Already cancelled" });
  }

  booking.status = "CANCELLED";
  booking.cancelledBy = "ADMIN";
  await booking.save();

  const quota = await FlightQuota.findOne({ date: booking.date });
  if (quota) {
    quota.bookedSeats = Math.max(0, quota.bookedSeats - 1);
    quota.availableSeats += 1;
    await quota.save();
  }

  res.json({ message: "Booking cancelled and seat restored" });
});

/* ==========================================
   SET MONTHLY QUOTA (ADMIN)
   ========================================== */
router.post("/set-monthly-quota", adminAuth, async (req, res) => {
  try {
    const { year, month, sorties, seatsPerSortie } = req.body;

    if (!year || !month || sorties <= 0 || seatsPerSortie <= 0) {
      return res.status(400).json({
        message: "Invalid monthly quota data"
      });
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    let daysUpdated = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date =
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

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
      daysUpdated++;
    }

    res.json({
      message: "Monthly quota created successfully",
      daysUpdated
    });

  } catch (err) {
    console.error("Monthly quota error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   REPORTS SUMMARY (ADMIN)
   ========================================== */
router.get("/reports/summary", adminAuth, async (req, res) => {
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
});

/* ==========================================
   DATE-WISE REPORT (ADMIN)
   ========================================== */
router.get("/reports/date/:date", adminAuth, async (req, res) => {
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
});

/* ==========================================
   🔴 LIVE STATS (PUBLIC – LANDING PAGE)
   ========================================== */
router.get("/stats/live", async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const confirmed = await Booking.countDocuments({ status: "CONFIRMED" });
    const cancelled = await Booking.countDocuments({ status: "CANCELLED" });

    const quotas = await FlightQuota.find();
    const totalSeats = quotas.reduce((s, q) => s + q.totalSeats, 0);
    const availableSeats = quotas.reduce((s, q) => s + q.availableSeats, 0);

    res.json({
      totalBookings,
      confirmed,
      cancelled,
      totalSeats,
      availableSeats
    });
  } catch (err) {
    console.error("Live stats error:", err);
    res.status(500).json({ message: "Stats unavailable" });
  }
});

module.exports = router;
