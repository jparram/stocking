import { useState, useMemo } from 'react';
import { MASTER_CATALOG, CATEGORIES } from '../data/masterCatalog';
import type { Store } from '../types';
import StoreBadge from '../components/StoreBadge';

const STORE_FILTERS: { label: string; value: Store | 'all' }[] = [
  { label: 'All Stores', value: 'all' },
  { label: "Sam's Club", value: 'sams' },
  { label: 'Harris Teeter', value: 'ht' },
];

export default function StockingGuide() {
  const [storeFilter, setStoreFilter] = useState<Store | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return MASTER_CATALOG.filter(item => {
      const matchStore = storeFilter === 'all' || item.store === storeFilter;
      const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      return matchStore && matchCat && matchSearch;
    });
  }, [storeFilter, categoryFilter, search]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, typeof filtered>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [filtered]);

  const samsCost = MASTER_CATALOG.filter(i => i.store === 'sams')
    .reduce((s, i) => s + i.approxCost, 0);
  const htCost = MASTER_CATALOG.filter(i => i.store === 'ht')
    .reduce((s, i) => s + i.approxCost, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sams to-sams-dark text-white rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-1">📋 Stocking Guide</h1>
        <p className="text-sams-light text-sm">
          Master catalog of {MASTER_CATALOG.length} items across Sam's Club and Harris Teeter.
          Estimated monthly investment: ${(samsCost + htCost).toFixed(0)}
        </p>
        <div className="flex gap-4 mt-3 text-sm">
          <span className="bg-white/20 px-3 py-1 rounded-full">
            Sam's Club: ${samsCost.toFixed(0)}/mo
          </span>
          <span className="bg-white/20 px-3 py-1 rounded-full">
            HT: ${htCost.toFixed(0)}/mo
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-brand-border p-4 shadow-sm space-y-3">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
        />
        <div className="flex flex-wrap gap-2">
          {STORE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStoreFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                storeFilter === f.value
                  ? f.value === 'ht'
                    ? 'bg-ht text-white'
                    : 'bg-sams text-white'
                  : 'bg-brand-bg text-brand-muted hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              categoryFilter === 'all' ? 'bg-gray-700 text-white' : 'bg-brand-bg text-brand-muted'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === cat ? 'bg-gray-700 text-white' : 'bg-brand-bg text-brand-muted hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-brand-muted">
        Showing {filtered.length} of {MASTER_CATALOG.length} items
      </p>

      {/* Category Groups */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="bg-white rounded-xl border border-brand-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-brand-bg border-b border-brand-border flex items-center justify-between">
              <h2 className="font-semibold text-brand-text">{category}</h2>
              <span className="text-xs text-brand-muted">{items.length} items</span>
            </div>
            <div className="divide-y divide-brand-border">
              {items.map(item => (
                <div key={item.id} className="px-4 py-3 flex items-center justify-between hover:bg-brand-bg transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-brand-text">{item.name}</span>
                      <StoreBadge store={item.store} />
                    </div>
                    {item.notes && (
                      <p className="text-xs text-brand-muted mt-0.5">{item.notes}</p>
                    )}
                  </div>
                  <div className="text-right text-sm shrink-0 ml-4">
                    <div className="text-brand-text font-medium">
                      {item.parStock} {item.unit}
                    </div>
                    <div className="text-brand-muted text-xs">
                      ~${item.approxCost} · every {item.cadenceDays}d
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-brand-muted">
            <div className="text-4xl mb-3">🔍</div>
            <p>No items match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
