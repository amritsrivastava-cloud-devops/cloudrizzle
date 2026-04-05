<div align="center">

<br />

```
  ██████╗██╗      ██████╗ ██╗   ██╗██████╗ ██████╗ ██╗███████╗███████╗██╗     ███████╗
 ██╔════╝██║     ██╔═══██╗██║   ██║██╔══██╗██╔══██╗██║╚══███╔╝╚══███╔╝██║     ██╔════╝
 ██║     ██║     ██║   ██║██║   ██║██║  ██║██████╔╝██║  ███╔╝   ███╔╝ ██║     █████╗  
 ██║     ██║     ██║   ██║██║   ██║██║  ██║██╔══██╗██║ ███╔╝   ███╔╝  ██║     ██╔══╝  
 ╚██████╗███████╗╚██████╔╝╚██████╔╝██████╔╝██║  ██║██║███████╗███████╗███████╗███████╗
  ╚═════╝╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝╚══════╝
```

**AI-powered multi-cloud infrastructure platform**

Describe your infrastructure in plain English. CloudRizzle builds it on AWS, Azure, and GCP.

<br />

![Status](https://img.shields.io/badge/status-in%20development-orange?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![Python](https://img.shields.io/badge/python-3.11+-blue?style=flat-square&logo=python)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Terraform](https://img.shields.io/badge/terraform-1.6+-purple?style=flat-square&logo=terraform)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)

<br />

</div>

---

## What is CloudRizzle?

CloudRizzle is an open-source, AI-driven cloud infrastructure platform. Instead of writing complex Terraform or CloudFormation code manually, you simply describe what you need in plain English — and CloudRizzle generates, validates, and deploys the entire infrastructure for you across AWS, Azure, and GCP.

**Example:**
> *"Create a 3-tier AWS VPC with a load balancer, 2 EC2 instances, and an RDS PostgreSQL database with automated backups"*

CloudRizzle converts this into production-ready Terraform code, shows you a visual canvas of the infrastructure, runs a plan for your approval, and then applies it — all from one interface.

---

## Features

- **AI Infra Generation** — Natural language to Terraform code using Claude / GPT-4o
- **Multi-Cloud Support** — AWS, Azure, and GCP from one unified platform
- **Visual Infra Canvas** — See your infrastructure as an interactive node graph
- **Plan → Approve → Apply** — Never deploy blindly; always review before apply
- **Project Management** — Organize infra into projects with full deployment history
- **Cost Tracking** — Real-time monthly cost across all cloud providers
- **Role-Based Access** — User dashboard + full admin panel for platform management
- **Drift Detection** — Know when your real infra drifts from your desired state
- **Self-Hostable** — Run entirely on your own server, no vendor lock-in

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | React framework with SSR |
| TailwindCSS | Utility-first styling |
| shadcn/ui | Component library |
| React Flow | Interactive infra canvas |
| TanStack Query | Server state, caching, background refresh |
| Zustand | Global client state management |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI (Python) | Core REST API |
| Temporal | Durable workflow engine for long-running jobs |
| Redis | Job queue and caching |
| PostgreSQL + pgvector | Primary database + semantic search |
| Clerk | Authentication and role management |

### AI Engine
| Technology | Purpose |
|---|---|
| Claude API / GPT-4o | LLM for infrastructure generation |
| LangGraph | Stateful AI workflow orchestration |
| Prompt Validator | Validates AI output before execution |
| Policy Engine | Safety checks on generated Terraform |

### Infrastructure as Code
| Technology | Purpose |
|---|---|
| Terraform | Primary IaC engine (multi-cloud) |
| Atlantis | Safe plan/apply workflow with approvals |
| Drift Detection | Scheduled state comparison |
| Policy Checks | OPA / Checkov compliance gates |

### Cloud Providers
| Provider | SDK |
|---|---|
| AWS | Boto3 |
| Azure | azure-mgmt |
| GCP | google-cloud SDK |

### Observability
| Technology | Purpose |
|---|---|
| Prometheus | Metrics collection |
| Grafana | Dashboards and alerting |
| Loki | Log aggregation |
| OpenTelemetry | Distributed tracing |

---

## Project Structure

```
cloudrizzle/
│
├── frontend/                        # Next.js 14 application
│   ├── app/
│   │   ├── (auth)/                  # Auth pages (login, signup)
│   │   ├── (user)/                  # User dashboard routes
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── deployments/
│   │   │   └── canvas/
│   │   ├── (admin)/                 # Admin panel routes (protected)
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── projects/
│   │   │   └── deployments/
│   │   └── api/                     # Next.js API routes (proxy layer)
│   ├── components/
│   │   ├── ui/                      # shadcn/ui base components
│   │   ├── canvas/                  # React Flow infra canvas
│   │   ├── prompt/                  # AI prompt input components
│   │   └── layout/                  # Sidebar, navbar, shell
│   ├── lib/
│   │   ├── api.ts                   # API client (TanStack Query hooks)
│   │   └── store.ts                 # Zustand global store
│   └── middleware.ts                # Clerk auth + role-based routing
│
├── backend/                         # FastAPI application
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py          # Auth endpoints
│   │   │   │   ├── projects.py      # Project CRUD
│   │   │   │   ├── deployments.py   # Deployment management
│   │   │   │   ├── infra.py         # Infra resource tracking
│   │   │   │   ├── ai.py            # AI generation endpoints
│   │   │   │   └── admin/           # Admin-only endpoints
│   │   │   │       ├── users.py
│   │   │   │       ├── projects.py
│   │   │   │       └── deployments.py
│   │   │   └── deps.py              # Shared dependencies (auth, db)
│   │   ├── core/
│   │   │   ├── config.py            # Environment configuration
│   │   │   ├── security.py          # JWT / Clerk token validation
│   │   │   └── database.py          # SQLAlchemy setup
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── deployment.py
│   │   │   └── infra_resource.py
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── generator.py     # LangGraph AI pipeline
│   │   │   │   ├── validator.py     # Terraform output validator
│   │   │   │   └── policy.py        # Policy engine checks
│   │   │   ├── terraform/
│   │   │   │   ├── runner.py        # Terraform plan/apply executor
│   │   │   │   ├── parser.py        # Terraform output parser
│   │   │   │   └── drift.py         # Drift detection logic
│   │   │   └── cloud/
│   │   │       ├── aws.py           # AWS SDK integration
│   │   │       ├── azure.py         # Azure SDK integration
│   │   │       └── gcp.py           # GCP SDK integration
│   │   └── workers/                 # Temporal workflow definitions
│   │       ├── deploy_workflow.py
│   │       └── drift_workflow.py
│   ├── migrations/                  # Alembic DB migrations
│   ├── tests/
│   └── requirements.txt
│
├── infrastructure/                  # CloudRizzle's own infra (meta!)
│   ├── terraform/                   # Terraform for deploying CloudRizzle
│   └── docker/
│       ├── Dockerfile.frontend
│       ├── Dockerfile.backend
│       └── docker-compose.yml
│
├── .github/
│   └── workflows/
│       ├── ci.yml                   # CI pipeline (lint, test)
│       └── deploy.yml               # CD pipeline
│
├── docs/                            # Documentation
│   ├── architecture.md
│   ├── api.md
│   └── deployment.md
│
├── .env.example                     # Environment variable template
├── .gitignore
├── README.md
└── LICENSE
```

---

## Architecture Overview

```
User / Admin Browser
        │
        ▼
  Next.js Frontend  ──────────────────────────────────────────────────
  (App Router)                                                        │
        │                                                             │
        ▼                                                             │
  FastAPI Backend  (REST API + role-based auth)                       │
        │                                                             │
        ├── AI Engine (LangGraph + Claude / GPT-4o)                  │
        │       └── Generates Terraform code from prompt             │
        │                                                             │
        ├── Temporal Workflows                                        │
        │       └── plan → approve → apply (durable, retryable)      │
        │                                                             │
        ├── Terraform Runner                                          │
        │       └── Executes against AWS / Azure / GCP               │
        │                                                             │
        └── PostgreSQL + pgvector                                     │
                └── Users, Projects, Deployments, Infra State        │
                                                                      │
  Observability: Prometheus + Grafana + Loki + OpenTelemetry ─────────
```

---

## Getting Started

> Full setup guide coming soon. This section will be updated as the project is built.

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis
- Terraform 1.6+
- Docker (optional but recommended)

### Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Key variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cloudrizzle

# Redis
REDIS_URL=redis://localhost:6379

# Auth (Clerk)
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

# AI
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=

# Azure
AZURE_SUBSCRIPTION_ID=
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=

# GCP
GOOGLE_APPLICATION_CREDENTIALS=
GCP_PROJECT_ID=
```

### Quick Start (Development)

```bash
# Clone the repository
git clone https://github.com/yourusername/cloudrizzle.git
cd cloudrizzle

# Backend
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`

---

## Roadmap

### Phase 1 — MVP (Current)
- [x] Project architecture and planning
- [x] UI/UX design (user + admin views)
- [ ] Database schema design
- [ ] FastAPI backend with auth
- [ ] AI → Terraform generation pipeline
- [ ] AWS integration (EC2, VPC, RDS, S3)
- [ ] Next.js frontend connected to backend
- [ ] Basic admin panel

### Phase 2 — Multi-Cloud
- [ ] Azure integration
- [ ] GCP integration
- [ ] Infra visual canvas (React Flow)
- [ ] Drift detection
- [ ] Cost tracking dashboard

### Phase 3 — Production Ready
- [ ] Temporal workflow engine
- [ ] Policy engine (OPA / Checkov)
- [ ] Atlantis integration
- [ ] pgvector semantic template search
- [ ] Full observability stack
- [ ] Keycloak enterprise auth option

### Phase 4 — Scale
- [ ] Template marketplace
- [ ] Team collaboration
- [ ] Multi-region support
- [ ] SOC2 compliance features
- [ ] Mobile app

---

## Cost of Running CloudRizzle

One of the core principles of this project is keeping costs as low as possible.

| Component | Cost |
|---|---|
| Next.js | Free (open source) |
| FastAPI | Free (open source) |
| PostgreSQL | Free (open source) |
| Redis | Free (open source) |
| Terraform | Free (open source) |
| Temporal | Free (open source, self-hosted) |
| Prometheus + Grafana + Loki | Free (open source) |
| Clerk | Free up to 10,000 MAU |
| AI API (Claude / GPT-4o) | Pay per token (bring your own key) |
| **Server (EC2 / Azure VM)** | **~$30–60/month** |

**Total software cost: $0.** You only pay for the server you deploy on.

---

## Contributing

Contributions are welcome! This project is being built in public.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Acknowledgements

Built with love using:
- [Terraform](https://terraform.io) — Infrastructure as Code
- [LangGraph](https://langchain-ai.github.io/langgraph/) — AI workflow orchestration
- [Temporal](https://temporal.io) — Durable workflow execution
- [React Flow](https://reactflow.dev) — Infra canvas
- [shadcn/ui](https://ui.shadcn.com) — UI components
- [FastAPI](https://fastapi.tiangolo.com) — Backend framework

---

<div align="center">

Made with dedication by the CloudRizzle team

**[Website](#) · [Documentation](#) · [Discord](#) · [Twitter](#)**

</div>
