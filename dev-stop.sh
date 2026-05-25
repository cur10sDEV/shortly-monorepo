#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()  { echo -e "${GREEN}  ✓ $1${NC}"; }

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"

log "Stopping Shortly dev services (data preserved)..."
docker compose $COMPOSE_FILES stop
ok "Dev services stopped"

log "Stopping PostgreSQL..."
docker compose -f db/docker-compose.yml stop
ok "PostgreSQL stopped"

echo ""
log "──────────────────────────────────────"
log "  All services stopped"
log "  Containers and volumes preserved"
log "  Run ./dev-start.sh to resume"
log "──────────────────────────────────────"
