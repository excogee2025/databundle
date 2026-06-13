import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { signToken, authMiddleware } from '../middleware/auth.js';
import { ROLE_PERMISSIONS, ROLE_LABELS } from '../config/roles.js';
import { logAudit } from '../services/auditService.js';
import { blacklistToken } from '../lib/redis.js';
import { recordConsent, exportUserData, deleteUserData } from '../services/gdprService.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  gdprConsent: z.boolean().default(false),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: hashed,
        gdprConsent: data.gdprConsent,
        gdprConsentAt: data.gdprConsent ? new Date() : null,
        walletRecord: { create: { balance: 0 } },
      },
      select: { id: true, name: true, email: true, phone: true, role: true, wallet: true, gdprConsent: true },
    });

    const { token } = signToken({ id: user.id, email: user.email, role: user.role });
    await logAudit({
      userId: user.id,
      action: 'auth.register',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ user, token });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0]?.message });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.active || !(await bcrypt.compare(data.password, user.password))) {
      await logAudit({
        action: 'auth.login_failed',
        ipAddress: req.ip,
        metadata: { email: data.email },
        severity: 'warning',
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { token } = signToken({ id: user.id, email: user.email, role: user.role });
    await logAudit({
      userId: user.id,
      action: 'auth.login',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        wallet: user.wallet,
        gdprConsent: user.gdprConsent,
      },
      token,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0]?.message });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const expiresIn = 7 * 24 * 60 * 60;
    if (req.user.jti) {
      await blacklistToken(req.user.jti, expiresIn);
    }
    await logAudit({
      userId: req.user.id,
      action: 'auth.logout',
      ipAddress: req.ip,
    });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/consent', authMiddleware, async (req, res) => {
  try {
    const user = await recordConsent(req.user.id);
    res.json({ gdprConsent: user.gdprConsent, gdprConsentAt: user.gdprConsentAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me/export', authMiddleware, async (req, res) => {
  try {
    const data = await exportUserData(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/me', authMiddleware, async (req, res) => {
  try {
    const result = await deleteUserData(req.user.id, { anonymize: true });
    if (req.user.jti) await blacklistToken(req.user.jti, 86400);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        wallet: true, gdprConsent: true, createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      ...user,
      roleLabel: ROLE_LABELS[user.role],
      permissions: ROLE_PERMISSIONS[user.role] || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
