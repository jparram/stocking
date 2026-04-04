import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useRecipes } from '../hooks/useRecipes';
import type { AppState, Recipe, RecipeIngredient, ShoppingList, ShoppingListItem, Store } from '../types';
import { MASTER_CATALOG } from '../data/masterCatalog';
import { formatDate, generateId, storeLabel } from '../utils';

// ─── Props ────────────────────────────────────────────────────────────────────
interface RecipeDetailProps {
  state: AppState;
  updateList: (list: ShoppingList) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(minutes?: number): string | null {
  if (minutes == null) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function ingredientLabel(ing: RecipeIngredient): string {
  const parts: string[] = [];
  if (ing.amount != null) parts.push(String(ing.amount));
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.name);
  return parts.join(' ');
}

function activeListMatchesStore(l: ShoppingList, s: Store): boolean {
  if (l.status === 'complete') return false;
  if (s === 'both') return true;
  return l.store === s || l.store === 'both';
}

function storeButtonActiveClass(s: Store): string {
  if (s === 'ht') return 'bg-ht text-white border-ht';
  return 'bg-sams text-white border-sams'; // 'sams' and 'both' use Sam's colors
}

// ─── Add to Shopping List Modal ───────────────────────────────────────────────
interface AddToListModalProps {
  ingredients: RecipeIngredient[];
  lists: ShoppingList[];
  onConfirm: (selectedIds: string[], targetListId: string) => Promise<void>;
  onClose: () => void;
}

function AddToListModal({ ingredients, lists, onConfirm, onClose }: AddToListModalProps) {
  const catalogIngredients = ingredients.filter(i => i.catalogItemId);
  const noCatalogIngredients = ingredients.filter(i => !i.catalogItemId);

  const [store, setStore] = useState<Store>('sams');

  function relevantCatalogIds(s: Store): Set<string> {
    return new Set(
      catalogIngredients
        .filter(i => {
          const item = MASTER_CATALOG.find(c => c.id === i.catalogItemId);
          return item && (s === 'both' || item.store === s || item.store === 'both');
        })
        .map(i => i.id)
    );
  }

  const [checked, setChecked] = useState<Set<string>>(() => relevantCatalogIds(store));

  const activeLists = lists.filter(l => activeListMatchesStore(l, store));

  const [targetListId, setTargetListId] = useState(activeLists[0]?.id ?? '');

  function handleStoreChange(newStore: Store) {
    setStore(newStore);
    setChecked(relevantCatalogIds(newStore));
    const filtered = lists.filter(l => activeListMatchesStore(l, newStore));
    setTargetListId(filtered[0]?.id ?? '');
  }

  useEffect(() => {
    const hasValidSelection = activeLists.some(list => list.id === targetListId);
    if (!hasValidSelection) {
      setTargetListId(activeLists[0]?.id ?? '');
    }
  }, [activeLists, targetListId]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleConfirm() {
    if (!targetListId) {
      setError('Please select a shopping list.');
      return;
    }
    if (checked.size === 0) {
      setError('Please select at least one ingredient.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onConfirm(Array.from(checked), targetListId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add items.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-brand-border">
          <h2 className="text-lg font-bold text-brand-text">Add Ingredients to Shopping List</h2>
          <p className="text-sm text-brand-muted mt-1">Select which ingredients to add, then choose a list.</p>
        </div>

        {/* Store selector */}
        <div className="px-6 pt-4 pb-2">
          <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2">Store</p>
          <div className="flex gap-2">
            {(['sams', 'ht', 'both'] as Store[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleStoreChange(s)}
                className={`flex-1 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  store === s
                    ? storeButtonActiveClass(s)
                    : 'border-brand-border text-brand-muted hover:bg-brand-bg'
                }`}
              >
                {storeLabel(s)}
              </button>
            ))}
          </div>
        </div>

        {/* Ingredient list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
          {catalogIngredients.length === 0 && noCatalogIngredients.length === 0 && (
            <p className="text-brand-muted text-sm">No ingredients found.</p>
          )}

          {catalogIngredients.map(ing => {
            const catalogItem = MASTER_CATALOG.find(c => c.id === ing.catalogItemId);
            return (
              <label
                key={ing.id}
                className="flex items-start gap-3 cursor-pointer rounded-lg p-2 hover:bg-brand-bg"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded accent-sams"
                  checked={checked.has(ing.id)}
                  onChange={() => toggle(ing.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text">{ingredientLabel(ing)}</p>
                  {catalogItem && (
                    <p className="text-xs text-sams mt-0.5">🔗 {catalogItem.name}</p>
                  )}
                  {ing.notes && <p className="text-xs text-brand-muted mt-0.5">{ing.notes}</p>}
                </div>
              </label>
            );
          })}

          {noCatalogIngredients.length > 0 && (
            <>
              <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide pt-2">
                Not in catalog — add manually
              </p>
              {noCatalogIngredients.map(ing => (
                <div
                  key={ing.id}
                  className="flex items-start gap-3 rounded-lg p-2 opacity-50"
                >
                  <input type="checkbox" className="mt-0.5 h-4 w-4 rounded" disabled />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-brand-muted">{ingredientLabel(ing)}</p>
                    {ing.notes && <p className="text-xs text-brand-muted mt-0.5">{ing.notes}</p>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* List selector */}
        <div className="px-6 py-4 border-t border-brand-border space-y-3">
          {activeLists.length === 0 ? (
            <p className="text-sm text-brand-muted">
              No active lists found.{' '}
              <Link to="/list/new" className="text-sams hover:underline">
                Create one first
              </Link>
              .
            </p>
          ) : (
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Add to list</label>
              <select
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
                value={targetListId}
                onChange={e => setTargetListId(e.target.value)}
              >
                {activeLists.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({storeLabel(l.store)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-brand-border text-brand-muted rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving || activeLists.length === 0}
              className="flex-1 bg-sams text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-sams-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Adding…' : `Add ${checked.size} item${checked.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
interface DeleteDialogProps {
  recipeName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

function DeleteDialog({ recipeName, onConfirm, onClose }: DeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleConfirm() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onConfirm();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete recipe. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-brand-text">Delete recipe?</h2>
        <p className="text-brand-muted text-sm">
          Delete <span className="font-semibold text-brand-text">{recipeName}</span>? This cannot be undone.
        </p>
        {deleteError && (
          <p className="text-red-600 text-sm">{deleteError}</p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-brand-border text-brand-muted rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-bg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RecipeDetail({ state, updateList }: RecipeDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRecipe, getIngredients, updateRecipe, deleteRecipe } = useRecipes();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [markingMade, setMarkingMade] = useState(false);
  const [addedBanner, setAddedBanner] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadingPage(true);
    Promise.all([getRecipe(id), getIngredients(id)]).then(([r, ings]) => {
      if (cancelled) return;
      setRecipe(r);
      setIngredients(ings);
      setLoadingPage(false);
    }).catch(err => {
      if (cancelled) return;
      console.error('Failed to load recipe:', err);
      setLoadingPage(false);
    });
    return () => { cancelled = true; };
  }, [id, getRecipe, getIngredients]);

  async function handleToggleFavorite() {
    if (!recipe) return;
    const next = !recipe.isFavorite;
    // Optimistic update
    setRecipe(r => r ? { ...r, isFavorite: next } : r);
    try {
      const updated = await updateRecipe(recipe.id, {
        name: recipe.name,
        description: recipe.description,
        servings: recipe.servings,
        prepMinutes: recipe.prepMinutes,
        cookMinutes: recipe.cookMinutes,
        tags: recipe.tags,
        sourceUrl: recipe.sourceUrl,
        notes: recipe.notes,
        isFavorite: next,
        lastMadeDate: recipe.lastMadeDate,
      });
      setRecipe(updated);
    } catch (err) {
      console.error('Failed to update favorite:', err);
      // Revert on failure
      setRecipe(r => r ? { ...r, isFavorite: !next } : r);
    }
  }

  async function handleMarkMadeToday() {
    if (!recipe) return;
    setMarkingMade(true);
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
    try {
      const updated = await updateRecipe(recipe.id, {
        name: recipe.name,
        description: recipe.description,
        servings: recipe.servings,
        prepMinutes: recipe.prepMinutes,
        cookMinutes: recipe.cookMinutes,
        tags: recipe.tags,
        sourceUrl: recipe.sourceUrl,
        notes: recipe.notes,
        isFavorite: recipe.isFavorite,
        lastMadeDate: today,
      });
      setRecipe(updated);
    } finally {
      setMarkingMade(false);
    }
  }

  async function handleDelete() {
    if (!recipe) return;
    await deleteRecipe(recipe.id);
    navigate('/recipes');
  }

  async function handleAddToList(selectedIngredientIds: string[], targetListId: string) {
    const targetList = state.lists.find(l => l.id === targetListId);
    if (!targetList) throw new Error('List not found.');

    const mergedItems = [...targetList.items];

    selectedIngredientIds.forEach(ingId => {
      const ing = ingredients.find(i => i.id === ingId);
      if (!ing?.catalogItemId) return;

      const catalogItem = MASTER_CATALOG.find(c => c.id === ing.catalogItemId);
      if (!catalogItem) return;

      const quantityToAdd = ing.amount ?? 1;
      const existingIndex = mergedItems.findIndex(item => item.itemId === catalogItem.id);

      if (existingIndex >= 0) {
        const existingItem = mergedItems[existingIndex];
        const mergedNotes = ing.notes
          ? existingItem.notes
            ? existingItem.notes.includes(ing.notes)
              ? existingItem.notes
              : `${existingItem.notes}; ${ing.notes}`
            : ing.notes
          : existingItem.notes;

        mergedItems[existingIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + quantityToAdd,
          notes: mergedNotes,
        };
        return;
      }

      const item: ShoppingListItem = {
        id: generateId(),
        itemId: catalogItem.id,
        name: catalogItem.name,
        category: catalogItem.category,
        store: catalogItem.store,
        quantity: quantityToAdd,
        unit: ing.unit ?? catalogItem.unit,
        approxCost: catalogItem.approxCost,
        checked: false,
        notes: ing.notes,
      };

      mergedItems.push(item);
    });

    const updatedList: ShoppingList = {
      ...targetList,
      items: mergedItems,
    };

    await updateList(updatedList);
    setAddedBanner(true);
    setTimeout(() => setAddedBanner(false), 4000);
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loadingPage) {
    return (
      <div className="text-center py-20 text-brand-muted">
        <div className="text-4xl mb-3">🍳</div>
        <p>Loading recipe…</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-brand-text mb-2">Recipe not found</h2>
        <Link to="/recipes" className="text-sams hover:underline">← Back to Recipes</Link>
      </div>
    );
  }

  const prepTime = formatTime(recipe.prepMinutes);
  const cookTime = formatTime(recipe.cookMinutes);

  return (
    <div className="space-y-6 pb-10">
      {/* Success banner */}
      {addedBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-ht text-white px-6 py-3 rounded-xl shadow-lg text-sm font-semibold">
          ✓ Ingredients added to shopping list!
        </div>
      )}

      {/* Back link */}
      <Link to="/recipes" className="inline-flex items-center gap-1 text-sm text-brand-muted hover:text-sams transition-colors">
        ← Recipes
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
        {/* Name + favorite */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-brand-text leading-tight">{recipe.name}</h1>
          <button
            type="button"
            aria-label={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            onClick={handleToggleFavorite}
            className="text-2xl leading-none shrink-0 hover:scale-110 transition-transform"
          >
            {recipe.isFavorite ? '⭐' : '☆'}
          </button>
        </div>

        {/* Description */}
        {recipe.description && (
          <p className="text-brand-muted">{recipe.description}</p>
        )}

        {/* Badges */}
        {(prepTime || cookTime || recipe.servings) && (
          <div className="flex flex-wrap gap-2">
            {prepTime && (
              <span className="inline-flex items-center gap-1 bg-brand-bg border border-brand-border rounded-full px-3 py-1 text-xs font-medium text-brand-text">
                🕐 Prep: {prepTime}
              </span>
            )}
            {cookTime && (
              <span className="inline-flex items-center gap-1 bg-brand-bg border border-brand-border rounded-full px-3 py-1 text-xs font-medium text-brand-text">
                🍳 Cook: {cookTime}
              </span>
            )}
            {recipe.servings && (
              <span className="inline-flex items-center gap-1 bg-brand-bg border border-brand-border rounded-full px-3 py-1 text-xs font-medium text-brand-text">
                🍽️ Serves {recipe.servings}
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recipe.tags.map(tag => (
              <span
                key={tag}
                className="bg-sams-light text-sams text-xs font-medium px-2.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Last made + source URL */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-brand-muted">
          {recipe.lastMadeDate && (
            <span>Last made: {formatDate(recipe.lastMadeDate)}</span>
          )}
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sams hover:underline"
            >
              🔗 View source
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to={`/recipes/${recipe.id}/edit`}
            className="border border-brand-border text-brand-text text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-bg transition-colors"
          >
            ✏️ Edit
          </Link>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="border border-sams text-sams text-sm font-medium px-4 py-2 rounded-lg hover:bg-sams-light transition-colors"
          >
            🛒 Add to List
          </button>
          <button
            type="button"
            onClick={handleMarkMadeToday}
            disabled={markingMade}
            className="border border-brand-border text-brand-text text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-bg transition-colors disabled:opacity-50"
          >
            {markingMade ? 'Saving…' : '✅ Mark as Made Today'}
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="border border-red-200 text-red-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors ml-auto"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Ingredients */}
      <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-brand-text">Ingredients</h2>
          {ingredients.some(i => i.catalogItemId) && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="bg-sams text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-sams-dark transition-colors"
            >
              🛒 Add to Shopping List
            </button>
          )}
        </div>

        {ingredients.length === 0 ? (
          <p className="text-brand-muted text-sm">No ingredients listed.</p>
        ) : (
          <ul className="divide-y divide-brand-border">
            {ingredients.map(ing => {
              const catalogItem = ing.catalogItemId
                ? MASTER_CATALOG.find(c => c.id === ing.catalogItemId)
                : null;
              return (
                <li key={ing.id} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-text">{ingredientLabel(ing)}</p>
                    {ing.notes && (
                      <p className="text-xs text-brand-muted mt-0.5">{ing.notes}</p>
                    )}
                    {catalogItem && (
                      <p className="text-xs text-sams mt-0.5">🔗 {catalogItem.name}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Notes */}
      {recipe.notes && (
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-text">Notes</h2>
            <Link
              to={`/recipes/${recipe.id}/edit`}
              className="text-xs text-brand-muted hover:text-sams transition-colors"
            >
              ✏️ Edit
            </Link>
          </div>
          <p className="text-sm text-brand-text whitespace-pre-wrap leading-relaxed">{recipe.notes}</p>
        </div>
      )}

      {/* Modals */}
      {showDeleteDialog && (
        <DeleteDialog
          recipeName={recipe.name}
          onConfirm={handleDelete}
          onClose={() => setShowDeleteDialog(false)}
        />
      )}
      {showAddModal && (
        <AddToListModal
          ingredients={ingredients}
          lists={state.lists}
          onConfirm={handleAddToList}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
