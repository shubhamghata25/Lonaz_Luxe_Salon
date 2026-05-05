const router = require("express").Router();
const db = require("../config/db");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");

// POST /api/contacts
router.post("/", [
  body("name").trim().isLength({ min: 2 }),
  body("email").isEmail().normalizeEmail(),
  body("message").trim().isLength({ min: 5 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, phone, subject, message } = req.body;
  try {
    await db.query(
      "INSERT INTO contacts (name,email,phone,subject,message) VALUES ($1,$2,$3,$4,$5)",
      [name, email, phone, subject, message]
    );
    res.status(201).json({ message: "Message received. We'll get back to you soon!" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/contacts (admin)
router.get("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM contacts ORDER BY created_at DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/contacts/:id/read (admin)
router.patch("/:id/read", authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query("UPDATE contacts SET is_read=TRUE WHERE id=$1", [req.params.id]);
    res.json({ message: "Marked as read" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
