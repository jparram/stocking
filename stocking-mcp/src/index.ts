#!/usr/bin/env node
/**
 * stocking-mcp — MCP server for the Family Grocery Tracker
 *
 * Tools:
 *   get_due_store        — which store is due this week per bi-weekly cadence
 *   suggest_items        — cadence-based item suggestions ranked by urgency
 *   create_shopping_list — write a full list to DynamoDB via AppSync
 *   get_shopping_lists   — read recent lists
 *   get_list_items       — line items for a specific list, grouped by category
 *   update_list_item     — check/uncheck an item
 *   complete_list        — mark a list done, record actual spend
 *
 * Setup: see stocking-mcp/README.md
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GraphQLClient } from './graphql.js';
import { CadenceEngine } from './cadence.js';
import { MASTER_CATALOG } from './catalog.js';

const server = new Server(
  { name: 'stocking-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

const gql = new GraphQLClient(
  process.env['APPSYNC_ENDPOINT'] ?? '',
  process.env['APPSYNC_API_KEY']  ?? ''
);

const cadence = new CadenceEngine(
  process.env['CADENCE_START_DATE'] ?? '2026-01-04'
);

// ── TOOL LIST ────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
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
          store: { type: 'string', enum: ['sams', 'ht'], description: 'Which store' },
          include_routine: { type: 'boolean', description: 'Include not-yet-due items (default false)' },
          days_since_last_shop: { type: 'number', description: 'Override days since last shop (optional)' },
        },
      },
    },
    {
      name: 'create_shopping_list',
      description:
        'Creates a new shopping list in the app and saves it to DynamoDB. '
        + 'The list will immediately appear in the Stocking app. '
        + 'Use suggest_items first to get recommended items, then call this to create.',
      inputSchema: {
        type: 'object',
        required: ['store', 'items'],
        properties: {
          store: { type: 'string', enum: ['sams', 'ht', 'both'] },
          name:  { type: 'string', description: 'List name (auto-generated if omitted)' },
          week_of: { type: 'string', description: 'ISO date for the Monday of the shopping week (defaults to current week)' },
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
        properties: {
          list_id: { type: 'string' },
        },
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
          item_id: { type: 'string', description: 'ShoppingListItem ID (from get_list_items, not the catalog ID)' },
          checked: { type: 'boolean' },
          notes:   { type: 'string', description: 'Optional note (e.g. substitution made)' },
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
          actual_spend: { type: 'number', description: 'Amount actually spent (for spend tracking)' },
        },
      },
    },
  ],
}));

// ── TOOL HANDLERS ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {

      case 'get_due_store': {
        const date = args?.['date']
          ? new Date(args['date'] as string)
          : new Date();
        return { content: [{ type: 'text', text: JSON.stringify(cadence.getDueStore(date), null, 2) }] };
      }

      case 'suggest_items': {
        const store   = args!['store'] as 'sams' | 'ht';
        const routine = (args?.['include_routine'] as boolean) ?? false;
        const override = args?.['days_since_last_shop'] as number | undefined;
        const suggestions = cadence.suggestItems(store, routine, override);
        return { content: [{ type: 'text', text: JSON.stringify(suggestions, null, 2) }] };
      }

      case 'create_shopping_list': {
        const store   = args!['store'] as string;
        const weekOf  = (args?.['week_of'] as string) ?? cadence.getMondayOf();
        const rawItems = args!['items'] as Array<{
          item_id: string;
          quantity: number;
          notes?: string;
        }>;

        const resolvedItems = rawItems.map((ri) => {
          const cat = MASTER_CATALOG.find((c) => c.id === ri.item_id);
          if (!cat) throw new Error(`Unknown item_id: ${ri.item_id}`);
          return {
            itemId:     ri.item_id,
            name:       cat.name,
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
          : store === 'ht' ? 'Harris Teeter'
          : 'Both Stores';

        const listName =
          (args?.['name'] as string) ?? `Week of ${weekOf} — ${storeName}`;

        const totalEstimate = resolvedItems.reduce(
          (sum, i) => sum + i.approxCost * i.quantity, 0
        );

        const list = await gql.createShoppingList({
          name: listName, weekOf, store,
          status: 'active',
          totalSpend: totalEstimate,
          items: resolvedItems,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              list_id: list.id,
              name: listName,
              store,
              week_of: weekOf,
              item_count: resolvedItems.length,
              estimated_total: `$${totalEstimate.toFixed(2)}`,
              message: 'List created and live in the Stocking app.',
            }, null, 2),
          }],
        };
      }

      case 'get_shopping_lists': {
        const limit  = (args?.['limit']  as number) ?? 5;
        const store  = args?.['store']   as string | undefined;
        const status = args?.['status']  as string | undefined;
        const lists  = await gql.listShoppingLists(limit, store, status);
        return { content: [{ type: 'text', text: JSON.stringify(lists, null, 2) }] };
      }

      case 'get_list_items': {
        const items = await gql.getListItems(args!['list_id'] as string);
        return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
      }

      case 'update_list_item': {
        const result = await gql.updateListItem(
          args!['list_id'] as string,
          args!['item_id'] as string,
          args!['checked'] as boolean,
          args?.['notes']  as string | undefined
        );
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'complete_list': {
        const result = await gql.completeList(
          args!['list_id']      as string,
          args?.['actual_spend'] as number | undefined
        );
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
  }
});

// ── START ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('stocking-mcp running on stdio');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
