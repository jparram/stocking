import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRecipes } from '../hooks/useRecipes';
import type { Recipe } from '../types';
import { formatDate } from '../utils';

function TimeDisplay({ prepMinutes, cookMinutes }: { prepMinutes?: number; cookMinutes?: number }) {
  if (!prepMinutes && !cookMinutes) return null;
  const parts: string[] = [];
  if (prepMinutes) parts.push(`${prepMinutes} min prep`);
  if (cookMinutes) parts.push(`${cookMinutes} min cook`);
  return <span className="text-xs text-brand-muted">{parts.join(' · ')}</span>;
}

interface RecipeCardProps {
  recipe: Recipe;
  onToggleFavorite: (id: string) => void;
}

function RecipeCard({ recipe, onToggleFavorite }: RecipeCardProps) {
  const navigate = useNavigate();
  const visibleTags = recipe.tags?.slice(0, 3) ?? [];
  const extraTags = (recipe.tags?.length ?? 0) - visibleTags.length;

  return (
    <div
      className="bg-white rounded-xl border border-brand-border p-4 shadow-sm hover:border-sams transition-colors cursor-pointer relative"
      onClick={() => navigate(`/recipes/${recipe.id}`)}
    >
      {/* Favorite toggle */}
      <button
        className="absolute top-3 right-3 text-xl leading-none"
        title={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        onClick={e => {
          e.stopPropagation();
          onToggleFavorite(recipe.id);
        }}
      >
        {recipe.isFavorite ? '⭐' : '☆'}
      </button>

      {/* Name */}
      <h3 className="font-semibold text-brand-text pr-8 mb-1">{recipe.name}</h3>

      {/* Description */}
      {recipe.description && (
        <p className="text-sm text-brand-muted line-clamp-2 mb-2">{recipe.description}</p>
      )}

      {/* Time */}
      <div className="mb-2">
        <TimeDisplay prepMinutes={recipe.prepMinutes} cookMinutes={recipe.cookMinutes} />
      </div>

      {/* Tags */}
      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {visibleTags.map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-sams-light text-sams text-xs rounded-full font-medium"
            >
              {tag}
            </span>
          ))}
          {extraTags > 0 && (
            <span className="px-2 py-0.5 bg-brand-bg text-brand-muted text-xs rounded-full">
              +{extraTags} more
            </span>
          )}
        </div>
      )}

      {/* Last made */}
      {recipe.lastMadeDate && (
        <p className="text-xs text-brand-muted">Last made: {formatDate(recipe.lastMadeDate)}</p>
      )}
    </div>
  );
}

export default function RecipeList() {
  const { recipes, loading, toggleFavorite } = useRecipes();
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    recipes.forEach(r => r.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [recipes]);

  // Filtered recipes
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return recipes.filter(r => {
      if (favoritesOnly && !r.isFavorite) return false;
      if (activeTag && !r.tags?.includes(activeTag)) return false;
      if (q) {
        const nameMatch = r.name.toLowerCase().includes(q);
        const tagMatch = r.tags?.some(t => t.toLowerCase().includes(q)) ?? false;
        if (!nameMatch && !tagMatch) return false;
      }
      return true;
    });
  }, [recipes, search, activeTag, favoritesOnly]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Recipes</h1>
        <Link
          to="/recipes/new"
          className="bg-sams text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-sams-dark transition-colors"
        >
          + New Recipe
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted">🔍</span>
        <input
          type="text"
          placeholder="Search by name or tag…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sams focus:border-transparent"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Favorites toggle */}
        <button
          onClick={() => setFavoritesOnly(f => !f)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            favoritesOnly
              ? 'bg-sams text-white'
              : 'bg-white border border-brand-border text-brand-muted hover:text-brand-text'
          }`}
        >
          ⭐ Favorites
        </button>

        {/* Tag chips */}
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTag === tag
                ? 'bg-sams text-white'
                : 'bg-white border border-brand-border text-brand-muted hover:text-brand-text'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-brand-muted">
          <div className="text-4xl mb-3">🍳</div>
          <p>Loading recipes…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && recipes.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📖</div>
          <h2 className="text-xl font-semibold text-brand-text mb-2">No recipes yet</h2>
          <p className="text-brand-muted mb-6">Add your first one to get started!</p>
          <Link
            to="/recipes/new"
            className="bg-sams text-white px-6 py-3 rounded-lg font-semibold hover:bg-sams-dark transition-colors"
          >
            + New Recipe
          </Link>
        </div>
      )}

      {/* No results state */}
      {!loading && recipes.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-brand-muted">
          <div className="text-4xl mb-3">🔍</div>
          <p>No recipes match your filters.</p>
          <button
          onClick={() => { setSearch(''); setActiveTag(null); setFavoritesOnly(false); }}
            className="text-sams hover:underline text-sm mt-2"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Recipe grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} onToggleFavorite={toggleFavorite} />
          ))}
        </div>
      )}
    </div>
  );
}
