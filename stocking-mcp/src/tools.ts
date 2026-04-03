/**
 * Tool definitions and handler logic — shared between the stdio and Lambda transports.
 */

import type { CadenceEngine } from './cadence.js';
import type { GraphQLClient } from './graphql.js';
import type { CatalogItem } from './catalog.js';
import type { KrogerClient } from './kroger.js';

export const TOOL_DEFINITIONS = [
  {
    name: 'get_due_store',
    description:
      'Returns which store (sams or ht) is due for a shopping run this week '
      + 'based on the bi-weekly cadence. Also shows days since last run and '
      + 'days until next scheduled run for each store.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'ISO date to check (defaults to today)' },
      },
    },
  },
  {
    name: 'suggest_items',
    description:
      'Returns a cadence-based suggested item list for a given store. '
      + 'Items are ranked by urgency: overdue > due > approaching > routine. '
      + 'Use this before create_shopping_list to review what should be on the run.',
    inputSchema: {
      type: 'object',
      required: ['store'],
      properties: {
        store: { type: 'string', enum: ['sams', 'ht'] },
        include_routine: { type: 'boolean', description: 'Include not-yet-due items (default false)' },
        days_since_last_shop: { type: 'number', description: 'Override cadence estimate (optional)' },
      },
    },
  },
  {
    name: 'create_shopping_list',
    description:
      'Creates a new shopping list in the app and saves it to DynamoDB. '
      + 'Appears live in the Stocking app immediately. '
      + 'Use suggest_items first, then call this with confirmed items.',
    inputSchema: {
      type: 'object',
      required: ['store', 'items'],
      properties: {
        store: { type: 'string', enum: ['sams', 'ht', 'both'] },
        name:    { type: 'string', description: 'List name (auto-generated if omitted)' },
        week_of: { type: 'string', description: 'ISO Monday date for the shopping week (defaults to current week)' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['item_id', 'quantity'],
            properties: {
              item_id:  { type: 'string', description: 'ID from catalog (e.g. sc-001, ht-013)' },
              quantity: { type: 'number' },
              notes:    { type: 'string' },
            },
          },
        },
      },
    },
  },
  {
    name: 'get_shopping_lists',
    description: 'Returns recent shopping lists (most recent first) with status, store, item count, and total.',
    inputSchema: {
      type: 'object',
      properties: {
        limit:  { type: 'number', description: 'Number to return (default 5)' },
        store:  { type: 'string', enum: ['sams', 'ht', 'both'] },
        status: { type: 'string', enum: ['draft', 'active', 'complete'] },
      },
    },
  },
  {
    name: 'get_list_items',
    description: 'Returns all line items for a specific list, grouped by category.',
    inputSchema: {
      type: 'object',
      required: ['list_id'],
      properties: { list_id: { type: 'string' } },
    },
  },
  {
    name: 'update_list_item',
    description: 'Check or uncheck an item on an active list (use while shopping in-store).',
    inputSchema: {
      type: 'object',
      required: ['list_id', 'item_id', 'checked'],
      properties: {
        list_id: { type: 'string' },
        item_id: { type: 'string', description: 'ShoppingListItem ID from get_list_items' },
        checked: { type: 'boolean' },
        notes:   { type: 'string' },
      },
    },
  },
  {
    name: 'complete_list',
    description: 'Marks a list as complete and optionally records actual spend for history tracking.',
    inputSchema: {
      type: 'object',
      required: ['list_id'],
      properties: {
        list_id:      { type: 'string' },
        actual_spend: { type: 'number' },
      },
    },
  },
  {
    name: 'search_products',
    description:
      'Searches the Kroger/Harris Teeter product catalog for items by keyword. '
      + 'Returns product names, sizes, and approximate prices. '
      + 'Use this to discover HT products that are not yet in the master catalog.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'Product search term (e.g. "organic milk", "bread")' },
        limit: { type: 'number', description: 'Max results (default 10, max 50)' },
      },
    },
  },
  {
    name: 'list_recipes',
    description: 'Returns all recipes with summary info. Optionally filter by tag or favorites.',
    inputSchema: {
      type: 'object',
      properties: {
        limit:          { type: 'number',  description: 'Max results (default 20)' },
        tag:            { type: 'string',  description: 'Filter by tag' },
        favorites_only: { type: 'boolean', description: 'Return only favorited recipes' },
      },
    },
  },
  {
    name: 'get_recipe',
    description: 'Returns full recipe detail including all ingredients.',
    inputSchema: {
      type: 'object',
      required: ['recipe_id'],
      properties: {
        recipe_id: { type: 'string', description: 'Recipe ID' },
      },
    },
  },
  {
    name: 'create_recipe',
    description: 'Creates a new recipe with optional ingredients.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name:         { type: 'string' },
        description:  { type: 'string' },
        servings:     { type: 'number' },
        prepMinutes:  { type: 'number' },
        cookMinutes:  { type: 'number' },
        tags:         { type: 'array',  items: { type: 'string' } },
        sourceUrl:    { type: 'string' },
        notes:        { type: 'string' },
        isFavorite:   { type: 'boolean' },
        lastMadeDate: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name'],
            properties: {
              name:          { type: 'string' },
              amount:        { type: 'number' },
              unit:          { type: 'string' },
              catalogItemId: { type: 'string', description: 'Catalog item ID (e.g. ht-006)' },
              notes:         { type: 'string' },
            },
          },
        },
      },
    },
  },
  {
    name: 'update_recipe',
    description: 'Updates recipe metadata. Does not modify ingredients — use add_recipe_ingredient / delete_recipe_ingredient for that.',
    inputSchema: {
      type: 'object',
      required: ['recipe_id'],
      properties: {
        recipe_id:    { type: 'string' },
        name:         { type: 'string' },
        description:  { type: 'string' },
        servings:     { type: 'number' },
        prepMinutes:  { type: 'number' },
        cookMinutes:  { type: 'number' },
        tags:         { type: 'array', items: { type: 'string' } },
        sourceUrl:    { type: 'string' },
        notes:        { type: 'string' },
        isFavorite:   { type: 'boolean' },
        lastMadeDate: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'delete_recipe',
    description: 'Deletes a recipe and all its ingredients.',
    inputSchema: {
      type: 'object',
      required: ['recipe_id'],
      properties: {
        recipe_id: { type: 'string' },
      },
    },
  },
  {
    name: 'add_recipe_ingredient',
    description: 'Appends one or more ingredients to an existing recipe.',
    inputSchema: {
      type: 'object',
      required: ['recipe_id', 'ingredients'],
      properties: {
        recipe_id: { type: 'string' },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name'],
            properties: {
              name:          { type: 'string' },
              amount:        { type: 'number' },
              unit:          { type: 'string' },
              catalogItemId: { type: 'string' },
              notes:         { type: 'string' },
            },
          },
        },
      },
    },
  },
  {
    name: 'delete_recipe_ingredient',
    description: 'Removes a single ingredient from a recipe.',
    inputSchema: {
      type: 'object',
      required: ['ingredient_id'],
      properties: {
        recipe_id:     { type: 'string', description: 'Recipe ID (for context/confirmation)' },
        ingredient_id: { type: 'string', description: 'RecipeIngredient ID to delete' },
      },
    },
  },
  {
    name: 'add_recipe_to_shopping_list',
    description:
      'Pushes catalog-linked ingredients from a recipe onto an existing shopping list. '
      + 'Ingredients with a catalogItemId are resolved against the master catalog. '
      + 'Ingredients without a catalogItemId are added as custom items.',
    inputSchema: {
      type: 'object',
      required: ['recipe_id', 'list_id', 'store'],
      properties: {
        recipe_id:       { type: 'string' },
        list_id:         { type: 'string', description: 'Target shopping list ID' },
        store:           { type: 'string', enum: ['sams', 'ht', 'both'], description: 'Store (used for custom item defaults)' },
        ingredient_ids:  { type: 'array', items: { type: 'string' }, description: 'If omitted, all ingredients are added' },
      },
    },
  },
];

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  cadence: CadenceEngine,
  gql: GraphQLClient,
  catalog: CatalogItem[],
  kroger?: KrogerClient
): Promise<{ content: { type: string; text: string }[] }> {
  const text = await dispatch(name, args, cadence, gql, catalog, kroger);
  return { content: [{ type: 'text', text: JSON.stringify(text, null, 2) }] };
}

async function dispatch(
  name: string,
  args: Record<string, unknown>,
  cadence: CadenceEngine,
  gql: GraphQLClient,
  catalog: CatalogItem[],
  kroger?: KrogerClient
): Promise<unknown> {
  switch (name) {
    case 'get_due_store': {
      const date = args['date'] ? new Date(args['date'] as string) : new Date();
      return cadence.getDueStore(date);
    }

    case 'suggest_items': {
      const store    = args['store'] as 'sams' | 'ht';
      const routine  = (args['include_routine'] as boolean) ?? false;
      const override = args['days_since_last_shop'] as number | undefined;
      return cadence.suggestItems(store, routine, override);
    }

    case 'create_shopping_list': {
      const store   = args['store'] as string;
      const weekOf  = (args['week_of'] as string) ?? cadence.getMondayOf();
      const rawItems = args['items'] as Array<{
        item_id: string; quantity: number; notes?: string;
      }>;

      const resolvedItems = rawItems.map((ri) => {
        const cat = catalog.find((c) => c.id === ri.item_id);
        if (!cat) throw new Error(`Unknown item_id: ${ri.item_id}`);
        return {
          itemId: ri.item_id, name: cat.name, category: cat.category,
          store: cat.store, quantity: ri.quantity, unit: cat.unit,
          approxCost: cat.approxCost, checked: false,
          notes: ri.notes ?? cat.notes ?? '',
        };
      });

      const storeName =
        store === 'sams' ? "Sam's Club"
        : store === 'ht' ? 'Harris Teeter' : 'Both Stores';
      const listName =
        (args['name'] as string) ?? `Week of ${weekOf} — ${storeName}`;
      const totalEstimate = resolvedItems.reduce(
        (sum, i) => sum + i.approxCost * i.quantity, 0
      );

      const list = await gql.createShoppingList({
        name: listName, weekOf, store, status: 'active',
        totalSpend: totalEstimate, items: resolvedItems,
      });

      return {
        success: true, list_id: list.id, name: listName, store,
        week_of: weekOf, item_count: resolvedItems.length,
        estimated_total: `$${totalEstimate.toFixed(2)}`,
        message: 'List created and live in the Stocking app.',
      };
    }

    case 'get_shopping_lists':
      return gql.listShoppingLists(
        (args['limit'] as number) ?? 5,
        args['store']  as string | undefined,
        args['status'] as string | undefined
      );

    case 'get_list_items':
      return gql.getListItems(args['list_id'] as string);

    case 'update_list_item':
      return gql.updateListItem(
        args['list_id'] as string,
        args['item_id'] as string,
        args['checked'] as boolean,
        args['notes']   as string | undefined
      );

    case 'complete_list':
      return gql.completeList(
        args['list_id']       as string,
        args['actual_spend']  as number | undefined
      );

    case 'search_products': {
      if (!kroger) throw new Error('Kroger API not configured (missing KROGER_CLIENT_ID / KROGER_CLIENT_SECRET)');
      const products = await kroger.searchProducts(
        args['query'] as string,
        (args['limit'] as number | undefined) ?? 10
      );
      return products.map(p => ({
        productId: p.productId,
        name: p.description,
        brand: p.brand,
        categories: p.categories,
        size: p.items?.[0]?.size,
        price: p.items?.[0]?.price?.regular,
        promoPrice: p.items?.[0]?.price?.promo,
      }));
    }

    case 'list_recipes':
      return gql.listRecipes(
        (args['limit'] as number) ?? 20,
        args['tag']            as string | undefined,
        args['favorites_only'] as boolean | undefined
      );

    case 'get_recipe':
      return gql.getRecipe(args['recipe_id'] as string);

    case 'create_recipe': {
      const recipeInput = {
        name:         args['name']         as string,
        description:  args['description']  as string | undefined,
        servings:     args['servings']     as number | undefined,
        prepMinutes:  args['prepMinutes']  as number | undefined,
        cookMinutes:  args['cookMinutes']  as number | undefined,
        tags:         args['tags']         as string[] | undefined,
        sourceUrl:    args['sourceUrl']    as string | undefined,
        notes:        args['notes']        as string | undefined,
        isFavorite:   args['isFavorite']   as boolean | undefined,
        lastMadeDate: args['lastMadeDate'] as string | undefined,
      };
      const ingredients = (args['ingredients'] as Array<{
        name: string; amount?: number; unit?: string; catalogItemId?: string; notes?: string;
      }> | undefined) ?? [];

      const recipe = await gql.createRecipe(recipeInput, ingredients);
      return {
        success: true,
        recipe_id: recipe.id,
        name: recipeInput.name,
        ingredient_count: ingredients.length,
      };
    }

    case 'update_recipe': {
      const recipeId = args['recipe_id'] as string;
      const updates = {
        name:         args['name']         as string | undefined,
        description:  args['description']  as string | undefined,
        servings:     args['servings']     as number | undefined,
        prepMinutes:  args['prepMinutes']  as number | undefined,
        cookMinutes:  args['cookMinutes']  as number | undefined,
        tags:         args['tags']         as string[] | undefined,
        sourceUrl:    args['sourceUrl']    as string | undefined,
        notes:        args['notes']        as string | undefined,
        isFavorite:   args['isFavorite']   as boolean | undefined,
        lastMadeDate: args['lastMadeDate'] as string | undefined,
      };
      return gql.updateRecipe(recipeId, updates);
    }

    case 'delete_recipe': {
      const recipeId = args['recipe_id'] as string;
      const result = await gql.deleteRecipe(recipeId);
      return {
        success: true,
        recipe_id: recipeId,
        deleted_ingredient_count: result.deletedIngredientCount,
      };
    }

    case 'add_recipe_ingredient': {
      const recipeId = args['recipe_id'] as string;
      const ingredients = args['ingredients'] as Array<{
        name: string; amount?: number; unit?: string; catalogItemId?: string; notes?: string;
      }>;
      const added: { id: string; name: string }[] = [];
      for (let i = 0; i < ingredients.length; i++) {
        const result = await gql.createRecipeIngredient(recipeId, { ...ingredients[i], sortOrder: i });
        added.push(result);
      }
      return { success: true, recipe_id: recipeId, added };
    }

    case 'delete_recipe_ingredient': {
      const ingredientId = args['ingredient_id'] as string;
      await gql.deleteRecipeIngredient(ingredientId);
      return { success: true, deleted_ingredient_id: ingredientId };
    }

    case 'add_recipe_to_shopping_list': {
      const recipeId      = args['recipe_id']      as string;
      const listId        = args['list_id']        as string;
      const store         = args['store']          as string;
      const ingredientIds = args['ingredient_ids'] as string[] | undefined;

      const recipeData = await gql.getRecipe(recipeId) as {
        name: string;
        ingredients: Array<{
          id: string; name: string; amount?: number; unit?: string;
          catalogItemId?: string; notes?: string;
        }>;
      };

      let ingredients = recipeData.ingredients;
      if (ingredientIds && ingredientIds.length > 0) {
        ingredients = ingredients.filter((ing) => ingredientIds.includes(ing.id));
      }

      const added:          { name: string; catalog_id: string }[] = [];
      const addedAsCustom:  { name: string }[]                     = [];
      const skipped:        { name: string; reason: string }[]     = [];

      for (const ing of ingredients) {
        if (ing.catalogItemId) {
          const cat = catalog.find((c) => c.id === ing.catalogItemId);
          if (cat) {
            await gql.addShoppingListItem(listId, {
              itemId:     cat.id,
              name:       cat.name,
              category:   cat.category,
              store:      cat.store,
              quantity:   ing.amount ?? 1,
              unit:       ing.unit ?? cat.unit,
              approxCost: cat.approxCost,
              checked:    false,
              notes:      ing.notes ?? '',
            });
            added.push({ name: cat.name, catalog_id: cat.id });
          } else {
            skipped.push({ name: ing.name, reason: `catalogItemId ${ing.catalogItemId} not found in catalog` });
          }
        } else {
          await gql.addShoppingListItem(listId, {
            itemId:     `custom-${ing.name.toLowerCase().replace(/\s+/g, '-')}`,
            name:       ing.name,
            category:   'Custom',
            store,
            quantity:   ing.amount ?? 1,
            unit:       ing.unit ?? 'each',
            approxCost: 0,
            checked:    false,
            notes:      ing.notes ?? '',
          });
          addedAsCustom.push({ name: ing.name });
        }
      }

      return {
        success: true,
        list_id: listId,
        recipe_name: recipeData.name,
        added,
        added_as_custom: addedAsCustom,
        skipped,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
