/**
 * Tool definitions and handler logic — shared between the stdio and Lambda transports.
 */

import type { CadenceEngine } from './cadence.js';
import type { GraphQLClient } from './graphql.js';
import type { CatalogItem } from './catalog.js';
import type { KrogerClient } from './kroger.js';

// ── Reconciliation types ──────────────────────────────────────────────────────

/**
 * A single line from an Instacart order export (Purchased Items CSV or
 * equivalent structured data).  All fields except `name` and `status` are
 * optional so callers can pass as much or as little detail as available.
 */
export interface InstacartLineItem {
  /** Human-readable product description from the order */
  name: string;
  /** Delivery outcome: "Delivered", "Refund", or "Partial Refund" */
  status: 'Delivered' | 'Refund' | 'Partial Refund';
  /** Quantity ordered */
  quantity?: number;
  /** Amount actually charged (after promotions, before tax) */
  price_paid?: number;
  /** Store slug — used to cross-check against the list's store */
  store?: string;
}

/**
 * A list item from get_list_items, used internally for matching.
 */
interface ListItem {
  id: string;
  name: string;
  checked: boolean;
  notes?: string;
}

/**
 * Fuzzy name match between a list item name and an Instacart product name.
 * Returns true if they share enough significant words (≥1 word of ≥4 chars).
 */
function namesMatch(listName: string, instacartName: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);

  const listWords = normalize(listName);
  const instWords = normalize(instacartName);

  // Exact substring match (covers brand + product combos)
  if (instacartName.toLowerCase().includes(listName.toLowerCase())) return true;
  if (listName.toLowerCase().includes(instacartName.toLowerCase())) return true;

  // Shared significant words (≥4 chars)
  const significant = listWords.filter((w) => w.length >= 4);
  return significant.some((w) => instWords.includes(w));
}

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
      + '(using item_id="custom" and providing a name). Custom items are useful '
      + 'for seasonal or holiday purchases not in the master catalog.',
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
              item_id:  {
                type: 'string',
                description:
                  'ID from catalog (e.g. sc-001, ht-013), or "custom" for '
                  + 'off-catalog items. When using "custom", the name field is required.',
              },
              name:     {
                type: 'string',
                description:
                  'Display name for the item. Required when item_id is "custom". '
                  + 'Optional override for catalog items.',
              },
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
    name: 'reconcile_list',
    description:
      'Reconciles a shopping list against actual Instacart order data. '
      + 'Accepts the list ID, the actual amount paid, and an array of Instacart '
      + 'line items (name, status, quantity, price_paid). '
      + 'Automatically matches list items to Instacart items by name, corrects '
      + 'check states (delivered → checked, refunded → unchecked), updates the '
      + 'actual spend, and returns a full diff: matched items, list items with '
      + 'no Instacart match, and Instacart purchases not on the list. '
      + 'Works on both active and complete lists.',
    inputSchema: {
      type: 'object',
      required: ['list_id', 'actual_spend', 'instacart_items'],
      properties: {
        list_id: {
          type: 'string',
          description: 'The shopping list ID to reconcile',
        },
        actual_spend: {
          type: 'number',
          description: 'Total amount actually paid (from Instacart order total)',
        },
        instacart_items: {
          type: 'array',
          description: 'Line items from the Instacart order',
          items: {
            type: 'object',
            required: ['name', 'status'],
            properties: {
              name:       { type: 'string', description: 'Product description from Instacart' },
              status:     { type: 'string', enum: ['Delivered', 'Refund', 'Partial Refund'], description: 'Delivery outcome' },
              quantity:   { type: 'number', description: 'Quantity ordered' },
              price_paid: { type: 'number', description: 'Amount charged after promotions' },
              store:      { type: 'string', description: 'Store slug (e.g. sams-club, harristeeter)' },
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
        item_id: string; name?: string; quantity: number; notes?: string;
      }>;

      const resolvedItems = rawItems.map((ri) => {
        // ── Custom (off-catalog) item ──────────────────────────────────────────
        // Triggered by item_id === 'custom' OR when item_id is not found in
        // the catalog but a name is supplied.
        const isCustomId = ri.item_id === 'custom';
        const cat = isCustomId ? undefined : catalog.find((c) => c.id === ri.item_id);

        if (!cat) {
          // Require a name for items that can't be resolved from the catalog
          const displayName = ri.name?.trim();
          if (!displayName) {
            throw new Error(
              `Unknown item_id "${ri.item_id}" and no name provided. `
              + `Either use a valid catalog ID or pass item_id="custom" with a name.`
            );
          }
          // Build a synthetic catalog-shaped entry for the custom item
          return {
            itemId:     ri.item_id === 'custom' ? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` : ri.item_id,
            name:       displayName,
            category:   'Custom',
            store:      store === 'both' ? 'both' : store,
            quantity:   ri.quantity,
            unit:       '',
            approxCost: 0,
            checked:    false,
            notes:      ri.notes ?? '',
          };
        }

        // ── Catalog item (normal path) ─────────────────────────────────────────
        return {
          itemId:     ri.item_id,
          name:       ri.name?.trim() || cat.name,   // allow name override
          category:   cat.category,
          store:      cat.store,
          quantity:   ri.quantity,
          unit:       cat.unit,
          approxCost: cat.approxCost,
          checked:    false,
          notes:      ri.notes ?? cat.notes ?? '',
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

    case 'reconcile_list': {
      const listId       = args['list_id'] as string;
      const actualSpend  = args['actual_spend'] as number;
      const instacartItems = args['instacart_items'] as InstacartLineItem[];

      // 1. Fetch the current list items
      const listData = await gql.getListItems(listId) as {
        items_by_category: Record<string, ListItem[]>;
      };
      const allListItems: ListItem[] = Object.values(listData.items_by_category).flat();

      // 2. Match list items to Instacart items by fuzzy name
      const matched: Array<{
        list_item: string;
        instacart_item: string;
        status: string;
        price_paid?: number;
        action: string;
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
            ? `Refunded per Instacart order — not delivered`
            : inItem.status === 'Partial Refund'
            ? `Partial refund per Instacart order`
            : `Delivered per Instacart order`;

          matched.push({
            list_item:      listItem.name,
            instacart_item: inItem.name,
            status:         inItem.status,
            price_paid:     inItem.price_paid,
            action:         delivered ? 'checked' : 'unchecked',
          });

          // Only update if the current state differs or notes should be added
          const needsUpdate = listItem.checked !== delivered || !listItem.notes?.includes('Instacart');
          if (needsUpdate) {
            await gql.updateListItem(listId, listItem.id, delivered, note);
          }
        } else {
          unmatchedInstacart.push(inItem);
        }
      }

      // 3. List items with no Instacart match
      const unmatchedList = allListItems
        .filter((li) => !usedListItemIds.has(li.id))
        .map((li) => ({ id: li.id, name: li.name, was_checked: li.checked }));

      // 4. Correct the spend
      await gql.completeList(listId, actualSpend);

      return {
        list_id:      listId,
        actual_spend: actualSpend,
        summary: {
          matched:             matched.length,
          unmatched_on_list:   unmatchedList.length,
          untracked_purchases: unmatchedInstacart.length,
        },
        matched,
        unmatched_on_list:   unmatchedList,
        untracked_purchases: unmatchedInstacart.map((i) => ({
          name:       i.name,
          status:     i.status,
          quantity:   i.quantity,
          price_paid: i.price_paid,
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
        productId: p.productId,
        name: p.description,
        brand: p.brand,
        categories: p.categories,
        size: p.items?.[0]?.size,
        price: p.items?.[0]?.price?.regular,
        promoPrice: p.items?.[0]?.price?.promo,
      }));
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
