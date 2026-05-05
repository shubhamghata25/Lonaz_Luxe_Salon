const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const db     = require("../config/db");
const { authenticate } = require("../middleware/auth");

const sign = (user) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set");
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// Sanitize error — never reveal if email exists or not (prevents enumeration)
const INVALID_CREDS = { error: "Invalid email or password" };

// POST /api/auth/register
router.post("/register", [
  body("name").trim().isLength({ min: 2, max: 60 }).escape(),
  body("email").isEmail().normalizeEmail().isLength({ max: 100 }),
  body("password").isLength({ min: 6, max: 72 }),
  body("phone").optional().isMobilePhone("en-IN"),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { name, email, password, phone } = req.body;
  try {
    const exists = await db.query("SELECT id FROM users WHERE email=$1", [email]);
    if (exists.rows.length) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      "INSERT INTO users (name,email,password,phone) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role,phone,created_at",
      [name, email, hash, phone || null]
    );
    res.status(201).json({ token: sign(rows[0]), user: rows[0] });
  } catch (e) {
    console.error("Register error:", e.message);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty().isLength({ max: 72 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(INVALID_CREDS);

  const { email, password } = req.body;
  try {
    const { rows } = await db.query(
      "SELECT id,name,email,password,role,phone,avatar_url,created_at FROM users WHERE email=$1",
      [email]
    );

    // Always run bcrypt even if user not found — prevents timing attacks
    const dummyHash = "$2a$12$invalidhashtopreventtimingattack00000000000000000000000";
    const valid = rows.length
      ? await bcrypt.compare(password, rows[0].password)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!rows.length || !valid) return res.status(401).json(INVALID_CREDS);

    const { password: _, ...user } = rows[0];
    res.json({ token: sign(user), user });
  } catch (e) {
    console.error("Login error:", e.message);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id,name,email,phone,role,avatar_url,created_at FROM users WHERE id=$1",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PATCH /api/auth/change-password
router.patch("/change-password", authenticate, [
  body("currentPassword").notEmpty(),
  body("newPassword").isLength({ min: 6, max: 72 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { currentPassword, newPassword } = req.body;
  try {
    const { rows } = await db.query("SELECT password FROM users WHERE id=$1", [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query("UPDATE users SET password=$1 WHERE id=$2", [hash, req.user.id]);
    res.json({ message: "Password updated successfully" });
  } catch (e) {
    res.status(500).json({ error: "Failed to update password" });
  }
});

module.exports = router;
