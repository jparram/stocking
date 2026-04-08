import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { Store, Item, AppState, RecipeIngredient, ShoppingList, ShoppingListItem } from '../types';
import { MASTER_CATALOG } from '../data/masterCatalog';
import { createShoppingList, storeLabel, isDueThisWeek, generateId, getMondayOf, formatDate } from '../utils';
import StoreBadge from '../components/StoreBadge';
import { useMealCalendar } from '../hooks/useMealCalendar';
import { useRecipes } from '../hooks/useRecipes';

type Step = 'store' | 'meal-plan' | 'items' | 'review';

// ── Meal-plan helpers ─────────────────────────────────────────────────────────

function shiftWeek(weekOf: string, delta: number): string {
  const d = new Date(weekOf + 'T12:00:00');
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().split('T')[0];
}

function formatWeekRange(weekOf: string): string {
  const mon = new Date(weekOf + 'T12:00:00');
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(mon)} – ${fmt(sun)}, ${sun.getFullYear()}`;
}

/** Round a quantity to 3 decimal places to avoid floating-point accumulation errors. */
function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Normalize a unit string for use as an aggregation key.
 *  Empty / null / undefined all collapse to 'each'. */
function normalizeUnit(unit?: string | null): string {
  const u = (unit ?? '').trim().toLowerCase();
  return u || 'each';
}

/** Aggregate a flat list of recipe ingredients into deduplicated ShoppingListItems.
 *  Catalog items (same catalogItemId) are summed; custom items are keyed by name+unit. */
function aggregateIngredients(
  ingredients: RecipeIngredient[],
  defaultStore: Store,
): ShoppingListItem[] {
  const map = new Map<string, ShoppingListItem>();

  for (const ing of ingredients) {
    if (ing.catalogItemId) {
      const cat = MASTER_CATALOG.find(c => c.id === ing.catalogItemId);
      if (cat) {
        const key = `catalog:${ing.catalogItemId}`;
        const existing = map.get(key);
        if (existing) {
          existing.quantity = roundQty(existing.quantity + (ing.amount ?? 1));
        } else {
          map.set(key, {
            id: generateId(),
            itemId: cat.id,
            name: cat.name,
            category: cat.category,
            store: cat.store,
            quantity: ing.amount ?? 1,
            unit: ing.unit ?? cat.unit,
            approxCost: cat.approxCost,
            checked: false,
            notes: ing.notes ?? undefined,
          });
        }
        continue;
      }
    }
    // No catalogItemId (or not found) → custom item, keyed by name + normalised unit
    const unitKey = normalizeUnit(ing.unit);
    const key = `custom:${ing.name.toLowerCase()}:${unitKey}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity = roundQty(existing.quantity + (ing.amount ?? 1));
    } else {
      map.set(key, {
        id: generateId(),
        itemId: `custom-${generateId()}`,
        name: ing.name,
        category: 'Custom',
        store: defaultStore,
        quantity: ing.amount ?? 1,
        unit: ing.unit ?? 'each',
        approxCost: 0,
        checked: false,
        notes: ing.notes ?? undefined,
      });
    }
  }

  return Array.from(map.values());
}

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

  // ── Meal-plan generation state ──────────────────────────────────────────────
  const [isMealPlanPath, setIsMealPlanPath] = useState(false);
  const [mealPlanWeekOf, setMealPlanWeekOf] = useState(getMondayOf());
  const [mealPlanGenerating, setMealPlanGenerating] = useState(false);
  const [mealPlanError, setMealPlanError] = useState<string | null>(null);
  const [generatedItems, setGeneratedItems] = useState<ShoppingListItem[]>([]);

  const { weekEntries } = useMealCalendar();
  const { getIngredients } = useRecipes();

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

  const generateFromMealPlan = async () => {
    setMealPlanGenerating(true);
    setMealPlanError(null);
    setGeneratedItems([]);
    try {
      const entries = weekEntries(mealPlanWeekOf);
      const recipeIds = [...new Set(
        entries.filter(e => e.recipeId).map(e => e.recipeId!),
      )];

      if (recipeIds.length === 0) {
        setMealPlanError('No recipes found in the meal plan for this week. Assign recipes to meal slots on the Meal Plan page first.');
        return;
      }

      const allIngredients: RecipeIngredient[] = [];
      for (const recipeId of recipeIds) {
        const ings = await getIngredients(recipeId);
        allIngredients.push(...ings);
      }

      const aggregated = aggregateIngredients(allIngredients, selectedStore);
      setGeneratedItems(aggregated);
    } catch (err) {
      setMealPlanError(err instanceof Error ? err.message : 'Failed to generate items from meal plan');
    } finally {
      setMealPlanGenerating(false);
    }
  };

  const handleSave = () => {
    let list: ShoppingList;
    if (isMealPlanPath) {
      // Meal-plan flow — build list directly from aggregated items
      const now = new Date().toISOString();
      list = {
        id: generateId(),
        name: listName || `Week of ${formatDate(mealPlanWeekOf)} — ${storeLabel(selectedStore)} (Meal Plan)`,
        weekOf: mealPlanWeekOf,
        store: selectedStore,
        items: generatedItems,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
    } else {
      list = createShoppingList(selectedStore, selectedItemObjects, listName || undefined);
      list.status = 'active';
    }
    onAdd(list);
    navigate(`/list/${list.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator — adapts to normal vs. meal-plan flow */}
      {(() => {
        const visibleSteps: Step[] = step === 'meal-plan' || (step === 'review' && isMealPlanPath)
          ? ['store', 'meal-plan', 'review']
          : ['store', 'items', 'review'];
        return (
          <div className="flex items-center gap-2 mb-6">
            {visibleSteps.map((s, idx) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step === s
                      ? 'bg-sams text-white'
                      : idx < visibleSteps.indexOf(step)
                      ? 'bg-green-500 text-white'
                      : 'bg-brand-border text-brand-muted'
                  }`}
                >
                  {idx + 1}
                </div>
                <span className={`text-sm hidden sm:block ${step === s ? 'font-semibold' : 'text-brand-muted'}`}>
                  {s === 'store' ? 'Choose Store' : s === 'meal-plan' ? 'Meal Plan' : s === 'items' ? 'Select Items' : 'Review & Save'}
                </span>
                {idx < 2 && <div className="w-8 h-0.5 bg-brand-border" />}
              </div>
            ))}
          </div>
        );
      })()}

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
            onClick={() => { setIsMealPlanPath(false); setStep('items'); }}
            className="w-full bg-sams text-white py-3 rounded-lg font-semibold hover:bg-sams-dark transition-colors"
          >
            Next: Select Items →
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-brand-muted">or</span>
            </div>
          </div>
          <button
            onClick={() => {
              setIsMealPlanPath(true);
              setGeneratedItems([]);
              setMealPlanError(null);
              setStep('meal-plan');
            }}
            className="w-full border-2 border-dashed border-ht text-ht py-3 rounded-lg font-semibold hover:bg-ht-light transition-colors"
          >
            📅 Generate from meal plan
          </button>
        </div>
      )}

      {/* Step 2: Select Items */}
      {/* Step 2 (meal-plan flow): Generate from meal plan */}
      {step === 'meal-plan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Generate from Meal Plan</h1>
            <StoreBadge store={selectedStore} size="md" />
          </div>

          {/* Week picker */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setMealPlanWeekOf(w => shiftWeek(w, -1)); setGeneratedItems([]); setMealPlanError(null); }}
              className="p-2 rounded-lg border border-brand-border hover:bg-brand-bg transition-colors text-brand-muted hover:text-brand-text"
              aria-label="Previous week"
            >
              ‹
            </button>
            <div className="flex-1 text-center">
              <span className="font-semibold text-brand-text text-sm">{formatWeekRange(mealPlanWeekOf)}</span>
            </div>
            <button
              onClick={() => { setMealPlanWeekOf(w => shiftWeek(w, 1)); setGeneratedItems([]); setMealPlanError(null); }}
              className="p-2 rounded-lg border border-brand-border hover:bg-brand-bg transition-colors text-brand-muted hover:text-brand-text"
              aria-label="Next week"
            >
              ›
            </button>
            <button
              onClick={() => { setMealPlanWeekOf(getMondayOf()); setGeneratedItems([]); setMealPlanError(null); }}
              className="px-3 py-2 text-xs font-medium border border-brand-border rounded-lg hover:bg-brand-bg text-brand-muted hover:text-brand-text transition-colors"
            >
              Today
            </button>
          </div>

          {/* Meal plan preview */}
          {(() => {
            const entries = weekEntries(mealPlanWeekOf).filter(e => e.recipeId);
            const uniqueRecipes = [...new Map(entries.map(e => [e.recipeId!, e.recipeName ?? e.recipeId!])).entries()];
            return uniqueRecipes.length > 0 ? (
              <div className="bg-brand-bg rounded-xl border border-brand-border p-4">
                <p className="text-xs font-medium text-brand-muted mb-2">
                  🍳 {uniqueRecipes.length} recipe{uniqueRecipes.length !== 1 ? 's' : ''} planned this week
                </p>
                <ul className="space-y-1">
                  {uniqueRecipes.map(([id, name]) => (
                    <li key={id} className="text-sm text-brand-text">• {name}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-brand-bg rounded-xl border border-brand-border p-4 text-center text-sm text-brand-muted">
                No recipes found for this week. Assign recipes to meal slots on the{' '}
                <Link to="/meal-plan" className="text-ht underline">Meal Plan</Link> page.
              </div>
            );
          })()}

          {/* Generate button */}
          <button
            onClick={generateFromMealPlan}
            disabled={mealPlanGenerating || weekEntries(mealPlanWeekOf).filter(e => e.recipeId).length === 0}
            className="w-full bg-ht text-white py-3 rounded-lg font-semibold hover:bg-ht-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mealPlanGenerating ? '⏳ Fetching ingredients…' : '🔄 Generate Shopping List'}
          </button>

          {/* Error */}
          {mealPlanError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{mealPlanError}</p>
          )}

          {/* Aggregated preview */}
          {generatedItems.length > 0 && (
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-brand-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-brand-bg border-b border-brand-border flex justify-between">
                  <span className="font-semibold text-sm">{generatedItems.length} items</span>
                  <span className="text-sm text-brand-muted">
                    Est. total: ${generatedItems.reduce((s, i) => s + i.approxCost * i.quantity, 0).toFixed(2)}
                  </span>
                </div>
                <div className="divide-y divide-brand-border max-h-64 overflow-y-auto">
                  {generatedItems.map(item => (
                    <div key={item.id} className="px-4 py-2.5 flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium text-brand-text">{item.name}</span>
                        {item.category === 'Custom' && (
                          <span className="ml-2 text-xs text-brand-muted italic">custom</span>
                        )}
                      </div>
                      <span className="text-xs text-brand-muted">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('store')}
              className="px-4 py-2.5 border border-brand-border rounded-lg text-sm font-medium hover:bg-brand-bg transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep('review')}
              disabled={generatedItems.length === 0}
              className="flex-1 bg-sams text-white py-2.5 rounded-lg font-semibold hover:bg-sams-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Review {generatedItems.length > 0 ? `${generatedItems.length} Items` : 'Items'} →
            </button>
          </div>
        </div>
      )}

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
          {/* Meal-plan flow: show generated items */}
          {isMealPlanPath ? (
            <div className="bg-white rounded-xl border border-brand-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-brand-bg border-b border-brand-border flex justify-between">
                <span className="font-semibold text-sm">{generatedItems.length} items</span>
                <span className="text-sm text-brand-muted">
                  Est. total: ${generatedItems.reduce((s, i) => s + i.approxCost * i.quantity, 0).toFixed(2)}
                </span>
              </div>
              <div className="divide-y divide-brand-border max-h-64 overflow-y-auto">
                {generatedItems.map(item => (
                  <div key={item.id} className="px-4 py-2.5 flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-brand-text">{item.name}</span>
                      {item.category !== 'Custom' && <StoreBadge store={item.store} />}
                      {item.category === 'Custom' && (
                        <span className="ml-2 text-xs text-brand-muted italic">custom</span>
                      )}
                    </div>
                    <div className="text-right text-xs text-brand-muted">
                      {item.quantity} {item.unit}{item.approxCost > 0 && <><br />~${(item.approxCost * item.quantity).toFixed(2)}</>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Normal flow: show selected catalog items */
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
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(isMealPlanPath ? 'meal-plan' : 'items')}
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
