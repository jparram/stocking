import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { AppState, ShoppingList, ShoppingListItem } from '../types';
import { formatDate, formatCurrency, listProgress, listTotalCost, groupByCategory, generateId } from '../utils';
import StoreBadge from '../components/StoreBadge';
import ProgressBar from '../components/ProgressBar';
import { MASTER_CATALOG } from '../data/masterCatalog';

interface ActiveListProps {
  state: AppState;
  loading: boolean;
  onUpdate: (list: ShoppingList) => void;
  onLog: (log: import('../types').WeeklyLog) => void;
}

export default function ActiveList({ state, loading, onUpdate, onLog }: ActiveListProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [addSearch, setAddSearch] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);

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

  const addableItems = MASTER_CATALOG.filter(catalogItem => {
    const alreadyAdded = list.items.some(i => i.itemId === catalogItem.id);
    const matchStore = list.store === 'both' || catalogItem.store === list.store;
    const matchSearch = !addSearch || catalogItem.name.toLowerCase().includes(addSearch.toLowerCase());
    return !alreadyAdded && matchStore && matchSearch;
  });

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
        <button
          onClick={() => setShowAddPanel(!showAddPanel)}
          className="px-3 py-2 bg-white border border-brand-border rounded-lg text-sm font-medium hover:bg-brand-bg transition-colors"
        >
          + Add Item
        </button>
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

      {/* Add Item Panel */}
      {showAddPanel && (
        <div className="bg-white rounded-xl border border-brand-border p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-2">Add Items</h3>
          <input
            type="text"
            placeholder="Search catalog..."
            value={addSearch}
            onChange={e => setAddSearch(e.target.value)}
            className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-sams"
          />
          <div className="divide-y divide-brand-border max-h-48 overflow-y-auto rounded-lg border border-brand-border">
            {addableItems.slice(0, 20).map(item => (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className="w-full px-3 py-2.5 flex justify-between items-center hover:bg-brand-bg text-left transition-colors"
              >
                <div>
                  <span className="text-sm text-brand-text">{item.name}</span>
                  <span className="text-xs text-brand-muted ml-2">{item.category}</span>
                </div>
                <span className="text-xs text-brand-muted">+</span>
              </button>
            ))}
            {addableItems.length === 0 && (
              <p className="px-3 py-3 text-sm text-brand-muted text-center">No items to add</p>
            )}
          </div>
        </div>
      )}

      {/* Checklist by Category */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="bg-white rounded-xl border border-brand-border shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-brand-bg border-b border-brand-border flex justify-between">
            <h2 className="font-semibold text-sm text-brand-text">{category}</h2>
            <span className="text-xs text-brand-muted">
              {items.filter(i => i.checked).length}/{items.length}
            </span>
          </div>
          <div className="divide-y divide-brand-border">
            {items.map(item => (
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
        </div>
      ))}

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
