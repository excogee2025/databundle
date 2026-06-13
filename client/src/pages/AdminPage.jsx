import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { admin as adminApi, orders as ordersApi, support as supportApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar, { RoleBadge } from '../components/DashboardSidebar';
import OrderCard from '../components/OrderCard';
import { PageLoader } from '../components/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/helpers';
import { ROLE_LABELS } from '../utils/roles';
import {
  BarChart3, Users, ShoppingCart, TrendingUp, RefreshCw,
  HeadphonesIcon, Package, Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'users', label: 'Users & Agents', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'transactions', label: 'Transactions', icon: BarChart3 },
  { id: 'bundles', label: 'Bundles', icon: Package },
  { id: 'support', label: 'Support', icon: HeadphonesIcon },
];

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState(null);
  const [bundles, setBundles] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOverview = async () => {
    const { data } = await adminApi.stats();
    setStats(data);
  };

  const loadTab = async (id) => {
    setTab(id);
    try {
      if (id === 'overview') await loadOverview();
      if (id === 'users') { const { data } = await adminApi.users(); setUsers(data); }
      if (id === 'orders') { const { data } = await ordersApi.adminAll(); setOrders(data); }
      if (id === 'transactions') { const { data } = await adminApi.transactions(); setTransactions(data); }
      if (id === 'bundles') { const { data } = await adminApi.bundles(); setBundles(data); }
      if (id === 'support') { const { data } = await supportApi.adminAll(); setTickets(data); }
    } catch {
      toast.error('Failed to load data');
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadOverview().finally(() => setLoading(false));
    }
  }, [isAdmin]);

  const handleRetry = async (orderId) => {
    try {
      await ordersApi.adminRetry(orderId);
      toast.success('Retry initiated');
      loadTab('orders');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Retry failed');
    }
  };

  const updateUserRole = async (id, role) => {
    try {
      await adminApi.updateUser(id, { role });
      toast.success('Role updated');
      loadTab('users');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  const replyTicket = async (id, adminReply) => {
    try {
      await supportApi.adminUpdate(id, { status: 'resolved', adminReply });
      toast.success('Reply sent');
      loadTab('support');
    } catch {
      toast.error('Failed to reply');
    }
  };

  const toggleBundle = async (id, active) => {
    try {
      await adminApi.updateBundle(id, { active });
      toast.success('Bundle updated');
      loadTab('bundles');
    } catch {
      toast.error('Update failed');
    }
  };

  if (authLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const statCards = stats ? [
    { label: 'Customers', value: stats.users, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Agents', value: stats.agents, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
    { label: 'Revenue', value: formatCurrency(stats.revenue), icon: BarChart3, color: 'bg-brand-50 text-brand-600' },
    { label: 'Open Tickets', value: stats.openTickets, icon: HeadphonesIcon, color: 'bg-amber-50 text-amber-600' },
  ] : [];

  return (
    <DashboardSidebar>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Admin Panel</h1>
            <p className="text-sm text-slate-500">Platform management & monitoring</p>
          </div>
          <button onClick={() => loadTab(tab)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => loadTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium ${
                tab === id ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {loading && tab === 'overview' ? <PageLoader /> : (
          <>
            {tab === 'overview' && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {statCards.map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-100 p-4">
                      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-2`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-xl font-extrabold">{value}</p>
                      <p className="text-xs text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-slate-100 p-4">
                    <p className="text-sm text-slate-500">Total Orders</p>
                    <p className="text-2xl font-extrabold">{stats.totalOrders}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-4">
                    <p className="text-sm text-slate-500">Success Rate</p>
                    <p className="text-2xl font-extrabold text-emerald-600">{stats.successRate}%</p>
                  </div>
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">User</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Wallet</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </td>
                        <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3">{formatCurrency(u.wallet)}</td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={(e) => updateUserRole(u.id, e.target.value)}
                            className="text-xs px-2 py-1 rounded-lg border border-slate-200"
                          >
                            {Object.entries(ROLE_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'orders' && (
              <div className="space-y-3">
                {orders.map((o) => <OrderCard key={o.id} order={o} showRetry onRetry={handleRetry} />)}
              </div>
            )}

            {tab === 'transactions' && transactions && (
              <div className="space-y-4">
                <h3 className="font-bold">Payment Transactions</h3>
                <div className="bg-white rounded-xl border border-slate-100 divide-y">
                  {transactions.payments?.map((t) => (
                    <div key={t.id} className="px-4 py-3 flex justify-between text-sm">
                      <span className="font-mono text-xs">{t.order?.orderNumber}</span>
                      <span className="font-bold">{formatCurrency(t.amount)}</span>
                      <span className="text-slate-400">{formatDate(t.createdAt)}</span>
                    </div>
                  ))}
                </div>
                <h3 className="font-bold mt-4">Wallet Transactions</h3>
                <div className="bg-white rounded-xl border border-slate-100 divide-y">
                  {transactions.wallet?.map((t) => (
                    <div key={t.id} className="px-4 py-3 flex justify-between text-sm">
                      <span>{t.user?.name} — {t.type}</span>
                      <span className={`font-bold ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(t.amount))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'bundles' && (
              <div className="space-y-2">
                {bundles.map((b) => (
                  <div key={b.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{b.network?.name} — {b.dataAmount}</p>
                      <p className="text-xs text-slate-500">{b.name} · {formatCurrency(b.price)}</p>
                    </div>
                    <button
                      onClick={() => toggleBundle(b.id, !b.active)}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${b.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {b.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === 'support' && (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div key={t.id} className="bg-white rounded-xl border border-slate-100 p-4">
                    <div className="flex justify-between mb-2">
                      <div>
                        <p className="font-semibold">{t.subject}</p>
                        <p className="text-xs text-slate-500">{t.user?.name} ({ROLE_LABELS[t.user?.role]}) · {t.priority}</p>
                      </div>
                      <span className="text-xs font-bold uppercase text-slate-500">{t.status}</span>
                    </div>
                    <p className="text-sm text-slate-600">{t.message}</p>
                    {t.status === 'open' && (
                      <button
                        onClick={() => replyTicket(t.id, 'Thank you for contacting us. We are looking into your issue.')}
                        className="mt-3 text-xs text-brand-600 font-semibold hover:underline"
                      >
                        Quick Reply & Resolve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardSidebar>
  );
}
