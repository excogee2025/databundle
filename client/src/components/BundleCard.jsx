import { NETWORK_COLORS, formatCurrency } from '../utils/helpers';
import { Zap, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BundleCard({ bundle, onSelect, selected }) {
  const colors = NETWORK_COLORS[bundle.network?.slug] || NETWORK_COLORS.mtn;

  return (
    <div
      className={`relative bg-white rounded-2xl border-2 p-5 card-hover cursor-pointer ${
        selected ? 'border-brand-500 ring-4 ring-brand-100' : 'border-slate-100 hover:border-brand-200'
      }`}
      onClick={() => onSelect?.(bundle)}
    >
      {bundle.popular && (
        <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wide rounded-full">
          Popular
        </span>
      )}

      <div className="flex items-start justify-between mb-4">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${colors.bg} ${colors.text}`}>
          {bundle.network?.name}
        </span>
        <span className="text-2xl font-extrabold text-brand-600">{formatCurrency(bundle.price)}</span>
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-1">{bundle.dataAmount}</h3>
      <p className="text-sm text-slate-500 mb-4">{bundle.name}</p>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {bundle.validity}</span>
        <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" /> Instant</span>
      </div>

      {onSelect && (
        <Link
          to={`/checkout/${bundle.id}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-4 block w-full text-center py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          Buy Now
        </Link>
      )}
    </div>
  );
}
