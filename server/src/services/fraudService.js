import prisma from '../lib/prisma.js';
import { logAudit } from './auditService.js';

const FRAUD_THRESHOLDS = {
  PURCHASES_PER_HOUR: 10,
  PURCHASES_PER_DAY: 50,
  WALLET_TOPUP_PER_HOUR: 5,
  FAILED_PAYMENTS_PER_HOUR: 5,
  HIGH_VALUE_PURCHASE: 500,
};

export async function createFraudAlert({ userId, type, description, score, ipAddress, metadata }) {
  const alert = await prisma.fraudAlert.create({
    data: { userId, type, description, score, ipAddress, metadata: metadata ? JSON.stringify(metadata) : null },
  });

  await logAudit({
    userId,
    action: 'fraud.alert_created',
    resource: type,
    ipAddress,
    metadata: { alertId: alert.id, score },
    severity: score >= 0.8 ? 'critical' : 'warning',
  });

  return alert;
}

export async function checkPurchaseFraud({ userId, amount, ipAddress }) {
  const alerts = [];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [hourlyCount, dailyCount] = await Promise.all([
    prisma.order.count({ where: { userId, createdAt: { gte: oneHourAgo } } }),
    prisma.order.count({ where: { userId, createdAt: { gte: oneDayAgo } } }),
  ]);

  if (hourlyCount >= FRAUD_THRESHOLDS.PURCHASES_PER_HOUR) {
    alerts.push(await createFraudAlert({
      userId,
      type: 'velocity_hourly',
      description: `${hourlyCount + 1} purchases in the last hour`,
      score: 0.7,
      ipAddress,
    }));
  }

  if (dailyCount >= FRAUD_THRESHOLDS.PURCHASES_PER_DAY) {
    alerts.push(await createFraudAlert({
      userId,
      type: 'velocity_daily',
      description: `${dailyCount + 1} purchases in 24 hours`,
      score: 0.85,
      ipAddress,
    }));
  }

  if (amount >= FRAUD_THRESHOLDS.HIGH_VALUE_PURCHASE) {
    alerts.push(await createFraudAlert({
      userId,
      type: 'high_value',
      description: `High-value purchase: GH₵ ${amount}`,
      score: 0.6,
      ipAddress,
      metadata: { amount },
    }));
  }

  const blocked = alerts.some((a) => a.score >= 0.8);
  return { blocked, alerts, riskScore: Math.max(0, ...alerts.map((a) => a.score), 0) };
}

export async function runSecurityScan() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [unresolvedAlerts, recentFailedOrders, suspiciousUsers] = await Promise.all([
    prisma.fraudAlert.count({ where: { resolved: false } }),
    prisma.order.count({ where: { status: 'failed', createdAt: { gte: oneDayAgo } } }),
    prisma.fraudAlert.findMany({
      where: { createdAt: { gte: oneDayAgo }, resolved: false },
      select: { userId: true },
    }),
  ]);

  const userAlertCounts = {};
  for (const a of suspiciousUsers) {
    if (a.userId) userAlertCounts[a.userId] = (userAlertCounts[a.userId] || 0) + 1;
  }
  const suspiciousUserCount = Object.values(userAlertCounts).filter((c) => c > 2).length;

  const issues = [];
  if (unresolvedAlerts > 0) issues.push({ type: 'fraud_alerts', count: unresolvedAlerts, severity: 'high' });
  if (recentFailedOrders > 20) issues.push({ type: 'failed_orders', count: recentFailedOrders, severity: 'medium' });
  if (suspiciousUserCount > 0) issues.push({ type: 'suspicious_users', count: suspiciousUserCount, severity: 'high' });

  return {
    scannedAt: new Date().toISOString(),
    status: issues.length === 0 ? 'clean' : issues.some((i) => i.severity === 'high') ? 'critical' : 'warning',
    issues,
    summary: {
      unresolvedAlerts,
      recentFailedOrders,
      suspiciousUserCount,
    },
  };
}

export async function getFraudAlerts({ resolved = false, limit = 50 } = {}) {
  return prisma.fraudAlert.findMany({
    where: { resolved },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function resolveFraudAlert(id) {
  return prisma.fraudAlert.update({ where: { id }, data: { resolved: true } });
}
