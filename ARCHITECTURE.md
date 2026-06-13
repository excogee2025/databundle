# Enterprise Architecture — DataBundle GH

## Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│  NGINX (SSL/TLS termination, rate limiting, reverse proxy)  │
├──────────────────────────┬──────────────────────────────────┤
│  React + Tailwind CSS    │  Node.js Express API             │
│  (Static SPA)            │  JWT · RBAC · Audit · Fraud      │
├──────────────────────────┴──────────────────────────────────┤
│  PostgreSQL (primary)  │  Redis (cache, JWT blacklist)      │
├────────────────────────┴────────────────────────────────────┤
│  Paystack · Telecom API · AWS/Azure (hosting)               │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Front-End | React 19 + Tailwind CSS 4 + Vite |
| Back-End | Node.js + Express |
| Database | PostgreSQL 16 (primary) |
| Cache | Redis 7 (sessions, JWT blacklist, bundle cache) |
| Optional | MongoDB (analytics/logs — future) |
| Hosting | AWS / Azure via Docker + Kubernetes |
| Proxy | NGINX (rate limiting, SSL, security headers) |

## Security Layers

| Layer | Implementation |
|-------|---------------|
| JWT Authentication | Signed tokens with `jti`, Redis blacklist on logout |
| SSL/TLS | NGINX + cert-manager (K8s) / ACM (AWS) |
| DB Role-Based Access | `databundle_app` (read/write), `databundle_readonly` |
| Audit Logs | `audit_logs` table — all auth, purchase, security events |
| Fraud Detection | Velocity checks, high-value alerts, auto-block |
| GDPR Compliance | Consent tracking, data export, anonymized deletion |
| Firewall & Monitoring | Rate limiting, Helmet headers, `/api/security/scan` |

## API Endpoints (Spec)

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with GDPR consent |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/logout` | Revoke JWT (Redis blacklist) |
| GET | `/api/auth/me` | Current user + permissions |
| POST | `/api/auth/consent` | Record GDPR consent |
| GET | `/api/auth/me/export` | Export user data (GDPR) |
| DELETE | `/api/auth/me` | Anonymize account (GDPR) |

### Bundles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bundles` | List all bundles (Redis cached) |
| GET | `/api/bundles/:id` | Single bundle |
| GET | `/api/bundles/networks` | Networks with bundles |

### Purchases
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/purchase` | Create purchase (fraud-checked) |
| GET | `/api/purchase/history/:userId` | Purchase history |

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents (admin) |
| GET | `/api/agents/:id/sales` | Agent sales history |

### Dashboards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/customer/:id` | Customer dashboard |
| GET | `/api/dashboard/agent/:id` | Agent dashboard |
| GET | `/api/dashboard/admin` | Admin dashboard |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/send` | Send notification (admin) |
| GET | `/api/notifications/user/:userId` | User notifications |

### Telecom
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/telecom/activate` | Activate data bundle |
| GET | `/api/telecom/status/:transactionId` | Check delivery status |

### Security
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs` | Audit logs (admin) |
| POST | `/api/security/scan` | Run fraud/security scan |

### Analytics & Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/customer-trends` | Popular bundles, peak purchase times |
| GET | `/api/analytics/agent-performance` | Sales by agent level |
| GET | `/api/analytics/revenue-forecast` | Demand prediction (linear regression) |
| GET | `/api/analytics/export/:type/:format` | Download CSV or PDF report |

## Database Schema

| Table | Key Fields |
|-------|-----------|
| `users` | user_id, email, password_hash, role, gdpr_consent |
| `agents` | agent_id, user_id, level, commission_rate, parent_agent_id |
| `bundles` | bundle_id, name, data_size, validity_days, price, operator |
| `purchases` | purchase_id, user_id, bundle_id, agent_id, status, transaction_id |
| `transactions` | transaction_id, purchase_id, amount, payment_method, status |
| `wallets` | wallet_id, user_id, balance |
| `notifications` | notification_id, user_id, message, type, status |
| `audit_logs` | log_id, user_id, action, ip_address, timestamp |
| `fraud_alerts` | user_id, type, score, resolved |

## Deployment

### Docker Compose (local / staging)
```bash
docker compose up -d --build
docker compose exec api node prisma/seed.js
```

### Kubernetes (production)
```bash
kubectl apply -f infra/kubernetes/deployment.yaml
```

### AWS / Azure
- **Compute**: EKS / AKS with auto-scaling
- **Database**: RDS PostgreSQL / Azure Database for PostgreSQL
- **Cache**: ElastiCache Redis / Azure Cache for Redis
- **SSL**: ACM / Azure Key Vault + cert-manager
- **CDN**: CloudFront / Azure CDN in front of NGINX
- **Monitoring**: CloudWatch / Azure Monitor + `/api/security/scan`
