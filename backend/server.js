require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");
const path      = require("path");
const http      = require("http");
const https     = require("https");

const app = express();
app.set("trust proxy", 1);

// ── SECURITY HEADERS ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // handled by Next.js frontend
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "https://lonazluxesalon.vercel.app",
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Razorpay webhooks)
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin === o || origin.startsWith(o))) return cb(null, true);
    console.warn(`CORS blocked: ${origin}`);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));

// ── BODY PARSING ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── EXTRA SECURITY MIDDLEWARE ────────────────────────────────────────────────
const { blockSuspiciousAgents, preventParamPollution, sanitizeBody, logSuspicious } = require("./middleware/security");
app.use(blockSuspiciousAgents);
app.use(preventParamPollution);
app.use(sanitizeBody);
app.use(logSuspicious);

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,  // FIX: was 10 — too low, locked out real users
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, max: 20,
  message: { error: "Too many uploads. Please slow down." },
});
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  message: { error: "Too many payment requests." },
});

app.use("/api/", limiter);
app.use("/api/auth/", authLimiter);
app.use("/api/upload/", uploadLimiter);
app.use("/api/payments/", paymentLimiter);

// ── REMOVE SENSITIVE HEADERS ─────────────────────────────────────────────────
app.use((req, res, next) => {
  res.removeHeader("X-Powered-By");
  next();
});

// ── STATIC FILES ─────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── ROUTES ───────────────────────────────────────────────────────────────────
app.use("/api/auth",          require("./routes/auth"));
app.use("/api/categories",    require("./routes/categories"));
app.use("/api/services",      require("./routes/services"));
app.use("/api/sub-services",  require("./routes/subservices"));
app.use("/api/bookings",      require("./routes/bookings"));
app.use("/api/timeslots",     require("./routes/timeslots"));
app.use("/api/payments",      require("./routes/payments"));
app.use("/api/courses",       require("./routes/courses"));
app.use("/api/careers",       require("./routes/careers"));
app.use("/api/contacts",      require("./routes/contacts"));
app.use("/api/admin",         require("./routes/admin"));
app.use("/api/users",         require("./routes/users"));
app.use("/api/offers",        require("./routes/offers"));
app.use("/api/settings",      require("./routes/settings"));
app.use("/api/videos",        require("./routes/videos"));
app.use("/api/upload",        require("./routes/upload"));

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", salon: "Lonaz Luxe Salon", ts: new Date() })
);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Never leak stack traces in production
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) console.error(err.stack);
  else console.error(`[ERROR] ${req.method} ${req.path}: ${err.message}`);

  res.status(err.status || 500).json({
    error: isProd ? "Internal server error" : err.message,
  });
});

// ── AUTO-MIGRATE ──────────────────────────────────────────────────────────────
async function runMigrations() {
  try {
    await require("./config/migrate").run();
    await require("./config/migrate_v2").run();
    await require("./config/migrate_v3").run();
    await require("./config/migrate_v4").run();
    await require("./config/migrate_v5").run();
    await require("./config/seed").run();
    console.log("✅ All migrations + seed applied");
  } catch (err) {
    console.error("⚠️  Migration warning:", err.message);
  }
}

// ── KEEP-ALIVE ────────────────────────────────────────────────────────────────
function startKeepAlive() {
  if (process.env.NODE_ENV !== "production") return;
  const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;
  if (!selfUrl) return;
  const pingUrl = `${selfUrl}/api/health`;
  const client  = pingUrl.startsWith("https") ? https : http;
  setInterval(() => {
    client.get(pingUrl, (res) => {
      console.log(`🏓 Keep-alive ping → ${res.statusCode}`);
    }).on("error", (e) => console.error("Keep-alive error:", e.message));
  }, 14 * 60 * 1000);
  console.log(`🏓 Keep-alive started → ${pingUrl}`);
}

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Lonaz Luxe API on port ${PORT}`);
    startKeepAlive();
  });
});
