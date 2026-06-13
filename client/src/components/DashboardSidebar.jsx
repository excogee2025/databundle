import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission, isAdmin, hasAnyPermission, ROLE_LABELS, ROLE_COLORS } from '../utils/roles';
import { PERMISSIONS } from '../utils/roles';
import {
  LayoutDashboard, Wallet, Bell, HeadphonesIcon, Shield, Home, ShoppingBag, BarChart3,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home, public: true },
  { path: '/dashboard', label: 'My Orders', icon: LayoutDashboard, permission: PERMISSIONS.HISTORY },
  { path: '/agent', label: 'Agent Portal', icon: ShoppingBag, permission: PERMISSIONS.SELL_BUNDLES },
  { path: '/wallet', label: 'Wallet', icon: Wallet, permission: PERMISSIONS.WALLET },
  { path: '/notifications', label: 'Notifications', icon: Bell, permission: PERMISSIONS.NOTIFICATIONS },
  { path: '/support', label: 'Support', icon: HeadphonesIcon, permission: PERMISSIONS.SUPPORT },
  { path: '/reports', label: 'Analytics', icon: BarChart3, permissions: [PERMISSIONS.ADVANCED_ANALYTICS, PERMISSIONS.SYSTEM_ANALYTICS, PERMISSIONS.MONITORING] },
  { path: '/admin', label: 'Admin Panel', icon: Shield, admin: true },
];

export default function DashboardSidebar({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  const visibleItems = navItems.filter((item) => {
    if (item.public) return false;
    if (item.admin) return isAdmin(user);
    if (item.permissions) return hasAnyPermission(user, ...item.permissions);
    if (item.permission) return hasPermission(user, item.permission);
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 sticky top-24">
            {user && (
              <div className="mb-4 pb-4 border-b border-slate-100">
                <p className="font-bold text-slate-900 truncate">{user.name}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ROLE_COLORS[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </span>
                {hasPermission(user, PERMISSIONS.WALLET) && (
                  <p className="text-xs text-slate-500 mt-2">Wallet: GH₵ {Number(user.wallet).toFixed(2)}</p>
                )}
              </div>
            )}
            <nav className="space-y-1">
              {visibleItems.map(({ path, label, icon: Icon }) => {
                const active = location.pathname === path || location.pathname.startsWith(path + '/');
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function RoleBadge({ role }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}
