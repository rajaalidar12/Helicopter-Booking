const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // ❌ No Authorization header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Passenger not authenticated"
      });
    }

    // ✅ Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Malformed token"
      });
    }

    // ✅ Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_PASSENGER_SECRET
    );

    // 🔐 HARD VALIDATIONS
    if (decoded.role !== "PASSENGER") {
      return res.status(403).json({
        message: "Invalid passenger role"
      });
    }

    if (!decoded.contact) {
      return res.status(401).json({
        message: "Invalid passenger token"
      });
    }

    // ✅ Attach SAFE passenger object
    req.passenger = {
      contact: decoded.contact,
      role: decoded.role
    };

    next();

  } catch (err) {
    console.error("Passenger auth error:", err.message);
    return res.status(401).json({
      message: "Passenger not authenticated"
    });
  }
};
