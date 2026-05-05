const router = require("express").Router();
const db = require("../config/db");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { body, param, validationResult } = require("express-validator");
const upload = require("../utils/multer");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

// GET /api/careers/jobs — public
router.get("/jobs", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM jobs WHERE is_active=TRUE ORDER BY created_at DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/careers/jobs (admin)
router.post("/jobs", authenticate, requireAdmin, [
  body("title").trim().isLength({ min: 2, max: 120 }).withMessage("title must be 2-120 chars"),
  body("type").optional().isIn(["Full-time","Part-time","Contract","Internship"]).withMessage("invalid type"),
  body("experience").optional().trim().isLength({ max: 50 }),
  body("salary").optional().trim().isLength({ max: 80 }),
  body("description").optional().trim().isLength({ max: 2000 }),
], validate, async (req, res) => {
  const { title, type, experience, salary, description } = req.body;
  try {
    const { rows } = await db.query(
      "INSERT INTO jobs (title,type,experience,salary,description) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [title, type || "Full-time", experience || null, salary || null, description || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/careers/jobs/:id (admin)
router.patch("/jobs/:id", authenticate, requireAdmin, [
  param("id").isUUID().withMessage("invalid id"),
  body("title").optional().trim().isLength({ min: 2, max: 120 }),
  body("type").optional().isIn(["Full-time","Part-time","Contract","Internship"]),
  body("is_active").optional().isBoolean(),
], validate, async (req, res) => {
  const { title, type, experience, salary, description, is_active } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE jobs SET
         title=COALESCE($1,title), type=COALESCE($2,type),
         experience=COALESCE($3,experience), salary=COALESCE($4,salary),
         description=COALESCE($5,description), is_active=COALESCE($6,is_active)
       WHERE id=$7 RETURNING *`,
      [title||null, type||null, experience||null, salary||null, description||null, is_active??null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/careers/jobs/:id (admin)
router.delete("/jobs/:id", authenticate, requireAdmin, [
  param("id").isUUID().withMessage("invalid id"),
], validate, async (req, res) => {
  try {
    await db.query("UPDATE jobs SET is_active=FALSE WHERE id=$1", [req.params.id]);
    res.json({ message: "Job removed" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/careers/apply — public
router.post("/apply", (req, res, next) => {
  req.uploadFolder = "resumes"; next();
}, upload.single("resume"), [
  body("job_title").trim().isLength({ min: 2, max: 120 }).withMessage("job_title required"),
  body("name").trim().isLength({ min: 2, max: 120 }).withMessage("name must be 2-120 chars"),
  body("email").isEmail().normalizeEmail().withMessage("valid email required"),
  body("phone").optional().trim().isLength({ max: 20 }),
  body("experience").optional().trim().isLength({ max: 50 }),
  body("cover_letter").optional().trim().isLength({ max: 3000 }),
], validate, async (req, res) => {
  const { job_title, name, email, phone, experience, cover_letter } = req.body;
  try {
    const resumeUrl = req.file ? `/uploads/resumes/${req.file.filename}` : null;
    const { rows } = await db.query(
      `INSERT INTO applications (job_title,name,email,phone,experience,cover_letter,resume_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [job_title, name, email, phone||null, experience||null, cover_letter||null, resumeUrl]
    );
    res.status(201).json({ message: "Application submitted successfully", id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/careers/applications (admin)
router.get("/applications", authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM applications ORDER BY created_at DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/careers/applications/:id (admin)
router.patch("/applications/:id", authenticate, requireAdmin, [
  param("id").isUUID().withMessage("invalid id"),
  body("status").isIn(["new","reviewed","shortlisted","rejected"]).withMessage("invalid status"),
], validate, async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE applications SET status=$1 WHERE id=$2 RETURNING *",
      [req.body.status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
