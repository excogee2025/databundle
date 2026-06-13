import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bundles as bundlesApi, orders as ordersApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, NETWORK_COLORS } from '../utils/helpers';
import LoadingSpinner, { PageLoader } from '../components/LoadingSpinner';
import { Phone, Mail, CreditCard, ArrowLeft, Wifi } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const { bundleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detectedNetwork, setDetectedNetwork] = useState(null);
  const [form, setForm] = useState({
    recipientPhone: '',
    email: user?.email || '',
    paymentSource: 'paystack',
  });

  useEffect(() => {
    bundlesApi.getById(bundleId)
      .then(({ data }) => setBundle(data))
      .catch(() => {
        toast.error('Bundle not found');
        navigate('/bundles');
      })
      .finally(() => setLoading(false));
  }, [bundleId, navigate]);

  useEffect(() => {
    if (user?.email) setForm((f) => ({ ...f, email: user.email }));
  }, [user]);

  const handlePhoneChange = async (phone) => {
    setForm((f) => ({ ...f, recipientPhone: phone }));
    if (phone.length >= 10) {
      try {
        const { data } = await ordersApi.detectNetwork(phone);
        setDetectedNetwork(data.network);
      } catch {
        setDetectedNetwork(null);
      }
    } else {
      setDetectedNetwork(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.recipientPhone || !form.email) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await ordersApi.create({
        bundleId,
        recipientPhone: form.recipientPhone,
        email: form.email,
        paymentSource: form.paymentSource,
      });

      if (data.payment.wallet || form.paymentSource === 'wallet') {
        toast.success('Order completed!');
        navigate(`/track?order=${data.order.orderNumber}`);
        return;
      }

      const paymentUrl = data.payment.authorization_url;
      if (data.payment.mock) {
        navigate(`/checkout/mock-pay?ref=${data.payment.reference}&order=${data.order.orderNumber}`);
      } else {
        window.location.href = paymentUrl;
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!bundle) return null;

  const colors = NETWORK_COLORS[bundle.network?.slug] || NETWORK_COLORS.mtn;
  const networkMismatch = detectedNetwork && detectedNetwork !== bundle.network.slug;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Order summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sticky top-24">
            <h2 className="font-bold text-slate-900 mb-4">Order Summary</h2>

            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
                <Wifi className={`w-6 h-6 ${colors.text}`} />
              </div>
              <div>
                <p className="font-bold text-lg">{bundle.dataAmount}</p>
                <p className="text-sm text-slate-500">{bundle.network.name} · {bundle.validity}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Bundle</span><span>{bundle.name}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-100">
                <span>Total</span>
                <span className="text-brand-600">{formatCurrency(bundle.price)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                <Phone className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Recipient Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 0241234567"
                value={form.recipientPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-base"
                required
              />
              {detectedNetwork && (
                <p className={`text-xs mt-1.5 ${networkMismatch ? 'text-red-600' : 'text-emerald-600'}`}>
                  Detected network: {detectedNetwork.toUpperCase()}
                  {networkMismatch && ` — doesn't match ${bundle.network.name}`}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                <Mail className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Email (for receipt)
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>

            <div className="bg-brand-50 rounded-xl p-4 text-sm text-brand-800 space-y-3">
              <p className="font-semibold">Payment Method</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="pay" value="paystack" checked={form.paymentSource === 'paystack'} onChange={() => setForm((f) => ({ ...f, paymentSource: 'paystack' }))} />
                <CreditCard className="w-4 h-4" /> Paystack (MoMo / Card)
              </label>
              {user && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="pay" value="wallet" checked={form.paymentSource === 'wallet'} onChange={() => setForm((f) => ({ ...f, paymentSource: 'wallet' }))} />
                  <span>Wallet Balance (GH₵ {Number(user.wallet).toFixed(2)})</span>
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || networkMismatch}
              className="w-full py-3.5 rounded-xl bg-brand-600 text-white font-bold text-base hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? <LoadingSpinner size="sm" /> : null}
              Pay {formatCurrency(bundle.price)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
