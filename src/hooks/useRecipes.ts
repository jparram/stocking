import { useState, useEffect, useRef, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { Recipe, RecipeIngredient } from '../types';

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

function mapIngredient(i: Schema['RecipeIngredient']['type']): RecipeIngredient {
  return {
    id: i.id,
    recipeId: i.recipeId,
    name: i.name,
    amount: i.amount ?? undefined,
    unit: i.unit ?? undefined,
    catalogItemId: i.catalogItemId ?? undefined,
    notes: i.notes ?? undefined,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

export interface RecipeInput {
  name: string;
  description?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  tags?: string[];
  sourceUrl?: string;
  notes?: string;
  isFavorite?: boolean;
}

export interface IngredientInput {
  name: string;
  amount?: number;
  unit?: string;
  catalogItemId?: string;
  notes?: string;
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

  async function getRecipe(id: string): Promise<Recipe | null> {
    try {
      const client = getClient();
      const { data } = await client.models.Recipe.get({ id });
      return data ? mapRecipe(data) : null;
    } catch (err) {
      console.error('Failed to get recipe:', err);
      return null;
    }
  }

  async function getIngredients(recipeId: string): Promise<RecipeIngredient[]> {
    try {
      const client = getClient();
      const { data } = await client.models.RecipeIngredient.list({
        filter: { recipeId: { eq: recipeId } },
      });
      return data.map(mapIngredient);
    } catch (err) {
      console.error('Failed to load ingredients:', err);
      return [];
    }
  }

  async function createRecipe(input: RecipeInput): Promise<Recipe> {
    const client = getClient();
    const { data, errors } = await client.models.Recipe.create({
      name: input.name,
      description: input.description,
      servings: input.servings,
      prepMinutes: input.prepMinutes,
      cookMinutes: input.cookMinutes,
      tags: input.tags,
      sourceUrl: input.sourceUrl,
      notes: input.notes,
      isFavorite: input.isFavorite ?? false,
    });
    if (errors?.length || !data) {
      throw new Error(errors?.map(e => e.message).join(', ') ?? 'Failed to create recipe');
    }
    const recipe = mapRecipe(data);
    setRecipes(prev => [recipe, ...prev]);
    return recipe;
  }

  async function updateRecipe(id: string, input: RecipeInput): Promise<Recipe> {
    const client = getClient();
    const { data, errors } = await client.models.Recipe.update({
      id,
      name: input.name,
      description: input.description,
      servings: input.servings,
      prepMinutes: input.prepMinutes,
      cookMinutes: input.cookMinutes,
      tags: input.tags,
      sourceUrl: input.sourceUrl,
      notes: input.notes,
      isFavorite: input.isFavorite ?? false,
    });
    if (errors?.length || !data) {
      throw new Error(errors?.map(e => e.message).join(', ') ?? 'Failed to update recipe');
    }
    const recipe = mapRecipe(data);
    setRecipes(prev => prev.map(r => (r.id === id ? recipe : r)));
    return recipe;
  }

  async function createIngredient(recipeId: string, input: IngredientInput): Promise<RecipeIngredient> {
    const client = getClient();
    const { data, errors } = await client.models.RecipeIngredient.create({
      recipeId,
      name: input.name,
      amount: input.amount,
      unit: input.unit,
      catalogItemId: input.catalogItemId,
      notes: input.notes,
    });
    if (errors?.length || !data) {
      throw new Error(errors?.map(e => e.message).join(', ') ?? 'Failed to create ingredient');
    }
    return mapIngredient(data);
  }

  async function updateIngredient(id: string, input: IngredientInput): Promise<RecipeIngredient> {
    const client = getClient();
    const { data, errors } = await client.models.RecipeIngredient.update({
      id,
      name: input.name,
      amount: input.amount,
      unit: input.unit,
      catalogItemId: input.catalogItemId,
      notes: input.notes,
    });
    if (errors?.length || !data) {
      throw new Error(errors?.map(e => e.message).join(', ') ?? 'Failed to update ingredient');
    }
    return mapIngredient(data);
  }

  async function deleteIngredient(id: string): Promise<void> {
    const client = getClient();
    const { errors } = await client.models.RecipeIngredient.delete({ id });
    if (errors?.length) {
      throw new Error(errors.map(e => e.message).join(', '));
    }
  }

  return {
    recipes,
    loading,
    toggleFavorite,
    getRecipe,
    getIngredients,
    createRecipe,
    updateRecipe,
    createIngredient,
    updateIngredient,
    deleteIngredient,
  };
}
