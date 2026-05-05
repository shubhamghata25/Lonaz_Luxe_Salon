/**
 * FILE: backend/config/migrate_v2.js  [MODIFIED v2.1]
 * Exports run() so server.js can call it on startup.
 * Still works standalone: node config/migrate_v2.js
 */
require("dotenv").config();
const db = require("./db");

const SQL = `
-- ─── 1. MODIFY bookings ──────────────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS total_amount     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS paid_amount      NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sub_service_id   UUID,
  ADD COLUMN IF NOT EXISTS payment_status   VARCHAR(20) DEFAULT 'unpaid';

-- ─── 2. MODIFY payments ──────────────────────────────────────────────────────
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_method   VARCHAR(30),
  ADD COLUMN IF NOT EXISTS transaction_id   TEXT,
  ADD COLUMN IF NOT EXISTS fee_applied      NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gateway_order_id TEXT;

-- ─── 3. MODIFY courses ───────────────────────────────────────────────────────
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS offer_price NUMERIC(10,2);

-- ─── 4. offers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  discount    VARCHAR(50),
  image_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. sub_services ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sub_services (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name        VARCHAR(120) NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  duration    INTEGER,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. admin_settings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_settings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key        VARCHAR(100) UNIQUE NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. jobs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(120) NOT NULL,
  type        VARCHAR(30) DEFAULT 'Full-time',
  experience  VARCHAR(50),
  salary      VARCHAR(80),
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sub_services_service ON sub_services(service_id);
CREATE INDEX IF NOT EXISTS idx_offers_active        ON offers(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_active          ON jobs(is_active);
`;

const SEED_SETTINGS = `
INSERT INTO admin_settings (key, value) VALUES
  ('salon_name',       'SmartSalon'),
  ('logo_url',         ''),
  ('upi_id',           'smartsalon@upi'),
  ('whatsapp_number',  '919876543210')
ON CONFLICT (key) DO NOTHING;
`;

const SEED_JOBS = `
INSERT INTO jobs (title, type, experience, salary, description) VALUES
  ('Senior Hair Stylist', 'Full-time', '3+ years',  '₹30,000 – ₹50,000/mo', 'Lead client styling sessions, mentor junior staff, and uphold our quality standards.'),
  ('Salon Receptionist',  'Full-time', '1+ year',   '₹18,000 – ₹25,000/mo', 'Manage appointments, greet clients, and maintain a welcoming front-desk environment.'),
  ('Makeup Artist',       'Part-time', '2+ years',  '₹20,000 – ₹35,000/mo', 'Bridal, editorial, and event makeup for a diverse clientele.'),
  ('Colorist',            'Full-time', '2+ years',  '₹25,000 – ₹40,000/mo', 'Expert in balayage, highlights, and color correction techniques.')
ON CONFLICT DO NOTHING;
`;

async function run() {
  await db.query(SQL);
  await db.query(SEED_SETTINGS);
  await db.query(SEED_JOBS);
}

module.exports = { run };

if (require.main === module) {
  run()
    .then(() => { console.log("✅ v2 migration complete"); process.exit(0); })
    .catch(err => { console.error("❌ v2 migration failed:", err.message); process.exit(1); });
}
