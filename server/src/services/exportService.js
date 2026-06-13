import PDFDocument from 'pdfkit';

export function toCSV(rows, columns) {
  const header = columns.map((c) => escapeCsv(c.label)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsv(c.accessor(row))).join(',')
  );
  return [header, ...lines].join('\n');
}

function escapeCsv(val) {
  const str = val == null ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function customerTrendsToCSV(data) {
  const bundleRows = data.popularBundles.map((b) => ({
    section: 'Popular Bundle',
    name: `${b.network} ${b.dataAmount} - ${b.name}`,
    purchases: b.count,
    revenue: b.revenue.toFixed(2),
  }));

  const hourRows = data.peakPurchaseTimes.byHour
    .filter((h) => h.count > 0)
    .map((h) => ({
      section: 'Peak Hour',
      name: h.label,
      purchases: h.count,
      revenue: '',
    }));

  return toCSV(
    [...bundleRows, ...hourRows],
    [
      { label: 'Section', accessor: (r) => r.section },
      { label: 'Item', accessor: (r) => r.name },
      { label: 'Purchases', accessor: (r) => r.purchases },
      { label: 'Revenue (GH₵)', accessor: (r) => r.revenue },
    ]
  );
}

export function agentPerformanceToCSV(data) {
  const levelRows = data.byLevel.map((l) => ({
    agent: l.label,
    level: l.level,
    sales: l.salesCount,
    revenue: l.revenue.toFixed(2),
    commissions: l.commissions.toFixed(2),
    agents: l.agentCount,
  }));

  const topRows = data.topAgents.map((a) => ({
    agent: a.name,
    level: a.levelLabel,
    sales: a.salesCount,
    revenue: a.revenue.toFixed(2),
    commissions: a.commissions.toFixed(2),
    agents: '',
  }));

  return toCSV(
    [...levelRows, ...topRows],
    [
      { label: 'Agent / Level', accessor: (r) => r.agent },
      { label: 'Role', accessor: (r) => r.level },
      { label: 'Sales', accessor: (r) => r.sales },
      { label: 'Revenue (GH₵)', accessor: (r) => r.revenue },
      { label: 'Commissions (GH₵)', accessor: (r) => r.commissions },
      { label: 'Agent Count', accessor: (r) => r.agents },
    ]
  );
}

export function revenueForecastToCSV(data) {
  const histRows = data.historical.map((h) => ({
    type: 'Historical',
    date: h.date,
    amount: h.value.toFixed(2),
    lower: '',
    upper: '',
  }));

  const forecastRows = data.forecast.map((f) => ({
    type: 'Forecast',
    date: f.date,
    amount: f.predicted.toFixed(2),
    lower: f.lower.toFixed(2),
    upper: f.upper.toFixed(2),
  }));

  return toCSV(
    [...histRows, ...forecastRows],
    [
      { label: 'Type', accessor: (r) => r.type },
      { label: 'Date', accessor: (r) => r.date },
      { label: 'Amount (GH₵)', accessor: (r) => r.amount },
      { label: 'Lower Bound', accessor: (r) => r.lower },
      { label: 'Upper Bound', accessor: (r) => r.upper },
    ]
  );
}

export async function generateAnalyticsPDF(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).fillColor('#4338ca').text('DataBundle GH — Analytics Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#64748b').text(`Generated: ${new Date(report.generatedAt || Date.now()).toLocaleString()}`, { align: 'center' });
    doc.moveDown(1.5);

    const ct = report.customerTrends;
    sectionTitle(doc, 'Customer Trends');
    doc.fontSize(10).fillColor('#334155');
    doc.text(`Total purchases (${ct.periodDays}d): ${ct.totalPurchases}`);
    doc.text(`Peak hour: ${ct.peakPurchaseTimes.peakHour.label} (${ct.peakPurchaseTimes.peakHour.count} orders)`);
    doc.text(`Peak day: ${ct.peakPurchaseTimes.peakDay.label} (${ct.peakPurchaseTimes.peakDay.count} orders)`);
    doc.moveDown(0.5);
    doc.text('Top Bundles:', { underline: true });
    ct.popularBundles.slice(0, 5).forEach((b, i) => {
      doc.text(`  ${i + 1}. ${b.network} ${b.dataAmount} — ${b.count} sales (GH₵ ${b.revenue.toFixed(2)})`);
    });
    doc.moveDown(1);

    const ap = report.agentPerformance;
    sectionTitle(doc, 'Agent Performance by Level');
    doc.fontSize(10).fillColor('#334155');
    ap.byLevel.forEach((l) => {
      doc.text(`${l.label}: ${l.salesCount} sales | GH₵ ${l.revenue.toFixed(2)} revenue | ${l.agentCount} agents`);
    });
    doc.moveDown(0.5);
    doc.text('Top Agents:', { underline: true });
    ap.topAgents.slice(0, 5).forEach((a, i) => {
      doc.text(`  ${i + 1}. ${a.name} (${a.levelLabel}) — GH₵ ${a.revenue.toFixed(2)}`);
    });
    doc.moveDown(1);

    const rf = report.revenueForecast;
    sectionTitle(doc, 'Revenue Forecast');
    doc.fontSize(10).fillColor('#334155');
    doc.text(`Method: Linear regression | Confidence: ${rf.summary.confidence}`);
    doc.text(`Avg daily revenue: GH₵ ${rf.summary.avgDailyRevenue}`);
    doc.text(`Predicted ${rf.forecastDays}-day revenue: GH₵ ${rf.summary.predictedPeriodRevenue}`);
    doc.text(`Trend: ${rf.summary.trendDirection} (${rf.summary.trendChange >= 0 ? '+' : ''}${rf.summary.trendChange})`);
    doc.moveDown(0.5);
    doc.text('Forecast:', { underline: true });
    rf.forecast.slice(0, 7).forEach((f) => {
      doc.text(`  ${f.date}: GH₵ ${f.predicted} (${f.lower} – ${f.upper})`);
    });

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#94a3b8').text('DataBundle GH — Confidential', { align: 'center' });

    doc.end();
  });
}

function sectionTitle(doc, title) {
  doc.fontSize(14).fillColor('#1e293b').text(title);
  doc.moveDown(0.4);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
  doc.moveDown(0.6);
}

export function getExportFilename(type, format) {
  const ts = new Date().toISOString().slice(0, 10);
  return `databundle-${type}-${ts}.${format}`;
}
