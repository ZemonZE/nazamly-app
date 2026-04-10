#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[setup]${NC} $1"; }
warn()    { echo -e "${YELLOW}[setup]${NC} $1"; }
error()   { echo -e "${RED}[setup]${NC} $1"; exit 1; }

# ── Prerequisites ────────────────────────────────────────────────────────────

command -v node  >/dev/null 2>&1 || error "Node.js is not installed. Install it from https://nodejs.org"
command -v npm   >/dev/null 2>&1 || error "npm is not installed."
command -v docker >/dev/null 2>&1 || error "Docker is not installed. Install it from https://docs.docker.com/get-docker/"

# ── .env files ───────────────────────────────────────────────────────────────

info "Setting up .env files..."

if [ ! -f nazamly-backend/.env ]; then
  cp nazamly-backend/.env.example nazamly-backend/.env
  warn "Created nazamly-backend/.env from .env.example — fill in MONGO_URI and other secrets before starting the server."
else
  info "nazamly-backend/.env already exists, skipping."
fi

if [ ! -f nazamly-admin/.env ]; then
  cp nazamly-admin/.env.example nazamly-admin/.env
  info "Created nazamly-admin/.env"
else
  info "nazamly-admin/.env already exists, skipping."
fi

# ── npm install ───────────────────────────────────────────────────────────────

info "Installing backend dependencies..."
npm install --prefix nazamly-backend

info "Installing admin panel dependencies..."
npm install --prefix nazamly-admin

info "Installing student app dependencies..."
npm install --prefix nazamly-front

# ── Piston (Docker) ───────────────────────────────────────────────────────────

info "Starting Piston code execution service..."
docker compose up -d --force-recreate piston

info "Waiting for Piston to be ready..."
for i in $(seq 1 20); do
  if curl -sf http://localhost:2000/api/v2/runtimes >/dev/null 2>&1; then
    info "Piston is up."
    break
  fi
  if [ "$i" -eq 20 ]; then
    error "Piston did not start in time. Check 'docker compose logs piston'."
  fi
  sleep 3
done

info "Installing Piston runtimes (this may take a few minutes)..."

# gcc (C++)
info "Installing gcc (C++) runtime..."
if curl -f --max-time 300 -X POST http://localhost:2000/api/v2/packages \
  -H "Content-Type: application/json" \
  -d '{"language":"gcc","version":"10.2.0"}' 2>&1; then
  info "Installed gcc runtime."
else
  warn "gcc runtime install failed or already installed."
fi

# node (JavaScript)
info "Installing node (JavaScript) runtime..."
if curl -f --max-time 300 -X POST http://localhost:2000/api/v2/packages \
  -H "Content-Type: application/json" \
  -d '{"language":"node","version":"18.15.0"}' 2>&1; then
  info "Installed node runtime."
else
  warn "node runtime install failed or already installed."
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
info "Setup complete. Next steps:"
echo "  1. Fill in nazamly-backend/.env (MONGO_URI, Firebase keys, etc.)"
echo "  2. Start the backend:      npm run dev --prefix nazamly-backend"
echo "  3. Start the admin panel:  npm run dev --prefix nazamly-admin"
echo "  4. Start the student app:  npm run dev --prefix nazamly-front"
echo "  5. Piston is running at:   http://localhost:2000"
