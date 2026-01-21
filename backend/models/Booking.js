const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    passengerName: String,
    age: Number,
    date: String,
    phone: String,
    email: String,
    address: String,

    ownerContact: {
  type: String,
  required: true,
  index: true
},


    from: String,
    to: String,

    idType: String,
    idNumber: String,
    idDocumentPath: String,
    supportingDocumentPath: String,

    emergencyContact: {
      name: String,
      relation: String,
      phone: String
    },

    ticketNumber: {
      type: String,
      unique: true
    },

    status: {
      type: String,
      default: "CONFIRMED" // CONFIRMED / CANCELLED
    },

    cancelledBy: {
      type: String,
      default: null // ADMIN / PASSENGER
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
