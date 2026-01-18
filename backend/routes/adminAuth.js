require("dotenv").config();

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const router = express.Router();

/* ===============================
   ADMIN LOGIN (SECURE)
   =============================== */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password required"
      });
    }

    // Check username from ENV
    if (username !== process.env.ADMIN_USERNAME) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    // Compare password hash
    const passwordMatch = bcrypt.compareSync(
      password,
      process.env.ADMIN_PASSWORD_HASH
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    // Generate secure JWT
    const token = jwt.sign(
      { role: "ADMIN" },
      process.env.JWT_ADMIN_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      message: "Admin login successful",
      token
    });

  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({
      message: "Server error"
    });
  }
});

module.exports = router;
