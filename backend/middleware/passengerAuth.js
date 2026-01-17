const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Passenger not authenticated"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // MUST MATCH routes/passengerAuth.js
    const decoded = jwt.verify(token, "PASSENGER_SECRET");

    req.passenger = decoded; // optional, for future use
    next();

  } catch (err) {
    return res.status(401).json({
      message: "Passenger not authenticated"
    });
  }
};
