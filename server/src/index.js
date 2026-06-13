import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectRedis } from './lib/redis.js';
import authRoutes from './routes/auth.js';
import bundleRoutes from './routes/bundles.js';
import orderRoutes from './routes/orders.js';
import purchaseRoutes from './routes/purchase.js';
import agentRoutes from './routes/agents.js';
import walletRoutes from './routes/wallet.js';
import notificationRoutes, { supportRouter } from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import dashboardRoutes from './routes/dashboard.js';
import telecomRoutes from './routes/telecom.js';
import auditRoutes, { securityRouter } from './routes/security.js';
import analyticsRoutes from './routes/analytics.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ok',
    service: 'DataBundle API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    stack: {
      database: 'postgresql',
      cache: process.env.REDIS_URL ? 'redis' : 'memory',
      paystack: !process.env.PAYSTACK_SECRET_KEY?.includes('your_paystack') ? 'live' : 'mock',
      telecom: process.env.TELECOM_MODE || 'mock',
    },
    security: {
      jwt: true,
      auditLogs: true,
      fraudDetection: true,
      gdpr: true,
    },
  });
});

// ─── Spec API Endpoints ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/telecom', telecomRoutes);
app.use('/api/logs', auditRoutes);
app.use('/api/security', securityRouter);
app.use('/api/analytics', analyticsRoutes);

// ─── Extended / Legacy Routes ─────────────────────────────────────
app.use('/api/orders', orderRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/support', supportRouter);
app.use('/api/admin', adminRoutes);

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await connectRedis();
  app.listen(PORT, () => {
    console.log(`DataBundle API v2.0 → http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();
