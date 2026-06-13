# DataBundle GH — Full Stack Platform

Instant mobile data bundle purchases for **MTN**, **Telecel**, and **AirtelTigo** in Ghana. Built with React, Node.js, Paystack payments, and telecom API integration.

## Features

- **Modern UI/UX** — Responsive, mobile-first design with network filtering and bundle search
- **Full purchase flow** — Select bundle → enter phone → Paystack payment → instant delivery
- **Paystack integration** — Mobile Money & card payments with webhook support
- **Telecom API layer** — Mock mode for development; swap to live API with env vars
- **User accounts** — Register, login, order history
- **Admin dashboard** — Stats, order management, failed order retry
- **Order tracking** — Track by order number with status timeline

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router |
| Backend | Node.js, Express, Prisma ORM |
| Database | **PostgreSQL 16** (primary) |
| Cache | **Redis 7** (JWT blacklist, bundle cache) |
| Payments | Paystack |
| Telecom | Configurable API (mock / live) |
| Hosting | Docker + Kubernetes + NGINX |
| Cloud | AWS / Azure ready |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full enterprise spec.

## Quick Start

### Option A — Docker (recommended)

```bash
docker compose up -d --build
docker compose exec api node prisma/seed.js
```

Open **http://localhost** (NGINX → React + API proxy)

### Option B — Local development

**Prerequisites:** Node.js 18+, PostgreSQL, Redis (optional)

```bash
npm run setup
npm run dev
```

Open **http://localhost:5173**

### Default Admin Account

| Field | Value |
|-------|-------|
| Email | `admin@databundle.gh` |
| Password | `Admin@123456` |

### Demo Accounts (all roles)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@databundle.gh | Admin@123456 |
| Super Agent | super@databundle.gh | Agent@123456 |
| Senior Agent | senior@databundle.gh | Agent@123456 |
| Basic Agent | agent@databundle.gh | Agent@123456 |
| Customer | customer@databundle.gh | Customer@123 |

## Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **Customer** | Register/login, view bundles, purchase, wallet, history, notifications, support |
| **Basic Agent** | Sell bundles, view personal sales, commissions, wallet |
| **Senior Agent** | Manage sub-agents, advanced analytics, limited pricing, priority support |
| **Super Agent** | Full hierarchy control, approve promotions, system-wide analytics |
| **Admin** | Manage users, agents, bundles, transactions, monitoring, support |

## Configuration

Edit `server/.env`:

```env
# Paystack — get keys from https://dashboard.paystack.com
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...

# Telecom API — set TELECOM_MODE=live when ready
TELECOM_API_URL=https://your-reseller-api.com/v1
TELECOM_API_KEY=your_api_key
TELECOM_MODE=mock
```

Without Paystack keys, the app runs in **mock payment mode** — you can test the full flow end-to-end.

## Project Structure

```
DATA BUNDLE/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # Navbar, BundleCard, OrderCard, etc.
│       ├── pages/          # Home, Bundles, Checkout, Admin, etc.
│       ├── context/        # Auth context
│       └── lib/            # API client
├── server/                 # Express backend
│   ├── prisma/             # Schema, seed
│   └── src/
│       ├── routes/         # auth, bundles, orders
│       └── services/       # paystack, telecom, orderService
└── package.json            # Root scripts
```

## API Endpoints

Full spec documented in [ARCHITECTURE.md](./ARCHITECTURE.md).

| Category | Key Endpoints |
|----------|--------------|
| Auth | `POST /api/auth/register`, `/login`, `/logout` |
| Bundles | `GET /api/bundles`, `/api/bundles/:id` |
| Purchases | `POST /api/purchase`, `GET /api/purchase/history/:userId` |
| Agents | `GET /api/agents`, `/api/agents/:id/sales` |
| Dashboards | `GET /api/dashboard/customer/:id`, `/agent/:id`, `/admin` |
| Notifications | `POST /api/notifications/send`, `GET /api/notifications/user/:userId` |
| Telecom | `POST /api/telecom/activate`, `GET /api/telecom/status/:transactionId` |
| Security | `GET /api/logs`, `POST /api/security/scan` |

## Production Deployment

### Docker Compose
```bash
docker compose up -d --build
```

### Kubernetes (AWS EKS / Azure AKS)
```bash
kubectl apply -f infra/kubernetes/deployment.yaml
```

### Security checklist
- [ ] Set strong `JWT_SECRET` (32+ chars)
- [ ] Configure Paystack live keys
- [ ] Enable SSL/TLS at NGINX / load balancer
- [ ] Use PostgreSQL role `databundle_app` (not superuser)
- [ ] Enable Redis for JWT blacklist
- [ ] Set `GDPR_REQUIRED=true` for production
- [ ] Configure CloudWatch / Azure Monitor alerts

## License

Private — All rights reserved.
