/**
 * FILE: backend/routes/courses.js  [MODIFIED]
 *
 * Changes from v1:
 *  - GET / now returns offer_price if set
 *  - POST / and PATCH /:id accept offer_price
 *  - DELETE /:id added (soft delete via is_active=false)
 *  - All v1 enroll/access endpoints preserved unchanged
 */
const router = require("express").Router();
const db = require("../config/db");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { body, param, validationResult } = require("express-validator");
const { sendCourseEnrollmentConfirmation } = require("../utils/email");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

// GET /api/courses — public, active only, includes offer_price
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id,title,description,price,offer_price,duration_hrs,
              lesson_count,thumbnail,tag
       FROM courses WHERE is_active=TRUE ORDER BY created_at`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/courses/:id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM courses WHERE id=$1 AND is_active=TRUE", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const course = { ...rows[0] };
    if (!req.headers.authorization) delete course.video_url;
    res.json(course);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/courses/:id/access — enrolled users only
router.get("/:id/access", authenticate, async (req, res) => {
  try {
    const { rows: enroll } = await db.query(
      "SELECT * FROM enrollments WHERE user_id=$1 AND course_id=$2",
      [req.user.id, req.params.id]
    );
    if (!enroll.length && req.user.role !== "admin")
      return res.status(403).json({ error: "Purchase required" });
    const { rows } = await db.query("SELECT * FROM courses WHERE id=$1", [req.params.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/courses/:id/enroll
router.post("/:id/enroll", authenticate, [
  param("id").isUUID().withMessage("invalid course id"),
  body("payment_id").isUUID().withMessage("valid payment_id required"),
], validate, async (req, res) => {
  const { payment_id } = req.body;
  try {
    const { rows: pay } = await db.query(
      "SELECT * FROM payments WHERE id=$1 AND status='success'", [payment_id]
    );
    if (!pay.length) return res.status(402).json({ error: "Payment not verified" });
    const { rows } = await db.query(
      `INSERT INTO enrollments (user_id,course_id,payment_id) VALUES ($1,$2,$3)
       ON CONFLICT (user_id,course_id) DO NOTHING RETURNING *`,
      [req.user.id, req.params.id, payment_id]
    );

    // Send enrollment confirmation email
    const { rows: courseRows } = await db.query("SELECT * FROM courses WHERE id=$1", [req.params.id]);
    const { rows: userRows } = await db.query("SELECT name, email FROM users WHERE id=$1", [req.user.id]);
    if (courseRows.length && userRows.length) {
      sendCourseEnrollmentConfirmation({
        to: userRows[0].email,
        name: userRows[0].name,
        courseTitle: courseRows[0].title,
        amount: courseRows[0].offer_price || courseRows[0].price,
        videoUrl: courseRows[0].video_url,
      }).catch(console.error);
    }

    res.status(201).json(rows[0] || { message: "Already enrolled" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Convert empty string to null for numeric fields
const num = (v) => (v === "" || v === undefined || v === null) ? null : Number(v);

// POST /api/courses (admin)
router.post("/", authenticate, requireAdmin, [
  body("title").trim().isLength({ min: 2, max: 200 }).withMessage("title required (2-200 chars)"),
  body("price").isNumeric({ no_symbols: false }).withMessage("valid price required"),
  body("offer_price").optional({ nullable: true }).isNumeric(),
  body("duration_hrs").optional({ nullable: true }).isNumeric(),
  body("lesson_count").optional({ nullable: true }).isInt({ min: 0 }),
  body("tag").optional().isIn(["BESTSELLER","NEW","POPULAR","SALE",""]).withMessage("invalid tag"),
  body("video_url").optional({ nullable: true }).isURL().withMessage("invalid video URL"),
], validate, async (req, res) => {
  const { title, description, price, offer_price, duration_hrs, lesson_count, thumbnail, video_url, tag } = req.body;
  if (!title || !price) return res.status(400).json({ error: "title and price required" });
  try {
    const { rows } = await db.query(
      `INSERT INTO courses (title,description,price,offer_price,duration_hrs,lesson_count,thumbnail,video_url,tag)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, description, num(price), num(offer_price), num(duration_hrs), num(lesson_count), thumbnail||null, video_url||null, tag||null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/courses/:id (admin)
router.patch("/:id", authenticate, requireAdmin, [
  param("id").isUUID().withMessage("invalid id"),
  body("title").optional().trim().isLength({ min: 2, max: 200 }),
  body("price").optional().isNumeric(),
  body("offer_price").optional({ nullable: true }).isNumeric(),
  body("tag").optional().isIn(["BESTSELLER","NEW","POPULAR","SALE",""]),
], validate, async (req, res) => {
  const { title, description, price, offer_price, duration_hrs, lesson_count, thumbnail, video_url, tag, is_active } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE courses SET
         title=COALESCE($1,title), description=COALESCE($2,description),
         price=COALESCE($3,price), offer_price=COALESCE($4,offer_price),
         duration_hrs=COALESCE($5,duration_hrs), lesson_count=COALESCE($6,lesson_count),
         thumbnail=COALESCE(NULLIF($7,''),thumbnail), video_url=COALESCE(NULLIF($8,''),video_url),
         tag=COALESCE(NULLIF($9,''),tag), is_active=COALESCE($10,is_active)
       WHERE id=$11 RETURNING *`,
      [title||null, description||null, num(price), num(offer_price), num(duration_hrs), num(lesson_count), thumbnail||null, video_url||null, tag||null, is_active??null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/courses/:id (admin — soft delete, NEW)
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query("UPDATE courses SET is_active=FALSE WHERE id=$1", [req.params.id]);
    res.json({ message: "Course removed" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
