import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authMiddleware, optionalAuth, adminMiddleware } from '../middleware/auth.js';
import { createOrder, handlePaymentSuccess, retryFailedOrder } from '../services/orderService.js';
import { validatePaystackWebhookSignature } from '../services/paystack.js';
import { detectNetwork } from '../services/telecom.js';

const router = Router();

const createOrderSchema = z.object({
  bundleId: z.string().uuid(),
  recipientPhone: z.string().min(9),
  email: z.string().email(),
  guestPhone: z.string().optional(),
  paymentSource: z.enum(['paystack', 'wallet']).default('paystack'),
});

router.post('/detect-network', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  res.json({ network: detectNetwork(phone) });
});

router.post('/', optionalAuth, async (req, res) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const result = await createOrder({
      ...data,
      userId: req.user?.id,
      guestEmail: req.user ? undefined : data.email,
      paymentSource: data.paymentSource,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0]?.message });
    }
    res.status(400).json({ error: err.message });
  }
});

router.get('/track/:orderNumber', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
      include: {
        items: { include: { bundle: { include: { network: true } } } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: { include: { bundle: { include: { network: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify-payment', async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: 'Reference required' });
    const order = await handlePaymentSuccess(reference);
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/webhook/paystack', async (req, res) => {
  try {
    if (!validatePaystackWebhookSignature(req)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      await handlePaymentSuccess(reference);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(200);
  }
});

router.get('/admin/all', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { bundle: { include: { network: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/stats', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const [totalOrders, completedOrders, revenue, users] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'completed' } }),
      prisma.order.aggregate({
        where: { status: 'completed' },
        _sum: { totalAmount: true },
      }),
      prisma.user.count(),
    ]);

    res.json({
      totalOrders,
      completedOrders,
      revenue: revenue._sum.totalAmount || 0,
      users,
      successRate: totalOrders ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/:id/retry', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const order = await retryFailedOrder(req.params.id);
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
