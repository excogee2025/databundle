import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authMiddleware, optionalAuth, requireSelfOrAdmin } from '../middleware/auth.js';
import { createOrder, handlePaymentSuccess } from '../services/orderService.js';
import { checkPurchaseFraud } from '../services/fraudService.js';
import { logAudit } from '../services/auditService.js';
import { detectNetwork } from '../services/telecom.js';

const router = Router();

const purchaseSchema = z.object({
  bundleId: z.string().uuid(),
  recipientPhone: z.string().min(9),
  email: z.string().email(),
  paymentSource: z.enum(['paystack', 'wallet']).default('paystack'),
});

// Spec: POST /api/purchase
router.post('/', optionalAuth, async (req, res) => {
  try {
    const data = purchaseSchema.parse(req.body);

    if (req.user?.id) {
      const bundle = await prisma.bundle.findUnique({ where: { id: data.bundleId } });
      const fraud = await checkPurchaseFraud({
        userId: req.user.id,
        amount: bundle?.price || 0,
        ipAddress: req.ip || req.headers['x-forwarded-for'],
      });

      if (fraud.blocked) {
        await logAudit({
          userId: req.user.id,
          action: 'purchase.blocked_fraud',
          ipAddress: req.ip,
          metadata: { alerts: fraud.alerts.map((a) => a.type) },
          severity: 'critical',
        });
        return res.status(403).json({ error: 'Purchase blocked due to security policy', code: 'FRAUD_DETECTED' });
      }
    }

    const result = await createOrder({
      ...data,
      userId: req.user?.id,
      guestEmail: req.user ? undefined : data.email,
      paymentSource: data.paymentSource,
    });

    await logAudit({
      userId: req.user?.id,
      action: 'purchase.created',
      resource: result.order?.orderNumber,
      ipAddress: req.ip,
      metadata: { amount: result.order?.totalAmount },
    });

    res.status(201).json(result);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0]?.message });
    res.status(400).json({ error: err.message });
  }
});

// Spec: GET /api/purchase/history/:userId
router.get('/history/:userId', authMiddleware, requireSelfOrAdmin('userId'), async (req, res) => {
  try {
    const purchases = await prisma.order.findMany({
      where: { userId: req.params.userId },
      include: {
        items: { include: { bundle: { include: { network: true } } } },
        transactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify-payment', async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: 'Reference required' });
    const result = await handlePaymentSuccess(reference);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/detect-network', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  res.json({ network: detectNetwork(phone) });
});

export default router;
