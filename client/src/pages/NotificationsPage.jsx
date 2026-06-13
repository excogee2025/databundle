import { useEffect, useState } from 'react';
import { notifications as notifApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import RoleGuard from '../components/RoleGuard';
import { PageLoader } from '../components/LoadingSpinner';
import { formatDate } from '../utils/helpers';
import { PERMISSIONS } from '../utils/roles';
import { Bell, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const TYPE_ICONS = {
  success: 'bg-emerald-100 text-emerald-600',
  warning: 'bg-amber-100 text-amber-600',
  order: 'bg-blue-100 text-blue-600',
  info: 'bg-slate-100 text-slate-600',
};

export default function NotificationsPage() {
  const { refreshUnread } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await notifApi.list();
      setNotifications(data);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await notifApi.markRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    refreshUnread();
  };

  const markAllRead = async () => {
    await notifApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    refreshUnread();
    toast.success('All marked as read');
  };

  return (
    <RoleGuard permissions={[PERMISSIONS.NOTIFICATIONS]}>
      <DashboardSidebar>
        {loading ? <PageLoader /> : (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-extrabold text-slate-900">Notifications</h1>
              {notifications.some((n) => !n.read) && (
                <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:text-brand-700">
                  <CheckCheck className="w-4 h-4" /> Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`bg-white rounded-xl border p-4 transition-colors ${n.read ? 'border-slate-100 opacity-70' : 'border-brand-200 bg-brand-50/30'}`}
                    onClick={() => !n.read && markRead(n.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TYPE_ICONS[n.type] || TYPE_ICONS.info}`}>
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{n.title}</p>
                        <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-slate-400">{formatDate(n.createdAt)}</span>
                          {n.link && (
                            <Link to={n.link} className="text-xs text-brand-600 font-medium hover:underline">View</Link>
                          )}
                        </div>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0 mt-2" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DashboardSidebar>
    </RoleGuard>
  );
}
