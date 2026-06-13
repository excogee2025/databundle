import prisma from '../lib/prisma.js';
import { logAudit } from './auditService.js';

export async function exportUserData(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, phone: true, role: true,
      gdprConsent: true, gdprConsentAt: true, createdAt: true,
    },
  });

  if (!user) throw new Error('User not found');

  const [orders, notifications, walletTxns, supportTickets, auditLogs] = await Promise.all([
    prisma.order.findMany({ where: { userId }, include: { items: { include: { bundle: true } } } }),
    prisma.notification.findMany({ where: { userId } }),
    prisma.walletTransaction.findMany({ where: { userId } }),
    prisma.supportTicket.findMany({ where: { userId } }),
    prisma.auditLog.findMany({ where: { userId }, take: 100 }),
  ]);

  await logAudit({ userId, action: 'gdpr.data_export', resource: userId, severity: 'info' });

  return {
    exportedAt: new Date().toISOString(),
    user,
    orders,
    notifications,
    walletTransactions: walletTxns,
    supportTickets,
    auditLogs,
  };
}

export async function deleteUserData(userId, { anonymize = true } = {}) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  if (anonymize) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@anonymized.local`,
        name: 'Deleted User',
        phone: null,
        password: 'DELETED',
        active: false,
        gdprConsent: false,
      },
    });
  } else {
    await prisma.user.delete({ where: { id: userId } });
  }

  await logAudit({ userId, action: 'gdpr.data_deletion', resource: userId, severity: 'warning' });
  return { success: true, anonymized: anonymize };
}

export async function recordConsent(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: { gdprConsent: true, gdprConsentAt: new Date() },
  });
}

export function gdprMiddleware(req, res, next) {
  if (process.env.GDPR_REQUIRED === 'true' && req.user && !req.path.includes('/consent')) {
    // Allow auth routes and consent endpoint without check
    if (!req.user.gdprConsent && !req.path.startsWith('/api/auth')) {
      return res.status(403).json({
        error: 'GDPR consent required',
        code: 'GDPR_CONSENT_REQUIRED',
        consentUrl: '/api/auth/consent',
      });
    }
  }
  next();
}
