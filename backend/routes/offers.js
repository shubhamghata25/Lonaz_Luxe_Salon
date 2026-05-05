/**
 * FILE: backend/routes/offers.js
 * Stores Cloudinary secure_url as image_url — no local disk fallback
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

const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary-v2");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function makeImageUploader() {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "lonaz-luxe/offers",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    },
  });
  return multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
}

// GET /api/offers  — public active offers
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM offers
       WHERE is_active=TRUE AND (expiry_date IS NULL OR expiry_date > NOW())
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/offers/all — admin (all including expired)
router.get("/all", authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM offers ORDER BY created_at DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/offers — multipart (image optional)
router.post("/", authenticate, requireAdmin, (req, res) => {
  const upload = makeImageUploader();
  upload.single("image")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const { title, description, discount, expiry_date } = req.body;
    if (!title || typeof title !== "string" || title.trim().length < 2)
      return res.status(400).json({ error: "title required (min 2 chars)" });
    if (discount !== undefined && (isNaN(Number(discount)) || Number(discount) < 0 || Number(discount) > 100))
      return res.status(400).json({ error: "discount must be 0-100" });
    if (expiry_date && isNaN(Date.parse(expiry_date)))
      return res.status(400).json({ error: "invalid expiry_date" });

    const image_url = req.file ? req.file.path : (req.body.image_url || null);

    try {
      const { rows } = await db.query(
        `INSERT INTO offers (title,description,discount,image_url,expiry_date)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [title, description, discount || 0, image_url, expiry_date || null]
      );
      res.status(201).json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
});

// PATCH /api/offers/:id
router.patch("/:id", authenticate, requireAdmin, (req, res) => {
  const upload = makeImageUploader();
  upload.single("image")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const { title, description, discount, expiry_date, is_active } = req.body;
    const image_url = req.file ? req.file.path : req.body.image_url;

    try {
      const { rows } = await db.query(
        `UPDATE offers SET
           title=COALESCE($1,title), description=COALESCE($2,description),
           discount=COALESCE($3,discount), image_url=COALESCE(NULLIF($4,''),image_url),
           expiry_date=COALESCE($5,expiry_date), is_active=COALESCE($6,is_active)
         WHERE id=$7 RETURNING *`,
        [title, description, discount, image_url, expiry_date, is_active, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
});

// DELETE /api/offers/:id
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query("UPDATE offers SET is_active=FALSE WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
