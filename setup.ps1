# setup.ps1 — Windows PowerShell setup script
$ErrorActionPreference = "Stop"

function info  { Write-Host "[setup] $args" -ForegroundColor Green }
function warn  { Write-Host "[setup] $args" -ForegroundColor Yellow }
function error { Write-Host "[setup] $args" -ForegroundColor Red; exit 1 }

# ── Prerequisites ─────────────────────────────────────────────────────────────

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    error "Node.js is not installed. Install it from https://nodejs.org"
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    error "npm is not installed."
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    error "Docker is not installed. Install it from https://docs.docker.com/get-docker/"
}
if (-not (Get-Command curl -ErrorAction SilentlyContinue)) {
    error "curl is not installed. It comes with Windows 10+. Make sure it's in your PATH."
}

# ── .env files ────────────────────────────────────────────────────────────────

info "Setting up .env files..."

if (-not (Test-Path "nazamly-backend\.env")) {
    Copy-Item "nazamly-backend\.env.example" "nazamly-backend\.env"
    warn "Created nazamly-backend\.env from .env.example — fill in MONGO_URI and other secrets before starting the server."
} else {
    info "nazamly-backend\.env already exists, skipping."
}

if (-not (Test-Path "nazamly-admin\.env")) {
    Copy-Item "nazamly-admin\.env.example" "nazamly-admin\.env"
    info "Created nazamly-admin\.env"
} else {
    info "nazamly-admin\.env already exists, skipping."
}

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
$ready = $false
for ($i = 1; $i -le 20; $i++) {
    try {
        $response = curl -sf http://localhost:2000/api/v2/runtimes 2>$null
        if ($LASTEXITCODE -eq 0) {
            info "Piston is up."
            $ready = $true
            break
        }
    } catch {}
    if ($i -eq 20) {
        error "Piston did not start in time. Check 'docker compose logs piston'."
    }
    Start-Sleep -Seconds 3
}

info "Installing Piston runtimes (this may take a few minutes)..."

# gcc (C++)
info "Installing gcc (C++) runtime..."
try {
    curl -f --max-time 300 -X POST http://localhost:2000/api/v2/packages `
        -H "Content-Type: application/json" `
        -d '{"language":"gcc","version":"10.2.0"}'
    info "Installed gcc runtime."
} catch {
    warn "gcc runtime install failed or already installed."
}

# node (JavaScript)
info "Installing node (JavaScript) runtime..."
try {
    curl -f --max-time 300 -X POST http://localhost:2000/api/v2/packages `
        -H "Content-Type: application/json" `
        -d '{"language":"node","version":"18.15.0"}'
    info "Installed node runtime."
} catch {
    warn "node runtime install failed or already installed."
}

# ── Done ──────────────────────────────────────────────────────────────────────

Write-Host ""
info "Setup complete. Next steps:"
Write-Host "  1. Fill in nazamly-backend\.env (MONGO_URI, Firebase keys, etc.)"
Write-Host "  2. Start the backend:      npm run dev --prefix nazamly-backend"
Write-Host "  3. Start the admin panel:  npm run dev --prefix nazamly-admin"
Write-Host "  4. Start the student app:  npm run dev --prefix nazamly-front"
Write-Host "  5. Piston is running at:   http://localhost:2000"