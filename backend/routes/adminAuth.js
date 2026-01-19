require("dotenv").config();

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const { logAudit } = require("../utils/auditLogger");
const { adminLoginLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

/* ===============================
   ADMIN LOGIN (SECURE + AUDIT)
   =============================== */
router.post("/login", adminLoginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    /* ===== BASIC INPUT VALIDATION ===== */
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      username.length > 50 ||
      password.length > 100
    ) {
      return res.status(400).json({
        message: "Invalid input"
      });
    }

    /* ===== USERNAME CHECK ===== */
    if (username !== process.env.ADMIN_USERNAME) {

      // 🔐 AUDIT FAILED LOGIN (USERNAME)
      await logAudit({
        req,
        actorType: "ADMIN",
        actorId: username || "UNKNOWN",
        action: "ADMIN_LOGIN_FAILED",
        details: { reason: "Invalid username" }
      });

      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    /* ===== PASSWORD CHECK ===== */
    const passwordMatch = bcrypt.compareSync(
      password,
      process.env.ADMIN_PASSWORD_HASH
    );

    if (!passwordMatch) {

      // 🔐 AUDIT FAILED LOGIN (PASSWORD)
      await logAudit({
        req,
        actorType: "ADMIN",
        actorId: username,
        action: "ADMIN_LOGIN_FAILED",
        details: { reason: "Invalid password" }
      });

      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    /* ===== SUCCESSFUL LOGIN ===== */
    await logAudit({
      req,
      actorType: "ADMIN",
      actorId: username,
      action: "ADMIN_LOGIN_SUCCESS"
    });

    /* ===== JWT GENERATION ===== */
    const token = jwt.sign(
      { role: "ADMIN" },
      process.env.JWT_ADMIN_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      message: "Admin login successful",
      token
    });

  } catch (err) {
    console.error("Admin login error:", err);

    // 🔐 AUDIT SYSTEM ERROR
    await logAudit({
      req,
      actorType: "ADMIN",
      actorId: "UNKNOWN",
      action: "ADMIN_LOGIN_ERROR",
      details: { error: err.message }
    });

    res.status(500).json({
      message: "Server error"
    });
  }
});

module.exports = router;
