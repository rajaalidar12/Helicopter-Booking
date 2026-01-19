const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  actorType: {
    type: String,
    enum: ["ADMIN", "PASSENGER", "SYSTEM"],
    required: true
  },

  actorId: {
    type: String, // admin username / passenger contact
    required: false
  },

  action: {
    type: String, // LOGIN, BOOK, CANCEL, OTP_VERIFY, SET_QUOTA
    required: true
  },

  details: {
    type: Object, // flexible metadata
    default: {}
  },

  ipAddress: {
    type: String
  },

  userAgent: {
    type: String
  },

  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
