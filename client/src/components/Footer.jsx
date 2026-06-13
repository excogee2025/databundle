import { Link } from 'react-router-dom';
import { Wifi, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <Wifi className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-lg">DataBundle GH</span>
            </div>
            <p className="text-sm leading-relaxed max-w-md">
              Ghana&apos;s fastest way to buy mobile data. Instant delivery for MTN, Telecel, and AirtelTigo. Secure payments via Paystack.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/bundles" className="hover:text-white transition-colors">Buy Data</Link></li>
              <li><Link to="/track" className="hover:text-white transition-colors">Track Order</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">My Orders</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Support</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> support@databundle.gh</li>
              <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> +233 24 000 0000</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 text-xs text-center">
          © {new Date().getFullYear()} DataBundle GH. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
