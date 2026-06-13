import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { ROLES, ROLE_LABELS, getCommissionRate } from '../config/roles.js';

const router = Router();

router.get('/stats', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const [users, agents, orders, revenue, tickets, promotions] = await Promise.all([
      prisma.user.count({ where: { role: ROLES.CUSTOMER } }),
      prisma.user.count({ where: { role: { in: [ROLES.BASIC_AGENT, ROLES.SENIOR_AGENT, ROLES.SUPER_AGENT] } } }),
      prisma.order.count(),
      prisma.order.aggregate({ where: { status: 'completed' }, _sum: { totalAmount: true } }),
      prisma.supportTicket.count({ where: { status: 'open' } }),
      prisma.promotion.count({ where: { status: 'pending' } }),
    ]);

    const completed = await prisma.order.count({ where: { status: 'completed' } });

    res.json({
      users,
      agents,
      totalOrders: orders,
      completedOrders: completed,
      revenue: revenue._sum.totalAmount || 0,
      openTickets: tickets,
      pendingPromotions: promotions,
      successRate: orders ? ((completed / orders) * 100).toFixed(1) : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { role } = req.query;
    const users = await prisma.user.findMany({
      where: role ? { role } : {},
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        wallet: true, active: true, createdAt: true,
        parentAgent: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { role, active, wallet } = req.body;
    const data = {};
    if (role !== undefined) data.role = role;
    if (active !== undefined) data.active = active;
    if (wallet !== undefined) data.wallet = wallet;
    if (role && [ROLES.BASIC_AGENT, ROLES.SENIOR_AGENT, ROLES.SUPER_AGENT].includes(role)) {
      data.commissionRate = getCommissionRate(role);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, wallet: true },
    });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/transactions', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const [orders, walletTxns] = await Promise.all([
      prisma.transaction.findMany({
        include: { order: { select: { orderNumber: true, recipientPhone: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.walletTransaction.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    res.json({ payments: orders, wallet: walletTxns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/bundles', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const bundles = await prisma.bundle.findMany({
      include: { network: true },
      orderBy: { price: 'asc' },
    });
    res.json(bundles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const bundleSchema = z.object({
  name: z.string().min(2),
  dataAmount: z.string(),
  validity: z.string(),
  price: z.number().min(0),
  costPrice: z.number().min(0),
  apiCode: z.string(),
  popular: z.boolean().optional(),
  active: z.boolean().optional(),
});

router.post('/bundles', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const data = bundleSchema.parse(req.body);
    const bundle = await prisma.bundle.create({
      data: { ...data, networkId: req.body.networkId },
      include: { network: true },
    });
    res.status(201).json(bundle);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0]?.message });
    res.status(400).json({ error: err.message });
  }
});

router.patch('/bundles/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const bundle = await prisma.bundle.update({
      where: { id: req.params.id },
      data: req.body,
      include: { network: true },
    });
    res.json(bundle);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/roles', (_req, res) => {
  res.json(ROLE_LABELS);
});

export default router;
