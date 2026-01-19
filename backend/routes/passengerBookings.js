const express = require("express");
const path = require("path");
const fs = require("fs");

const Booking = require("../models/Booking");
const FlightQuota = require("../models/FlightQuota");

const passengerAuth = require("../middleware/passengerAuth");

const router = express.Router();

/* ======================================================
   HELPER VALIDATORS (STEP 0.5.4)
   ====================================================== */
const ticketRegex = /^HC-\d{6}$/;
const phoneRegex = /^[0-9]{10}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(dateStr) {
  if (!dateRegex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/* ======================================================
   VIEW OWN BOOKING (JWT + TICKET PROTECTED)
   ====================================================== */
router.get(
  "/booking/:ticketNumber",
  passengerAuth,
  async (req, res) => {
    try {
      const ticketNumber = String(req.params.ticketNumber || "").trim();

      if (!ticketRegex.test(ticketNumber)) {
        return res.status(400).json({ message: "Invalid ticket number format" });
      }

      const booking = await Booking.findOne({
        ticketNumber,
        passengerContact: req.passenger.contact
      });

      if (!booking) {
        return res.status(404).json({
          message: "Booking not found or access denied"
        });
      }

      res.json(booking);

    } catch (err) {
      console.error("View booking error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* ======================================================
   MODIFY BOOKING (OWNER ONLY)
   ====================================================== */
router.post(
  "/modify-booking/:ticketNumber",
  passengerAuth,
  async (req, res) => {
    try {
      const ticketNumber = String(req.params.ticketNumber || "").trim();

      if (!ticketRegex.test(ticketNumber)) {
        return res.status(400).json({ message: "Invalid ticket number" });
      }

      let { newDate, phone, email } = req.body;

      if (newDate) newDate = String(newDate).trim();
      if (phone) phone = String(phone).trim();
      if (email) email = String(email).trim();

      if (phone && !phoneRegex.test(phone)) {
        return res.status(400).json({ message: "Invalid phone number" });
      }

      if (email && !emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }

      if (newDate && !isValidDate(newDate)) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const booking = await Booking.findOne({
        ticketNumber,
        passengerContact: req.passenger.contact,
        status: "CONFIRMED"
      });

      if (!booking) {
        return res.status(403).json({
          message: "You are not allowed to modify this booking"
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

        if (oldQuota) {
          oldQuota.bookedSeats = Math.max(0, oldQuota.bookedSeats - 1);
          oldQuota.availableSeats += 1;
          await oldQuota.save();
        }

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
  }
);

/* ======================================================
   CANCEL BOOKING (OWNER ONLY)
   ====================================================== */
router.post(
  "/cancel-booking/:ticketNumber",
  passengerAuth,
  async (req, res) => {
    try {
      const ticketNumber = String(req.params.ticketNumber || "").trim();

      if (!ticketRegex.test(ticketNumber)) {
        return res.status(400).json({ message: "Invalid ticket number" });
      }

      const booking = await Booking.findOne({
        ticketNumber,
        passengerContact: req.passenger.contact,
        status: "CONFIRMED"
      });

      if (!booking) {
        return res.status(403).json({
          message: "You are not allowed to cancel this booking"
        });
      }

      booking.status = "CANCELLED";
      booking.cancelledBy = "PASSENGER";
      await booking.save();

      const quota = await FlightQuota.findOne({ date: booking.date });
      if (quota) {
        quota.bookedSeats = Math.max(0, quota.bookedSeats - 1);
        quota.availableSeats += 1;
        await quota.save();
      }

      res.json({ message: "Booking cancelled successfully" });

    } catch (err) {
      console.error("Passenger cancel error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);


const jwt = require("jsonwebtoken");

router.get("/download-ticket/:ticketNumber", async (req, res) => {
  try {
    const { ticketNumber } = req.params;

    // ✅ Accept token from query OR header
    const token =
      req.query.token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Passenger not authenticated"
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_PASSENGER_SECRET
    );

    const booking = await Booking.findOne({
      ticketNumber,
      contact: decoded.contact   // 🔐 OWNER CHECK
    });

    if (!booking) {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    const pdfPath = path.join(
      __dirname,
      "..",
      "tickets",
      `Ticket-${ticketNumber}.pdf`
    );

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({
        message: "Ticket not found"
      });
    }

    res.download(pdfPath);

  } catch (err) {
    console.error("Download error:", err.message);
    res.status(401).json({
      message: "Invalid or expired token"
    });
  }
});





/* ======================================================
   CHECK SEAT AVAILABILITY (PUBLIC SAFE)
   ====================================================== */
router.get("/check-availability/:date", async (req, res) => {
  try {
    const date = String(req.params.date || "").trim();

    if (!isValidDate(date)) {
      return res.status(400).json({
        available: false,
        message: "Invalid date format"
      });
    }

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
