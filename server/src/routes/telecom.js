import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authMiddleware, requirePermission, adminMiddleware } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';
import { purchaseBundle, checkBundleStatus, normalizePhone, detectNetwork } from '../services/telecom.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

const activateSchema = z.object({
  phone: z.string().min(9),
  bundleCode: z.string(),
  networkSlug: z.string(),
  reference: z.string().optional(),
});

// Spec: POST /api/telecom/activate
router.post('/activate', authMiddleware, requirePermission(PERMISSIONS.SELL_BUNDLES, PERMISSIONS.MANAGE_TRANSACTIONS), async (req, res) => {
  try {
    const data = activateSchema.parse(req.body);
    const result = await purchaseBundle({
      phone: normalizePhone(data.phone),
      apiCode: data.bundleCode,
      networkSlug: data.networkSlug,
      orderRef: data.reference || `TEL-${Date.now()}`,
    });

    await logAudit({
      userId: req.user.id,
      action: 'telecom.activate',
      resource: result.reference,
      ipAddress: req.ip,
      metadata: { phone: data.phone, success: result.success },
    });

    res.json(result);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0]?.message });
    res.status(400).json({ error: err.message });
  }
});

// Spec: GET /api/telecom/status/:transactionId
router.get('/status/:transactionId', authMiddleware, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { telecomRef: req.params.transactionId },
          { orderNumber: req.params.transactionId },
          { id: req.params.transactionId },
        ],
      },
      include: { items: { include: { bundle: true } } },
    });

    if (order) {
      return res.json({
        transactionId: order.telecomRef || order.orderNumber,
        status: order.telecomStatus || order.status,
        orderStatus: order.status,
        recipientPhone: order.recipientPhone,
        fulfilledAt: order.fulfilledAt,
      });
    }

    const status = await checkBundleStatus(req.params.transactionId);
    res.json({ transactionId: req.params.transactionId, ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/detect-network', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  res.json({ network: detectNetwork(phone) });
});

export default router;
