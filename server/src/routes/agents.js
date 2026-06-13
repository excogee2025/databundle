import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { authMiddleware, requirePermission, adminMiddleware } from '../middleware/auth.js';
import { PERMISSIONS, canCreateAgentRole, getCommissionRate, ROLES, ROLE_LABELS } from '../config/roles.js';
import {
  getAgentCommissions,
  getAgentSalesStats,
  getAgentHierarchyIds,
  getBundlePriceForAgent,
} from '../services/commissionService.js';
import { createAgentSale } from '../services/orderService.js';
import { createNotification } from '../services/notificationService.js';

const router = Router();

// Spec: GET /api/agents
router.get('/', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const agents = await prisma.user.findMany({
      where: { role: { in: [ROLES.BASIC_AGENT, ROLES.SENIOR_AGENT, ROLES.SUPER_AGENT] } },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        wallet: true, active: true, createdAt: true,
        agentProfile: true,
        parentAgent: { select: { name: true } },
        _count: { select: { agentOrders: true, subAgents: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spec: GET /api/agents/:id/sales
router.get('/:id/sales', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== ROLES.ADMIN && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const sales = await prisma.order.findMany({
      where: { agentId: req.params.id },
      include: { items: { include: { bundle: { include: { network: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dashboard', authMiddleware, requirePermission(PERMISSIONS.SELL_BUNDLES), async (req, res) => {
  try {
    const subIds = await getAgentHierarchyIds(req.user.id);
    const stats = await getAgentSalesStats(req.user.id, subIds);
    const recentSales = await prisma.order.findMany({
      where: { agentId: req.user.id },
      include: { items: { include: { bundle: { include: { network: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({ stats, recentSales, subAgentCount: subIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/commissions', authMiddleware, requirePermission(PERMISSIONS.VIEW_COMMISSIONS), async (req, res) => {
  try {
    const commissions = await getAgentCommissions(req.user.id);
    res.json(commissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sales', authMiddleware, requirePermission(PERMISSIONS.VIEW_PERSONAL_SALES), async (req, res) => {
  try {
    const includeSub = req.user.role === ROLES.SENIOR_AGENT || req.user.role === ROLES.SUPER_AGENT;
    let agentIds = [req.user.id];
    if (includeSub) {
      agentIds = [req.user.id, ...(await getAgentHierarchyIds(req.user.id))];
    }

    const sales = await prisma.order.findMany({
      where: { agentId: { in: agentIds } },
      include: {
        items: { include: { bundle: { include: { network: true } } } },
        agent: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sell', authMiddleware, requirePermission(PERMISSIONS.SELL_BUNDLES), async (req, res) => {
  try {
    const schema = z.object({
      bundleId: z.string().uuid(),
      recipientPhone: z.string().min(9),
      paymentSource: z.enum(['wallet', 'paystack']).default('wallet'),
    });
    const data = schema.parse(req.body);

    const result = await createAgentSale({
      agentId: req.user.id,
      agentRole: req.user.role,
      ...data,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0]?.message });
    res.status(400).json({ error: err.message });
  }
});

router.get('/sub-agents', authMiddleware, requirePermission(PERMISSIONS.MANAGE_SUB_AGENTS, PERMISSIONS.FULL_HIERARCHY), async (req, res) => {
  try {
    const where = req.user.role === ROLES.SUPER_AGENT || req.user.role === ROLES.ADMIN
      ? { OR: [{ parentAgentId: req.user.id }, { parentAgent: { parentAgentId: req.user.id } }] }
      : { parentAgentId: req.user.id };

    const agents = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        wallet: true, active: true, createdAt: true,
        _count: { select: { agentOrders: true, subAgents: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const createAgentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  role: z.enum([ROLES.BASIC_AGENT, ROLES.SENIOR_AGENT, ROLES.SUPER_AGENT]),
});

router.post('/sub-agents', authMiddleware, requirePermission(PERMISSIONS.MANAGE_SUB_AGENTS, PERMISSIONS.FULL_HIERARCHY), async (req, res) => {
  try {
    const data = createAgentSchema.parse(req.body);

    if (!canCreateAgentRole(req.user.role, data.role)) {
      return res.status(403).json({ error: `You cannot create ${ROLE_LABELS[data.role]} accounts` });
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(data.password, 12);
    const agent = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: hashed,
        role: data.role,
        parentAgentId: req.user.id,
        commissionRate: getCommissionRate(data.role),
        wallet: 0,
      },
      select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
    });

    await createNotification(agent.id, {
      title: 'Agent Account Created',
      message: `Welcome! Your ${ROLE_LABELS[data.role]} account is ready.`,
      type: 'success',
      link: '/agent',
    });

    res.status(201).json(agent);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0]?.message });
    res.status(400).json({ error: err.message });
  }
});

router.get('/analytics', authMiddleware, requirePermission(PERMISSIONS.ADVANCED_ANALYTICS, PERMISSIONS.SYSTEM_ANALYTICS), async (req, res) => {
  try {
    const subIds = await getAgentHierarchyIds(req.user.id);
    const stats = await getAgentSalesStats(req.user.id, subIds);

    const salesByNetwork = await prisma.order.groupBy({
      by: ['networkSlug'],
      where: { agentId: { in: [req.user.id, ...subIds] }, status: 'completed' },
      _count: true,
      _sum: { totalAmount: true },
    });

    const salesByDay = await prisma.order.findMany({
      where: { agentId: { in: [req.user.id, ...subIds] }, status: 'completed' },
      select: { totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    res.json({ stats, salesByNetwork, recentSales: salesByDay });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pricing', authMiddleware, requirePermission(PERMISSIONS.LIMITED_PRICING), async (req, res) => {
  try {
    const pricing = await prisma.agentPricing.findMany({
      where: { agentId: req.user.id },
      include: { bundle: { include: { network: true } } },
    });
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/pricing/:bundleId', authMiddleware, requirePermission(PERMISSIONS.LIMITED_PRICING), async (req, res) => {
  try {
    const { customPrice } = req.body;
    if (!customPrice || customPrice < 0) return res.status(400).json({ error: 'Invalid price' });

    const bundle = await prisma.bundle.findUnique({ where: { id: req.params.bundleId } });
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });

    const minPrice = bundle.costPrice * 1.05;
    const maxPrice = bundle.price * 1.2;
    if (customPrice < minPrice || customPrice > maxPrice) {
      return res.status(400).json({
        error: `Price must be between GH₵ ${minPrice.toFixed(2)} and GH₵ ${maxPrice.toFixed(2)}`,
      });
    }

    const pricing = await prisma.agentPricing.upsert({
      where: { agentId_bundleId: { agentId: req.user.id, bundleId: req.params.bundleId } },
      update: { customPrice },
      create: { agentId: req.user.id, bundleId: req.params.bundleId, customPrice },
      include: { bundle: { include: { network: true } } },
    });
    res.json(pricing);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/promotions', authMiddleware, async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_AGENT || req.user.role === ROLES.ADMIN;
    const promotions = await prisma.promotion.findMany({
      where: isSuper ? {} : { createdById: req.user.id },
      include: {
        bundle: { include: { network: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/promotions', authMiddleware, requirePermission(PERMISSIONS.FULL_HIERARCHY, PERMISSIONS.MANAGE_CONTENT), async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(3),
      description: z.string().optional(),
      discountPct: z.number().min(1).max(50),
      bundleId: z.string().uuid().optional(),
    });
    const data = schema.parse(req.body);

    const promotion = await prisma.promotion.create({
      data: { ...data, createdById: req.user.id, status: 'pending' },
      include: { bundle: true },
    });
    res.status(201).json(promotion);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0]?.message });
    res.status(400).json({ error: err.message });
  }
});

router.post('/promotions/:id/approve', authMiddleware, requirePermission(PERMISSIONS.APPROVE_PROMOTIONS), async (req, res) => {
  try {
    const { action } = req.body;
    const promotion = await prisma.promotion.update({
      where: { id: req.params.id },
      data: {
        status: action === 'reject' ? 'rejected' : 'approved',
        approvedById: req.user.id,
      },
    });

    await createNotification(promotion.createdById, {
      title: `Promotion ${promotion.status}`,
      message: `Your promotion "${promotion.title}" was ${promotion.status}.`,
      type: promotion.status === 'approved' ? 'success' : 'warning',
    });

    res.json(promotion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/bundle-price/:bundleId', authMiddleware, requirePermission(PERMISSIONS.SELL_BUNDLES), async (req, res) => {
  try {
    const price = await getBundlePriceForAgent(req.params.bundleId, req.user.id);
    res.json({ price });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
