export const NETWORK_COLORS = {
  mtn: { bg: 'bg-yellow-400', text: 'text-yellow-900', border: 'border-yellow-400', hex: '#FFCC00' },
  telecel: { bg: 'bg-red-600', text: 'text-white', border: 'border-red-600', hex: '#E4002B' },
  airteltigo: { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500', hex: '#ED1C24' },
};

export const STATUS_STYLES = {
  pending_payment: { label: 'Awaiting Payment', color: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Processing', color: 'bg-indigo-100 text-indigo-800' },
  completed: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700' },
};

export function formatCurrency(amount) {
  return `GH₵ ${Number(amount).toFixed(2)}`;
}

export function formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('233') && cleaned.length === 12) {
    return `+233 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  return phone;
}

export function formatDate(date) {
  return new Date(date).toLocaleString('en-GH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
