import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';
import {
  getCustomerTrends,
  getAgentPerformance,
  getRevenueForecast,
  getFullAnalytics,
} from '../services/analyticsService.js';
import {
  customerTrendsToCSV,
  agentPerformanceToCSV,
  revenueForecastToCSV,
  generateAnalyticsPDF,
  getExportFilename,
} from '../services/exportService.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

const analyticsGuard = requirePermission(
  PERMISSIONS.ADVANCED_ANALYTICS,
  PERMISSIONS.SYSTEM_ANALYTICS,
  PERMISSIONS.MONITORING
);

router.get('/customer-trends', authMiddleware, analyticsGuard, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    res.json(await getCustomerTrends({ days }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/agent-performance', authMiddleware, analyticsGuard, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    res.json(await getAgentPerformance({ days }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/revenue-forecast', authMiddleware, analyticsGuard, async (req, res) => {
  try {
    const historyDays = parseInt(req.query.historyDays) || 60;
    const forecastDays = parseInt(req.query.forecastDays) || 14;
    res.json(await getRevenueForecast({ historyDays, forecastDays }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/full', authMiddleware, analyticsGuard, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    res.json(await getFullAnalytics({ days }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function loadReport(type, query) {
  const days = parseInt(query.days) || 90;
  switch (type) {
    case 'customer-trends':
      return { generatedAt: new Date().toISOString(), customerTrends: await getCustomerTrends({ days }) };
    case 'agent-performance':
      return { generatedAt: new Date().toISOString(), agentPerformance: await getAgentPerformance({ days }) };
    case 'revenue-forecast':
      return {
        generatedAt: new Date().toISOString(),
        revenueForecast: await getRevenueForecast({
          historyDays: parseInt(query.historyDays) || 60,
          forecastDays: parseInt(query.forecastDays) || 14,
        }),
      };
    case 'full':
      return getFullAnalytics({ days });
    default:
      throw new Error('Invalid report type');
  }
}

function reportToCSV(type, report) {
  switch (type) {
    case 'customer-trends':
      return customerTrendsToCSV(report.customerTrends);
    case 'agent-performance':
      return agentPerformanceToCSV(report.agentPerformance);
    case 'revenue-forecast':
      return revenueForecastToCSV(report.revenueForecast);
    case 'full': {
      const parts = [
        '=== CUSTOMER TRENDS ===',
        customerTrendsToCSV(report.customerTrends),
        '',
        '=== AGENT PERFORMANCE ===',
        agentPerformanceToCSV(report.agentPerformance),
        '',
        '=== REVENUE FORECAST ===',
        revenueForecastToCSV(report.revenueForecast),
      ];
      return parts.join('\n');
    }
    default:
      throw new Error('Invalid report type');
  }
}

// GET /api/analytics/export/:type/:format  (csv | pdf)
router.get('/export/:type/:format', authMiddleware, analyticsGuard, async (req, res) => {
  try {
    const { type, format } = req.params;
    if (!['customer-trends', 'agent-performance', 'revenue-forecast', 'full'].includes(type)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }
    if (!['csv', 'pdf'].includes(format)) {
      return res.status(400).json({ error: 'Format must be csv or pdf' });
    }

    const report = await loadReport(type, req.query);
    const filename = getExportFilename(type, format);

    await logAudit({
      userId: req.user.id,
      action: 'analytics.export',
      resource: `${type}.${format}`,
      ipAddress: req.ip,
    });

    if (format === 'csv') {
      const csv = reportToCSV(type, report);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send('\uFEFF' + csv);
    }

    const fullReport = type === 'full'
      ? report
      : await getFullAnalytics({ days: parseInt(req.query.days) || 90 });

    const pdf = await generateAnalyticsPDF(fullReport);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
