import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { getAuditLogs } from '../services/auditService.js';
import { runSecurityScan, getFraudAlerts, resolveFraudAlert } from '../services/fraudService.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

// Spec: GET /api/logs
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, action, limit, offset } = req.query;
    const logs = await getAuditLogs({
      userId,
      action,
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const securityRouter = Router();

// Spec: POST /api/security/scan
securityRouter.post('/scan', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const report = await runSecurityScan();
    await logAudit({
      userId: req.user.id,
      action: 'security.scan',
      metadata: report,
      severity: report.status === 'critical' ? 'critical' : 'info',
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

securityRouter.get('/fraud-alerts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const alerts = await getFraudAlerts({ resolved: req.query.resolved === 'true' });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

securityRouter.patch('/fraud-alerts/:id/resolve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const alert = await resolveFraudAlert(req.params.id);
    res.json(alert);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export { securityRouter };
export default router;
