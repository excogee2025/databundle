import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireSelfOrAdmin, adminMiddleware } from '../middleware/auth.js';
import { isAgent, ROLES } from '../config/roles.js';
import { getAgentSalesStats, getAgentHierarchyIds, getAgentCommissions } from '../services/commissionService.js';

const router = Router();

// Spec: GET /api/dashboard/customer/:id
router.get('/customer/:id', authMiddleware, requireSelfOrAdmin('id'), async (req, res) => {
  try {
    const userId = req.params.id;
    const [user, orders, notifications, wallet] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, wallet: true, role: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: { userId },
        include: { items: { include: { bundle: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.notification.findMany({ where: { userId, read: false }, take: 5 }),
      prisma.wallet.findUnique({ where: { userId } }),
    ]);

    const stats = {
      totalOrders: await prisma.order.count({ where: { userId } }),
      completedOrders: await prisma.order.count({ where: { userId, status: 'completed' } }),
      totalSpent: (await prisma.order.aggregate({
        where: { userId, status: 'completed' },
        _sum: { totalAmount: true },
      }))._sum.totalAmount || 0,
    };

    res.json({ user, stats, recentOrders: orders, unreadNotifications: notifications, wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spec: GET /api/dashboard/agent/:id
router.get('/agent/:id', authMiddleware, requireSelfOrAdmin('id'), async (req, res) => {
  try {
    const agentId = req.params.id;
    const user = await prisma.user.findUnique({
      where: { id: agentId },
      include: { agentProfile: true },
    });

    if (!user || !isAgent(user.role)) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const subIds = await getAgentHierarchyIds(agentId);
    const [stats, recentSales, commissions] = await Promise.all([
      getAgentSalesStats(agentId, subIds),
      prisma.order.findMany({
        where: { agentId },
        include: { items: { include: { bundle: { include: { network: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      getAgentCommissions(agentId),
    ]);

    res.json({
      agent: { id: user.id, name: user.name, role: user.role, profile: user.agentProfile },
      stats,
      recentSales,
      recentCommissions: commissions.slice(0, 10),
      subAgentCount: subIds.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spec: GET /api/dashboard/admin
router.get('/admin', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const [
      totalUsers, totalAgents, totalOrders, completedOrders,
      revenue, openTickets, unresolvedFraud, recentAudit,
    ] = await Promise.all([
      prisma.user.count({ where: { role: ROLES.CUSTOMER } }),
      prisma.user.count({ where: { role: { in: [ROLES.BASIC_AGENT, ROLES.SENIOR_AGENT, ROLES.SUPER_AGENT] } } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'completed' } }),
      prisma.order.aggregate({ where: { status: 'completed' }, _sum: { totalAmount: true } }),
      prisma.supportTicket.count({ where: { status: 'open' } }),
      prisma.fraudAlert.count({ where: { resolved: false } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { name: true } } } }),
    ]);

    res.json({
      stats: {
        customers: totalUsers,
        agents: totalAgents,
        totalOrders,
        completedOrders,
        revenue: revenue._sum.totalAmount || 0,
        successRate: totalOrders ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0,
        openTickets,
        unresolvedFraud,
      },
      recentAudit,
      systemHealth: {
        database: 'connected',
        redis: process.env.REDIS_URL ? 'configured' : 'optional',
        telecom: process.env.TELECOM_MODE || 'mock',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
