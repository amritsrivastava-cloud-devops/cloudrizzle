# CloudRizzle AI 🌩️

> **Robust Infrastructure in One Prompt** — A multi-cloud management platform powered by AI

![CloudRizzle Architecture](./docs/architecture.png)

## Overview

CloudRizzle AI is a production-grade platform that lets you:

- 🔗 **Connect** AWS, Azure, and GCP accounts in seconds
- 🤖 **Ask AI** to design, generate, and troubleshoot infrastructure
- ⚡ **Deploy** cloud resources using Terraform templates in one click
- 📊 **Monitor** live performance, costs, and logs across all clouds
- 💸 **Track Costs** with real-time billing dashboards and forecasts

---

## Architecture

```
CLIENT
  └── React Frontend (Dashboard · Projects · Monitoring · Settings · Admin)

API LAYER
  └── Express REST API (JWT auth · WebSocket · Rate limiting · CORS)

SERVICES
  ├── Auth Service          (JWT · Sessions · Redis)
  ├── Projects & Deploy     (Pipeline · Templates · Terraform)
  ├── Cloud Accounts        (AWS/Azure/GCP SDK · Monitoring)
  └── Billing & AI          (Stripe · Claude API)

DATA
  ├── PostgreSQL            (Users · Projects · Billing)
  └── Redis                 (Cache · Sessions · Queues)

EXTERNAL
  ├── AWS SDK               (EC2 · S3 · Lambda · RDS · ECS)
  ├── Azure SDK             (VMs · Blob · AKS)
  ├── GCP SDK               (Compute · GCS · GKE)
  └── Claude AI API         (Infrastructure assistant)
```

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React 18, Zustand, Recharts, Socket.io-client |
| Backend     | Node.js, Express, Socket.io       |
| Database    | PostgreSQL 16 (Sequelize ORM)     |
| Cache/Queue | Redis 7 (ioredis, Bull)           |
| IaC         | Terraform (AWS provider)          |
| AI          | Anthropic Claude API              |
| Auth        | JWT (access + refresh tokens)     |
| Container   | Docker, Docker Compose, Nginx     |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Anthropic API key (for AI features)

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/cloudrizzle-ai.git
cd cloudrizzle-ai

# Copy env file
cp backend/.env.example backend/.env

# Edit and fill in your keys
nano backend/.env
```

### 2. Start with Docker Compose (Recommended)

```bash
# Set required env vars
export ANTHROPIC_API_KEY=sk-ant-your-key-here
export JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Start all services
docker compose up -d

# View logs
docker compose logs -f backend
```

Services will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health**: http://localhost:5000/health

### 3. Development Mode (without Docker)

```bash
# Terminal 1: Start PostgreSQL & Redis
docker compose up postgres redis -d

# Terminal 2: Backend
cd backend
npm install
cp .env.example .env   # fill in values
npm run dev

# Terminal 3: Frontend
cd frontend
npm install
npm start
```

---

## Demo Credentials

```
Email:    demo@cloudrizzle.ai
Password: Demo@12345
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable              | Description                        | Required |
|-----------------------|------------------------------------|----------|
| `JWT_SECRET`          | JWT signing secret (32+ chars)     | ✅       |
| `JWT_REFRESH_SECRET`  | Refresh token secret (32+ chars)   | ✅       |
| `ANTHROPIC_API_KEY`   | Claude AI API key                  | ✅ (AI)  |
| `DB_HOST`             | PostgreSQL host                    | ✅       |
| `DB_PASSWORD`         | PostgreSQL password                | ✅       |
| `REDIS_HOST`          | Redis host                         | ✅       |
| `AWS_ACCESS_KEY_ID`   | AWS credentials (for real infra)   | Optional |
| `STRIPE_SECRET_KEY`   | Stripe for billing                 | Optional |

---

## API Reference

### Auth
| Method | Endpoint             | Description         |
|--------|----------------------|---------------------|
| POST   | `/api/auth/register` | Register new user   |
| POST   | `/api/auth/login`    | Login               |
| POST   | `/api/auth/refresh`  | Refresh access token|
| POST   | `/api/auth/logout`   | Logout              |
| GET    | `/api/auth/me`       | Get current user    |

### Cloud Accounts
| Method | Endpoint                         | Description              |
|--------|----------------------------------|--------------------------|
| GET    | `/api/cloud/accounts`            | List accounts            |
| POST   | `/api/cloud/accounts`            | Add cloud account        |
| GET    | `/api/cloud/accounts/:id/resources` | Get account resources |
| GET    | `/api/cloud/accounts/:id/costs`  | Get cost data            |
| DELETE | `/api/cloud/accounts/:id`        | Remove account           |
| GET    | `/api/cloud/summary`             | Overall cost summary     |

### AI
| Method | Endpoint                    | Description                |
|--------|-----------------------------|----------------------------|
| POST   | `/api/ai/chat`              | Chat with CloudRizzle AI   |
| POST   | `/api/ai/generate-terraform`| Generate Terraform code    |
| POST   | `/api/ai/analyze-cost`      | AI cost analysis           |
| GET    | `/api/ai/conversations`     | List conversations         |

### Terraform
| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| GET    | `/api/terraform/templates`  | List templates           |
| POST   | `/api/terraform/plan`       | Run terraform plan       |
| POST   | `/api/terraform/apply`      | Apply infrastructure     |
| GET    | `/api/terraform/executions/:id` | Get execution status |

### Monitoring
| Method | Endpoint                       | Description            |
|--------|--------------------------------|------------------------|
| GET    | `/api/monitoring/overview`     | Health & alerts        |
| GET    | `/api/monitoring/metrics`      | Time-series metrics    |
| GET    | `/api/monitoring/logs`         | Live log stream        |
| GET    | `/api/monitoring/costs/forecast` | Cost forecast        |

---

## WebSocket Events

| Event                      | Direction        | Description                  |
|----------------------------|------------------|------------------------------|
| `metrics:live`             | Server → Client  | Live CPU/memory/network stats|
| `deployment:created`       | Server → Client  | New deployment started       |
| `deployment:log`           | Server → Client  | Deployment log line          |
| `deployment:complete`      | Server → Client  | Deployment finished          |
| `terraform:log`            | Server → Client  | Terraform output line        |
| `terraform:plan:complete`  | Server → Client  | Plan finished with summary   |
| `terraform:apply:complete` | Server → Client  | Resources created            |
| `cloud:account:added`      | Server → Client  | Cloud account connected      |
| `subscribe:monitoring`     | Client → Server  | Subscribe to account metrics |

---

## Project Structure

```
cloudrizzle/
├── backend/
│   ├── src/
│   │   ├── index.js              # Server entry point
│   │   ├── routes/
│   │   │   ├── auth.js           # Authentication
│   │   │   ├── cloud.js          # Cloud account management
│   │   │   ├── projects.js       # Projects & deployments
│   │   │   ├── ai.js             # Claude AI integration
│   │   │   ├── terraform.js      # Terraform execution
│   │   │   ├── monitoring.js     # Metrics & logs
│   │   │   ├── billing.js        # Billing & usage
│   │   │   └── templates.js      # Infrastructure templates
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT middleware
│   │   ├── models/
│   │   │   └── index.js          # Sequelize models
│   │   ├── websocket/
│   │   │   └── socketManager.js  # Socket.io setup
│   │   └── utils/
│   │       ├── database.js       # PostgreSQL connection
│   │       ├── redis.js          # Redis connection
│   │       └── logger.js         # Winston logger
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Root router
│   │   ├── index.js              # React entry
│   │   ├── index.css             # Design system / global CSS
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── CloudAccountsPage.jsx
│   │   │   ├── ProjectsPage.jsx
│   │   │   ├── MonitoringPage.jsx
│   │   │   ├── DeployPage.jsx
│   │   │   ├── TemplatesPage.jsx
│   │   │   ├── AIAssistantPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── components/
│   │   │   └── layout/
│   │   │       ├── AppShell.jsx          # Sidebar + header
│   │   │       └── NotificationToast.jsx
│   │   ├── store/
│   │   │   └── index.js          # Zustand stores
│   │   ├── hooks/
│   │   │   └── useSocket.js      # WebSocket hook
│   │   └── utils/
│   │       └── api.js            # Axios instance
│   ├── public/
│   │   └── index.html
│   ├── Dockerfile
│   └── package.json
│
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

---

## Roadmap

- [ ] Real AWS SDK integration (replace mock data)
- [ ] Terraform state backend (S3 + DynamoDB locking)
- [ ] Stripe subscription billing
- [ ] Multi-user teams & RBAC
- [ ] GitHub Actions CI/CD integration
- [ ] Slack/PagerDuty alerting
- [ ] Cost anomaly detection with ML
- [ ] Infrastructure drift detection
- [ ] Custom Terraform module registry
- [ ] Mobile app (React Native)

---

## License

MIT © CloudRizzle AI
