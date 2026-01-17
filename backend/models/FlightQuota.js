const mongoose = require("mongoose");

const flightQuotaSchema = new mongoose.Schema({
  date: {
    type: String,
    unique: true,
    required: true
  },
  sorties: Number,
  seatsPerSortie: Number,
  totalSeats: Number,
  bookedSeats: Number,
  availableSeats: Number
});

module.exports = mongoose.model("FlightQuota", flightQuotaSchema);
