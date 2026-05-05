/**
 * FILE: backend/config/migrate_v5.js
 *
 * Fixes:
 * 1. Add price_min / price_max columns to services
 *    (admin-settable range, separate from the base price)
 * 2. Add UNIQUE constraint on categories.name to prevent duplicates
 *    (Screenshot showed Men×3, Women×2, Child×2 — caused by repeated seeding)
 */
require("dotenv").config();
const db = require("./db");

const SQL = `
-- ── Admin-settable price range on services ──────────────────────────────────
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS price_min NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_max NUMERIC(10,2);

-- ── Deduplicate categories by name (keep oldest row per name) ─────────────
-- Step 1: delete duplicates, keeping the row with the earliest created_at
DELETE FROM categories
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM categories
  ORDER BY name, created_at ASC
);

-- Step 2: add unique constraint so it can't happen again
-- (IF NOT EXISTS syntax for index, not constraint — safe to re-run)
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique ON categories (name);
`;

async function run() {
  await db.query(SQL);
}

module.exports = { run };

if (require.main === module) {
  run()
    .then(() => { console.log("✅ v5 migration done"); process.exit(0); })
    .catch(e  => { console.error("❌ v5 failed:", e.message); process.exit(1); });
}
