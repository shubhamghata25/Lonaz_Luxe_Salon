/**
 * FILE: backend/routes/settings.js
 * Logo + hero-media upload via Cloudinary only — no local disk fallback
 */
const router = require("express").Router();
const db = require("../config/db");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { body, param, validationResult } = require("express-validator");

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

function makeUploader(folder, resourceType = "image") {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      resource_type: resourceType,
      allowed_formats: resourceType === "video"
        ? ["mp4", "mov", "webm"]
        : ["jpg", "jpeg", "png", "webp"],
    },
  });
  return multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });
}

// GET /api/settings
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT key, value FROM admin_settings");
    const settings = {};
    rows.forEach((r) => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/settings
router.patch("/", authenticate, requireAdmin, [
  body("salon_name").optional().trim().isLength({ min: 1, max: 120 }),
  body("phone").optional().trim().isLength({ max: 20 }),
  body("email").optional().isEmail().normalizeEmail(),
  body("address").optional().trim().isLength({ max: 500 }),
  body("razorpay_key_public").optional().trim().isLength({ max: 200 }),
], validate, async (req, res) => {
  const allowed = [
    "salon_name", "upi_id", "whatsapp_number",
    "footer_tagline", "footer_address", "footer_phone",
    "footer_email", "instagram_url", "owner_image_url",
  ];
  const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k));
  if (!updates.length)
    return res.status(400).json({ error: "No valid settings provided" });

  try {
    for (const [key, value] of updates) {
      await db.query(
        `INSERT INTO admin_settings (key,value) VALUES ($1,$2)
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, value]
      );
    }
    const { rows } = await db.query("SELECT key, value FROM admin_settings");
    const settings = {};
    rows.forEach((r) => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/settings/logo
router.post(
  "/logo",
  authenticate,
  requireAdmin,
  (req, res, next) => {
    makeUploader("lonaz-luxe/settings", "image").single("logo")(req, res, next);
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Logo file required" });
    try {
      const logoUrl = req.file.path; // Cloudinary secure_url
      await db.query(
        `INSERT INTO admin_settings (key,value) VALUES ('logo_url',$1)
         ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()`,
        [logoUrl]
      );
      res.json({ logo_url: logoUrl });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
);

// GET /api/settings/hero-media
router.get("/hero-media", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM hero_media WHERE is_active=TRUE ORDER BY created_at DESC LIMIT 1"
    );
    res.json(rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/settings/hero-media
router.post(
  "/hero-media",
  authenticate,
  requireAdmin,
  (req, res, next) => {
    const resourceType = req.query.type === "video" ? "video" : "image";
    req._heroType = resourceType;
    makeUploader("lonaz-luxe/hero", resourceType).single("file")(req, res, next);
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "File required" });
    const type = req._heroType || "image";
    const url = req.file.path; // Cloudinary secure_url

    try {
      await db.query("UPDATE hero_media SET is_active=FALSE");
      const { rows } = await db.query(
        "INSERT INTO hero_media (type, url, is_active) VALUES ($1,$2,TRUE) RETURNING *",
        [type, url]
      );
      await db.query(
        `INSERT INTO admin_settings (key,value) VALUES ('hero_media_url',$1)
         ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()`,
        [url]
      );
      await db.query(
        `INSERT INTO admin_settings (key,value) VALUES ('hero_media_type',$1)
         ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()`,
        [type]
      );
      res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
);

// DELETE /api/settings/hero-media
router.delete("/hero-media", authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query("UPDATE hero_media SET is_active=FALSE");
    await db.query(
      `INSERT INTO admin_settings (key,value) VALUES ('hero_media_url','')
       ON CONFLICT (key) DO UPDATE SET value='', updated_at=NOW()`
    );
    res.json({ message: "Hero media cleared" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
