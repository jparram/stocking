import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { AppState, ShoppingList, ShoppingListItem } from '../types';
import { formatDate, formatCurrency, listProgress, listTotalCost, groupByCategory, generateId } from '../utils';
import StoreBadge from '../components/StoreBadge';
import ProgressBar from '../components/ProgressBar';
import { MASTER_CATALOG } from '../data/masterCatalog';
import { searchKrogerProducts, type KrogerSearchResult } from '../utils/krogerSearch';

interface ActiveListProps {
  state: AppState;
  loading: boolean;
  onUpdate: (list: ShoppingList) => void;
  onLog: (log: import('../types').WeeklyLog) => void;
}

export default function ActiveList({ state, loading, onUpdate, onLog }: ActiveListProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [addOpenCategory, setAddOpenCategory] = useState<string | null>(null);
  const [krogerQuery, setKrogerQuery] = useState('');
  const [krogerResults, setKrogerResults] = useState<KrogerSearchResult[]>([]);
  const [krogerLoading, setKrogerLoading] = useState(false);
  const [krogerError, setKrogerError] = useState<string | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [customUnit, setCustomUnit] = useState('ea');
  const [customCost, setCustomCost] = useState('0');

  const list = state.lists.find(l => l.id === id);

  if (!list) {
    if (loading) {
      return <div className="text-center py-16 text-gray-500">Loading...</div>;
    }
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-xl font-semibold mb-2">List not found</h2>
        <Link to="/" className="text-sams hover:underline">← Back to Dashboard</Link>
      </div>
    );
  }

  const progress = listProgress(list);
  const total = listTotalCost(list);
  const grouped = groupByCategory(list.items);
  const barColor = list.store === 'ht' ? 'bg-ht' : 'bg-sams';

  const toggleItem = (itemId: string) => {
    const updated: ShoppingList = {
      ...list,
      items: list.items.map(i =>
        i.id === itemId ? { ...i, checked: !i.checked } : i
      ),
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updated);
  };

  const updateNote = (itemId: string, notes: string) => {
    const updated: ShoppingList = {
      ...list,
      items: list.items.map(i => i.id === itemId ? { ...i, notes } : i),
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updated);
  };

  const handleMarkComplete = () => {
    const completedList: ShoppingList = {
      ...list,
      status: 'complete',
      totalSpend: total,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(completedList);
    onLog({
      id: generateId(),
      listId: list.id,
      weekOf: list.weekOf,
      store: list.store,
      totalSpend: total,
      itemCount: list.items.length,
      completedAt: new Date().toISOString(),
    });
    navigate('/history');
  };

  const addableByCategory = MASTER_CATALOG.reduce<Record<string, typeof MASTER_CATALOG>>((acc, catalogItem) => {
    const alreadyAdded = list.items.some(i => i.itemId === catalogItem.id);
    const matchStore = list.store === 'both' || catalogItem.store === list.store;
    if (!alreadyAdded && matchStore) {
      if (!acc[catalogItem.category]) acc[catalogItem.category] = [];
      acc[catalogItem.category].push(catalogItem);
    }
    return acc;
  }, {});

  // All categories: ones with items on the list + catalog-only ones with addable items
  const allCategories = Array.from(new Set([
    ...Object.keys(grouped),
    ...Object.keys(addableByCategory),
  ])).sort();

  const updateQuantity = (itemId: string, quantity: number) => {
    onUpdate({
      ...list,
      items: list.items.map(i => i.id === itemId ? { ...i, quantity } : i),
      updatedAt: new Date().toISOString(),
    });
  };

  const removeItem = (itemId: string) => {
    onUpdate({
      ...list,
      items: list.items.filter(i => i.id !== itemId),
      updatedAt: new Date().toISOString(),
    });
  };

  const addItem = (catalogItem: typeof MASTER_CATALOG[0]) => {
    const newItem: ShoppingListItem = {
      id: generateId(),
      itemId: catalogItem.id,
      name: catalogItem.name,
      category: catalogItem.category,
      store: catalogItem.store,
      quantity: catalogItem.parStock,
      unit: catalogItem.unit,
      approxCost: catalogItem.approxCost,
      checked: false,
      notes: catalogItem.notes,
    };
    onUpdate({
      ...list,
      items: [...list.items, newItem],
      updatedAt: new Date().toISOString(),
    });
  };

  const addKrogerItem = (result: KrogerSearchResult, category: string) => {
    const newItem: ShoppingListItem = {
      id: generateId(),
      itemId: `kroger-${result.productId}`,
      name: result.name,
      category,
      store: 'ht',
      quantity: 1,
      unit: result.size ?? 'ea',
      approxCost: result.promoPrice ?? result.price ?? 0,
      checked: false,
    };
    onUpdate({
      ...list,
      items: [...list.items, newItem],
      updatedAt: new Date().toISOString(),
    });
  };

  const runKrogerSearch = async () => {
    if (!krogerQuery.trim()) return;
    setKrogerLoading(true);
    setKrogerError(null);
    try {
      const results = await searchKrogerProducts(krogerQuery.trim());
      setKrogerResults(results);
    } catch (e) {
      setKrogerError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setKrogerLoading(false);
    }
  };

  const addCustomItem = (category: string) => {
    const name = customName.trim();
    if (!name) return;
    const newItem: ShoppingListItem = {
      id: generateId(),
      itemId: `custom-${generateId()}`,
      name,
      category,
      store: list.store === 'sams' ? 'sams' : 'ht',
      quantity: parseFloat(customQty) || 1,
      unit: customUnit.trim() || 'ea',
      approxCost: parseFloat(customCost) || 0,
      checked: false,
    };
    onUpdate({ ...list, items: [...list.items, newItem], updatedAt: new Date().toISOString() });
    setCustomName('');
    setCustomQty('1');
    setCustomUnit('ea');
    setCustomCost('0');
    setShowCustomForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-brand-border p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <Link to="/" className="text-xs text-brand-muted hover:text-sams mb-1 block">← Dashboard</Link>
            <h1 className="text-lg font-bold text-brand-text">{list.name}</h1>
            <p className="text-xs text-brand-muted">Week of {formatDate(list.weekOf)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StoreBadge store={list.store} size="md" />
            <span className="text-sm font-semibold">{formatCurrency(total)}</span>
          </div>
        </div>
        <ProgressBar percent={progress} color={barColor} />
        <div className="flex justify-between text-xs text-brand-muted mt-1">
          <span>{list.items.filter(i => i.checked).length} / {list.items.length} items</span>
          <span>{progress}% complete</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Link
          to={`/list/${list.id}/share`}
          className="px-3 py-2 bg-white border border-brand-border rounded-lg text-sm font-medium hover:bg-brand-bg transition-colors"
        >
          📤 Share / Export
        </Link>
        {list.status === 'active' && (
          <button
            onClick={handleMarkComplete}
            disabled={progress === 0}
            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            ✓ Mark Complete
          </button>
        )}
      </div>

      {/* Checklist by Category */}
      {allCategories.map(category => {
        const listItems = grouped[category] ?? [];
        const addable = addableByCategory[category] ?? [];
        const isOpen = addOpenCategory === category;
        return (
          <div key={category} className="bg-white rounded-xl border border-brand-border shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-brand-bg border-b border-brand-border flex justify-between items-center">
              <h2 className="font-semibold text-sm text-brand-text">{category}</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-brand-muted">
                  {listItems.filter(i => i.checked).length}/{listItems.length}
                </span>
                <button
                  onClick={() => {
                    if (isOpen) { setAddOpenCategory(null); setKrogerResults([]); setKrogerQuery(''); setShowCustomForm(false); }
                    else setAddOpenCategory(category);
                  }}
                  className="text-xs text-sams font-medium hover:underline"
                >
                  {isOpen ? 'Done' : '+ Add'}
                </button>
              </div>
            </div>
            <div className="divide-y divide-brand-border">
              {listItems.map(item => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  store={list.store}
                  onToggle={() => toggleItem(item.id)}
                  onNote={(n) => updateNote(item.id, n)}
                  onRemove={() => removeItem(item.id)}
                  onQuantity={(q) => updateQuantity(item.id, q)}
                />
              ))}
            </div>
            {isOpen && (
              <div className="border-t border-brand-border">
                {/* Kroger search */}
                <div className="px-4 py-2.5 flex gap-2 border-b border-brand-border">
                  <input
                    type="text"
                    value={krogerQuery}
                    onChange={e => setKrogerQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') void runKrogerSearch(); }}
                    placeholder="Search Harris Teeter products…"
                    className="flex-1 text-sm border border-brand-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sams"
                  />
                  <button
                    onClick={() => void runKrogerSearch()}
                    disabled={krogerLoading}
                    className="px-3 py-1 bg-sams text-white rounded text-sm font-medium disabled:opacity-50"
                  >
                    {krogerLoading ? '…' : 'Search'}
                  </button>
                </div>
                {krogerError && (
                  <p className="px-4 py-2 text-xs text-red-500">{krogerError}</p>
                )}
                {/* Kroger results */}
                {krogerResults.length > 0 && (
                  <div className="divide-y divide-brand-border">
                    {krogerResults.map(result => (
                      <button
                        key={result.productId}
                        onClick={() => { addKrogerItem(result, category); }}
                        className="w-full px-4 py-2.5 flex justify-between items-center hover:bg-blue-50 text-left transition-colors"
                      >
                        <div>
                          <span className="text-sm text-brand-text">{result.name}</span>
                          {result.size && <span className="text-xs text-brand-muted ml-2">{result.size}</span>}
                          {result.brand && <span className="text-xs text-brand-muted ml-1">· {result.brand}</span>}
                        </div>
                        <span className="text-xs text-brand-muted shrink-0 ml-2">
                          {result.price ? formatCurrency(result.price) : '—'} +
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {/* Catalog items */}
                {addable.length > 0 && (
                  <div className="divide-y divide-brand-border">
                    {krogerResults.length === 0 && (
                      <p className="px-4 py-1.5 text-xs text-brand-muted font-medium bg-brand-bg">From your catalog</p>
                    )}
                    {addable.map(catalogItem => (
                      <button
                        key={catalogItem.id}
                        onClick={() => { addItem(catalogItem); }}
                        className="w-full px-4 py-2.5 flex justify-between items-center hover:bg-brand-bg text-left transition-colors"
                      >
                        <div>
                          <span className="text-sm text-brand-text">{catalogItem.name}</span>
                          <span className="text-xs text-brand-muted ml-2">{catalogItem.parStock} {catalogItem.unit}</span>
                        </div>
                        <span className="text-xs text-brand-muted">{formatCurrency(catalogItem.approxCost)} +</span>
                      </button>
                    ))}
                  </div>
                )}
                {/* Custom item */}
                <div className="border-t border-brand-border">
                  {!showCustomForm ? (
                    <button
                      onClick={() => setShowCustomForm(true)}
                      className="w-full px-4 py-2.5 text-left text-xs text-brand-muted hover:text-sams hover:bg-brand-bg transition-colors"
                    >
                      + Add something not in the list…
                    </button>
                  ) : (
                    <div className="px-4 py-3 space-y-2">
                      <input
                        autoFocus
                        type="text"
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        placeholder="Item name"
                        className="w-full text-sm border border-brand-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sams"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0.1"
                          step="0.5"
                          value={customQty}
                          onChange={e => setCustomQty(e.target.value)}
                          placeholder="Qty"
                          className="w-20 text-sm border border-brand-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sams"
                        />
                        <input
                          type="text"
                          value={customUnit}
                          onChange={e => setCustomUnit(e.target.value)}
                          placeholder="Unit"
                          className="w-20 text-sm border border-brand-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sams"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={customCost}
                          onChange={e => setCustomCost(e.target.value)}
                          placeholder="Est. $"
                          className="w-24 text-sm border border-brand-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sams"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => addCustomItem(category)}
                          className="px-3 py-1 bg-sams text-white rounded text-sm font-medium"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setShowCustomForm(false)}
                          className="px-3 py-1 text-brand-muted text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {list.status === 'complete' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">🎉</div>
          <p className="font-semibold text-green-800">Shopping complete!</p>
          <p className="text-sm text-green-700">Total: {formatCurrency(list.totalSpend ?? total)}</p>
        </div>
      )}
    </div>
  );
}

interface ChecklistItemProps {
  item: ShoppingListItem;
  store: import('../types').Store;
  onToggle: () => void;
  onNote: (note: string) => void;
  onRemove: () => void;
  onQuantity: (qty: number) => void;
}

function ChecklistItem({ item, store, onToggle, onNote, onRemove, onQuantity }: ChecklistItemProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(item.notes ?? '');
  const [editingQty, setEditingQty] = useState(false);
  const [qtyText, setQtyText] = useState(String(item.quantity));

  const checkColor = store === 'ht' ? 'text-ht' : 'text-sams';

  return (
    <div className={`px-4 py-3 transition-colors ${item.checked ? 'bg-green-50' : ''}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
            item.checked
              ? store === 'ht' ? 'bg-ht border-ht' : 'bg-sams border-sams'
              : 'border-gray-300 hover:border-sams'
          }`}
          aria-label={item.checked ? 'Uncheck item' : 'Check item'}
        >
          {item.checked && <span className="text-white text-xs font-bold">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${item.checked ? `line-through text-brand-muted ${checkColor}` : 'text-brand-text'}`}>
            {item.name}
          </span>
          {item.notes && !editingNote && (
            <p className="text-xs text-brand-muted">{item.notes}</p>
          )}
          {editingNote && (
            <div className="flex gap-1 mt-1">
              <input
                autoFocus
                type="text"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onBlur={() => { onNote(noteText); setEditingNote(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { onNote(noteText); setEditingNote(false); } }}
                className="flex-1 text-xs border border-brand-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sams"
                placeholder="Add note..."
              />
            </div>
          )}
        </div>
        <div className="text-right text-xs text-brand-muted shrink-0 flex flex-col items-end gap-1">
          {editingQty ? (
            <input
              autoFocus
              type="number"
              min="0.5"
              step="0.5"
              value={qtyText}
              onChange={e => setQtyText(e.target.value)}
              onBlur={() => { const n = parseFloat(qtyText); if (n > 0) onQuantity(n); setEditingQty(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { const n = parseFloat(qtyText); if (n > 0) onQuantity(n); setEditingQty(false); } if (e.key === 'Escape') setEditingQty(false); }}
              className="w-14 text-xs border border-brand-border rounded px-1 py-0.5 text-right focus:outline-none focus:ring-1 focus:ring-sams"
            />
          ) : (
            <button onClick={() => { setQtyText(String(item.quantity)); setEditingQty(true); }} className="hover:text-sams" title="Edit quantity">
              {item.quantity} {item.unit}
            </button>
          )}
          <span>{formatCurrency(item.approxCost)}</span>
          <div className="flex gap-2">
            <button onClick={() => setEditingNote(true)} className="text-brand-muted hover:text-sams" title="Add note">📝</button>
            <button onClick={onRemove} className="text-brand-muted hover:text-red-500" title="Remove item">✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}
