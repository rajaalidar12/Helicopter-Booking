const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(403).json({ message: "Passenger not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, "PASSENGER_SECRET");
    req.passenger = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid passenger token" });
  }
};
