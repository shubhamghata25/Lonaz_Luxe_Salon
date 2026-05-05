const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Authentication required" });

  const token = auth.split(" ")[1];
  if (!token || token.length > 2048)
    return res.status(401).json({ error: "Invalid token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    const msg = e.name === "TokenExpiredError" ? "Session expired. Please login again." : "Invalid token";
    res.status(401).json({ error: msg });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin")
    return res.status(403).json({ error: "Admin access required" });
  next();
};

// Optional auth — attaches user if token present but doesn't block
const optionalAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return next();
  try {
    req.user = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
  } catch {}
  next();
};

module.exports = { authenticate, requireAdmin, optionalAuth };
