/**
 * FILE: backend/routes/videos.js  [NEW]
 * Instagram/social video section — admin adds URLs, shown on homepage
 */
const router = require("express").Router();
const db = require("../config/db");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { body, param, query, validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};


// GET /api/videos — public, active only
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM videos WHERE is_active=TRUE ORDER BY sort_order, created_at DESC"
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/videos (admin)
router.post("/", authenticate, requireAdmin, [
  body("url").isURL({ require_protocol: true }).withMessage("valid url required"),
  body("title").optional().trim().isLength({ max: 200 }),
  body("platform").optional().isIn(["instagram","youtube","facebook","tiktok"]).withMessage("invalid platform"),
  body("sort_order").optional().isInt({ min: 0 }),
], validate, async (req, res) => {
  const { title, url, thumbnail_url, platform, sort_order } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });
  try {
    const { rows } = await db.query(
      `INSERT INTO videos (title,url,thumbnail_url,platform,sort_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, url, thumbnail_url || null, platform || "instagram", sort_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/videos/:id (admin)
router.patch("/:id", authenticate, requireAdmin, [
  param("id").isUUID().withMessage("invalid id"),
  body("url").optional().isURL({ require_protocol: true }).withMessage("valid url required"),
  body("platform").optional().isIn(["instagram","youtube","facebook","tiktok"]),
  body("is_active").optional().isBoolean(),
], validate, async (req, res) => {
  const { title, url, thumbnail_url, platform, sort_order, is_active } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE videos SET
         title=COALESCE($1,title), url=COALESCE($2,url),
         thumbnail_url=COALESCE($3,thumbnail_url), platform=COALESCE($4,platform),
         sort_order=COALESCE($5,sort_order), is_active=COALESCE($6,is_active)
       WHERE id=$7 RETURNING *`,
      [title, url, thumbnail_url, platform, sort_order, is_active, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/videos/:id (hard delete)
router.delete("/:id", authenticate, requireAdmin, [
  param("id").isUUID().withMessage("invalid id"),
], validate, async (req, res) => {
  try {
    await db.query("DELETE FROM videos WHERE id=$1", [req.params.id]);
    res.json({ message: "Video removed" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
