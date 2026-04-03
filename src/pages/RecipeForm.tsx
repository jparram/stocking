import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecipes } from '../hooks/useRecipes';
import type { RecipeIngredient } from '../types';
import { MASTER_CATALOG } from '../data/masterCatalog';

// ─── Local draft type for ingredient rows ────────────────────────────────────
interface IngredientDraft {
  /** Stable key for React reconciliation — persisted id or generated uuid */
  draftKey: string;
  /** Undefined = new, not yet persisted */
  id?: string;
  name: string;
  amount: string;
  unit: string;
  catalogItemId: string;
  notes: string;
}

function emptyIngredient(): IngredientDraft {
  return { draftKey: crypto.randomUUID(), name: '', amount: '', unit: '', catalogItemId: '', notes: '' };
}

function ingredientFromPersisted(i: RecipeIngredient): IngredientDraft {
  return {
    draftKey: i.id,
    id: i.id,
    name: i.name,
    amount: i.amount != null ? String(i.amount) : '',
    unit: i.unit ?? '',
    catalogItemId: i.catalogItemId ?? '',
    notes: i.notes ?? '',
  };
}

// ─── Catalog typeahead ────────────────────────────────────────────────────────
interface CatalogTypeaheadProps {
  value: string;
  selectedId: string;
  onChange: (name: string, catalogItemId: string) => void;
}

function CatalogTypeahead({ value, selectedId, onChange }: CatalogTypeaheadProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync when parent value changes (e.g. on load)
  useEffect(() => { setQuery(value); }, [value]);

  const suggestions = query.trim().length > 0
    ? MASTER_CATALOG.filter(i =>
        i.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSelect = (id: string, name: string) => {
    setQuery(name);
    setOpen(false);
    onChange(name, id);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    // Manual edits invalidate any previous catalog selection
    onChange(v, '');
  };

  const handleBlur = () => {
    // Slight delay so click on dropdown registers first
    setTimeout(() => setOpen(false), 150);
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => query.trim().length > 0 && setOpen(true)}
        onBlur={handleBlur}
        placeholder="Search catalog…"
        className="w-full border border-brand-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
      />
      {selectedId && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-sams font-medium pointer-events-none">
          🔗
        </span>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-brand-border rounded shadow-md max-h-48 overflow-y-auto">
          {suggestions.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onMouseDown={() => handleSelect(item.id, item.name)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-brand-bg"
              >
                <span className="font-medium">{item.name}</span>
                <span className="ml-2 text-xs text-brand-muted">{item.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Ingredient row ───────────────────────────────────────────────────────────
interface IngredientRowProps {
  ingredient: IngredientDraft;
  index: number;
  total: number;
  onChange: (index: number, field: keyof IngredientDraft, value: string) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
}

function IngredientRow({ ingredient, index, total, onChange, onRemove, onMove }: IngredientRowProps) {
  return (
    <div className="bg-white border border-brand-border rounded-lg p-3 space-y-2">
      {/* Row controls */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-brand-muted font-medium">Ingredient {index + 1}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(index, 'up')}
            disabled={index === 0}
            className="p-1 text-brand-muted hover:text-brand-text disabled:opacity-30"
            title="Move up"
            aria-label="Move ingredient up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 'down')}
            disabled={index === total - 1}
            className="p-1 text-brand-muted hover:text-brand-text disabled:opacity-30"
            title="Move down"
            aria-label="Move ingredient down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1 text-red-400 hover:text-red-600"
            title="Remove ingredient"
            aria-label="Remove ingredient"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Amount + Unit + Name */}
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-2">
          <label className="block text-xs text-brand-muted mb-1">Amount</label>
          <input
            type="number"
            min="0"
            step="any"
            value={ingredient.amount}
            onChange={e => onChange(index, 'amount', e.target.value)}
            className="w-full border border-brand-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
            placeholder="2"
          />
        </div>
        <div className="col-span-3">
          <label className="block text-xs text-brand-muted mb-1">Unit</label>
          <input
            type="text"
            value={ingredient.unit}
            onChange={e => onChange(index, 'unit', e.target.value)}
            className="w-full border border-brand-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
            placeholder="lbs"
          />
        </div>
        <div className="col-span-7">
          <label className="block text-xs text-brand-muted mb-1">Name *</label>
          <input
            type="text"
            value={ingredient.name}
            onChange={e => onChange(index, 'name', e.target.value)}
            className="w-full border border-brand-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
            placeholder="Chicken breast"
            required
          />
        </div>
      </div>

      {/* Catalog link + Notes */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-brand-muted mb-1">Catalog Link (optional)</label>
          <CatalogTypeahead
            value={
              ingredient.catalogItemId
                ? (MASTER_CATALOG.find(i => i.id === ingredient.catalogItemId)?.name ?? ingredient.name)
                : ingredient.name
            }
            selectedId={ingredient.catalogItemId}
            onChange={(name, id) => {
              onChange(index, 'catalogItemId', id);
              if (name) {
                onChange(index, 'name', name);
              }
            }}
          />
        </div>
        <div>
          <label className="block text-xs text-brand-muted mb-1">Notes</label>
          <input
            type="text"
            value={ingredient.notes}
            onChange={e => onChange(index, 'notes', e.target.value)}
            className="w-full border border-brand-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
            placeholder="sliced thin"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Tag input ────────────────────────────────────────────────────────────────
interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const tag = input.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-sams-light text-sams text-sm px-2.5 py-1 rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-sams hover:text-sams-dark leading-none"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          className="flex-1 border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
          placeholder="Type a tag and press Enter…"
        />
        <button
          type="button"
          onClick={addTag}
          className="px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-sm hover:bg-brand-border transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────
export default function RecipeForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const {
    getRecipe,
    getIngredients,
    createRecipe,
    updateRecipe,
    createIngredient,
    updateIngredient,
    deleteIngredient,
  } = useRecipes();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('');
  const [prepMinutes, setPrepMinutes] = useState('');
  const [cookMinutes, setCookMinutes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([emptyIngredient()]);

  const [loadingData, setLoadingData] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');

  // ── Load existing recipe for edit ───────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;

    (async () => {
      setLoadingData(true);
      try {
        const [recipe, existingIngredients] = await Promise.all([
          getRecipe(id),
          getIngredients(id),
        ]);
        if (cancelled) return;
        if (!recipe) {
          navigate('/recipes');
          return;
        }
        setName(recipe.name);
        setDescription(recipe.description ?? '');
        setServings(recipe.servings != null ? String(recipe.servings) : '');
        setPrepMinutes(recipe.prepMinutes != null ? String(recipe.prepMinutes) : '');
        setCookMinutes(recipe.cookMinutes != null ? String(recipe.cookMinutes) : '');
        setTags(recipe.tags ?? []);
        setSourceUrl(recipe.sourceUrl ?? '');
        setNotes(recipe.notes ?? '');
        setIsFavorite(recipe.isFavorite ?? false);
        setIngredients(
          existingIngredients.length > 0
            ? existingIngredients.map(ingredientFromPersisted)
            : [emptyIngredient()]
        );
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id, isEdit, getRecipe, getIngredients, navigate]);

  // ── Ingredient helpers ──────────────────────────────────────────────────────
  const handleIngredientChange = (index: number, field: keyof IngredientDraft, value: string) => {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing));
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, emptyIngredient()]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const moveIngredient = (index: number, direction: 'up' | 'down') => {
    setIngredients(prev => {
      const next = [...prev];
      const swapIdx = direction === 'up' ? index - 1 : index + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return next;
      [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
      return next;
    });
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Recipe name is required.';
    ingredients.forEach((ing, i) => {
      if (!ing.name.trim()) errs[`ingredient_${i}`] = 'Ingredient name is required.';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSaveError('');

    const recipeInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      servings: servings ? parseInt(servings, 10) : undefined,
      prepMinutes: prepMinutes ? parseInt(prepMinutes, 10) : undefined,
      cookMinutes: cookMinutes ? parseInt(cookMinutes, 10) : undefined,
      tags: tags.length > 0 ? tags : undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      isFavorite,
    };

    try {
      let recipeId: string;

      if (isEdit && id) {
        await updateRecipe(id, recipeInput);
        recipeId = id;

        // Determine which persisted ingredients were removed
        const currentPersistedIds = new Set(
          ingredients.filter(i => i.id).map(i => i.id as string)
        );
        const serverIngredients = await getIngredients(id);
        const removedIds = serverIngredients
          .filter(oi => !currentPersistedIds.has(oi.id))
          .map(oi => oi.id);

        await Promise.all(removedIds.map(rid => deleteIngredient(rid)));

        // Create or update current ingredient rows
        await Promise.all(
          ingredients.map((ing, sortOrder) => {
            const ingInput = {
              name: ing.name.trim(),
              amount: ing.amount ? parseFloat(ing.amount) : undefined,
              unit: ing.unit.trim() || undefined,
              catalogItemId: ing.catalogItemId || undefined,
              notes: ing.notes.trim() || undefined,
              sortOrder,
            };
            if (ing.id) {
              return updateIngredient(ing.id, ingInput);
            } else {
              return createIngredient(id, ingInput);
            }
          })
        );
      } else {
        const recipe = await createRecipe(recipeInput);
        recipeId = recipe.id;

        await Promise.all(
          ingredients
            .filter(ing => ing.name.trim())
            .map((ing, sortOrder) =>
              createIngredient(recipeId, {
                name: ing.name.trim(),
                amount: ing.amount ? parseFloat(ing.amount) : undefined,
                unit: ing.unit.trim() || undefined,
                catalogItemId: ing.catalogItemId || undefined,
                notes: ing.notes.trim() || undefined,
                sortOrder,
              })
            )
        );
      }

      navigate(`/recipes/${recipeId}`);
    } catch (err) {
      console.error('Failed to save recipe:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loadingData) {
    return (
      <div className="text-center py-16 text-brand-muted">
        <div className="text-4xl mb-3">🍳</div>
        <p>Loading recipe…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">
          {isEdit ? 'Edit Recipe' : 'New Recipe'}
        </h1>
        <button
          type="button"
          onClick={() => navigate(isEdit && id ? `/recipes/${id}` : '/recipes')}
          className="text-sm text-brand-muted hover:text-brand-text"
        >
          ← Cancel
        </button>
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {saveError}
        </div>
      )}

      {/* ── Recipe Info ─────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-brand-border p-4 space-y-4">
        <h2 className="font-semibold text-brand-text">Recipe Info</h2>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams ${errors.name ? 'border-red-400' : 'border-brand-border'}`}
            placeholder="e.g. Chicken Stir Fry"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams resize-none"
            placeholder="Brief description of the recipe…"
          />
        </div>

        {/* Servings / Prep / Cook */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">Servings</label>
            <input
              type="number"
              min="1"
              value={servings}
              onChange={e => setServings(e.target.value)}
              className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
              placeholder="4"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">Prep (min)</label>
            <input
              type="number"
              min="0"
              value={prepMinutes}
              onChange={e => setPrepMinutes(e.target.value)}
              className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
              placeholder="15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">Cook (min)</label>
            <input
              type="number"
              min="0"
              value={cookMinutes}
              onChange={e => setCookMinutes(e.target.value)}
              className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
              placeholder="30"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">Tags</label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        {/* Source URL */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">Source URL</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
            className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
            placeholder="https://…"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">Cook Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams resize-none"
            placeholder="Tips, substitutions, variations…"
          />
        </div>

        {/* Favorite */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isFavorite}
            onChange={e => setIsFavorite(e.target.checked)}
            className="w-4 h-4 accent-sams"
          />
          <span className="text-sm text-brand-text">Mark as favorite ⭐</span>
        </label>
      </section>

      {/* ── Ingredients ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-semibold text-brand-text">Ingredients</h2>

        {ingredients.map((ing, idx) => (
          <div key={ing.draftKey}>
            <IngredientRow
              ingredient={ing}
              index={idx}
              total={ingredients.length}
              onChange={handleIngredientChange}
              onRemove={removeIngredient}
              onMove={moveIngredient}
            />
            {errors[`ingredient_${idx}`] && (
              <p className="text-red-500 text-xs mt-1 ml-1">{errors[`ingredient_${idx}`]}</p>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addIngredient}
          className="w-full border-2 border-dashed border-brand-border rounded-lg py-2.5 text-sm text-brand-muted hover:border-sams hover:text-sams transition-colors"
        >
          + Add Ingredient
        </button>
      </section>

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pb-8">
        <button
          type="button"
          onClick={() => navigate(isEdit && id ? `/recipes/${id}` : '/recipes')}
          className="px-4 py-2.5 border border-brand-border rounded-lg text-sm font-medium hover:bg-brand-bg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-sams text-white py-2.5 rounded-lg font-semibold hover:bg-sams-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : isEdit ? '💾 Save Changes' : '💾 Create Recipe'}
        </button>
      </div>
    </form>
  );
}
