#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✓ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
fail() { echo -e "${RED}  ✗ $1${NC}"; exit 1; }

# ─── Prerequisites ──────────────────────────────────────────────

log "Checking prerequisites..."

command -v docker >/dev/null 2>&1 || fail "Docker not found. Install it first."
docker info >/dev/null 2>&1 || fail "Docker daemon not running."

ok "Docker is ready"

# ─── Environment validation ─────────────────────────────────────

log "Checking env files..."
for f in envs/.env.db envs/.env.ticket envs/.env.redirection envs/.env.api envs/.env.consumer; do
  [ -f "$f" ] || warn "Missing $f (using defaults where possible)"
done

# ─── Cleanup handler ────────────────────────────────────────────

cleanup() {
  local exit_code=$?
  echo ""
  if [ $exit_code -ne 0 ]; then
    warn "Startup failed. Run ./stop.sh or 'docker compose down' to clean up."
  fi
  exit $exit_code
}
trap cleanup EXIT

# ─── Start PostgreSQL ───────────────────────────────────────────

log "Starting PostgreSQL..."
docker compose -f db/docker-compose.yml up -d --wait 2>/dev/null || \
  docker compose -f db/docker-compose.yml up -d

sleep 2

# ─── Initialize DB schema if empty ──────────────────────────────

log "Initializing database schema..."
SCHEMA_CHECK=$(docker compose -f db/docker-compose.yml exec -T shortly-main-db \
  psql -U postgres -d shortly-main-db -t -c \
  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'links');" 2>/dev/null || echo "f")

if [ "$SCHEMA_CHECK" != " t" ]; then
  log "Running schema init..."
  docker compose -f db/docker-compose.yml exec -T shortly-main-db \
    psql -U postgres -d shortly-main-db < scripts/db/init.sql
  ok "Schema initialized"
else
  ok "Schema already exists"
fi

# ─── Start Infrastructure (Kafka + Elasticsearch) ──────────────

log "Starting Kafka + Elasticsearch..."
docker compose up -d shortly-kafka shortly-elasticsearch

log "Waiting for Kafka to be healthy (up to 2 min)..."
if ! docker compose wait shortly-kafka --timeout 120 2>/dev/null; then
  warn "Kafka healthcheck timed out. Check 'docker compose logs shortly-kafka'"
fi

log "Waiting for Elasticsearch to be healthy (up to 1 min)..."
if ! docker compose wait shortly-elasticsearch --timeout 60 2>/dev/null; then
  warn "Elasticsearch healthcheck timed out. Check 'docker compose logs shortly-elasticsearch'"
fi

ok "Infrastructure ready"

# ─── Build and Start All Services ───────────────────────────────

log "Building and starting all services (ticket, redirection, api, consumer, frontend)..."
docker compose up -d --build

# ─── Wait for services ──────────────────────────────────────────

log "Waiting for services to be healthy..."

SERVICES=("shortly-ticket-service" "shortly-redirection-service" "shortly-api-service")
for svc in "${SERVICES[@]}"; do
  log "  Waiting for $svc..."
  if docker compose wait "$svc" --timeout 60 2>/dev/null; then
    ok "$svc is healthy"
  else
    warn "$svc healthcheck timed out. Check 'docker compose logs $svc'"
  fi
done

# ─── Summary ────────────────────────────────────────────────────

echo ""
log "=============================================="
log "  Shortly is running!"
log "=============================================="
echo ""
echo -e "  ${CYAN}Frontend:${NC}          http://localhost:3000"
echo -e "  ${CYAN}API Service:${NC}       http://localhost:8080/api/v1"
echo -e "  ${CYAN}Redirection:${NC}       http://localhost:8000"
echo -e "  ${CYAN}Ticket Service:${NC}    http://localhost:5000/api/v1"
echo -e "  ${CYAN}Kafka:${NC}             localhost:9092"
echo -e "  ${CYAN}Elasticsearch:${NC}     http://localhost:9200"
echo -e "  ${CYAN}PostgreSQL:${NC}        localhost:5432"
echo ""
echo -e "  ${YELLOW}Logs:${NC}  docker compose logs -f <service-name>"
echo -e "  ${YELLOW}Stop:${NC}  ./stop.sh"
echo -e "  ${YELLOW}Down:${NC}  docker compose down"
echo ""

# Verify health
log "Quick health check..."
for url in \
  "http://localhost:5000/api/v1/health-check" \
  "http://localhost:8000/api/v1/health-check" \
  "http://localhost:8080/api/v1/health-check" \
  "http://localhost:9200/_cluster/health"; do
  if curl -sf "$url" >/dev/null 2>&1; then
    ok "$url"
  else
    warn "$url not responding"
  fi
done

echo ""
log "${GREEN}Done!${NC}"
