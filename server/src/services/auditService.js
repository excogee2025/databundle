import prisma from './prisma.js';

export async function logAudit({
  userId = null,
  action,
  resource = null,
  ipAddress = null,
  userAgent = null,
  metadata = null,
  severity = 'info',
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        ipAddress,
        userAgent,
        metadata: metadata ? JSON.stringify(metadata) : null,
        severity,
      },
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write:', err.message);
    return null;
  }
}

export async function getAuditLogs({ userId, action, limit = 100, offset = 0 } = {}) {
  return prisma.auditLog.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(action ? { action } : {}),
    },
    include: { user: { select: { name: true, email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export function auditMiddleware(action, resource = null) {
  return async (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        logAudit({
          userId: req.user?.id,
          action,
          resource: resource || req.originalUrl,
          ipAddress: req.ip || req.headers['x-forwarded-for'],
          userAgent: req.headers['user-agent'],
          metadata: { method: req.method, status: res.statusCode },
        });
      }
    });
    next();
  };
}
