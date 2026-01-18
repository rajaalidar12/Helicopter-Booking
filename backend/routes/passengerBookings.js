const express = require("express");
const path = require("path");
const fs = require("fs");

const Booking = require("../models/Booking");
const FlightQuota = require("../models/FlightQuota");

const router = express.Router();

/* ==========================================
   VIEW OWN BOOKING (TICKET NUMBER)
   ========================================== */
router.get("/booking/:ticketNumber", async (req, res) => {
  try {
    const booking = await Booking.findOne({
      ticketNumber: req.params.ticketNumber
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);
  } catch (err) {
    console.error("View booking error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   MODIFY BOOKING (DATE + CONTACT ONLY)
   ========================================== */
router.post("/modify-booking/:ticketNumber", async (req, res) => {
  try {
    const { newDate, phone, email } = req.body;

    const booking = await Booking.findOne({
      ticketNumber: req.params.ticketNumber,
      status: "CONFIRMED"
    });

    if (!booking) {
      return res.status(404).json({
        message: "Active booking not found"
      });
    }

    /* ---------- DATE CHANGE ---------- */
    if (newDate && newDate !== booking.date) {
      const oldQuota = await FlightQuota.findOne({ date: booking.date });
      const newQuota = await FlightQuota.findOne({ date: newDate });

      if (!newQuota || newQuota.availableSeats <= 0) {
        return res.status(400).json({
          message: "No seats available on selected new date"
        });
      }

      // Restore old seat
      if (oldQuota) {
        oldQuota.bookedSeats = Math.max(0, oldQuota.bookedSeats - 1);
        oldQuota.availableSeats += 1;
        await oldQuota.save();
      }

      // Deduct new seat
      newQuota.bookedSeats += 1;
      newQuota.availableSeats -= 1;
      await newQuota.save();

      booking.date = newDate;
    }

    /* ---------- CONTACT UPDATE ---------- */
    if (phone) booking.phone = phone;
    if (email) booking.email = email;

    await booking.save();

    res.json({
      message: "Booking modified successfully",
      booking
    });

  } catch (err) {
    console.error("Passenger modify error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   CANCEL BOOKING (PASSENGER)
   ========================================== */
router.post("/cancel-booking/:ticketNumber", async (req, res) => {
  try {
    const booking = await Booking.findOne({
      ticketNumber: req.params.ticketNumber
    });

    if (!booking || booking.status !== "CONFIRMED") {
      return res.status(400).json({
        message: "Active booking not found or already cancelled"
      });
    }

    booking.status = "CANCELLED";
    booking.cancelledBy = "PASSENGER";
    await booking.save();

    // Restore seat
    const quota = await FlightQuota.findOne({ date: booking.date });
    if (quota) {
      quota.bookedSeats = Math.max(0, quota.bookedSeats - 1);
      quota.availableSeats += 1;
      await quota.save();
    }

    res.json({
      message: "Booking cancelled successfully"
    });

  } catch (err) {
    console.error("Passenger cancel error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   DOWNLOAD TICKET PDF  ✅ NEW FEATURE
   ========================================== */
router.get("/download-ticket/:ticketNumber", async (req, res) => {
  try {
    const booking = await Booking.findOne({
      ticketNumber: req.params.ticketNumber
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Adjust path ONLY if your folder name is different
    const pdfPath = path.join(
      __dirname,
      "..",
      "tickets",
      `Ticket-${booking.ticketNumber}.pdf`
    );

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ message: "Ticket PDF not found" });
    }

    res.download(pdfPath, `Ticket-${booking.ticketNumber}.pdf`);

  } catch (err) {
    console.error("Download ticket error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


/* ==========================================
   CHECK SEAT AVAILABILITY (DATE)
   ========================================== */
router.get("/check-availability/:date", async (req, res) => {
  try {
    const { date } = req.params;

    const quota = await FlightQuota.findOne({ date });

    if (!quota) {
      return res.json({
        available: false,
        message: "No flights scheduled for this date"
      });
    }

    if (quota.availableSeats <= 0) {
      return res.json({
        available: false,
        message: "No seats available"
      });
    }

    res.json({
      available: true,
      availableSeats: quota.availableSeats,
      message: `${quota.availableSeats} seats available`
    });

  } catch (err) {
    console.error("Availability check error:", err);
    res.status(500).json({ message: "Server error" });
  }
});





module.exports = router;
