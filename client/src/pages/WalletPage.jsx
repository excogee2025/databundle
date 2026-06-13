import { useEffect, useState } from 'react';
import { wallet as walletApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import RoleGuard from '../components/RoleGuard';
import { PageLoader } from '../components/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/helpers';
import { PERMISSIONS } from '../utils/roles';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WalletPage() {
  const { user, refreshUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  const load = async () => {
    try {
      const [balRes, histRes] = await Promise.all([walletApi.balance(), walletApi.history()]);
      setBalance(balRes.data.balance);
      setHistory(histRes.data);
    } catch {
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleTopup = async (e) => {
    e.preventDefault();
    const amount = parseFloat(topupAmount);
    if (!amount || amount < 1) return toast.error('Minimum top-up is GH₵ 1');

    setTopupLoading(true);
    try {
      const { data } = await walletApi.topup({ amount, email: user.email });
      if (data.payment.mock) {
        await walletApi.verifyTopup(data.reference);
        toast.success('Wallet topped up!');
        refreshUser();
        load();
      } else {
        window.location.href = data.payment.authorization_url;
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Top-up failed');
    } finally {
      setTopupLoading(false);
    }
  };

  return (
    <RoleGuard permissions={[PERMISSIONS.WALLET]}>
      <DashboardSidebar>
        {loading ? <PageLoader /> : (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-extrabold text-slate-900">My Wallet</h1>

            <div className="bg-gradient-to-br from-brand-600 to-brand-500 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-6 h-6 opacity-80" />
                <span className="text-sm opacity-80">Available Balance</span>
              </div>
              <p className="text-4xl font-extrabold">{formatCurrency(balance)}</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Top Up Wallet
              </h2>
              <form onSubmit={handleTopup} className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Amount (GH₵)"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button type="submit" disabled={topupLoading} className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50">
                  Top Up
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-bold text-slate-900 mb-4">Transaction History</h2>
              {history.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {history.map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${txn.amount >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                          {txn.amount >= 0 ? <ArrowDownRight className="w-4 h-4 text-emerald-600" /> : <ArrowUpRight className="w-4 h-4 text-red-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{txn.description || txn.type}</p>
                          <p className="text-xs text-slate-400">{formatDate(txn.createdAt)}</p>
                        </div>
                      </div>
                      <span className={`font-bold text-sm ${txn.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {txn.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(txn.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DashboardSidebar>
    </RoleGuard>
  );
}
