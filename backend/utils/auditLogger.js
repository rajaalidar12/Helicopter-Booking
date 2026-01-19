const AuditLog = require("../models/AuditLog");

async function logAudit({
  req,
  actorType,
  actorId,
  action,
  details = {}
}) {
  try {
    await AuditLog.create({
      actorType,
      actorId,
      action,
      details,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });
  } catch (err) {
    // Never block main flow due to logging failure
    console.error("Audit log failed:", err.message);
  }
}

module.exports = { logAudit };
