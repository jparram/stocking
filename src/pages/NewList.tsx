import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Store, Item, AppState } from '../types';
import { MASTER_CATALOG } from '../data/masterCatalog';
import { createShoppingList, storeLabel, isDueThisWeek } from '../utils';
import StoreBadge from '../components/StoreBadge';

type Step = 'store' | 'items' | 'review';

interface NewListProps {
  state: AppState;
  onAdd: (list: ReturnType<typeof createShoppingList>) => void;
}

export default function NewList({ state, onAdd }: NewListProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('store');
  const [selectedStore, setSelectedStore] = useState<Store>('both');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [listName, setListName] = useState('');

  const suggestedItems = useMemo(() => {
    return MASTER_CATALOG.filter(item => {
      const matchStore = selectedStore === 'both' || item.store === selectedStore;
      const isDue = isDueThisWeek(item, state.settings.cadenceStartDate);
      return matchStore && isDue;
    });
  }, [selectedStore, state.settings.cadenceStartDate]);

  const catalogItems = useMemo(() => {
    return MASTER_CATALOG.filter(item => {
      const matchStore = selectedStore === 'both' || item.store === selectedStore;
      const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      return matchStore && matchSearch;
    });
  }, [selectedStore, search]);

  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addAllSuggested = () => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      suggestedItems.forEach(i => next.add(i.id));
      return next;
    });
  };

  const selectedItemObjects: Item[] = MASTER_CATALOG.filter(i => selectedItems.has(i.id));

  const handleSave = () => {
    const list = createShoppingList(selectedStore, selectedItemObjects, listName || undefined);
    list.status = 'active';
    onAdd(list);
    navigate(`/list/${list.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(['store', 'items', 'review'] as Step[]).map((s, idx) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step === s
                  ? 'bg-sams text-white'
                  : idx < (['store', 'items', 'review'] as Step[]).indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-brand-border text-brand-muted'
              }`}
            >
              {idx + 1}
            </div>
            <span className={`text-sm hidden sm:block ${step === s ? 'font-semibold' : 'text-brand-muted'}`}>
              {s === 'store' ? 'Choose Store' : s === 'items' ? 'Select Items' : 'Review & Save'}
            </span>
            {idx < 2 && <div className="w-8 h-0.5 bg-brand-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Store */}
      {step === 'store' && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Where are you shopping?</h1>
          <div className="grid gap-4">
            {([
              { store: 'sams' as Store, label: "Sam's Club", desc: "Bulk groceries, proteins, household", color: 'border-sams bg-sams-light', icon: '🔵' },
              { store: 'ht' as Store, label: 'Harris Teeter', desc: 'Fresh deli, produce, specialty items', color: 'border-ht bg-ht-light', icon: '🟢' },
              { store: 'both' as Store, label: 'Both Stores', desc: 'Create a combined list for both stores', color: 'border-gray-400 bg-gray-50', icon: '🛒' },
            ]).map(opt => (
              <button
                key={opt.store}
                onClick={() => setSelectedStore(opt.store)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedStore === opt.store ? opt.color + ' border-opacity-100' : 'border-brand-border hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{opt.icon}</span>
                  <div>
                    <p className="font-semibold text-brand-text">{opt.label}</p>
                    <p className="text-sm text-brand-muted">{opt.desc}</p>
                  </div>
                  {selectedStore === opt.store && (
                    <span className="ml-auto text-xl">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep('items')}
            className="w-full bg-sams text-white py-3 rounded-lg font-semibold hover:bg-sams-dark transition-colors"
          >
            Next: Select Items →
          </button>
        </div>
      )}

      {/* Step 2: Select Items */}
      {step === 'items' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Select Items</h1>
            <StoreBadge store={selectedStore} size="md" />
          </div>

          {suggestedItems.length > 0 && (
            <div className="bg-brand-bg rounded-xl border border-brand-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm text-brand-text">
                  🔔 Suggested This Week ({suggestedItems.length} items)
                </h2>
                <button
                  onClick={addAllSuggested}
                  className="text-xs text-sams hover:underline font-medium"
                >
                  Add All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedItems.has(item.id)
                        ? item.store === 'ht' ? 'bg-ht text-white' : 'bg-sams text-white'
                        : 'bg-white border border-brand-border text-brand-text hover:border-sams'
                    }`}
                  >
                    {selectedItems.has(item.id) ? '✓ ' : ''}{item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search all items */}
          <input
            type="text"
            placeholder="Search all items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
          />

          <div className="bg-white rounded-xl border border-brand-border divide-y divide-brand-border max-h-64 overflow-y-auto">
            {catalogItems.map(item => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-brand-bg transition-colors text-left ${
                  selectedItems.has(item.id) ? 'bg-sams-light' : ''
                }`}
              >
                <div>
                  <span className="text-sm font-medium text-brand-text">{item.name}</span>
                  <span className="text-xs text-brand-muted ml-2">{item.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-brand-muted">
                    {item.parStock} {item.unit} · ~${item.approxCost}
                  </span>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                    selectedItems.has(item.id)
                      ? item.store === 'ht' ? 'bg-ht border-ht' : 'bg-sams border-sams'
                      : 'border-brand-border'
                  }`}>
                    {selectedItems.has(item.id) && <span className="text-white text-xs">✓</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('store')}
              className="px-4 py-2.5 border border-brand-border rounded-lg text-sm font-medium hover:bg-brand-bg transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep('review')}
              disabled={selectedItems.size === 0}
              className="flex-1 bg-sams text-white py-2.5 rounded-lg font-semibold hover:bg-sams-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Review {selectedItems.size} Items →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Save */}
      {step === 'review' && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Review & Save</h1>
          <input
            type="text"
            placeholder="List name (optional)"
            value={listName}
            onChange={e => setListName(e.target.value)}
            className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
          />
          <div className="bg-white rounded-xl border border-brand-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-brand-bg border-b border-brand-border flex justify-between">
              <span className="font-semibold text-sm">{selectedItemObjects.length} items</span>
              <span className="text-sm text-brand-muted">
                Est. total: ${selectedItemObjects.reduce((s, i) => s + i.approxCost * i.parStock, 0).toFixed(2)}
              </span>
            </div>
            <div className="divide-y divide-brand-border max-h-64 overflow-y-auto">
              {selectedItemObjects.map(item => (
                <div key={item.id} className="px-4 py-2.5 flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-brand-text">{item.name}</span>
                    <StoreBadge store={item.store} />
                  </div>
                  <div className="text-right text-xs text-brand-muted">
                    {item.parStock} {item.unit}<br />
                    ~${(item.approxCost * item.parStock).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('items')}
              className="px-4 py-2.5 border border-brand-border rounded-lg text-sm font-medium hover:bg-brand-bg transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-sams text-white py-2.5 rounded-lg font-semibold hover:bg-sams-dark transition-colors"
            >
              💾 Save List for {storeLabel(selectedStore)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
