#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✓ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
fail() { echo -e "${RED}  ✗ $1${NC}"; exit 1; }

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"

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
  if [ $exit_code -ne 0 ]; then
    echo ""
    warn "Startup failed. Run ./dev-stop.sh to clean up."
  fi
  exit $exit_code
}
trap cleanup EXIT

# ─── Start PostgreSQL ───────────────────────────────────────────

log "Starting PostgreSQL..."
docker compose -f db/docker-compose.yml up -d --wait 2>/dev/null || \
  docker compose -f db/docker-compose.yml up -d
sleep 3
ok "PostgreSQL is running"

# ─── Initialize DB schema (ranges table) ────────────────────────

log "Initializing database schema (ranges)..."
docker compose -f db/docker-compose.yml exec -T shortly-main-db \
  psql -U postgres -d shortly-main-db < scripts/db/init.sql 2>&1 | grep -v "^DROP\|^CREATE\|^INSERT\|^COMMIT\|^BEGIN\|^NOTICE" || true
ok "Ranges table ready"

# ─── Start Infrastructure (Kafka + ES + Redis) ──────────────────

log "Starting Kafka + Elasticsearch + Redis..."
docker compose $COMPOSE_FILES up -d shortly-kafka shortly-elasticsearch shortly-redis

log "Waiting for Redis (up to 30s)..."
for i in $(seq 1 10); do
  if docker compose exec -T shortly-redis redis-cli ping 2>/dev/null | grep -q PONG; then
    ok "Redis is healthy"
    break
  fi
  [ "$i" -eq 10 ] && warn "Redis not ready yet (will keep trying)"
  sleep 3
done

log "Waiting for Elasticsearch (up to 90s)..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:9200/_cluster/health 2>/dev/null >/dev/null; then
    ok "Elasticsearch is healthy"
    break
  fi
  [ "$i" -eq 30 ] && warn "Elasticsearch not ready yet (will keep trying)"
  sleep 3
done

log "Waiting for Kafka (up to 2 min)..."
for i in $(seq 1 40); do
  if echo 'test' | docker compose exec -T shortly-kafka \
    /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list 2>/dev/null >/dev/null; then
    ok "Kafka is healthy"
    break
  fi
  [ "$i" -eq 40 ] && warn "Kafka not ready yet (will keep trying)"
  sleep 3
done

# ─── Build and Start All Services ───────────────────────────────

log "Building and starting all services (dev mode)..."
docker compose $COMPOSE_FILES up -d --build

# ─── Wait for services to be healthy ────────────────────────────

log "Waiting for HTTP services to respond..."
for svc in "Ticket:5000/api/v1/health-check" "Redirection:8000/api/v1/health-check" "API:8080/api/v1/health-check"; do
  name="${svc%%:*}"
  path="${svc#*:}"
  port="${path%%/*}"
  log "  $name ($path)..."
  for i in $(seq 1 30); do
    if curl -sf "http://localhost/$path" 2>/dev/null >/dev/null; then
      ok "$name is healthy"
      break
    fi
    [ "$i" -eq 30 ] && warn "$name not responding — check 'docker compose logs shortly-$(echo $name | tr '[:upper:]' '[:lower:]')-service'"
    sleep 2
  done
done

# ─── Create links table (depends on better-auth user table) ─────

log "Creating links table (after better-auth migration)..."
docker compose -f db/docker-compose.yml exec -T shortly-main-db \
  psql -U postgres -d shortly-main-db < scripts/db/links.sql 2>&1 | grep -v "^DROP\|^CREATE\|^INSERT\|^COMMIT\|^BEGIN\|^NOTICE\|^psql" || true
ok "Links table ready"

# ─── Summary ────────────────────────────────────────────────────

echo ""
log "=============================================="
log "  Shortly is running in DEV mode!"
log "=============================================="
echo ""
echo -e "  ${CYAN}Frontend:${NC}          http://localhost:3000"
echo -e "  ${CYAN}API Service:${NC}       http://localhost:8080/api/v1"
echo -e "  ${CYAN}Redirection:${NC}       http://localhost:8000"
echo -e "  ${CYAN}Ticket Service:${NC}    http://localhost:5000/api/v1"
echo -e "  ${CYAN}Kafka:${NC}             localhost:9092"
echo -e "  ${CYAN}Elasticsearch:${NC}     http://localhost:9200"
echo -e "  ${CYAN}Redis:${NC}             redis://localhost:6379"
echo -e "  ${CYAN}PostgreSQL:${NC}        localhost:5432"
echo ""
echo -e "  ${YELLOW}Logs:${NC}  docker compose $COMPOSE_FILES logs -f <service-name>"
echo -e "  ${YELLOW}Stop:${NC}  ./dev-stop.sh"
echo -e "  ${YELLOW}Hot reload:${NC} Edit source files — services restart automatically"
echo ""

# ─── Final health check ────────────────────────────────────────

log "Final health check..."
all_ok=true
for url in \
  "http://localhost:5000/api/v1/health-check" \
  "http://localhost:8000/api/v1/health-check" \
  "http://localhost:8080/api/v1/health-check" \
  "http://localhost:9200/_cluster/health"; do
  if curl -sf "$url" >/dev/null 2>&1; then
    ok "$url"
  else
    warn "$url not responding"
    all_ok=false
  fi
done

if echo 'PING' | docker compose exec -T shortly-redis redis-cli 2>/dev/null | grep -q PONG; then
  ok "redis://localhost:6379"
else
  warn "redis://localhost:6379 not responding"
  all_ok=false
fi

if $all_ok; then
  ok "All services healthy"
else
  warn "Some services are not responding — check logs"
fi

echo ""
log "${GREEN}Dev environment ready!${NC}"
