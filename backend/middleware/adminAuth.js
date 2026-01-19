const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    let token;

    // ✅ Handle BOTH cases safely
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = authHeader; // fallback (old frontend calls)
    }

    if (!token) {
      return res.status(401).json({ message: "Malformed token" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_ADMIN_SECRET
    );

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    req.admin = decoded;
    next();

  } catch (err) {
    console.error("Admin auth error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};
