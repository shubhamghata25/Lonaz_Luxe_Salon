# SmartSalon — Deployment Guide (Free Forever Stack)

## What Changed from Previous Guide
| Problem | Old (broken) | New (fixed) |
|---|---|---|
| Database costs money after 90 days | Render PostgreSQL | **Neon** (free forever) |
| No shell on Render free tier | Manual `node migrate.js` in shell | **Auto-runs on every startup** |
| Render sleeps after 15 min | No fix | **Self-ping every 14 min** (built into server) |

---

## Free Stack Overview

| Service | What it does | Free limit |
|---|---|---|
| **Vercel** | Frontend hosting | 100GB/mo — unlimited |
| **Render** | Backend (Node.js) | 750 hrs/mo — always on with self-ping |
| **Neon** | PostgreSQL database | 0.5GB storage — **free forever** |
| **Gmail SMTP** | Booking emails | 500/day free |
| **Razorpay** | Payments | No monthly fee, ~2% per txn |

---

## STEP 1 — Push Code to GitHub

```bash
cd smartsalon
git init
git add .
git commit -m "SmartSalon v2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/smartsalon.git
git push -u origin main
```

---

## STEP 2 — Create Free Database on Neon (replaces Render PostgreSQL)

Neon is a serverless PostgreSQL that is **free forever** — no 90-day expiry.

1. Go to **neon.tech** → Sign up free (use GitHub login)
2. Click **New Project**
   - Name: `smartsalon`
   - Region: **AWS ap-south-1** (Mumbai — closest to India)
3. Click **Create Project**
4. On the dashboard, click **Connection Details**
5. Select **Connection string** → copy it. It looks like:
   ```
   postgresql://smartsalon_owner:PASSWORD@ep-xxx.ap-south-1.aws.neon.tech/smartsalon?sslmode=require
   ```
6. **Save this string** — you'll need it in Step 3

> **That's it for the database.** No migrations needed manually — the server runs them automatically on first start.

---

## STEP 3 — Set Up Gmail App Password

1. Go to **myaccount.google.com**
2. **Security** → **2-Step Verification** → Enable
3. **Security** → **App Passwords** → Generate new
4. App: Mail, Device: Other → name it "SmartSalon"
5. Copy the 16-character password (e.g. `abcd efgh ijkl mnop`)

---

## STEP 4 — Deploy Backend on Render

1. Go to **render.com** → Sign up free (use GitHub login)
2. **New** → **Web Service** → connect your GitHub repo
3. Configure:
   - **Name**: `smartsalon-api`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free**

4. Click **Advanced** → Add Environment Variables:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(paste the Neon connection string from Step 2)* |
| `JWT_SECRET` | *(any 32+ char random string — e.g. `SmartSalon2024_xK9mP3qRvL8nZ`)* |
| `JWT_EXPIRES_IN` | `7d` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | *(your Gmail address)* |
| `SMTP_PASS` | *(the 16-char App Password from Step 3)* |
| `OWNER_EMAIL` | *(owner's email — gets new booking alerts)* |
| `ADMIN_EMAIL` | `admin@smartsalon.in` |
| `ADMIN_PASSWORD` | *(choose a strong password)* |
| `FRONTEND_URL` | `https://smartsalon.vercel.app` *(update after Step 5)* |
| `BACKEND_URL` | *(your Render URL — e.g. `https://smartsalon-api.onrender.com`)* |
| `PORT` | `5000` |
| `RAZORPAY_KEY_ID` | *(optional — from Razorpay dashboard)* |
| `RAZORPAY_KEY_SECRET` | *(optional)* |
| `PAYTM_MID` | *(optional — Paytm merchant ID)* |
| `PAYTM_KEY` | *(optional)* |

> **Note on `RENDER_EXTERNAL_URL`**: Render sets this automatically. The built-in self-ping uses it. You do NOT need to add it manually.

5. Click **Create Web Service**
6. Wait ~3 minutes for the build

**What happens automatically on first deploy:**
- `npm install` runs
- `npm start` runs server.js
- server.js calls `runMigrations()` which runs:
  - `migrate.js` → creates all base tables
  - `migrate_v2.js` → adds new columns + tables
  - `seed.js` → inserts admin user + services + time slots
- Server starts listening on port 5000
- Self-ping starts (pings `/api/health` every 14 min to prevent sleep)

**No shell access needed. Zero manual steps.**

7. Copy your backend URL: `https://smartsalon-api.onrender.com`

---

## STEP 5 — Deploy Frontend on Vercel

1. Go to **vercel.com** → Sign up with GitHub
2. **Add New** → **Project** → import your `smartsalon` repo
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework**: Next.js (auto-detected)
4. Add Environment Variables:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://smartsalon-api.onrender.com/api` |
| `NEXT_PUBLIC_RAZORPAY_KEY` | *(Razorpay public key — optional)* |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `919876543210` *(with country code, no +)* |
| `NEXT_PUBLIC_UPI_ID` | `smartsalon@upi` |

5. Click **Deploy** → wait ~2 min
6. Copy your URL: `https://smartsalon.vercel.app`

---

## STEP 6 — Update CORS on Render

1. Render → your service → **Environment**
2. Update `FRONTEND_URL` to your actual Vercel URL
3. Click **Save** → Render redeploys automatically

---

## STEP 7 — Test Your Deployment

Open `https://smartsalon-api.onrender.com/api/health` in browser.

Expected response:
```json
{ "status": "ok", "ts": "2024-04-15T..." }
```

If you see this, the backend + database are working.

Now test the full flow:
```
✅ Homepage loads
✅ /services page shows 6 services (loaded from Neon DB)
✅ /booking — select service → sub-service → date → slot → pay
✅ Confirmation email arrives
✅ /login — use ADMIN_EMAIL + ADMIN_PASSWORD
✅ /admin — all 11 tabs load correctly
✅ Admin Settings tab — change salon name → navbar updates
✅ Admin Offers tab — add offer → appears on homepage
```

---

## About Render Sleep (and why it's fixed)

Render free services sleep after **15 minutes** of no traffic.
When asleep, the first request takes 30–60 seconds to wake up.

**The built-in self-ping fix:** `server.js` pings `/api/health` every **14 minutes** using Node's built-in `https` module — no extra package needed. This keeps the server permanently awake.

The ping only starts when `NODE_ENV=production` and `RENDER_EXTERNAL_URL` (set automatically by Render) is available.

You can verify it's working in Render logs — you'll see:
```
🏓 Keep-alive started — pinging https://smartsalon-api.onrender.com/api/health every 14 min
🏓 Keep-alive ping → 200
🏓 Keep-alive ping → 200
```

---

## Alternative Free Databases

If you ever want to switch from Neon:

| Provider | Free Storage | Notes |
|---|---|---|
| **Neon** (recommended) | 0.5 GB | Serverless, auto-suspends idle compute (not data), Mumbai region |
| **Supabase** | 500 MB | Also free, good dashboard, requires `?sslmode=require` in URL |
| **ElephantSQL** | 20 MB | Very small — only for testing |
| **Railway** | $5 credit/mo | Has a free tier via credits |

All use the same PostgreSQL connection string format. Just swap `DATABASE_URL`.

---

## Local Development

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/smartsalon
cd smartsalon

# 2. Backend
cd backend
cp .env.example .env
# Edit .env — add your Neon DATABASE_URL, Gmail credentials
npm install
npm run dev   # auto-migrates on start, runs on port 5000

# 3. Frontend
cd ../frontend
cp .env.local.example .env.local
# Edit — NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm install
npm run dev   # runs on port 3000

# Open: http://localhost:3000
# Admin: http://localhost:3000/admin
```

---

## Monthly Cost Summary

| Service | Cost |
|---|---|
| Vercel frontend | **₹0** |
| Render backend (with self-ping) | **₹0** |
| Neon PostgreSQL | **₹0** |
| Gmail SMTP | **₹0** |
| Razorpay | ~2% per online txn only |
| Custom domain (optional) | ~₹800/year |
| **Total** | **₹0 / month** |
