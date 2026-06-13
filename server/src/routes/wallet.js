import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';
import {
  getWalletBalance,
  getWalletHistory,
  initiateWalletTopup,
} from '../services/walletService.js';
import { handlePaymentSuccess } from '../services/orderService.js';

const router = Router();

router.get('/balance', authMiddleware, requirePermission(PERMISSIONS.WALLET), async (req, res) => {
  try {
    const balance = await getWalletBalance(req.user.id);
    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', authMiddleware, requirePermission(PERMISSIONS.WALLET), async (req, res) => {
  try {
    const history = await getWalletHistory(req.user.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/topup', authMiddleware, requirePermission(PERMISSIONS.WALLET), async (req, res) => {
  try {
    const schema = z.object({ amount: z.number().min(1), email: z.string().email() });
    const { amount, email } = schema.parse(req.body);
    const result = await initiateWalletTopup(req.user.id, amount, email);
    res.json(result);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0]?.message });
    res.status(400).json({ error: err.message });
  }
});

router.post('/topup/verify', authMiddleware, async (req, res) => {
  try {
    const { reference } = req.body;
    const result = await handlePaymentSuccess(reference);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
