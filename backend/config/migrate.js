/**
 * FILE: backend/config/migrate.js  [MODIFIED v2.1]
 * Exports run() so server.js can call it on startup.
 * Still works standalone: node config/migrate.js
 */
require("dotenv").config();
const db = require("./db");

const SQL = `
-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(200) UNIQUE NOT NULL,
  phone       VARCHAR(20),
  password    TEXT NOT NULL,
  role        VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- SERVICES
CREATE TABLE IF NOT EXISTS services (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(120) NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL,
  duration    INTEGER NOT NULL,
  icon        VARCHAR(10),
  category    VARCHAR(60),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- TIME SLOTS CONFIG
CREATE TABLE IF NOT EXISTS time_slot_configs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_time   TIME NOT NULL UNIQUE,
  is_active   BOOLEAN DEFAULT TRUE
);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_ref    VARCHAR(12) UNIQUE NOT NULL,
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  service_id     UUID REFERENCES services(id) ON DELETE SET NULL,
  customer_name  VARCHAR(120) NOT NULL,
  customer_email VARCHAR(200) NOT NULL,
  customer_phone VARCHAR(20),
  booking_date   DATE NOT NULL,
  booking_time   TIME NOT NULL,
  status         VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  notes          TEXT,
  amount         NUMERIC(10,2),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id           UUID REFERENCES bookings(id) ON DELETE CASCADE,
  user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  amount               NUMERIC(10,2) NOT NULL,
  currency             VARCHAR(5) DEFAULT 'INR',
  method               VARCHAR(30),
  status               VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','success','failed','refunded')),
  razorpay_order_id    TEXT,
  razorpay_payment_id  TEXT,
  upi_screenshot_url   TEXT,
  admin_verified       BOOLEAN DEFAULT FALSE,
  admin_note           TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- COURSES
CREATE TABLE IF NOT EXISTS courses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL,
  duration_hrs NUMERIC(5,1),
  lesson_count INTEGER DEFAULT 0,
  thumbnail    TEXT,
  video_url    TEXT,
  tag          VARCHAR(30),
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ENROLLMENTS
CREATE TABLE IF NOT EXISTS enrollments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID REFERENCES courses(id) ON DELETE CASCADE,
  payment_id  UUID REFERENCES payments(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- APPLICATIONS
CREATE TABLE IF NOT EXISTS applications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_title    VARCHAR(120) NOT NULL,
  name         VARCHAR(120) NOT NULL,
  email        VARCHAR(200) NOT NULL,
  phone        VARCHAR(20),
  experience   VARCHAR(50),
  cover_letter TEXT,
  resume_url   TEXT,
  status       VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','reviewed','shortlisted','rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(200) NOT NULL,
  phone      VARCHAR(20),
  subject    VARCHAR(200),
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_bookings_date     ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user     ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking  ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user  ON enrollments(user_id);
`;

async function run() {
  await db.query(SQL);
}

module.exports = { run };

// Allow running directly: node config/migrate.js
if (require.main === module) {
  run()
    .then(() => { console.log("✅ v1 migration complete"); process.exit(0); })
    .catch(err => { console.error("❌ Migration failed:", err.message); process.exit(1); });
}
