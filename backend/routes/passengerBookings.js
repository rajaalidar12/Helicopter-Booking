console.log("✅ passengerBookings routes loaded");

const express = require("express");
const path = require("path");
const fs = require("fs");

const Booking = require("../models/Booking");
const FlightQuota = require("../models/FlightQuota");
const passengerAuth = require("../middleware/passengerAuth");

// 👇 IMPORT THIS SO WE CAN REGENERATE MISSING TICKETS
const generateTicketPDF = require("../utils/ticketPDF"); 

const router = express.Router();

/* ================= HELPERS ================= */
const ticketRegex = /^HC-\d{6}$/;
const phoneRegex = /^[0-9]{10}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(dateStr) {
  if (!dateRegex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/* ==========================================
   VIEW OWN BOOKING
   ========================================== */
router.get("/booking/:ticketNumber", passengerAuth, async (req, res) => {
  try {
    const ticketNumber = String(req.params.ticketNumber || "").trim();

    if (!ticketRegex.test(ticketNumber)) {
      return res.status(400).json({ message: "Invalid ticket number format" });
    }

    const booking = await Booking.findOne({
      ticketNumber,
      ownerContact: req.passenger.contact
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found or access denied" });
    }

    res.json(booking);

  } catch (err) {
    console.error("View booking error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   MODIFY BOOKING
   ========================================== */
router.post("/modify-booking/:ticketNumber", passengerAuth, async (req, res) => {
  try {
    const ticketNumber = String(req.params.ticketNumber || "").trim();
    let { newDate, phone, email } = req.body;

    if (!ticketRegex.test(ticketNumber)) return res.status(400).json({ message: "Invalid ticket number" });
    if (phone && !phoneRegex.test(phone)) return res.status(400).json({ message: "Invalid phone number" });
    if (email && !emailRegex.test(email)) return res.status(400).json({ message: "Invalid email address" });
    if (newDate && !isValidDate(newDate)) return res.status(400).json({ message: "Invalid date format" });

    const booking = await Booking.findOne({
      ticketNumber,
      status: "CONFIRMED",
      ownerContact: req.passenger.contact
    });

    if (!booking) return res.status(404).json({ message: "Active booking not found or access denied" });

    /* DATE CHANGE LOGIC */
    if (newDate && newDate !== booking.date) {
      const oldQuota = await FlightQuota.findOne({ date: booking.date });
      const newQuota = await FlightQuota.findOne({ date: newDate });

      if (!newQuota || newQuota.availableSeats <= 0) {
        return res.status(400).json({ message: "No seats available on selected new date" });
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

    if (phone) booking.phone = phone;
    if (email) booking.email = email;

    await booking.save();

    // OPTIONAL: Regenerate PDF here since details changed
    await generateTicketPDF(booking);

    res.json({ message: "Booking modified successfully" });

  } catch (err) {
    console.error("Modify booking error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   CANCEL BOOKING
   ========================================== */
router.post("/cancel-booking/:ticketNumber", passengerAuth, async (req, res) => {
  try {
    const ticketNumber = String(req.params.ticketNumber || "").trim();

    if (!ticketRegex.test(ticketNumber)) return res.status(400).json({ message: "Invalid ticket number" });

    const booking = await Booking.findOne({
      ticketNumber,
      status: "CONFIRMED",
      ownerContact: req.passenger.contact
    });

    if (!booking) return res.status(400).json({ message: "Active booking not found or access denied" });

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
    console.error("Cancel booking error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   ✅ DOWNLOAD TICKET (FIXED)
   ========================================== */
router.get("/download-ticket/:ticketNumber", passengerAuth, async (req, res) => {
  try {
    const ticketNumber = String(req.params.ticketNumber || "").trim();

    if (!ticketRegex.test(ticketNumber)) {
      return res.status(400).json({ message: "Invalid ticket number" });
    }

    const booking = await Booking.findOne({
      ticketNumber,
      ownerContact: req.passenger.contact
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found or access denied" });
    }

    // 1. Try to find existing PDF
    let pdfPath = path.join(__dirname, "..", "tickets", `Ticket-${ticketNumber}.pdf`);
    
    // 2. SELF-HEALING: If not found, check alternative name OR regenerate
    if (!fs.existsSync(pdfPath)) {
        console.log(`⚠️ PDF missing for ${ticketNumber}. Regenerating...`);
        
        // Call the generator imported at the top
        // This will create the file at the correct path
        pdfPath = await generateTicketPDF(booking); 
    }

    // 3. Download
    res.download(pdfPath, `Ticket-${ticketNumber}.pdf`);

  } catch (err) {
    console.error("Download ticket error:", err);
    res.status(500).json({ message: "Server error generating ticket" });
  }
});

/* ==========================================
   CHECK SEAT AVAILABILITY
   ========================================== */
router.get("/check-availability/:date", async (req, res) => {
  try {
    const date = String(req.params.date || "").trim();

    if (!isValidDate(date)) {
      return res.json({ available: false, message: "Invalid date format" });
    }

    const quota = await FlightQuota.findOne({ date });
    if (!quota || quota.availableSeats <= 0) {
      return res.json({ available: false, message: "No seats available" });
    }

    res.json({
      available: true,
      availableSeats: quota.availableSeats,
      message: `${quota.availableSeats} seats available`
    });

  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;