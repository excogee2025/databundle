import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { cacheGet, cacheSet } from '../lib/redis.js';

const router = Router();
const CACHE_TTL = 300;

router.get('/networks', async (_req, res) => {
  try {
    const cached = await cacheGet('bundles:networks');
    if (cached) return res.json(cached);

    const networks = await prisma.network.findMany({
      where: { active: true },
      include: {
        bundles: { where: { active: true }, orderBy: { price: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
    await cacheSet('bundles:networks', networks, CACHE_TTL);
    res.json(networks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spec: GET /api/bundles
router.get('/', async (req, res) => {
  try {
    const { network, popular, operator } = req.query;
    const cacheKey = `bundles:list:${network || 'all'}:${popular || 'all'}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const bundles = await prisma.bundle.findMany({
      where: {
        active: true,
        ...(network ? { network: { slug: network } } : {}),
        ...(operator ? { operator } : {}),
        ...(popular === 'true' ? { popular: true } : {}),
      },
      include: { network: true },
      orderBy: { price: 'asc' },
    });
    await cacheSet(cacheKey, bundles, CACHE_TTL);
    res.json(bundles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spec: GET /api/bundles/:id
router.get('/:id', async (req, res) => {
  try {
    if (req.params.id === 'networks') return res.redirect(301, '/api/bundles/networks');

    const cached = await cacheGet(`bundles:${req.params.id}`);
    if (cached) return res.json(cached);

    const bundle = await prisma.bundle.findUnique({
      where: { id: req.params.id },
      include: { network: true },
    });
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    await cacheSet(`bundles:${req.params.id}`, bundle, CACHE_TTL);
    res.json(bundle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy aliases
router.get('/bundles/list/all', (req, res) => res.redirect(307, '/api/bundles?' + new URLSearchParams(req.query).toString()));

export default router;
