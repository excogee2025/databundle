import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { orders as ordersApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import RoleGuard from '../components/RoleGuard';
import OrderCard from '../components/OrderCard';
import { PageLoader, EmptyState } from '../components/LoadingSpinner';
import { PERMISSIONS } from '../utils/roles';
import { Package, ShoppingBag } from 'lucide-react';

export default function DashboardPage() {
  const { user, isAgent, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAgent) return;
    ordersApi.myOrders()
      .then(({ data }) => setOrders(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAgent]);

  if (authLoading) return <PageLoader />;
  if (isAgent) return <Navigate to="/agent" replace />;

  return (
    <RoleGuard permissions={[PERMISSIONS.HISTORY]}>
      <DashboardSidebar>
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">My Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back, {user?.name}</p>
        </div>

        {loading ? (
          <PageLoader />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="You haven't purchased any data bundles yet."
            action={
              <Link to="/bundles" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700">
                <ShoppingBag className="w-4 h-4" /> Browse Bundles
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </DashboardSidebar>
    </RoleGuard>
  );
}
