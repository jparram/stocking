#!/usr/bin/env tsx
/**
 * seed-mar20.ts
 *
 * Seeds the Mar 20, 2026 Sam's Club order into DynamoDB.
 * Run after seed-history.ts has already been executed.
 *
 * Usage:
 *   cd stocking-mcp
 *   npx tsx scripts/seed-mar20.ts
 */

import { GraphQLClient } from '../src/graphql.js';

const gql = new GraphQLClient(
  process.env['APPSYNC_ENDPOINT'] ?? '',
  process.env['APPSYNC_API_KEY']  ?? ''
);

if (!process.env['APPSYNC_ENDPOINT'] || !process.env['APPSYNC_API_KEY']) {
  console.error('ERROR: APPSYNC_ENDPOINT and APPSYNC_API_KEY must be set in .env');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Reconciliation notes:
//   11/19 items map to catalog IDs
//   8/19 items are one-offs (condiments, charcoal, supplement, bags)
//   Turmeric supplement ($36.56) included as custom — likely not recurring
//   Charcoal ($24.38) included as custom — seasonal
//   Clorox, Mayo, Ketchup, Spring Mix, Ziploc — custom one-offs
// ─────────────────────────────────────────────────────────────────────────────

const MAR20_ORDER = {
  weekOf:      '2026-03-16',
  store:       'sams' as const,
  status:      'complete' as const,
  name:        "Sam's Club — Mar 20, 2026",
  actualSpend: 477.80,
  items: [
    // ── Catalog items ─────────────────────────────────────────────────────
    { itemId: 'sc-001', name: 'Wright Brand Thick Cut Bacon 64 oz',         category: 'Freezer — Protein', store: 'sams', quantity: 2,   unit: 'packs',   approxCost: 41.16 },
    { itemId: 'sc-004', name: 'Members Mark Whole Chicken Wings',            category: 'Freezer — Protein', store: 'sams', quantity: 6,   unit: 'lb',      approxCost: 20.62 },
    { itemId: 'sc-015', name: 'Members Mark Whole Milk',                     category: 'Dairy & Eggs',      store: 'sams', quantity: 2,   unit: 'jugs',    approxCost:  7.86 },
    { itemId: 'sc-017', name: 'Members Mark Cage-Free Large Eggs',           category: 'Dairy & Eggs',      store: 'sams', quantity: 1,   unit: 'flat',    approxCost:  5.66 },
    { itemId: 'sc-018', name: 'Strawberries',                                category: 'Fresh Fruit',       store: 'sams', quantity: 1,   unit: 'bag',     approxCost:  4.83 },
    { itemId: 'sc-019', name: 'Green Seedless Grapes',                       category: 'Fresh Fruit',       store: 'sams', quantity: 1,   unit: 'bag',     approxCost:  8.38 },
    { itemId: 'sc-020', name: 'Bananas (3 lbs.)',                             category: 'Fresh Fruit',       store: 'sams', quantity: 1,   unit: 'bag',     approxCost:  1.79 },
    { itemId: 'sc-021', name: 'Sunkist Valencia Oranges',                    category: 'Fresh Fruit',       store: 'sams', quantity: 1,   unit: 'bag',     approxCost:  9.96 },
    { itemId: 'sc-022', name: 'McCafé K-Cup Pods',                            category: 'Pantry',            store: 'sams', quantity: 1,   unit: 'box',     approxCost: 58.54 },
    { itemId: 'sc-031', name: 'MadeGood Granola Bars',                        category: 'Snacks & Kids',     store: 'sams', quantity: 1,   unit: 'box',     approxCost: 17.06 },
    { itemId: 'sc-033', name: 'Bragg Apple Cider Vinegar',                    category: 'Pantry',            store: 'sams', quantity: 1,   unit: 'bottle',  approxCost: 10.96 },
    // ── One-off / custom items ─────────────────────────────────────────────
    { itemId: 'custom', name: 'Clorox Performance Bleach',                   category: 'Household',         store: 'sams', quantity: 1,   unit: 'bottle',  approxCost: 23.16 },
    { itemId: 'custom', name: 'Del Monte Pineapple Spears',                  category: 'Pantry',            store: 'sams', quantity: 1,   unit: 'can',     approxCost:  9.72 },
    { itemId: 'custom', name: "Duke's Mayonnaise Real Smooth & Creamy",      category: 'Pantry',            store: 'sams', quantity: 1,   unit: 'jar',     approxCost: 10.35 },
    { itemId: 'custom', name: 'Heinz Tomato Ketchup',                        category: 'Pantry',            store: 'sams', quantity: 1,   unit: 'bottle',  approxCost: 13.40 },
    { itemId: 'custom', name: 'Local Bounti Spring Mix',                     category: 'Produce',           store: 'sams', quantity: 1,   unit: 'bag',     approxCost:  6.06 },
    { itemId: 'custom', name: 'Members Mark Turmeric Extract 1400mg',        category: 'Supplements',       store: 'sams', quantity: 1,   unit: 'bottle',  approxCost: 36.56 },
    { itemId: 'custom', name: 'The Good Charcoal Lump Charcoal',             category: 'Household',         store: 'sams', quantity: 1,   unit: 'bag',     approxCost: 24.38 },
    { itemId: 'custom', name: 'Ziploc Sandwich Bags EasyGuide',              category: 'Household',         store: 'sams', quantity: 1,   unit: 'box',     approxCost: 15.23 },
  ],
};

async function seed() {
  console.log('Seeding Mar 20, 2026 Sam\'s Club order...\n');

  try {
    const list = await gql.createShoppingList({
      name:       MAR20_ORDER.name,
      weekOf:     MAR20_ORDER.weekOf,
      store:      MAR20_ORDER.store,
      status:     MAR20_ORDER.status,
      totalSpend: MAR20_ORDER.actualSpend,
      items:      MAR20_ORDER.items.map(item => ({
        ...item,
        checked: true,  // historic = already purchased
        notes: item.itemId === 'custom' ? 'One-off item — not in standing catalog' : '',
      })),
    });

    console.log(`✓  ${MAR20_ORDER.name}  →  ${list.id}`);
    console.log(`   Items: ${MAR20_ORDER.items.length} (11 catalog + 8 custom)`);
    console.log(`   Spend: $${MAR20_ORDER.actualSpend}`);
    console.log('\nDone.');
  } catch (err) {
    console.error(`✗  ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

seed();
