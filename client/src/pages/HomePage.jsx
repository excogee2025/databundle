import { Link } from 'react-router-dom';
import { Zap, Shield, Clock, Smartphone, ArrowRight, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { bundles as bundlesApi } from '../lib/api';
import BundleCard from '../components/BundleCard';
import { PageLoader } from '../components/LoadingSpinner';

const features = [
  { icon: Zap, title: 'Instant Delivery', desc: 'Data arrives in seconds after payment' },
  { icon: Shield, title: 'Secure Payments', desc: 'Paystack-powered MoMo & card payments' },
  { icon: Clock, title: '24/7 Available', desc: 'Buy data anytime, day or night' },
  { icon: Smartphone, title: 'All Networks', desc: 'MTN, Telecel & AirtelTigo supported' },
];

export default function HomePage() {
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bundlesApi.getAll({ popular: 'true' })
      .then(({ data }) => setPopular(data.slice(0, 3)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-brand-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-400 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28 relative">
          <div className="max-w-2xl animate-fade-in">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm mb-6">
              <Star className="w-4 h-4 text-yellow-300" />
              <span>Trusted by thousands across Ghana</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              Buy Mobile Data<br />
              <span className="text-brand-200">Instantly & Securely</span>
            </h1>

            <p className="text-lg text-indigo-100 mb-8 leading-relaxed max-w-lg">
              Get MTN, Telecel, and AirtelTigo data bundles delivered to any number in seconds. Pay with Mobile Money or card.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/bundles"
                className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-6 py-3.5 rounded-xl hover:bg-brand-50 transition-colors shadow-xl shadow-black/10"
              >
                Buy Data Now <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/track"
                className="inline-flex items-center gap-2 glass text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                Track Your Order
              </Link>
            </div>
          </div>

          {/* Network pills */}
          <div className="flex flex-wrap gap-3 mt-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {['MTN', 'Telecel', 'AirtelTigo'].map((net) => (
              <span key={net} className="glass px-4 py-2 rounded-full text-sm font-semibold">{net}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 border border-slate-100 card-hover">
              <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-brand-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular bundles */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">Popular Bundles</h2>
              <p className="text-slate-500 mt-1">Best value data plans, delivered instantly</p>
            </div>
            <Link to="/bundles" className="hidden sm:flex items-center gap-1 text-brand-600 font-semibold text-sm hover:text-brand-700">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <PageLoader />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {popular.map((b) => (
                <BundleCard key={b.id} bundle={b} onSelect={() => {}} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-3xl p-8 md:p-12 text-white text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Ready to top up?</h2>
          <p className="text-brand-100 mb-6 max-w-md mx-auto">Choose your network, pick a bundle, enter the phone number, and pay. It&apos;s that simple.</p>
          <Link to="/bundles" className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition-colors">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
