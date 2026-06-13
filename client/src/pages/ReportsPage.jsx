import { useEffect, useState } from 'react';
import { analytics as analyticsApi } from '../lib/api';
import DashboardSidebar from '../components/DashboardSidebar';
import RoleGuard from '../components/RoleGuard';
import { PageLoader } from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/helpers';
import { PERMISSIONS } from '../utils/roles';
import {
  TrendingUp, Users, BarChart3, FileSpreadsheet, FileText,
  Clock, Package, ArrowUp, ArrowDown, Minus,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'customer', label: 'Customer Trends', icon: TrendingUp },
  { id: 'agents', label: 'Agent Performance', icon: Users },
  { id: 'forecast', label: 'Revenue Forecast', icon: BarChart3 },
];

function BarChart({ data, labelKey, valueKey, color = 'bg-brand-500', formatValue }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-16 shrink-0 text-right">{item[labelKey]}</span>
          <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden">
            <div
              className={`h-full ${color} rounded-lg transition-all duration-500 flex items-center justify-end pr-2`}
              style={{ width: `${Math.max((item[valueKey] / max) * 100, item[valueKey] > 0 ? 8 : 0)}%` }}
            >
              {item[valueKey] > 0 && (
                <span className="text-[10px] font-bold text-white">
                  {formatValue ? formatValue(item[valueKey]) : item[valueKey]}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExportButtons({ reportType, days }) {
  const [exporting, setExporting] = useState(null);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      await analyticsApi.downloadExport(reportType, format, { days });
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleExport('csv')}
        disabled={!!exporting}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
      >
        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
        {exporting === 'csv' ? 'Exporting...' : 'CSV'}
      </button>
      <button
        onClick={() => handleExport('pdf')}
        disabled={!!exporting}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
      >
        <FileText className="w-4 h-4 text-red-600" />
        {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
      </button>
    </div>
  );
}

function TrendIcon({ direction }) {
  if (direction === 'up') return <ArrowUp className="w-4 h-4 text-emerald-600" />;
  if (direction === 'down') return <ArrowDown className="w-4 h-4 text-red-600" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

export default function ReportsPage() {
  const [tab, setTab] = useState('customer');
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [customerTrends, setCustomerTrends] = useState(null);
  const [agentPerformance, setAgentPerformance] = useState(null);
  const [revenueForecast, setRevenueForecast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [ct, ap, rf] = await Promise.all([
        analyticsApi.customerTrends({ days }),
        analyticsApi.agentPerformance({ days }),
        analyticsApi.revenueForecast({ historyDays: Math.min(days, 60), forecastDays: 14 }),
      ]);
      setCustomerTrends(ct.data);
      setAgentPerformance(ap.data);
      setRevenueForecast(rf.data);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);

  return (
    <RoleGuard permissions={[PERMISSIONS.ADVANCED_ANALYTICS, PERMISSIONS.SYSTEM_ANALYTICS, PERMISSIONS.MONITORING]}>
      <DashboardSidebar>
        <div className="animate-fade-in">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Analytics & Reports</h1>
              <p className="text-sm text-slate-500 mt-1">Customer trends, agent performance, revenue forecasting</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={days}
                onChange={(e) => setDays(+e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              >
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <ExportButtons reportType="full" days={days} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  tab === id ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {loading ? <PageLoader /> : (
            <>
              {tab === 'customer' && customerTrends && (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <ExportButtons reportType="customer-trends" days={days} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard icon={Package} label="Total Purchases" value={customerTrends.totalPurchases} />
                    <StatCard icon={Clock} label="Peak Hour" value={customerTrends.peakPurchaseTimes.peakHour.label} sub={`${customerTrends.peakPurchaseTimes.peakHour.count} orders`} />
                    <StatCard icon={TrendingUp} label="Peak Day" value={customerTrends.peakPurchaseTimes.peakDay.label} sub={`${customerTrends.peakPurchaseTimes.peakDay.count} orders`} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartCard title="Popular Bundles" subtitle="Top selling data plans">
                      {customerTrends.popularBundles.length === 0 ? (
                        <EmptyChart message="No purchase data yet" />
                      ) : (
                        <BarChart
                          data={customerTrends.popularBundles.slice(0, 8).map((b) => ({
                            label: `${b.network} ${b.dataAmount}`,
                            count: b.count,
                          }))}
                          labelKey="label"
                          valueKey="count"
                          color="bg-brand-500"
                        />
                      )}
                    </ChartCard>

                    <ChartCard title="Peak Purchase Times" subtitle="Orders by hour of day">
                      {customerTrends.totalPurchases === 0 ? (
                        <EmptyChart message="No purchase data yet" />
                      ) : (
                        <BarChart
                          data={customerTrends.peakPurchaseTimes.byHour.filter((_, h) => h >= 6 && h <= 23)}
                          labelKey="label"
                          valueKey="count"
                          color="bg-indigo-500"
                        />
                      )}
                    </ChartCard>
                  </div>

                  <ChartCard title="Purchases by Day of Week">
                    <BarChart
                      data={customerTrends.peakPurchaseTimes.byDay}
                      labelKey="label"
                      valueKey="count"
                      color="bg-purple-500"
                    />
                  </ChartCard>
                </div>
              )}

              {tab === 'agents' && agentPerformance && (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <ExportButtons reportType="agent-performance" days={days} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard icon={Users} label="Agent Sales" value={agentPerformance.totalAgentSales} />
                    <StatCard icon={TrendingUp} label="Total Revenue" value={formatCurrency(agentPerformance.summary.totalRevenue)} />
                    <StatCard icon={BarChart3} label="Active Agents" value={agentPerformance.summary.activeSellingAgents} />
                  </div>

                  <ChartCard title="Sales by Agent Level" subtitle="Performance grouped by role tier">
                    {agentPerformance.byLevel.length === 0 ? (
                      <EmptyChart message="No agent sales data yet" />
                    ) : (
                      <BarChart
                        data={agentPerformance.byLevel.map((l) => ({
                          label: l.label,
                          revenue: l.revenue,
                        }))}
                        labelKey="label"
                        valueKey="revenue"
                        color="bg-emerald-500"
                        formatValue={(v) => `₵${v.toFixed(0)}`}
                      />
                    )}
                  </ChartCard>

                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                      <h3 className="font-bold text-slate-900">Performance by Level</h3>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-3 text-left font-semibold text-slate-600">Level</th>
                          <th className="px-5 py-3 text-right font-semibold text-slate-600">Agents</th>
                          <th className="px-5 py-3 text-right font-semibold text-slate-600">Sales</th>
                          <th className="px-5 py-3 text-right font-semibold text-slate-600">Revenue</th>
                          <th className="px-5 py-3 text-right font-semibold text-slate-600">Commissions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentPerformance.byLevel.map((l) => (
                          <tr key={l.level} className="border-t border-slate-50">
                            <td className="px-5 py-3 font-medium">{l.label}</td>
                            <td className="px-5 py-3 text-right text-slate-500">{l.agentCount}</td>
                            <td className="px-5 py-3 text-right">{l.salesCount}</td>
                            <td className="px-5 py-3 text-right font-semibold text-brand-600">{formatCurrency(l.revenue)}</td>
                            <td className="px-5 py-3 text-right text-emerald-600">{formatCurrency(l.commissions)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {agentPerformance.topAgents.length > 0 && (
                    <ChartCard title="Top Agents" subtitle="By revenue">
                      <BarChart
                        data={agentPerformance.topAgents.slice(0, 8).map((a) => ({
                          label: a.name.split(' ')[0],
                          revenue: a.revenue,
                        }))}
                        labelKey="label"
                        valueKey="revenue"
                        color="bg-amber-500"
                        formatValue={(v) => `₵${v.toFixed(0)}`}
                      />
                    </ChartCard>
                  )}
                </div>
              )}

              {tab === 'forecast' && revenueForecast && (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <ExportButtons reportType="revenue-forecast" days={days} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={BarChart3} label="Avg Daily Revenue" value={formatCurrency(revenueForecast.summary.avgDailyRevenue)} />
                    <StatCard
                      icon={TrendingUp}
                      label="14-Day Forecast"
                      value={formatCurrency(revenueForecast.summary.predictedPeriodRevenue)}
                    />
                    <StatCard
                      label="Trend"
                      value={revenueForecast.summary.trendDirection}
                      sub={`${revenueForecast.summary.trendChange >= 0 ? '+' : ''}${formatCurrency(revenueForecast.summary.trendChange)} daily`}
                      trend={revenueForecast.summary.trendDirection}
                    />
                    <StatCard label="Confidence" value={revenueForecast.summary.confidence} sub="Linear regression" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartCard title="Historical Revenue" subtitle={`Last ${revenueForecast.historyDays} days`}>
                      {revenueForecast.historical.length === 0 ? (
                        <EmptyChart message="Not enough historical data" />
                      ) : (
                        <BarChart
                          data={revenueForecast.historical.slice(-14).map((h) => ({
                            label: h.date.slice(5),
                            value: h.value,
                          }))}
                          labelKey="label"
                          valueKey="value"
                          color="bg-brand-500"
                          formatValue={(v) => `₵${v.toFixed(0)}`}
                        />
                      )}
                    </ChartCard>

                    <ChartCard title="Demand Forecast" subtitle="Predicted daily revenue (next 14 days)">
                      <BarChart
                        data={revenueForecast.forecast.map((f) => ({
                          label: f.date.slice(5),
                          predicted: f.predicted,
                        }))}
                        labelKey="label"
                        valueKey="predicted"
                        color="bg-teal-500"
                        formatValue={(v) => `₵${v.toFixed(0)}`}
                      />
                      <p className="text-xs text-slate-400 mt-4">
                        Method: {revenueForecast.summary.method} · Range shown includes confidence bounds in export
                      </p>
                    </ChartCard>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                      <h3 className="font-bold text-slate-900">Forecast Detail</h3>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-3 text-left font-semibold text-slate-600">Date</th>
                          <th className="px-5 py-3 text-right font-semibold text-slate-600">Predicted</th>
                          <th className="px-5 py-3 text-right font-semibold text-slate-600">Lower</th>
                          <th className="px-5 py-3 text-right font-semibold text-slate-600">Upper</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueForecast.forecast.map((f) => (
                          <tr key={f.date} className="border-t border-slate-50">
                            <td className="px-5 py-3">{f.date}</td>
                            <td className="px-5 py-3 text-right font-semibold text-teal-600">{formatCurrency(f.predicted)}</td>
                            <td className="px-5 py-3 text-right text-slate-400">{formatCurrency(f.lower)}</td>
                            <td className="px-5 py-3 text-right text-slate-400">{formatCurrency(f.upper)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardSidebar>
    </RoleGuard>
  );
}

function StatCard({ icon: Icon, label, value, sub, trend }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4">
      {(Icon || trend) && (
        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center mb-2">
          {trend ? <TrendIcon direction={trend} /> : <Icon className="w-4 h-4 text-brand-600" />}
        </div>
      )}
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-extrabold text-slate-900 mt-0.5 capitalize">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h3 className="font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="text-center py-12 text-slate-400 text-sm">
      <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
      {message}
    </div>
  );
}
