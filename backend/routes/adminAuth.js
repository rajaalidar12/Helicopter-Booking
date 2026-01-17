const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

/* ===== TEMP ADMIN CREDENTIALS ===== */
const ADMIN_USER = {
  username: "admin",
  password: "admin123"
};

/* ===== ADMIN LOGIN ===== */
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === ADMIN_USER.username &&
    password === ADMIN_USER.password
  ) {
    const token = jwt.sign(
      { role: "ADMIN" },
      "SECRET_KEY",
      { expiresIn: "8h" }
    );

    return res.json({ token });
  }

  res.status(401).json({ message: "Invalid credentials" });
});

module.exports = router;
