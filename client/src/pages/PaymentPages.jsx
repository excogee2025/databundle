import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { orders as ordersApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { OrderStatusTimeline } from '../components/OrderCard';
import { formatCurrency, formatPhone, STATUS_STYLES } from '../utils/helpers';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MockPayPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ref = params.get('ref');
  const orderNumber = params.get('order');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const simulatePayment = async () => {
    setProcessing(true);
    try {
      const { data } = await ordersApi.verifyPayment(ref);
      setResult(data);
      toast.success('Payment successful! Data is being delivered.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  if (result) {
    const status = STATUS_STYLES[result.status] || STATUS_STYLES.completed;
    const isSuccess = result.status === 'completed';

    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center animate-fade-in">
        <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${isSuccess ? 'bg-emerald-100' : 'bg-red-100'}`}>
          {isSuccess ? <CheckCircle className="w-10 h-10 text-emerald-600" /> : <XCircle className="w-10 h-10 text-red-600" />}
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
          {isSuccess ? 'Data Delivered!' : 'Delivery Failed'}
        </h1>
        <p className="text-slate-500 mb-2">Order {result.orderNumber}</p>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${status.color} mb-6`}>
          {status.label}
        </span>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 text-left mb-6 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Recipient</span><span className="font-medium">{formatPhone(result.recipientPhone)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Amount</span><span className="font-medium">{formatCurrency(result.totalAmount)}</span></div>
          {result.telecomRef && (
            <div className="flex justify-between"><span className="text-slate-400">Reference</span><span className="font-mono text-xs">{result.telecomRef}</span></div>
          )}
        </div>

        <div className="mb-8 px-4">
          <OrderStatusTimeline status={result.status} />
        </div>

        <div className="flex gap-3 justify-center">
          <Link to="/bundles" className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
            Buy More
          </Link>
          <Link to={`/track?order=${result.orderNumber}`} className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 flex items-center gap-1">
            Track Order <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🧪</span>
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 mb-2">Mock Payment</h1>
        <p className="text-sm text-slate-500 mb-6">
          Paystack is not configured. Click below to simulate a successful payment and data delivery.
        </p>
        {orderNumber && (
          <p className="text-xs font-mono text-slate-400 mb-4">Order: {orderNumber}</p>
        )}
        <button
          onClick={simulatePayment}
          disabled={processing}
          className="w-full py-3 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {processing ? <LoadingSpinner size="sm" /> : null}
          Simulate Payment
        </button>
        <button onClick={() => navigate('/bundles')} className="mt-3 text-sm text-slate-500 hover:text-brand-600">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function PaymentCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = params.get('reference') || params.get('trxref');
    if (!ref) {
      navigate('/bundles');
      return;
    }

    ordersApi.verifyPayment(ref)
      .then(({ data }) => {
        navigate(`/checkout/mock-pay?ref=${ref}&order=${data.orderNumber}`, { replace: true });
      })
      .catch(() => {
        toast.error('Payment verification failed');
        navigate('/bundles');
      })
      .finally(() => setLoading(false));
  }, [params, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-slate-500">Verifying payment...</p>
    </div>
  );
}
