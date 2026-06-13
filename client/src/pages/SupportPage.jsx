import { useEffect, useState } from 'react';
import { support as supportApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import RoleGuard from '../components/RoleGuard';
import { PageLoader } from '../components/LoadingSpinner';
import { formatDate } from '../utils/helpers';
import { PERMISSIONS, ROLES } from '../utils/roles';
import { HeadphonesIcon, Send, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-100 text-slate-600',
};

export default function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const isPriority = user?.role === ROLES.SENIOR_AGENT || user?.role === ROLES.SUPER_AGENT;

  useEffect(() => {
    supportApi.myTickets()
      .then(({ data }) => setTickets(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await supportApi.create(form);
      setTickets((prev) => [data, ...prev]);
      setForm({ subject: '', message: '' });
      toast.success('Support ticket submitted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleGuard permissions={[PERMISSIONS.SUPPORT]}>
      <DashboardSidebar>
        {loading ? <PageLoader /> : (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Support</h1>
              {isPriority && (
                <p className="text-sm text-amber-600 flex items-center gap-1 mt-1">
                  <Star className="w-3.5 h-3.5" /> Priority support enabled for your role
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <HeadphonesIcon className="w-4 h-4" /> New Ticket
              </h2>
              <input
                type="text"
                placeholder="Subject"
                required
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <textarea
                placeholder="Describe your issue..."
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
              <button type="submit" disabled={submitting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50">
                <Send className="w-4 h-4" /> Submit Ticket
              </button>
            </form>

            <div className="space-y-3">
              <h2 className="font-bold text-slate-900">Your Tickets</h2>
              {tickets.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8 bg-white rounded-2xl border border-slate-100">No tickets yet</p>
              ) : tickets.map((t) => (
                <div key={t.id} className="bg-white rounded-xl border border-slate-100 p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900">{t.subject}</h3>
                    <div className="flex gap-2">
                      {t.priority === 'priority' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">PRIORITY</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[t.status]}`}>{t.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{t.message}</p>
                  {t.adminReply && (
                    <div className="mt-3 p-3 bg-brand-50 rounded-lg text-sm">
                      <p className="font-semibold text-brand-800 text-xs mb-1">Admin Reply</p>
                      <p className="text-slate-700">{t.adminReply}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">{formatDate(t.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DashboardSidebar>
    </RoleGuard>
  );
}
