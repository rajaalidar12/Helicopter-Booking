const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Passenger not authenticated" });
    }

    let token;

    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = authHeader;
    }

    if (!token) {
      return res.status(401).json({ message: "Malformed token" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_PASSENGER_SECRET
    );

    if (decoded.role !== "PASSENGER") {
      return res.status(403).json({ message: "Invalid passenger token" });
    }

    req.passenger = decoded;
    next();

  } catch (err) {
    console.error("Passenger auth error:", err.message);
    return res.status(401).json({ message: "Passenger not authenticated" });
  }
};
