# ☁️ CloudRizzle — AI Infrastructure Platform

> Deploy and manage cloud infrastructure on AWS, Azure, and GCP using natural language prompts powered by AI.

---

## 🏗️ Architecture

```
cloudrizzle/
├── frontend/          # Next.js 14 (App Router)
├── backend/           # FastAPI (Python)
├── nginx/             # Reverse proxy + SSL
├── monitoring/        # Prometheus + Grafana configs
├── scripts/           # DB seed, deploy helpers
└── docker-compose.yml # One-command orchestration
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TailwindCSS, Recharts |
| Backend | FastAPI, Python 3.12 |
| Database | PostgreSQL 16 + Alembic migrations |
| Cache/Queue | Redis 7 |
| AI Engine | Claude (Anthropic) → Terraform HCL |
| IaC | Terraform 1.8 |
| Auth | JWT (access + refresh tokens) |
| Observability | Prometheus + Grafana |
| Proxy | Nginx + Let's Encrypt SSL |
| Deployment | Docker Compose on EC2/Azure VM |

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.12+

### 1. Clone
```bash
git clone https://github.com/YOUR_USERNAME/cloudrizzle.git
cd cloudrizzle
```

### 2. Configure
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set:
# - SECRET_KEY (generate: openssl rand -hex 32)
# - CREDENTIAL_ENCRYPTION_KEY (exactly 32 chars)
# - ANTHROPIC_API_KEY (get from console.anthropic.com)
```

### 3. Start everything
```bash
docker compose up -d
```

### 4. Run migrations + seed
```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python scripts/seed.py
```

### 5. Open
| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| API Docs | http://localhost/docs |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |

**Demo credentials:**
- Admin: `amritsrivastava.infra@gmail.com` / `Admin@12345`
- User: `bose4305@gmail.com` / `User@12345`

---

## 🔌 API Reference

All endpoints are prefixed `/api/v1`. Full docs at `/docs`.

### Auth
```
POST /api/v1/auth/register     Register new user
POST /api/v1/auth/login        Login → access + refresh tokens
POST /api/v1/auth/refresh      Refresh access token
GET  /api/v1/auth/me           Current user
```

### Projects
```
GET    /api/v1/projects        List projects
POST   /api/v1/projects        Create project
GET    /api/v1/projects/:id    Get project
PATCH  /api/v1/projects/:id    Update project
DELETE /api/v1/projects/:id    Delete project
```

### Deployments
```
GET  /api/v1/deployments              List all deployments
POST /api/v1/deployments              Create deployment (queued)
GET  /api/v1/deployments/:id          Get deployment
POST /api/v1/deployments/:id/approve  Approve (triggers apply)
POST /api/v1/deployments/:id/cancel   Cancel
```

### AI
```
POST /api/v1/ai/prompt           Prompt → Terraform HCL
GET  /api/v1/ai/recommendations  AI infrastructure recommendations
GET  /api/v1/ai/conversations    Conversation history
```

### Cloud Accounts
```
GET    /api/v1/cloud-accounts          List accounts
POST   /api/v1/cloud-accounts          Add account (encrypted)
POST   /api/v1/cloud-accounts/:id/test Test connection
DELETE /api/v1/cloud-accounts/:id      Remove account
```

---

## 🤖 AI → Infrastructure Flow

```
User types prompt
      ↓
FastAPI /ai/prompt endpoint
      ↓
Claude API (claude-sonnet-4-6)
  System prompt: "Convert to Terraform HCL"
      ↓
Generated HCL stored in deployment
      ↓
terraform plan (dry-run, no cloud changes)
      ↓
Plan shown to user for review
      ↓
User approves → POST /deployments/:id/approve
      ↓
terraform apply (real cloud resources created)
      ↓
Resources saved to infra_resources table
```

---

## 🗄️ Database Schema

```
users ──────────────── projects ──────────── deployments
  │                        │                      │
  ├── cloud_accounts        ├── infra_resources    └── (logs)
  ├── organizations         └── cost_records
  └── ai_conversations
```

---

## 🚢 Production Deployment (EC2)

```bash
# On your EC2 instance (Ubuntu 22.04, t3.large recommended)
curl -fsSL https://raw.githubusercontent.com/YOUR/cloudrizzle/main/deploy.sh | bash
```

**Or manually:**
```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Clone project
git clone https://github.com/YOUR/cloudrizzle.git /opt/cloudrizzle
cd /opt/cloudrizzle

# 3. Configure
cp backend/.env.example backend/.env
nano backend/.env   # Set your secrets

# 4. Deploy
docker compose up -d

# 5. Migrations
docker compose exec backend alembic upgrade head

# 6. SSL (replace with your domain)
docker compose exec certbot certbot certonly \
  --webroot -w /var/www/certbot \
  --email you@domain.com \
  --agree-tos -d cloudrizzle.com -d www.cloudrizzle.com
docker compose restart nginx
```

---

## 🔒 Security Notes

- Cloud credentials are **AES-256 encrypted** at rest
- JWT tokens expire after 60 minutes (configurable)
- Rate limiting on auth endpoints (10 req/min)
- All secrets via environment variables — never committed to git
- Nginx handles SSL termination with TLS 1.2/1.3 only
- Non-root user inside Docker containers

---

## 📊 Monitoring

- **Prometheus** scrapes FastAPI `/metrics` every 15s
- **Grafana** dashboards at `:3001` (admin/admin default)
- Change Grafana password via `GRAFANA_PASSWORD` env var

---

## 🛣️ Roadmap

- [ ] Phase 1 — Foundation ✅ (frontend + backend + DB)
- [ ] Phase 2 — AWS integration (real Terraform apply)
- [ ] Phase 3 — Azure + GCP connectors
- [ ] Phase 4 — Real-time deployment logs (WebSocket)
- [ ] Phase 5 — Drift detection + auto-remediation
- [ ] Phase 6 — Multi-user teams + RBAC
