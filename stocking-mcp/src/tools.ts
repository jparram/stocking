/**
 * Tool definitions and handler logic — shared between the stdio and Lambda transports.
 */

import type { CadenceEngine } from './cadence.js';
import type { GraphQLClient } from './graphql.js';
import type { CatalogItem } from './catalog.js';

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
];

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  cadence: CadenceEngine,
  gql: GraphQLClient,
  catalog: CatalogItem[]
): Promise<{ content: { type: string; text: string }[] }> {
  const text = await dispatch(name, args, cadence, gql, catalog);
  return { content: [{ type: 'text', text: JSON.stringify(text, null, 2) }] };
}

async function dispatch(
  name: string,
  args: Record<string, unknown>,
  cadence: CadenceEngine,
  gql: GraphQLClient,
  catalog: CatalogItem[]
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

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
