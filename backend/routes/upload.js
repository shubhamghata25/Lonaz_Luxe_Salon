/**
 * FILE: backend/routes/upload.js
 * Cloudinary image/video upload — returns secure URL
 */
const router = require("express").Router();
const { authenticate, requireAdmin } = require("../middleware/auth");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary-v2");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getUploader(folder = "lonaz-luxe", resourceType = "image") {
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
  return multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
}

// POST /api/upload/image
router.post("/image", authenticate, requireAdmin, (req, res) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return res.status(500).json({ error: "Cloudinary not configured on this server" });
  }
  const folder = req.query.folder || "lonaz-luxe/general";
  const upload = getUploader(folder, "image");
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: req.file.path, filename: req.file.public_id });
  });
});

// POST /api/upload/video
router.post("/video", authenticate, requireAdmin, (req, res) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return res.status(500).json({ error: "Cloudinary not configured on this server" });
  }
  const folder = req.query.folder || "lonaz-luxe/videos";
  const upload = getUploader(folder, "video");
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: req.file.path, filename: req.file.public_id });
  });
});

module.exports = router;
