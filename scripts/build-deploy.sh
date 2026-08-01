#!/usr/bin/env bash
# =============================================================================
# EDUCONNECT — ONE-CLICK BUILD & DEPLOY SCRIPT
# =============================================================================
# Usage:
#   chmod +x scripts/build-deploy.sh
#   ./scripts/build-deploy.sh [--skip-migrate] [--skip-build]
#
# What it does (in order):
#   1. Validates required environment variables.
#   2. Installs Node dependencies (ci install — reproducible).
#   3. Generates the Prisma client.
#   4. Runs database migrations (prisma migrate deploy).
#   5. Seeds optional default data (admin user, subscription plans).
#   6. Runs TypeScript type-check.
#   7. Runs the Next.js production build.
#   8. Prints a success banner with the next steps.
# =============================================================================

set -euo pipefail
IFS=$'\n\t'

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()   { echo -e "${CYAN}[educonnect]${RESET} $*"; }
ok()    { echo -e "${GREEN}[  OK  ]${RESET} $*"; }
warn()  { echo -e "${YELLOW}[ WARN ]${RESET} $*"; }
error() { echo -e "${RED}[ERROR ]${RESET} $*" >&2; exit 1; }
step()  { echo -e "\n${BOLD}── $* ──────────────────────────────────────────${RESET}"; }

# ── Argument parsing ──────────────────────────────────────────────────────────
SKIP_MIGRATE=false
SKIP_BUILD=false
for arg in "$@"; do
  case $arg in
    --skip-migrate) SKIP_MIGRATE=true ;;
    --skip-build)   SKIP_BUILD=true ;;
    *)              warn "Unknown flag: $arg" ;;
  esac
done

# ── 0. Sanity checks ──────────────────────────────────────────────────────────
step "0/7 — Preflight checks"

command -v node  &>/dev/null || error "Node.js not found. Install v20 LTS."
command -v npm   &>/dev/null || error "npm not found."

NODE_VER=$(node --version | cut -d. -f1 | tr -d 'v')
[[ "$NODE_VER" -ge 20 ]] || error "Node.js 20+ required (found v${NODE_VER})."
ok "Node.js $(node --version) / npm $(npm --version)"

# Required env vars — fail fast before we touch the database.
REQUIRED_VARS=(DATABASE_URL JWT_SECRET)
MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  [[ -z "${!var:-}" ]] && MISSING+=("$var")
done
[[ "${#MISSING[@]}" -gt 0 ]] && \
  error "Missing required environment variables: ${MISSING[*]}\n  Copy .env.production.example to .env and fill in the values."
ok "Required environment variables are set."

# ── 1. Install dependencies ───────────────────────────────────────────────────
step "1/7 — Installing Node dependencies"
npm ci --prefer-offline
ok "Dependencies installed."

# ── 2. Prisma client generation ───────────────────────────────────────────────
step "2/7 — Generating Prisma client"
npx prisma generate
ok "Prisma client generated."

# ── 3. Database migrations ────────────────────────────────────────────────────
if [[ "$SKIP_MIGRATE" == true ]]; then
  warn "Skipping database migrations (--skip-migrate flag set)."
else
  step "3/7 — Running database migrations"
  log "Running: prisma migrate deploy"
  # `migrate deploy` applies pending migrations without interactive prompts —
  # safe in CI and production. It does NOT reset the database.
  npx prisma migrate deploy
  ok "Migrations applied."

  # ── 3a. Optional seed ────────────────────────────────────────────────────
  if [[ -f "prisma/seed.ts" || -f "prisma/seed.js" ]]; then
    log "Running database seed…"
    npx prisma db seed
    ok "Seed complete."
  else
    warn "No prisma/seed file found — skipping seed step."
  fi
fi

# ── 4. TypeScript type-check ──────────────────────────────────────────────────
step "4/7 — TypeScript type-check"
npx tsc --noEmit
ok "TypeScript: 0 errors."

# ── 5. Next.js production build ───────────────────────────────────────────────
if [[ "$SKIP_BUILD" == true ]]; then
  warn "Skipping Next.js build (--skip-build flag set)."
else
  step "5/7 — Building Next.js (production)"
  # NEXT_TELEMETRY_DISABLED prevents the build from phoning home.
  NEXT_TELEMETRY_DISABLED=1 npm run build
  ok "Next.js build complete."
fi

# ── 6. Post-build summary ─────────────────────────────────────────────────────
step "6/7 — Build summary"
if [[ -d ".next" ]]; then
  BUILD_SIZE=$(du -sh .next | cut -f1)
  ok ".next directory: ${BUILD_SIZE}"
fi

# ── 7. Next steps banner ──────────────────────────────────────────────────────
step "7/7 — Deployment ready"
echo ""
echo -e "${GREEN}${BOLD}  ✅  Educonnect is ready to deploy!${RESET}"
echo ""
echo -e "  Vercel:    vercel --prod"
echo -e "  Railway:   railway up"
echo -e "  Docker:    docker build -t educonnect . && docker run -p 3000:3000 educonnect"
echo -e "  PM2:       pm2 start 'npm start' --name educonnect"
echo ""
echo -e "  LiveKit VPS:  docker compose -f docker-compose.livekit.yml up -d"
echo ""
