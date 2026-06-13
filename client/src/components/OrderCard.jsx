import { STATUS_STYLES, formatCurrency, formatDate, formatPhone } from '../utils/helpers';
import { RefreshCw } from 'lucide-react';

export default function OrderCard({ order, onRetry, showRetry }) {
  const status = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
  const item = order.items?.[0];
  const bundle = item?.bundle;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs text-slate-400 font-mono">{order.orderNumber}</p>
          <h3 className="font-bold text-slate-900 mt-0.5">
            {bundle ? `${bundle.dataAmount} — ${bundle.network?.name}` : 'Data Bundle'}
          </h3>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-slate-400 text-xs">Recipient</p>
          <p className="font-medium">{formatPhone(order.recipientPhone)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Amount</p>
          <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Date</p>
          <p className="font-medium">{formatDate(order.createdAt)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Telecom Ref</p>
          <p className="font-medium font-mono text-xs truncate">{order.telecomRef || '—'}</p>
        </div>
      </div>

      {order.failureReason && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{order.failureReason}</p>
      )}

      {showRetry && order.status === 'failed' && (
        <button
          onClick={() => onRetry(order.id)}
          className="mt-3 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry delivery
        </button>
      )}
    </div>
  );
}

export function OrderStatusTimeline({ status }) {
  const steps = [
    { key: 'pending_payment', label: 'Payment' },
    { key: 'paid', label: 'Confirmed' },
    { key: 'processing', label: 'Processing' },
    { key: 'completed', label: 'Delivered' },
  ];

  const order = ['pending_payment', 'paid', 'processing', 'completed', 'failed'];
  const currentIdx = order.indexOf(status);

  return (
    <div className="flex items-center justify-between relative">
      <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200" />
      {steps.map((step, i) => {
        const done = currentIdx > i || status === 'completed';
        const active = order[currentIdx] === step.key;
        return (
          <div key={step.key} className="relative flex flex-col items-center z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-600 text-white animate-pulse-soft' : 'bg-white border-2 border-slate-200 text-slate-400'
            }`}>
              {done ? '✓' : i + 1}
            </div>
            <span className={`text-[10px] mt-1.5 font-medium ${done || active ? 'text-slate-700' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
