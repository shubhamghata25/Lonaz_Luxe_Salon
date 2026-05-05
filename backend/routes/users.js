const router = require("express").Router();
const { body, validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};
const db = require("../config/db");
const { authenticate } = require("../middleware/auth");

// GET /api/users/my-bookings
router.get("/my-bookings", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*,s.name AS service_name,s.duration FROM bookings b
       LEFT JOIN services s ON b.service_id=s.id
       WHERE b.user_id=$1 ORDER BY b.booking_date DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/my-courses
router.get("/my-courses", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*,e.enrolled_at FROM enrollments e
       JOIN courses c ON e.course_id=c.id
       WHERE e.user_id=$1`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/users/profile
router.patch("/profile", authenticate, [
  body("name").optional().trim().isLength({ min: 2, max: 120 }).withMessage("name must be 2-120 chars"),
  body("phone").optional().trim().matches(/^[+\d\s\-()]{7,20}$/).withMessage("invalid phone number"),
], validate, async (req, res) => {
  const { name, phone } = req.body;
  try {
    const { rows } = await db.query(
      "UPDATE users SET name=COALESCE($1,name), phone=COALESCE($2,phone), updated_at=NOW() WHERE id=$3 RETURNING id,name,email,phone,role",
      [name, phone, req.user.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
