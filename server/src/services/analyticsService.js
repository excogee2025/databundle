import prisma from '../lib/prisma.js';
import { ROLES, ROLE_LABELS, AGENT_ROLES } from '../config/roles.js';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function getCustomerTrends({ days = 90 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const completed = await prisma.order.findMany({
    where: { status: 'completed', createdAt: { gte: since } },
    include: { items: { include: { bundle: { include: { network: true } } } } },
  });

  const bundleCounts = {};
  const hourCounts = Array(24).fill(0);
  const dayCounts = Array(7).fill(0);
  const networkCounts = {};

  for (const order of completed) {
    const d = new Date(order.createdAt);
    hourCounts[d.getHours()] += 1;
    dayCounts[d.getDay()] += 1;

    for (const item of order.items) {
      const b = item.bundle;
      const key = b.id;
      if (!bundleCounts[key]) {
        bundleCounts[key] = {
          bundleId: b.id,
          name: b.name,
          dataAmount: b.dataAmount,
          network: b.network?.name || order.networkSlug,
          operator: b.operator || b.network?.name,
          count: 0,
          revenue: 0,
        };
      }
      bundleCounts[key].count += item.quantity;
      bundleCounts[key].revenue += item.unitPrice * item.quantity;
    }

    networkCounts[order.networkSlug] = (networkCounts[order.networkSlug] || 0) + 1;
  }

  const popularBundles = Object.values(bundleCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const peakDay = dayCounts.indexOf(Math.max(...dayCounts));

  const purchasesByHour = hourCounts.map((count, hour) => ({
    hour,
    label: `${hour.toString().padStart(2, '0')}:00`,
    count,
  }));

  const purchasesByDay = dayCounts.map((count, day) => ({
    day,
    label: DAY_NAMES[day],
    count,
  }));

  return {
    periodDays: days,
    totalPurchases: completed.length,
    popularBundles,
    peakPurchaseTimes: {
      peakHour: { hour: peakHour, label: `${peakHour.toString().padStart(2, '0')}:00`, count: hourCounts[peakHour] },
      peakDay: { day: peakDay, label: DAY_NAMES[peakDay], count: dayCounts[peakDay] },
      byHour: purchasesByHour,
      byDay: purchasesByDay,
    },
    purchasesByNetwork: Object.entries(networkCounts).map(([slug, count]) => ({ network: slug, count })),
  };
}

export async function getAgentPerformance({ days = 90 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const agentOrders = await prisma.order.findMany({
    where: {
      status: 'completed',
      agentId: { not: null },
      createdAt: { gte: since },
    },
    include: {
      agent: { select: { id: true, name: true, role: true, email: true } },
    },
  });

  const byLevel = {};
  const byAgent = {};

  for (const role of AGENT_ROLES) {
    byLevel[role] = {
      level: role,
      label: ROLE_LABELS[role],
      salesCount: 0,
      revenue: 0,
      commissions: 0,
      agentCount: 0,
    };
  }

  const agentIds = new Set();

  for (const order of agentOrders) {
    const role = order.agent?.role;
    if (!role || !byLevel[role]) continue;

    byLevel[role].salesCount += 1;
    byLevel[role].revenue += order.totalAmount;
    byLevel[role].commissions += order.commissionAmount;
    agentIds.add(order.agentId);

    if (!byAgent[order.agentId]) {
      byAgent[order.agentId] = {
        agentId: order.agentId,
        name: order.agent.name,
        email: order.agent.email,
        level: role,
        levelLabel: ROLE_LABELS[role],
        salesCount: 0,
        revenue: 0,
        commissions: 0,
      };
    }
    byAgent[order.agentId].salesCount += 1;
    byAgent[order.agentId].revenue += order.totalAmount;
    byAgent[order.agentId].commissions += order.commissionAmount;
  }

  for (const role of AGENT_ROLES) {
    byLevel[role].agentCount = await prisma.user.count({ where: { role, active: true } });
  }

  const topAgents = Object.values(byAgent).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  return {
    periodDays: days,
    totalAgentSales: agentOrders.length,
    byLevel: Object.values(byLevel).filter((l) => l.salesCount > 0 || l.agentCount > 0),
    topAgents,
    summary: {
      totalRevenue: agentOrders.reduce((s, o) => s + o.totalAmount, 0),
      totalCommissions: agentOrders.reduce((s, o) => s + o.commissionAmount, 0),
      activeSellingAgents: agentIds.size,
    },
  };
}

function linearForecast(dataPoints, forecastDays) {
  const n = dataPoints.length;
  if (n < 2) {
    const avg = n ? dataPoints[0].value : 0;
    return Array.from({ length: forecastDays }, (_, i) => ({
      date: addDays(dataPoints[n - 1]?.date || new Date(), i + 1),
      predicted: avg,
      lower: avg * 0.85,
      upper: avg * 1.15,
    }));
  }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  dataPoints.forEach((p, i) => {
    sumX += i;
    sumY += p.value;
    sumXY += i * p.value;
    sumX2 += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;

  const residuals = dataPoints.map((p, i) => p.value - (slope * i + intercept));
  const stdDev = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / n);

  const lastDate = new Date(dataPoints[n - 1].date);
  return Array.from({ length: forecastDays }, (_, i) => {
    const x = n + i;
    const predicted = Math.max(0, slope * x + intercept);
    return {
      date: addDays(lastDate, i + 1),
      dayOffset: i + 1,
      predicted: round2(predicted),
      lower: round2(Math.max(0, predicted - 1.96 * stdDev)),
      upper: round2(predicted + 1.96 * stdDev),
    };
  });
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export async function getRevenueForecast({ historyDays = 60, forecastDays = 14 } = {}) {
  const since = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: { status: 'completed', createdAt: { gte: since } },
    select: { totalAmount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const dailyMap = {};
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    dailyMap[key] = (dailyMap[key] || 0) + o.totalAmount;
  }

  const sortedDates = Object.keys(dailyMap).sort();
  const historical = sortedDates.map((date) => ({ date, value: dailyMap[date] }));

  const last14 = historical.slice(-14);
  const avgDaily = last14.length
    ? last14.reduce((s, d) => s + d.value, 0) / last14.length
    : 0;

  const forecast = linearForecast(historical.length >= 7 ? historical.slice(-30) : historical, forecastDays);

  const predictedTotal = forecast.reduce((s, f) => s + f.predicted, 0);
  const trend = historical.length >= 2
    ? historical[historical.length - 1].value - historical[historical.length - 2].value
    : 0;

  return {
    historyDays,
    forecastDays,
    historical,
    forecast,
    summary: {
      avgDailyRevenue: round2(avgDaily),
      predictedPeriodRevenue: round2(predictedTotal),
      trendDirection: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
      trendChange: round2(trend),
      confidence: historical.length >= 14 ? 'high' : historical.length >= 7 ? 'medium' : 'low',
      method: 'linear_regression',
    },
  };
}

export async function getFullAnalytics(options = {}) {
  const [customerTrends, agentPerformance, revenueForecast] = await Promise.all([
    getCustomerTrends(options),
    getAgentPerformance(options),
    getRevenueForecast(options),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    customerTrends,
    agentPerformance,
    revenueForecast,
  };
}
