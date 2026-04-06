#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CloudRizzle — EC2 Deployment Script
# Run this on your EC2 instance (Ubuntu 22.04)
# Usage: bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "🚀 CloudRizzle Deployment Script"
echo "================================="

# ── 1. System update ──────────────────────────────────────────────────────────
echo "→ Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

# ── 2. Install Docker ─────────────────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
    echo "→ Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "✓ Docker installed"
else
    echo "✓ Docker already installed: $(docker --version)"
fi

# ── 3. Install Docker Compose ─────────────────────────────────────────────────
if ! command -v docker compose &> /dev/null; then
    echo "→ Installing Docker Compose..."
    sudo apt-get install -y docker-compose-plugin
    echo "✓ Docker Compose installed"
else
    echo "✓ Docker Compose already installed"
fi

# ── 4. Clone / update repo ────────────────────────────────────────────────────
REPO_DIR="/opt/cloudrizzle"
if [ -d "$REPO_DIR/.git" ]; then
    echo "→ Pulling latest changes..."
    cd $REPO_DIR && git pull origin main
else
    echo "→ Cloning repository..."
    sudo git clone https://github.com/YOUR_USERNAME/cloudrizzle.git $REPO_DIR
    sudo chown -R $USER:$USER $REPO_DIR
fi

cd $REPO_DIR

# ── 5. Configure environment ──────────────────────────────────────────────────
if [ ! -f backend/.env ]; then
    echo "→ Creating .env from example..."
    cp backend/.env.example backend/.env
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env and set your secrets before continuing!"
    echo "   nano backend/.env"
    echo ""
    echo "   Required:"
    echo "   - SECRET_KEY (openssl rand -hex 32)"
    echo "   - CREDENTIAL_ENCRYPTION_KEY (exactly 32 chars)"
    echo "   - ANTHROPIC_API_KEY"
    echo "   - POSTGRES_PASSWORD"
    read -p "Press ENTER after editing .env to continue..."
fi

# ── 6. Pull / build images ────────────────────────────────────────────────────
echo "→ Building Docker images..."
docker compose build --parallel

# ── 7. Start services ─────────────────────────────────────────────────────────
echo "→ Starting all services..."
docker compose up -d

# ── 8. Wait for DB ────────────────────────────────────────────────────────────
echo "→ Waiting for PostgreSQL to be ready..."
until docker compose exec postgres pg_isready -U postgres -d cloudrizzle; do
    sleep 2
done
echo "✓ PostgreSQL ready"

# ── 9. Run migrations ─────────────────────────────────────────────────────────
echo "→ Running database migrations..."
docker compose exec backend alembic upgrade head

# ── 10. Seed database (first deploy only) ─────────────────────────────────────
read -p "Seed database with demo data? (y/N): " SEED_DB
if [[ "$SEED_DB" =~ ^[Yy]$ ]]; then
    docker compose exec backend python scripts/seed.py
fi

# ── 11. SSL Certificate ───────────────────────────────────────────────────────
echo ""
read -p "Set up SSL certificate for your domain? (y/N): " SETUP_SSL
if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
    read -p "Enter your domain (e.g. cloudrizzle.com): " DOMAIN
    docker compose exec certbot certbot certonly \
        --webroot -w /var/www/certbot \
        --email admin@$DOMAIN \
        --agree-tos --no-eff-email \
        -d $DOMAIN -d www.$DOMAIN
    docker compose restart nginx
    echo "✓ SSL certificate installed"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "✅ CloudRizzle deployed successfully!"
echo ""
echo "Services running:"
docker compose ps
echo ""
echo "URLs:"
echo "  Frontend:   http://$(curl -s ifconfig.me)"
echo "  API Docs:   http://$(curl -s ifconfig.me)/docs"
echo "  Grafana:    http://$(curl -s ifconfig.me):3001"
echo "  Prometheus: http://$(curl -s ifconfig.me):9090"
echo ""
echo "Logs: docker compose logs -f"
