#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  SmartSalon — One-command Local Setup
#  Usage: bash setup.sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e
GREEN='\033[0;32m' YELLOW='\033[1;33m' RED='\033[0;31m' NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SmartSalon Local Dev Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Check Node.js ─────────────────────────────────
if ! command -v node &>/dev/null; then
  err "Node.js not found. Install from https://nodejs.org (v18+)"
fi
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_VER" -lt 18 ] && err "Node.js v18+ required. Found $(node -v)"
ok "Node.js $(node -v)"

# ── Step 2: Backend .env ──────────────────────────────────
if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  warn "Created backend/.env from example — EDIT IT with your DATABASE_URL before starting!"
else
  ok "backend/.env exists"
fi

# ── Step 3: Frontend .env.local ───────────────────────────
if [ ! -f "frontend/.env.local" ]; then
  cp frontend/.env.local.example frontend/.env.local
  ok "Created frontend/.env.local (uses http://localhost:5000/api)"
else
  ok "frontend/.env.local exists"
fi

# ── Step 4: Install backend deps ──────────────────────────
echo ""
echo "Installing backend dependencies..."
cd backend && npm install --silent && cd ..
ok "Backend dependencies installed"

# ── Step 5: Install frontend deps ─────────────────────────
echo "Installing frontend dependencies..."
cd frontend && npm install --silent && cd ..
ok "Frontend dependencies installed"

# ── Step 6: Validate DATABASE_URL ─────────────────────────
echo ""
DB_URL=$(grep "^DATABASE_URL=" backend/.env | cut -d= -f2-)
if [[ "$DB_URL" == *"user:password"* ]] || [[ -z "$DB_URL" ]]; then
  echo ""
  warn "DATABASE_URL in backend/.env is still the placeholder value."
  echo ""
  echo "  👉 Get a FREE database from: https://neon.tech"
  echo "     1. Sign up → New Project → Region: ap-south-1 (Mumbai)"
  echo "     2. Copy the connection string"
  echo "     3. Paste it into backend/.env as DATABASE_URL"
  echo ""
  echo "  Then re-run: bash setup.sh"
  echo ""
  exit 0
fi
ok "DATABASE_URL is set"

# ── Step 7: Launch both servers ───────────────────────────
echo ""
ok "All ready! Starting servers..."
echo ""
echo "  Backend  → http://localhost:5000"
echo "  Frontend → http://localhost:3000"
echo "  Admin    → http://localhost:3000/admin"
echo ""
echo "  Admin login: check ADMIN_EMAIL + ADMIN_PASSWORD in backend/.env"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo ""

# Start backend in background
cd backend && node server.js &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3

# Start frontend
cd ../frontend && npm run dev &
FRONTEND_PID=$!

# Trap Ctrl+C to kill both
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo 'Servers stopped.'" INT TERM
wait
