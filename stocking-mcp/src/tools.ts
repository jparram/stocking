/**
 * Tool definitions and handler logic — shared between the stdio and Lambda transports.
 */

import type { CadenceEngine } from './cadence.js';
import type { GraphQLClient } from './graphql.js';
import type { CatalogItem } from './catalog.js';
import type { KrogerClient } from './kroger.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InstacartLineItem {
  name: string;
  status: 'Delivered' | 'Refund' | 'Partial Refund';
  quantity?: number;
  price_paid?: number;
  store?: string;
}

interface ListItem {
  id: string;
  name: string;
  checked: boolean;
  notes?: string;
}

function namesMatch(listName: string, instacartName: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const listWords = normalize(listName);
  const instWords = normalize(instacartName);
  if (instacartName.toLowerCase().includes(listName.toLowerCase())) return true;
  if (listName.toLowerCase().includes(instacartName.toLowerCase())) return true;
  const significant = listWords.filter((w) => w.length >= 4);
  return significant.some((w) => instWords.includes(w));
}

// ── Shared item resolution ────────────────────────────────────────────────────

function resolveItem(
  ri: { item_id: string; name?: string; quantity: number; notes?: string },
  catalog: CatalogItem[],
  defaultStore: string
) {
  const isCustomId = ri.item_id === 'custom';
  const cat = isCustomId ? undefined : catalog.find((c) => c.id === ri.item_id);

  if (!cat) {
    const displayName = ri.name?.trim();
    if (!displayName) {
      throw new Error(
        `Unknown item_id "${ri.item_id}" and no name provided. `
        + `Either use a valid catalog ID or pass item_id="custom" with a name.`
      );
    }
    return {
      itemId:     `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name:       displayName,
      category:   'Custom',
      store:      defaultStore === 'both' ? 'both' : defaultStore,
      quantity:   ri.quantity,
      unit:       '',
      approxCost: 0,
      checked:    false,
      notes:      ri.notes ?? '',
    };
  }

  return {
    itemId:     ri.item_id,
    name:       ri.name?.trim() || cat.name,
    category:   cat.category,
    store:      cat.store,
    quantity:   ri.quantity,
    unit:       cat.unit,
    approxCost: cat.approxCost,
    checked:    false,
    notes:      ri.notes ?? cat.notes ?? '',
  };
}

// ── Tool definitions ──────────────────────────────────────────────────────────

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
      + 'Use suggest_items first, then call this with confirmed items. '
      + 'Items can be catalog items (using item_id) or custom one-off items '
      + '(using item_id="custom" and providing a name).',
    inputSchema: {
      type: 'object',
      required: ['store', 'items'],
      properties: {
        store:   { type: 'string', enum: ['sams', 'ht', 'both'] },
        name:    { type: 'string', description: 'List name (auto-generated if omitted)' },
        week_of: { type: 'string', description: 'ISO Monday date for the shopping week (defaults to current week)' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['item_id', 'quantity'],
            properties: {
              item_id:  { type: 'string', description: 'Catalog ID or "custom" for off-catalog items.' },
              name:     { type: 'string', description: 'Display name. Required when item_id is "custom".' },
              quantity: { type: 'number' },
              notes:    { type: 'string' },
            },
          },
        },
      },
    },
  },
  {
    name: 'add_list_item',
    description:
      'Appends one or more items to an existing shopping list. '
      + 'Use this to add forgotten or ad-hoc items rather than creating a new list. '
      + 'Accepts the same item format as create_shopping_list.',
    inputSchema: {
      type: 'object',
      required: ['list_id', 'store', 'items'],
      properties: {
        list_id: { type: 'string', description: 'ID of the existing shopping list' },
        store:   { type: 'string', enum: ['sams', 'ht', 'both'], description: 'Store context for custom item defaults' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['item_id', 'quantity'],
            properties: {
              item_id:  { type: 'string', description: 'Catalog ID or "custom" for off-catalog items.' },
              name:     { type: 'string', description: 'Display name. Required when item_id is "custom".' },
              quantity: { type: 'number' },
              notes:    { type: 'string' },
            },
          },
        },
      },
    },
  },
  {
    name: 'delete_list_item',
    description:
      'Removes a single item from a shopping list by its ShoppingListItem ID. '
      + 'Use get_list_items first to find the item ID. '
      + 'Useful for correcting mistakes after add_list_item or create_shopping_list.',
    inputSchema: {
      type: 'object',
      required: ['list_id', 'item_id'],
      properties: {
        list_id: { type: 'string', description: 'The list the item belongs to (for confirmation context)' },
        item_id: { type: 'string', description: 'ShoppingListItem ID to delete (from get_list_items)' },
      },
    },
  },
  {
    name: 'spend_summary',
    description:
      'Summarises actual grocery spend across completed lists within a date range. '
      + 'Returns total spend, per-store breakdown (sams / ht), number of runs, '
      + 'average spend per run, weekly and monthly averages, and — if an '
      + 'annual_target is provided — pace tracking showing projected annual spend '
      + 'vs target and whether you are over or under budget. '
      + 'Defaults to the current calendar year if no dates are supplied.',
    inputSchema: {
      type: 'object',
      properties: {
        from:          { type: 'string', description: 'ISO date start of range (inclusive). Defaults to Jan 1 of current year.' },
        to:            { type: 'string', description: 'ISO date end of range (inclusive). Defaults to today.' },
        store:         { type: 'string', enum: ['sams', 'ht'], description: 'Filter to a single store (omit for both).' },
        annual_target: { type: 'number', description: 'Optional annual grocery budget target in dollars for pace tracking.' },
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
    name: 'reconcile_list',
    description:
      'Reconciles a shopping list against actual Instacart order data. '
      + 'Accepts the list ID, the actual amount paid, and an array of Instacart '
      + 'line items (name, status, quantity, price_paid). '
      + 'Automatically matches list items to Instacart items by name, corrects '
      + 'check states (delivered → checked, refunded → unchecked), updates the '
      + 'actual spend, and returns a full diff.',
    inputSchema: {
      type: 'object',
      required: ['list_id', 'actual_spend', 'instacart_items'],
      properties: {
        list_id:      { type: 'string' },
        actual_spend: { type: 'number' },
        instacart_items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'status'],
            properties: {
              name:       { type: 'string' },
              status:     { type: 'string', enum: ['Delivered', 'Refund', 'Partial Refund'] },
              quantity:   { type: 'number' },
              price_paid: { type: 'number' },
              store:      { type: 'string' },
            },
          },
        },
      },
    },
  },
  {
    name: 'search_products',
    description:
      'Searches the Kroger/Harris Teeter product catalog for items by keyword. '
      + 'Returns product names, sizes, and approximate prices.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'Product search term' },
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

// ── Handler ───────────────────────────────────────────────────────────────────

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
      const store    = args['store'] as string;
      const weekOf   = (args['week_of'] as string) ?? cadence.getMondayOf();
      const rawItems = args['items'] as Array<{
        item_id: string; name?: string; quantity: number; notes?: string;
      }>;
      const resolvedItems = rawItems.map((ri) => resolveItem(ri, catalog, store));
      const storeName =
        store === 'sams' ? "Sam's Club" : store === 'ht' ? 'Harris Teeter' : 'Both Stores';
      const listName = (args['name'] as string) ?? `Week of ${weekOf} — ${storeName}`;
      const totalEstimate = resolvedItems.reduce((sum, i) => sum + i.approxCost * i.quantity, 0);
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

    case 'add_list_item': {
      const listId   = args['list_id'] as string;
      const store    = args['store'] as string;
      const rawItems = args['items'] as Array<{
        item_id: string; name?: string; quantity: number; notes?: string;
      }>;
      const resolvedItems = rawItems.map((ri) => resolveItem(ri, catalog, store));
      const added: { id: string; name: string }[] = [];
      for (const item of resolvedItems) {
        const result = await gql.addItemToList(listId, item);
        added.push({ id: result.id, name: item.name });
      }
      return {
        success: true, list_id: listId,
        items_added: added.length, added,
        message: `${added.length} item(s) added to list.`,
      };
    }

    case 'delete_list_item': {
      const itemId = args['item_id'] as string;
      const listId = args['list_id'] as string;
      const result = await gql.deleteListItem(itemId);
      return {
        success: true,
        list_id: listId,
        deleted_item_id: result.id,
        message: `Item ${result.id} removed from list.`,
      };
    }

    case 'spend_summary': {
      const now    = new Date();
      const fromStr = (args['from'] as string | undefined) ?? `${now.getFullYear()}-01-01`;
      const toStr   = (args['to']   as string | undefined) ?? now.toISOString().slice(0, 10);
      const storeFilter    = args['store'] as string | undefined;
      const annualTarget   = args['annual_target'] as number | undefined;

      const fromDate = new Date(fromStr);
      const toDate   = new Date(toStr);
      toDate.setHours(23, 59, 59, 999);

      const allLists = await gql.listAllCompletedLists();

      // Filter to date range and optional store
      const filtered = allLists.filter((l) => {
        const d = new Date(l.createdAt);
        return d >= fromDate && d <= toDate
          && (!storeFilter || l.store === storeFilter);
      });

      if (filtered.length === 0) {
        return {
          from: fromStr, to: toStr, store: storeFilter ?? 'all',
          total_spend: 0, runs: 0,
          message: 'No completed lists found in this date range.',
        };
      }

      // Totals
      const totalSpend = filtered.reduce((s, l) => s + (l.totalSpend ?? 0), 0);
      const samSpend   = filtered.filter((l) => l.store === 'sams').reduce((s, l) => s + (l.totalSpend ?? 0), 0);
      const htSpend    = filtered.filter((l) => l.store === 'ht').reduce((s, l) => s + (l.totalSpend ?? 0), 0);
      const samRuns    = filtered.filter((l) => l.store === 'sams').length;
      const htRuns     = filtered.filter((l) => l.store === 'ht').length;

      // Averages
      const rangeDays  = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000));
      const rangeWeeks = rangeDays / 7;
      const avgPerRun  = totalSpend / filtered.length;
      const avgWeekly  = totalSpend / rangeWeeks;
      const avgMonthly = avgWeekly * 4.33;

      // Pace vs annual target
      let pace: Record<string, unknown> | undefined;
      if (annualTarget !== undefined) {
        const yearStart    = new Date(`${now.getFullYear()}-01-01`);
        const daysElapsed  = Math.max(1, Math.round((now.getTime() - yearStart.getTime()) / 86400000));
        const daysInYear   = 365;
        const paceAnnual   = (totalSpend / daysElapsed) * daysInYear;
        const onTrack      = paceAnnual <= annualTarget;
        const delta        = annualTarget - paceAnnual;
        pace = {
          annual_target:    annualTarget,
          projected_annual: Math.round(paceAnnual * 100) / 100,
          delta:            Math.round(delta * 100) / 100,
          status:           onTrack ? 'on track ✅' : 'over budget ⚠️',
          days_elapsed:     daysElapsed,
        };
      }

      // Per-list breakdown (sorted by date)
      const runs = filtered
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((l) => ({
          date:  l.createdAt.slice(0, 10),
          store: l.store,
          name:  l.name,
          spend: l.totalSpend,
        }));

      return {
        from: fromStr,
        to:   toStr,
        store: storeFilter ?? 'all',
        total_spend:  Math.round(totalSpend  * 100) / 100,
        by_store: {
          sams: { spend: Math.round(samSpend * 100) / 100, runs: samRuns },
          ht:   { spend: Math.round(htSpend  * 100) / 100, runs: htRuns  },
        },
        runs_total:   filtered.length,
        avg_per_run:  Math.round(avgPerRun  * 100) / 100,
        avg_weekly:   Math.round(avgWeekly  * 100) / 100,
        avg_monthly:  Math.round(avgMonthly * 100) / 100,
        ...(pace ? { pace } : {}),
        runs,
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
        args['list_id']      as string,
        args['actual_spend'] as number | undefined
      );

    case 'reconcile_list': {
      const listId         = args['list_id'] as string;
      const actualSpend    = args['actual_spend'] as number;
      const instacartItems = args['instacart_items'] as InstacartLineItem[];

      const listData = await gql.getListItems(listId) as {
        items_by_category: Record<string, ListItem[]>;
      };
      const allListItems: ListItem[] = Object.values(listData.items_by_category).flat();

      const matched: Array<{
        list_item: string; instacart_item: string;
        status: string; price_paid?: number; action: string;
      }> = [];
      const unmatchedInstacart: InstacartLineItem[] = [];
      const usedListItemIds = new Set<string>();

      for (const inItem of instacartItems) {
        const listItem = allListItems.find(
          (li) => !usedListItemIds.has(li.id) && namesMatch(li.name, inItem.name)
        );
        if (listItem) {
          usedListItemIds.add(listItem.id);
          const delivered = inItem.status === 'Delivered' || inItem.status === 'Partial Refund';
          const note = inItem.status === 'Refund'
            ? 'Refunded per Instacart order — not delivered'
            : inItem.status === 'Partial Refund'
            ? 'Partial refund per Instacart order'
            : 'Delivered per Instacart order';
          matched.push({
            list_item: listItem.name, instacart_item: inItem.name,
            status: inItem.status, price_paid: inItem.price_paid,
            action: delivered ? 'checked' : 'unchecked',
          });
          const needsUpdate = listItem.checked !== delivered || !listItem.notes?.includes('Instacart');
          if (needsUpdate) await gql.updateListItem(listId, listItem.id, delivered, note);
        } else {
          unmatchedInstacart.push(inItem);
        }
      }

      const unmatchedList = allListItems
        .filter((li) => !usedListItemIds.has(li.id))
        .map((li) => ({ id: li.id, name: li.name, was_checked: li.checked }));

      await gql.completeList(listId, actualSpend);

      return {
        list_id: listId, actual_spend: actualSpend,
        summary: {
          matched: matched.length,
          unmatched_on_list: unmatchedList.length,
          untracked_purchases: unmatchedInstacart.length,
        },
        matched,
        unmatched_on_list: unmatchedList,
        untracked_purchases: unmatchedInstacart.map((i) => ({
          name: i.name, status: i.status, quantity: i.quantity, price_paid: i.price_paid,
        })),
      };
    }

    case 'search_products': {
      if (!kroger) throw new Error('Kroger API not configured (missing KROGER_CLIENT_ID / KROGER_CLIENT_SECRET)');
      const products = await kroger.searchProducts(
        args['query'] as string,
        (args['limit'] as number | undefined) ?? 10
      );
      return products.map(p => ({
        productId:  p.productId,
        name:       p.description,
        brand:      p.brand,
        categories: p.categories,
        size:       p.items?.[0]?.size,
        price:      p.items?.[0]?.price?.regular,
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
      for (let index = 0; index < ingredients.length; index++) {
        const result = await gql.createRecipeIngredient(recipeId, { ...ingredients[index], sortOrder: index });
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
