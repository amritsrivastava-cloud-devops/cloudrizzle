#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# CloudRizzle — EC2 Server Setup Script
# Run this ONCE on a fresh Ubuntu 22.04 EC2 instance
# Usage: bash deploy.sh
# ═══════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[CloudRizzle]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

log "═══════════════════════════════════════"
log "  CloudRizzle EC2 Setup"
log "═══════════════════════════════════════"

# ── 1. System Update ─────────────────────────────────────────
log "Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# ── 2. Install Docker ────────────────────────────────────────
if ! command -v docker &> /dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    log "Docker installed ✓"
else
    log "Docker already installed ✓"
fi

# ── 3. Install Docker Compose ────────────────────────────────
if ! command -v docker compose &> /dev/null; then
    log "Installing Docker Compose..."
    sudo apt-get install -y docker-compose-plugin
    log "Docker Compose installed ✓"
fi

# ── 4. Create project directory ──────────────────────────────
log "Creating project directory..."
sudo mkdir -p /opt/cloudrizzle
sudo chown $USER:$USER /opt/cloudrizzle

# ── 5. Clone repo ────────────────────────────────────────────
log "Cloning repository..."
if [ -d "/opt/cloudrizzle/.git" ]; then
    warn "Repo already exists — pulling latest..."
    cd /opt/cloudrizzle && git pull
else
    git clone https://github.com/yourusername/cloudrizzle.git /opt/cloudrizzle
fi

# ── 6. Create .env file ──────────────────────────────────────
cd /opt/cloudrizzle

if [ ! -f ".env" ]; then
    log "Creating .env file from template..."
    cp .env.example .env
    warn "⚠️  IMPORTANT: Edit /opt/cloudrizzle/.env with your actual values!"
    warn "   nano /opt/cloudrizzle/.env"
    read -p "Press ENTER after editing .env to continue..."
fi

# ── 7. Create SSL directory ──────────────────────────────────
mkdir -p nginx/ssl

# ── 8. Configure firewall ────────────────────────────────────
log "Configuring UFW firewall..."
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable
log "Firewall configured ✓"

# ── 9. Start services ────────────────────────────────────────
log "Starting CloudRizzle services..."
docker compose pull
docker compose up -d postgres redis

log "Waiting for database to be ready..."
sleep 15

log "Running DB migrations..."
docker compose run --rm backend alembic upgrade head

log "Starting all services..."
docker compose up -d

# ── 10. Get SSL certificate ──────────────────────────────────
source .env
if [ ! -z "$DOMAIN" ] && [ ! -z "$SSL_EMAIL" ]; then
    log "Getting SSL certificate for $DOMAIN..."
    docker compose --profile ssl run --rm certbot
    log "Reloading Nginx with SSL..."
    docker compose exec nginx nginx -s reload
    log "SSL configured ✓"
else
    warn "DOMAIN or SSL_EMAIL not set — skipping SSL setup"
    warn "Set up SSL manually: docker compose --profile ssl run --rm certbot"
fi

# ── 11. Health check ─────────────────────────────────────────
log "Running health check..."
sleep 10
if curl -sf http://localhost/health > /dev/null; then
    log "✓ CloudRizzle is running!"
else
    err "Health check failed — check: docker compose logs"
fi

# ── 12. Print status ─────────────────────────────────────────
log ""
log "═══════════════════════════════════════"
log "  CloudRizzle deployed successfully! 🚀"
log "═══════════════════════════════════════"
log ""
log "  Frontend:  https://$DOMAIN"
log "  API:       https://$DOMAIN/api/v1"
log "  API Docs:  https://$DOMAIN/docs"
log "  Grafana:   http://$(curl -s ifconfig.me):3001"
log ""
log "Useful commands:"
log "  docker compose ps          — check all containers"
log "  docker compose logs -f     — follow all logs"
log "  docker compose logs backend — backend logs only"
log "  docker compose restart backend — restart backend"
log "  docker compose down        — stop everything"
log ""
