import { useState, useEffect, useRef, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { Recipe } from '../types';

type Client = ReturnType<typeof generateClient<Schema>>;

function mapRecipe(r: Schema['Recipe']['type']): Recipe {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    servings: r.servings ?? undefined,
    prepMinutes: r.prepMinutes ?? undefined,
    cookMinutes: r.cookMinutes ?? undefined,
    tags: (r.tags?.filter(Boolean) as string[]) ?? [],
    sourceUrl: r.sourceUrl ?? undefined,
    notes: r.notes ?? undefined,
    isFavorite: r.isFavorite ?? false,
    lastMadeDate: r.lastMadeDate ?? undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export function useRecipes() {
  const clientRef = useRef<Client | null>(null);
  function getClient(): Client {
    if (!clientRef.current) {
      clientRef.current = generateClient<Schema>({ authMode: 'apiKey' });
    }
    return clientRef.current;
  }

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const client = getClient();
      const { data: rawRecipes } = await client.models.Recipe.list();
      setRecipes(
        rawRecipes
          .map(mapRecipe)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      );
    } catch (err) {
      console.error('Failed to load recipes from DynamoDB:', err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  async function toggleFavorite(id: string) {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;
    const next = !recipe.isFavorite;
    // Optimistic update
    setRecipes(prev => prev.map(r => (r.id === id ? { ...r, isFavorite: next } : r)));
    try {
      const client = getClient();
      await client.models.Recipe.update({ id, isFavorite: next });
    } catch (err) {
      console.error('Failed to update favorite:', err);
      // Revert on failure
      setRecipes(prev => prev.map(r => (r.id === id ? { ...r, isFavorite: !next } : r)));
    }
  }

  return { recipes, loading, toggleFavorite };
}
