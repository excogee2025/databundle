import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authMiddleware, requirePermission, adminMiddleware } from '../middleware/auth.js';
import { PERMISSIONS, ROLES } from '../config/roles.js';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from '../services/notificationService.js';

const router = Router();

router.get('/', authMiddleware, requirePermission(PERMISSIONS.NOTIFICATIONS), async (req, res) => {
  try {
    const notifications = await getUserNotifications(req.user.id);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    await markNotificationRead(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/read-all', authMiddleware, async (req, res) => {
  try {
    await markAllNotificationsRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spec: POST /api/notifications/send
router.post('/send', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string().uuid(),
      title: z.string().min(1),
      message: z.string().min(1),
      type: z.string().default('info'),
      link: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const notification = await prisma.notification.create({
      data: { ...data, status: 'sent' },
    });
    res.status(201).json(notification);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0]?.message });
    res.status(400).json({ error: err.message });
  }
});

// Spec: GET /api/notifications/:userId
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== ROLES.ADMIN && req.user.id !== req.params.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const notifications = await getUserNotifications(req.params.userId);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

const ticketSchema = z.object({
  subject: z.string().min(3),
  message: z.string().min(10),
});

const supportRouter = Router();

supportRouter.post('/', authMiddleware, requirePermission(PERMISSIONS.SUPPORT), async (req, res) => {
  try {
    const data = ticketSchema.parse(req.body);
    const priority = req.user.role === ROLES.SENIOR_AGENT || req.user.role === ROLES.SUPER_AGENT
      ? 'priority'
      : 'normal';

    const ticket = await prisma.supportTicket.create({
      data: { ...data, userId: req.user.id, priority },
    });
    res.status(201).json(ticket);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0]?.message });
    res.status(400).json({ error: err.message });
  }
});

supportRouter.get('/my', authMiddleware, requirePermission(PERMISSIONS.SUPPORT), async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

supportRouter.get('/admin/all', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

supportRouter.patch('/admin/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, adminReply } = req.body;
    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: { status, adminReply },
    });
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export { supportRouter };
