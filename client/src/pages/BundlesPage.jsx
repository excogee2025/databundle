import { useEffect, useState } from 'react';
import { bundles as bundlesApi } from '../lib/api';
import BundleCard from '../components/BundleCard';
import { PageLoader } from '../components/LoadingSpinner';
import { NETWORK_COLORS } from '../utils/helpers';
import { Search } from 'lucide-react';

export default function BundlesPage() {
  const [networks, setNetworks] = useState([]);
  const [activeNetwork, setActiveNetwork] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bundlesApi.getNetworks()
      .then(({ data }) => setNetworks(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allBundles = networks.flatMap((n) =>
    n.bundles.map((b) => ({ ...b, network: n }))
  );

  const filtered = allBundles.filter((b) => {
    const matchNetwork = activeNetwork === 'all' || b.network.slug === activeNetwork;
    const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.dataAmount.toLowerCase().includes(search.toLowerCase());
    return matchNetwork && matchSearch;
  });

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Buy Data Bundles</h1>
        <p className="text-slate-500 mt-1">Select your network and choose a plan</p>
      </div>

      {/* Network tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveNetwork('all')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeNetwork === 'all' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'
          }`}
        >
          All Networks
        </button>
        {networks.map((n) => {
          const c = NETWORK_COLORS[n.slug];
          return (
            <button
              key={n.slug}
              onClick={() => setActiveNetwork(n.slug)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                activeNetwork === n.slug
                  ? `${c.bg} ${c.text}`
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {n.name}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search bundles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-slate-500 py-12">No bundles found matching your search.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((b) => (
            <BundleCard key={b.id} bundle={b} onSelect={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
