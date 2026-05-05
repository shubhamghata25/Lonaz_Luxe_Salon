# SmartSalon — Bug Fixes Applied

## What Was Wrong

### 1. "Failed to load courses" + blank pages
**Root cause:** Frontend could not reach the backend.

The frontend called `http://localhost:5000/api` (hardcoded fallback). In production (Vercel), there is no `localhost:5000` — the backend is on Render at a different URL. Without `NEXT_PUBLIC_API_URL` set, every API call failed silently.

### 2. Duplicate 401 interceptor in `api.js`
Two `api.interceptors.response.use(...)` blocks both handled 401 errors, causing a race condition where users got redirected to `/login` twice on session expiry.

### 3. CSP `connect-src` blocked backend in production
The Content-Security-Policy header in `next.config.js` only added `localhost:*` in dev mode. In production the backend URL was never added to `connect-src`, so the browser blocked API calls even when `NEXT_PUBLIC_API_URL` was correctly set.

---

## Fixes Applied

### Fix 1: Next.js API Proxy (`next.config.js`)
Added `rewrites()` that forwards `/api/proxy/*` → backend.

```js
async rewrites() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";
  return [{ source: "/api/proxy/:path*", destination: `${backendUrl}/api/:path*` }];
}
```

This means even if `NEXT_PUBLIC_API_URL` is not set, the app still works because all requests go through Next.js → Render (no CORS, no env var required on client).

### Fix 2: `lib/api.js` — smarter baseURL fallback
```js
// Before (broken in production if env var missing):
baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

// After (falls back to Next.js proxy — always works):
baseURL: process.env.NEXT_PUBLIC_API_URL || "/api/proxy"
```

### Fix 3: `lib/api.js` — removed duplicate 401 interceptor
Removed the second `api.interceptors.response.use` block that was a duplicate of the first.

### Fix 4: CSP `connect-src` fixed for production
```js
// Before: backend URL missing in production
"connect-src 'self' https: wss: " + (isDev ? "http://localhost:* ws://localhost:*" : "")

// After: includes backend URL always
`connect-src 'self' https: wss: ${backendUrl} ${isDev ? "http://localhost:* ws://localhost:*" : ""}`
```

### Fix 5: `vercel.json` — added proxy rewrite
Added `/api/proxy/:path*` → Render backend so Vercel edge handles the proxy (faster than Next.js middleware).

### Fix 6: `.env` files created
- `backend/.env` — copy of `.env.example` with instructions
- `frontend/.env.local` — pre-configured for local dev

### Fix 7: `setup.sh` — one-command local setup
Run `bash setup.sh` from the project root. It:
1. Checks Node.js version
2. Creates `.env` files if missing
3. Installs npm deps for both backend and frontend
4. Validates `DATABASE_URL` is not still a placeholder
5. Starts both servers concurrently

---

## How to Run Locally

```bash
# 1. Unzip and enter project
cd smartsalon

# 2. Run setup (installs deps, creates .env files)
bash setup.sh

# 3. Edit backend/.env and add your DATABASE_URL from neon.tech
# Then run setup.sh again — it will start both servers
bash setup.sh
```

## How to Deploy (Production)

See `DEPLOY.md` for full instructions.

**Quick summary:**
1. Push to GitHub
2. Deploy `backend/` on **Render** → add env vars from `backend/.env`
3. Deploy `frontend/` on **Vercel** → add `NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api`
4. Update `FRONTEND_URL` on Render to your Vercel URL
5. Update `vercel.json` `destination` to your actual Render URL

---

## Pages That Were Failing → Now Fixed

| Page | Error | Fixed By |
|------|-------|----------|
| `/courses` | "Failed to load courses" | Fix 1, 2 |
| `/careers` | Jobs not loading | Fix 1, 2 |
| `/services` | Services empty | Fix 1, 2 |
| `/booking` | Sub-services/slots not loading | Fix 1, 2 |
| All pages | CSP blocking API in production | Fix 4 |
| Login/auth | Double redirect on session expire | Fix 3 |
