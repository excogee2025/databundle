import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { orders as ordersApi } from '../lib/api';
import { OrderStatusTimeline } from '../components/OrderCard';
import { formatCurrency, formatPhone, STATUS_STYLES } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TrackPage() {
  const [params] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get('order') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleTrack = async (e) => {
    e?.preventDefault();
    if (!orderNumber.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const { data } = await ordersApi.track(orderNumber.trim().toUpperCase());
      setOrder(data);
    } catch {
      setOrder(null);
      toast.error('Order not found');
    } finally {
      setLoading(false);
    }
  };

  const status = order ? (STATUS_STYLES[order.status] || STATUS_STYLES.pending) : null;
  const bundle = order?.items?.[0]?.bundle;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Track Your Order</h1>
        <p className="text-slate-500 mt-1">Enter your order number to check delivery status</p>
      </div>

      <form onSubmit={handleTrack} className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="e.g. DB-M4K2X7-A3BC"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm uppercase"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Track'}
        </button>
      </form>

      {order && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-fade-in">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs text-slate-400">Order Number</p>
              <p className="font-mono font-bold text-lg">{order.orderNumber}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>{status.label}</span>
          </div>

          <div className="mb-8 px-2">
            <OrderStatusTimeline status={order.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm border-t border-slate-100 pt-4">
            <div>
              <p className="text-slate-400 text-xs">Bundle</p>
              <p className="font-medium">{bundle ? `${bundle.dataAmount} (${bundle.network?.name})` : '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Recipient</p>
              <p className="font-medium">{formatPhone(order.recipientPhone)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Amount</p>
              <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Telecom Ref</p>
              <p className="font-mono text-xs">{order.telecomRef || 'Pending'}</p>
            </div>
          </div>

          {order.failureReason && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{order.failureReason}</p>
          )}
        </div>
      )}

      {searched && !order && !loading && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No order found with that number.</p>
        </div>
      )}
    </div>
  );
}
