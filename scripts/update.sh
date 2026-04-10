#!/bin/bash
# CloudRizzle — Update Script
# Run this to deploy new code: bash scripts/update.sh

set -e
GREEN='\033[0;32m'
NC='\033[0m'
log() { echo -e "${GREEN}[Update]${NC} $1"; }

cd /opt/cloudrizzle

log "Pulling latest code..."
git pull origin main

log "Pulling new Docker images..."
docker compose pull backend frontend

log "Applying DB migrations..."
docker compose run --rm backend alembic upgrade head

log "Restarting backend..."
docker compose up -d --no-deps --build backend

log "Restarting frontend..."
docker compose up -d --no-deps --build frontend

log "Waiting for health check..."
sleep 15
curl -sf http://localhost/health && log "✓ Update complete!" || echo "Health check failed"
