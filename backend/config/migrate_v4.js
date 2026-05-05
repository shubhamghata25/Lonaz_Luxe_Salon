/**
 * FILE: backend/config/migrate_v4.js
 * v4 upgrades:
 *  - hero_media table (image/video background for homepage)
 *  - 15-minute slot intervals in time_slot_configs
 *  - slot_count column on bookings (how many 15-min slots service occupies)
 *  - Cloudinary-url columns on categories / offers / services (already TEXT, no-op alters)
 */
require("dotenv").config();
const db = require("./db");

const SQL = `
-- ─── Hero media (admin-uploaded background) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS hero_media (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type       VARCHAR(10) NOT NULL CHECK (type IN ('image','video')),
  url        TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active  BOOLEAN DEFAULT TRUE
);

-- ─── Slot-level duration on services ─────────────────────────────────────────
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS slot_duration INTEGER DEFAULT 30;

-- ─── Discount price on sub_services ──────────────────────────────────────────
ALTER TABLE sub_services
  ADD COLUMN IF NOT EXISTS discount_price NUMERIC(10,2);

-- ─── Booking end_time + slot_count ────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS slot_count   INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS end_time     TIME;

-- ─── Add hero_media_url to admin_settings (convenience key) ──────────────────
INSERT INTO admin_settings (key, value) VALUES
  ('hero_media_url',  ''),
  ('hero_media_type', 'image')
ON CONFLICT (key) DO NOTHING;
`;

async function run() {
  await db.query(SQL);
  await seedTimeSlots();
}

/**
 * Seed 15-minute slots from 09:00 to 20:45
 * Skips if slots already exist to avoid duplicates.
 */
async function seedTimeSlots() {
  const { rows } = await db.query("SELECT COUNT(*) FROM time_slot_configs");
  if (parseInt(rows[0].count) > 0) return; // already seeded

  const slots = [];
  for (let h = 9; h < 21; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }

  for (const slot of slots) {
    await db.query(
      "INSERT INTO time_slot_configs (slot_time, is_active) VALUES ($1, TRUE) ON CONFLICT DO NOTHING",
      [slot]
    );
  }
  console.log(`✅ Seeded ${slots.length} 15-min time slots (09:00–20:45)`);
}

module.exports = { run };

if (require.main === module) {
  run()
    .then(() => { console.log("✅ v4 migration complete"); process.exit(0); })
    .catch(err => { console.error("❌ v4 migration failed:", err.message); process.exit(1); });
}
