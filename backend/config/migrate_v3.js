/**
 * FILE: backend/config/migrate_v3.js  [NEW]
 * Lonaz Luxe upgrade — categories, videos, expiry on offers, image fields
 */
require("dotenv").config();
const db = require("./db");

const SQL = `
-- ─── categories (Level 1: Men / Women / Child) ───────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  image_url   TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── add category_id + image_url to services ─────────────────────────────────
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_url   TEXT,
  ADD COLUMN IF NOT EXISTS sort_order  INTEGER DEFAULT 0;

-- ─── add description + image_url + sort_order to sub_services ────────────────
ALTER TABLE sub_services
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS image_url   TEXT,
  ADD COLUMN IF NOT EXISTS sort_order  INTEGER DEFAULT 0;

-- ─── videos (Instagram section) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS videos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(200),
  url           TEXT NOT NULL,
  thumbnail_url TEXT,
  platform      VARCHAR(30) DEFAULT 'instagram',
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── add expiry_date to offers ───────────────────────────────────────────────
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;

-- ─── add extra settings keys ─────────────────────────────────────────────────
INSERT INTO admin_settings (key, value) VALUES
  ('footer_tagline',   'Where Beauty Meets Luxury'),
  ('footer_address',   '123 Style Street, Mumbai 400050'),
  ('footer_phone',     '+91 98765 43210'),
  ('footer_email',     'hello@lonazluxe.in'),
  ('instagram_url',    'https://instagram.com/lonazluxe'),
  ('salon_name',       'Lonaz Luxe Salon'),
  ('theme_color',      '#0f3b2f'),
  ('cloudinary_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_active     ON videos(is_active);
`;

const SEED_CATEGORIES = `
INSERT INTO categories (name, description, sort_order) VALUES
  ('Men',    'Premium grooming services for men',     1),
  ('Women',  'Luxury hair and beauty for women',      2),
  ('Child',  'Gentle care for your little ones',      3)
ON CONFLICT DO NOTHING;
`;

async function run() {
  await db.query(SQL);
  await db.query(SEED_CATEGORIES);
}

module.exports = { run };

if (require.main === module) {
  run()
    .then(() => { console.log("✅ v3 migration complete"); process.exit(0); })
    .catch(err => { console.error("❌ v3 migration failed:", err.message); process.exit(1); });
}
