import { useEffect, useState } from 'react';
import { agents as agentsApi, bundles as bundlesApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar, { RoleBadge } from '../components/DashboardSidebar';
import RoleGuard from '../components/RoleGuard';
import OrderCard from '../components/OrderCard';
import { PageLoader } from '../components/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/helpers';
import { PERMISSIONS, hasPermission, hasAnyPermission, ROLES, ROLE_LABELS } from '../utils/roles';
import {
  ShoppingBag, TrendingUp, Users, BarChart3, Tag, DollarSign,
  Plus, Phone, Send, Check, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'sell', label: 'Sell Bundle', icon: ShoppingBag, permission: PERMISSIONS.SELL_BUNDLES },
  { id: 'sales', label: 'Sales', icon: BarChart3, permission: PERMISSIONS.VIEW_PERSONAL_SALES },
  { id: 'commissions', label: 'Commissions', icon: DollarSign, permission: PERMISSIONS.VIEW_COMMISSIONS },
  { id: 'agents', label: 'Sub-Agents', icon: Users, permissions: [PERMISSIONS.MANAGE_SUB_AGENTS, PERMISSIONS.FULL_HIERARCHY] },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, permissions: [PERMISSIONS.ADVANCED_ANALYTICS, PERMISSIONS.SYSTEM_ANALYTICS] },
  { id: 'pricing', label: 'Pricing', icon: Tag, permission: PERMISSIONS.LIMITED_PRICING },
  { id: 'promotions', label: 'Promotions', icon: Tag },
];

export default function AgentDashboard() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [sales, setSales] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [subAgents, setSubAgents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [pricing, setPricing] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [networks, setNetworks] = useState([]);

  const [sellForm, setSellForm] = useState({ bundleId: '', recipientPhone: '' });
  const [agentForm, setAgentForm] = useState({ name: '', email: '', phone: '', password: '', role: ROLES.BASIC_AGENT });
  const [promoForm, setPromoForm] = useState({ title: '', description: '', discountPct: 5, bundleId: '' });

  const visibleTabs = TABS.filter((t) => {
    if (t.permissions) return hasAnyPermission(user, ...t.permissions);
    if (t.permission) return hasPermission(user, t.permission);
    return true;
  });

  useEffect(() => {
    Promise.all([
      agentsApi.dashboard(),
      bundlesApi.getNetworks(),
    ]).then(([dash, nets]) => {
      setDashboard(dash.data);
      setNetworks(nets.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const loadTab = async (id) => {
    setTab(id);
    try {
      if (id === 'sales') { const { data } = await agentsApi.sales(); setSales(data); }
      if (id === 'commissions') { const { data } = await agentsApi.commissions(); setCommissions(data); }
      if (id === 'agents') { const { data } = await agentsApi.subAgents(); setSubAgents(data); }
      if (id === 'analytics') { const { data } = await agentsApi.analytics(); setAnalytics(data); }
      if (id === 'pricing') { const { data } = await agentsApi.pricing(); setPricing(data); }
      if (id === 'promotions') { const { data } = await agentsApi.promotions(); setPromotions(data); }
    } catch {
      toast.error('Failed to load data');
    }
  };

  const handleSell = async (e) => {
    e.preventDefault();
    try {
      await agentsApi.sell({ ...sellForm, paymentSource: 'wallet' });
      toast.success('Bundle sold & delivered!');
      refreshUser();
      setSellForm({ bundleId: '', recipientPhone: '' });
      const { data } = await agentsApi.dashboard();
      setDashboard(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sale failed');
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      await agentsApi.createSubAgent(agentForm);
      toast.success('Agent created!');
      setAgentForm({ name: '', email: '', phone: '', password: '', role: ROLES.BASIC_AGENT });
      const { data } = await agentsApi.subAgents();
      setSubAgents(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create agent');
    }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    try {
      await agentsApi.createPromotion(promoForm);
      toast.success('Promotion submitted for approval');
      const { data } = await agentsApi.promotions();
      setPromotions(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const allBundles = networks.flatMap((n) => n.bundles.map((b) => ({ ...b, network: n })));

  return (
    <RoleGuard permissions={[PERMISSIONS.SELL_BUNDLES]}>
      <DashboardSidebar>
        {loading ? <PageLoader /> : (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-slate-900">Agent Portal</h1>
              <p className="text-sm text-slate-500">Sell bundles, track sales & earn commissions</p>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {visibleTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => loadTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    tab === id ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            {tab === 'overview' && dashboard && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Sales', value: dashboard.stats.totalSales },
                    { label: 'Completed', value: dashboard.stats.completedSales },
                    { label: 'Revenue', value: formatCurrency(dashboard.stats.revenue) },
                    { label: 'Commissions', value: formatCurrency(dashboard.stats.totalCommissions) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-100 p-4">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-xl font-extrabold text-slate-900 mt-1">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-4">
                  <p className="text-sm text-slate-500">Success Rate</p>
                  <p className="text-2xl font-extrabold text-emerald-600">{dashboard.stats.successRate}%</p>
                  {dashboard.subAgentCount > 0 && (
                    <p className="text-xs text-slate-400 mt-1">{dashboard.subAgentCount} sub-agent(s) in hierarchy</p>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Recent Sales</h3>
                  <div className="space-y-3">
                    {dashboard.recentSales.map((o) => <OrderCard key={o.id} order={o} />)}
                  </div>
                </div>
              </div>
            )}

            {tab === 'sell' && (
              <form onSubmit={handleSell} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 max-w-lg">
                <h3 className="font-bold text-slate-900">Sell Data Bundle</h3>
                <p className="text-xs text-slate-500">Paid from your wallet balance (GH₵ {Number(user.wallet).toFixed(2)})</p>
                <select
                  required
                  value={sellForm.bundleId}
                  onChange={(e) => setSellForm((f) => ({ ...f, bundleId: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
                >
                  <option value="">Select bundle...</option>
                  {allBundles.map((b) => (
                    <option key={b.id} value={b.id}>{b.network.name} — {b.dataAmount} ({formatCurrency(b.price)})</option>
                  ))}
                </select>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="Recipient phone (024...)"
                    value={sellForm.recipientPhone}
                    onChange={(e) => setSellForm((f) => ({ ...f, recipientPhone: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <button type="submit" className="w-full py-3 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Sell & Deliver
                </button>
              </form>
            )}

            {tab === 'sales' && (
              <div className="space-y-3">
                {sales.map((o) => <OrderCard key={o.id} order={o} />)}
                {sales.length === 0 && <p className="text-center text-slate-500 py-8">No sales yet</p>}
              </div>
            )}

            {tab === 'commissions' && (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-600">Order</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Amount</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Rate</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c) => (
                      <tr key={c.id} className="border-t border-slate-50">
                        <td className="px-4 py-3 font-mono text-xs">{c.order?.orderNumber}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600">{formatCurrency(c.amount)}</td>
                        <td className="px-4 py-3">{(c.rate * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {commissions.length === 0 && <p className="text-center text-slate-500 py-8">No commissions yet</p>}
              </div>
            )}

            {tab === 'agents' && hasAnyPermission(user, PERMISSIONS.MANAGE_SUB_AGENTS, PERMISSIONS.FULL_HIERARCHY) && (
              <div className="space-y-6">
                <form onSubmit={handleCreateAgent} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3 max-w-lg">
                  <h3 className="font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Create Sub-Agent</h3>
                  <input placeholder="Name" required value={agentForm.name} onChange={(e) => setAgentForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-4 py-2 rounded-xl border border-slate-200" />
                  <input type="email" placeholder="Email" required value={agentForm.email} onChange={(e) => setAgentForm((f) => ({ ...f, email: e.target.value }))} className="w-full px-4 py-2 rounded-xl border border-slate-200" />
                  <input type="tel" placeholder="Phone" value={agentForm.phone} onChange={(e) => setAgentForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-2 rounded-xl border border-slate-200" />
                  <input type="password" placeholder="Password" required value={agentForm.password} onChange={(e) => setAgentForm((f) => ({ ...f, password: e.target.value }))} className="w-full px-4 py-2 rounded-xl border border-slate-200" />
                  <select value={agentForm.role} onChange={(e) => setAgentForm((f) => ({ ...f, role: e.target.value }))} className="w-full px-4 py-2 rounded-xl border border-slate-200">
                    <option value={ROLES.BASIC_AGENT}>Basic Agent</option>
                    {user.role === ROLES.SUPER_AGENT && <option value={ROLES.SENIOR_AGENT}>Senior Agent</option>}
                  </select>
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold">Create Agent</button>
                </form>
                <div className="space-y-2">
                  {subAgents.map((a) => (
                    <div key={a.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{a.name}</p>
                        <p className="text-xs text-slate-500">{a.email}</p>
                      </div>
                      <div className="text-right">
                        <RoleBadge role={a.role} />
                        <p className="text-xs text-slate-400 mt-1">{a._count?.agentOrders || 0} sales</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'analytics' && analytics && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {analytics.salesByNetwork?.map((n) => (
                    <div key={n.networkSlug} className="bg-white rounded-xl border border-slate-100 p-4">
                      <p className="text-xs text-slate-500 uppercase">{n.networkSlug}</p>
                      <p className="font-bold">{n._count} sales</p>
                      <p className="text-sm text-brand-600">{formatCurrency(n._sum?.totalAmount || 0)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'pricing' && (
              <div className="space-y-3">
                {allBundles.slice(0, 10).map((b) => (
                  <div key={b.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-sm">{b.network.name} {b.dataAmount}</p>
                      <p className="text-xs text-slate-500">Default: {formatCurrency(b.price)}</p>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Custom price"
                      defaultValue={pricing.find((p) => p.bundleId === b.id)?.customPrice}
                      onBlur={async (e) => {
                        const val = parseFloat(e.target.value);
                        if (!val) return;
                        try {
                          await agentsApi.setPricing(b.id, val);
                          toast.success('Price updated');
                        } catch (err) {
                          toast.error(err.response?.data?.error || 'Invalid price');
                        }
                      }}
                      className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-right"
                    />
                  </div>
                ))}
              </div>
            )}

            {tab === 'promotions' && (
              <div className="space-y-6">
                <form onSubmit={handleCreatePromo} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3 max-w-lg">
                  <h3 className="font-bold">Create Promotion</h3>
                  <input placeholder="Title" required value={promoForm.title} onChange={(e) => setPromoForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-4 py-2 rounded-xl border border-slate-200" />
                  <input type="number" min="1" max="50" placeholder="Discount %" required value={promoForm.discountPct} onChange={(e) => setPromoForm((f) => ({ ...f, discountPct: +e.target.value }))} className="w-full px-4 py-2 rounded-xl border border-slate-200" />
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold">Submit for Approval</button>
                </form>
                <div className="space-y-2">
                  {promotions.map((p) => (
                    <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{p.title}</p>
                        <p className="text-xs text-slate-500">{p.discountPct}% off · {p.status}</p>
                      </div>
                      {hasPermission(user, PERMISSIONS.APPROVE_PROMOTIONS) && p.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={async () => { await agentsApi.approvePromotion(p.id, 'approve'); loadTab('promotions'); toast.success('Approved'); }} className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Check className="w-4 h-4" /></button>
                          <button onClick={async () => { await agentsApi.approvePromotion(p.id, 'reject'); loadTab('promotions'); toast.success('Rejected'); }} className="p-2 rounded-lg bg-red-50 text-red-600"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DashboardSidebar>
    </RoleGuard>
  );
}
