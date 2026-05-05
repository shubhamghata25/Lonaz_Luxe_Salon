/**
 * Extra security middleware
 *
 * FIXES applied:
 *  1. blockSuspiciousAgents — removed overly broad python-requests match,
 *     added more real scanner signatures
 *  2. preventParamPollution — now skips legitimate array params (category, ids, etc.)
 *  3. sanitizeBody — now correctly recurses into arrays, depth limit raised
 *  4. logSuspicious — unchanged (log only, never block)
 */

// ── 1. Block known scanner / attack tool User-Agents ─────────────────────────
const BLOCKED_AGENTS = [
  "sqlmap", "nikto", "nmap", "masscan", "zgrab",
  "dirbuster", "nuclei", "acunetix", "burpsuite", "havij",
];

const blockSuspiciousAgents = (req, res, next) => {
  const ua = (req.headers["user-agent"] || "").toLowerCase();
  if (BLOCKED_AGENTS.some((b) => ua.includes(b))) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

// ── 2. Prevent parameter pollution ───────────────────────────────────────────
// Whitelist any params that are legitimately multi-value in your app
const ALLOWED_ARRAY_PARAMS = new Set(["ids", "tags", "category"]);

const preventParamPollution = (req, res, next) => {
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (Array.isArray(req.query[key]) && !ALLOWED_ARRAY_PARAMS.has(key)) {
        req.query[key] = req.query[key][req.query[key].length - 1];
      }
    }
  }
  next();
};

// ── 3. Sanitize request body — strip keys starting with $ ────────────────────
// Prevents NoSQL injection-style payloads. Correctly handles arrays.
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === "object" && !(req.body instanceof Buffer)) {
    const sanitize = (obj, depth = 0) => {
      if (depth > 10) return;
      if (Array.isArray(obj)) {
        obj.forEach((item) => {
          if (item && typeof item === "object") sanitize(item, depth + 1);
        });
        return;
      }
      for (const key of Object.keys(obj)) {
        if (key.startsWith("$")) {
          delete obj[key];
        } else if (obj[key] && typeof obj[key] === "object") {
          sanitize(obj[key], depth + 1);
        }
      }
    };
    sanitize(req.body);
  }
  next();
};

// ── 4. Log suspicious activity — NEVER block, just warn ──────────────────────
const SUSPICIOUS_PATTERNS = [
  "<script", "javascript:", "onclick=", "onerror=",
  "etc/passwd", "cmd.exe", "../", "union select", "drop table",
];

const logSuspicious = (req, res, next) => {
  try {
    const payload = JSON.stringify({ ...req.query, ...req.body }).toLowerCase();
    const hit = SUSPICIOUS_PATTERNS.find((s) => payload.includes(s));
    if (hit) {
      console.warn(`⚠️  Suspicious [${hit}]: ${req.method} ${req.path} from ${req.ip}`);
    }
  } catch {}
  next();
};

module.exports = { blockSuspiciousAgents, preventParamPollution, sanitizeBody, logSuspicious };
