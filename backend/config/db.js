/**
 * FILE: backend/config/db.js  [MODIFIED v2.1]
 *
 * Supports:
 *  - Neon PostgreSQL  (neon.tech)    — free forever, 0.5GB
 *  - Supabase         (supabase.com) — free forever, 500MB
 *  - Render PostgreSQL (render.com)  — free 90 days only, then paid
 *
 * Neon and Supabase both require SSL — handled automatically below.
 * Connection string format is the same for all three providers.
 */
const { Pool } = require("pg");

// Detect Neon / Supabase from URL (both contain .neon. or supabase.co)
const dbUrl = process.env.DATABASE_URL || "";
const needsSsl = dbUrl.includes("neon.tech") ||
                 dbUrl.includes("supabase.co") ||
                 dbUrl.includes("supabase.in") ||
                 process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: dbUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => console.error("Unexpected DB error", err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
