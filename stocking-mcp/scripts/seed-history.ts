#!/usr/bin/env tsx
/**
 * seed-history.ts
 *
 * Seeds 9 historic shopping orders (Feb 12 – Mar 06, 2026) into DynamoDB
 * via the AppSync GraphQL API. Run once after initial deploy.
 *
 * Usage:
 *   cd stocking-mcp
 *   cp .env.example .env   # fill in APPSYNC_ENDPOINT + APPSYNC_API_KEY
 *   npx tsx scripts/seed-history.ts
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
// Historic orders — derived from INSTACART_Purchased_Items CSV
// All item prices are the actual Product Price from the receipt.
// Items that map to catalog IDs use their catalog ID; one-offs use 'custom'.
// ─────────────────────────────────────────────────────────────────────────────

const HISTORIC_ORDERS = [
  {
    weekOf:     '2026-02-09',
    store:      'ht',
    status:     'complete',
    name:       'Harris Teeter — Feb 12, 2026',
    actualSpend: 340.85,
    items: [
      { itemId: 'ht-058', name: 'Baby Spinach Bag',                         quantity: 1,   unit: 'bag',      approxCost:  3.99 },
      { itemId: 'custom', name: 'Barilla Rotini Pasta',                      quantity: 1,   unit: 'box',      approxCost:  2.49 },
      { itemId: 'ht-033', name: "Boar's Head Deluxe Ham",                    quantity: 1,   unit: 'pack',     approxCost: 15.99 },
      { itemId: 'ht-024', name: "Bush's Blackeye Peas 15.8 oz",              quantity: 1,   unit: 'can',      approxCost:  1.99 },
      { itemId: 'ht-069', name: 'Finish Jet Dry Rinse Aid',                  quantity: 1,   unit: 'bottle',   approxCost: 11.99 },
      { itemId: 'ht-062', name: 'Fresh Jalapeño Peppers',                    quantity: 1,   unit: 'each',     approxCost:  1.08 },
      { itemId: 'ht-009', name: 'Fresh Strawberries 1 LB Clamshell',         quantity: 1,   unit: 'carton',   approxCost:  5.99 },
      { itemId: 'ht-017', name: 'Go-GURT Strawberry Tubes',                  quantity: 1,   unit: 'box',      approxCost:  3.99 },
      { itemId: 'ht-006', name: 'Goodnight Brothers Ham Centers',             quantity: 2,   unit: 'packs',    approxCost:  9.98 },
      { itemId: 'ht-010', name: 'Green White Seedless Grapes',               quantity: 1,   unit: 'bag',      approxCost: 14.97 },
      { itemId: 'ht-002', name: 'Harris Teeter Frozen Whole Chicken Wings',  quantity: 4.5, unit: 'lb',       approxCost: 35.91 },
      { itemId: 'ht-007', name: 'HT Vitamin D Whole Milk Gallon',            quantity: 2,   unit: 'jugs',     approxCost:  7.98 },
      { itemId: 'ht-031', name: 'HT Whole Rotisserie Chicken',               quantity: 1,   unit: 'each',     approxCost:  7.99 },
      { itemId: 'ht-047', name: "Milo's Sweet Iced Tea Gallon",              quantity: 1,   unit: 'gallon',   approxCost:  4.99 },
      { itemId: 'custom', name: 'Mt Olive Roasted Red Peppers',              quantity: 1,   unit: 'jar',      approxCost:  3.99 },
      { itemId: 'ht-043', name: 'Pineapple Chunks',                          quantity: 1,   unit: 'container',approxCost:  9.99 },
      { itemId: 'ht-020', name: "Schreiber Foods Disney Princess String Cheese", quantity: 1, unit: 'bag',   approxCost:  7.99 },
      { itemId: 'ht-028', name: "Sister Schubert's Yeast Rolls",             quantity: 2,   unit: 'bags',     approxCost:  9.98 },
      { itemId: 'ht-027', name: "Stouffer's Pepperoni French Bread Pizza",   quantity: 2,   unit: 'boxes',    approxCost:  9.98 },
      { itemId: 'ht-013', name: "Thomas' Plain Bagels",                      quantity: 1,   unit: 'pack',     approxCost:  5.99 },
    ],
  },
  {
    weekOf:     '2026-02-09',
    store:      'sams',
    status:     'complete',
    name:       "Sam's Club — Feb 13, 2026",
    actualSpend: 151.44,
    items: [
      { itemId: 'sc-020', name: 'Bananas (3 lbs.)',                           quantity: 1,   unit: 'bag',      approxCost:  1.79 },
      { itemId: 'sc-025', name: 'Lucky Charms',                               quantity: 1,   unit: 'box',      approxCost:  9.61 },
      { itemId: 'sc-031', name: 'MadeGood Granola Bars',                      quantity: 1,   unit: 'box',      approxCost: 17.06 },
      { itemId: 'sc-029', name: 'Members Mark Rising Crust Pepperoni Pizza',  quantity: 1,   unit: 'pack',     approxCost: 15.84 },
      { itemId: 'sc-030', name: "Reser's Baked Scalloped Potatoes",           quantity: 1,   unit: 'pack',     approxCost:  9.74 },
      { itemId: 'sc-027', name: 'SNICKERS Ice Cream Bars',                    quantity: 1,   unit: 'box',      approxCost: 15.08 },
      { itemId: 'sc-001', name: 'Wright Brand Thick Cut Bacon 64 oz',         quantity: 2,   unit: 'packs',    approxCost: 41.16 },
    ],
  },
  {
    weekOf:     '2026-02-16',
    store:      'ht',
    status:     'complete',
    name:       'Harris Teeter — Feb 18, 2026',
    actualSpend: 149.37,
    items: [
      { itemId: 'ht-068', name: 'ALEXIA House Cut Fries',                    quantity: 1,   unit: 'bag',      approxCost:  7.99 },
      { itemId: 'ht-033', name: "Boar's Head Deluxe Ham",                    quantity: 1,   unit: 'pack',     approxCost: 17.43 },
      { itemId: 'ht-011', name: 'Fresh Bunch of Bananas',                    quantity: 1,   unit: 'bunch',    approxCost:  2.13 },
      { itemId: 'ht-009', name: 'Fresh Strawberries 1 LB Clamshell',         quantity: 1,   unit: 'carton',   approxCost:  5.99 },
      { itemId: 'ht-017', name: 'Go-GURT Strawberry Tubes',                  quantity: 1,   unit: 'box',      approxCost:  3.99 },
      { itemId: 'ht-042', name: 'HT Fuji Apples 3 lb Bag',                   quantity: 1,   unit: 'bag',      approxCost:  5.99 },
      { itemId: 'ht-031', name: 'HT Whole Rotisserie Chicken',               quantity: 1,   unit: 'each',     approxCost:  7.99 },
      { itemId: 'ht-015', name: "Nature's Own WhiteWheat Bread",             quantity: 1,   unit: 'loaf',     approxCost:  3.99 },
      { itemId: 'ht-020', name: 'Paw Patrol Mozzarella String Cheese',       quantity: 2,   unit: 'bags',     approxCost: 15.98 },
      { itemId: 'ht-021', name: 'OREO Double Stuf Party Size',                quantity: 2,   unit: 'packs',    approxCost: 15.98 },
      { itemId: 'ht-067', name: "Stouffer's Classic Lasagna Large",          quantity: 2,   unit: 'boxes',    approxCost: 11.98 },
      { itemId: 'ht-013', name: "Thomas' Plain Bagels",                      quantity: 1,   unit: 'pack',     approxCost:  5.99 },
    ],
  },
  {
    weekOf:     '2026-02-16',
    store:      'ht',
    status:     'complete',
    name:       'Harris Teeter — Feb 20, 2026 (baking run)',
    actualSpend: 51.90,
    items: [
      { itemId: 'ht-017', name: 'Go-GURT Strawberry Tubes',                  quantity: 2,   unit: 'boxes',    approxCost:  7.98 },
      { itemId: 'ht-055', name: 'HT Granulated Sugar',                       quantity: 1,   unit: 'bag',      approxCost:  2.99 },
      { itemId: 'ht-056', name: 'HT Light Brown Sugar',                      quantity: 1,   unit: 'bag',      approxCost:  3.99 },
      { itemId: 'ht-053', name: 'King Arthur All Purpose Flour',              quantity: 1,   unit: 'bag',      approxCost:  5.99 },
      { itemId: 'ht-040', name: 'Land O Lakes Unsalted Butter',              quantity: 1,   unit: 'box',      approxCost:  7.99 },
      { itemId: 'ht-057', name: 'McCormick Pure Vanilla Extract',             quantity: 1,   unit: 'bottle',   approxCost:  8.99 },
      { itemId: 'ht-054', name: 'Swans Down Cake Flour',                     quantity: 1,   unit: 'box',      approxCost:  5.99 },
    ],
  },
  {
    weekOf:     '2026-02-23',
    store:      'sams',
    status:     'complete',
    name:       "Sam's Club — Feb 23, 2026",
    actualSpend: 311.78,
    items: [
      { itemId: 'sc-020', name: 'Bananas (3 lbs.)',                           quantity: 1,   unit: 'bag',      approxCost:  1.79 },
      { itemId: 'sc-033', name: 'Bragg Apple Cider Vinegar',                  quantity: 1,   unit: 'bottle',   approxCost: 12.18 },
      { itemId: 'sc-019', name: 'Green Seedless Grapes',                      quantity: 1,   unit: 'bag',      approxCost:  8.50 },
      { itemId: 'sc-022', name: 'McCafé K-Cup Pods',                          quantity: 1,   unit: 'box',      approxCost: 58.54 },
      { itemId: 'sc-003', name: 'Members Mark Boneless Skinless Chicken Thighs', quantity: 6, unit: 'lb',     approxCost: 26.27 },
      { itemId: 'sc-015', name: 'Members Mark Whole Milk',                    quantity: 2,   unit: 'jugs',     approxCost:  8.20 },
      { itemId: 'sc-032', name: "Milo's Sweet Iced Tea",                      quantity: 1,   unit: 'jug',      approxCost:  4.32 },
      { itemId: 'sc-027', name: 'SNICKERS Ice Cream Bars',                    quantity: 1,   unit: 'box',      approxCost: 15.08 },
      { itemId: 'sc-018', name: 'Strawberries',                               quantity: 1,   unit: 'bag',      approxCost:  8.50 },
      { itemId: 'custom', name: 'Thomas Plain Bagels Value Pack (Sam\'s)',   quantity: 1,   unit: 'pack',     approxCost:  8.27 },
      { itemId: 'sc-001', name: 'Wright Brand Thick Cut Bacon 64 oz',         quantity: 1,   unit: 'pack',     approxCost: 20.58 },
    ],
  },
  {
    weekOf:     '2026-02-23',
    store:      'ht',
    status:     'complete',
    name:       'Harris Teeter — Feb 24, 2026',
    actualSpend: 233.97,
    items: [
      { itemId: 'ht-049', name: 'Barilla Oven-Ready Lasagne',                quantity: 2,   unit: 'boxes',    approxCost:  7.18 },
      { itemId: 'ht-033', name: "Boar's Head Deluxe Ham",                    quantity: 1,   unit: 'pack',     approxCost: 15.99 },
      { itemId: 'ht-030', name: 'Bonduelle Caesar Salad Bowl',               quantity: 1,   unit: 'bowl',     approxCost:  4.99 },
      { itemId: 'ht-037', name: 'Daisy Cottage Cheese 4%',                   quantity: 2,   unit: 'containers', approxCost: 9.98 },
      { itemId: 'ht-006', name: 'Goodnight Brothers Ham Centers',             quantity: 2,   unit: 'packs',    approxCost:  9.98 },
      { itemId: 'ht-073', name: 'Handi-foil Loaf Pans with Lids',            quantity: 3,   unit: 'pans',     approxCost: 17.97 },
      { itemId: 'ht-075', name: "Nathan's Skinless Beef Franks",             quantity: 1,   unit: 'pack',     approxCost:  8.99 },
      { itemId: 'ht-015', name: "Nature's Own WhiteWheat Bread",             quantity: 1,   unit: 'loaf',     approxCost:  3.99 },
      { itemId: 'ht-064', name: 'Fresh Parsley',                              quantity: 1,   unit: 'bunch',    approxCost:  1.99 },
      { itemId: 'ht-043', name: 'Pineapple Chunks',                           quantity: 1,   unit: 'container',approxCost:  9.99 },
      { itemId: 'ht-039', name: 'Sargento Whole Milk Mozzarella Shredded',   quantity: 4,   unit: 'bags',     approxCost: 19.96 },
    ],
  },
  {
    weekOf:     '2026-02-23',
    store:      'ht',
    status:     'complete',
    name:       'Harris Teeter — Feb 27, 2026',
    actualSpend: 192.55,
    items: [
      { itemId: 'ht-025', name: 'Barilla Spaghetti',                          quantity: 3,   unit: 'boxes',    approxCost:  7.47 },
      { itemId: 'ht-024', name: "Bush's Blackeye Peas 15.8 oz",              quantity: 4,   unit: 'cans',     approxCost:  7.96 },
      { itemId: 'ht-076', name: 'HT Sharp Cheddar Cheese Chunk',             quantity: 1,   unit: 'block',    approxCost:  5.99 },
      { itemId: 'ht-071', name: 'HT Snack Resealable Bags',                  quantity: 1,   unit: 'box',      approxCost:  3.99 },
      { itemId: 'ht-070', name: 'HT Quart Storage Bags',                     quantity: 1,   unit: 'box',      approxCost:  3.99 },
      { itemId: 'ht-050', name: 'Kraft Mac N Cheese Cups',                   quantity: 1,   unit: 'pack',     approxCost:  6.99 },
      { itemId: 'ht-035', name: "Neese's Hot Country Sausage",               quantity: 1,   unit: 'pack',     approxCost:  6.99 },
      { itemId: 'ht-051', name: 'Nestle Toll House Cookie Dough',            quantity: 2,   unit: 'rolls',    approxCost:  9.98 },
      { itemId: 'ht-021', name: 'OREO Double Stuf Party Size',                quantity: 2,   unit: 'packs',    approxCost: 15.98 },
      { itemId: 'ht-026', name: 'Rice-A-Roni Chicken',                       quantity: 4,   unit: 'boxes',    approxCost: 12.36 },
      { itemId: 'ht-072', name: 'Ziploc Gallon Freezer Bags',                quantity: 1,   unit: 'box',      approxCost:  8.99 },
    ],
  },
  {
    weekOf:     '2026-03-02',
    store:      'ht',
    status:     'complete',
    name:       'Harris Teeter — Mar 02, 2026',
    actualSpend: 108.42,
    items: [
      { itemId: 'ht-030', name: 'Bonduelle Bistro Caesar Salad Bowl',        quantity: 1,   unit: 'bowl',     approxCost:  4.99 },
      { itemId: 'ht-032', name: 'Butterball Frozen Turkey Breast Roast',     quantity: 1,   unit: 'each',     approxCost: 15.99 },
      { itemId: 'ht-044', name: 'Cheez-It Extra Toasty',                     quantity: 1,   unit: 'box',      approxCost:  6.99 },
      { itemId: 'ht-041', name: 'Coffee Mate French Vanilla Creamer',        quantity: 1,   unit: 'bottle',   approxCost:  8.99 },
      { itemId: 'ht-038', name: 'Daisy Sour Cream',                          quantity: 2,   unit: 'containers', approxCost: 5.98 },
      { itemId: 'ht-009', name: 'Fresh Strawberries 2 LB Clamshell',         quantity: 1,   unit: 'carton',   approxCost:  8.99 },
      { itemId: 'ht-060', name: 'Fresh Garlic',                               quantity: 2,   unit: 'heads',    approxCost:  1.58 },
      { itemId: 'ht-066', name: 'HT Dry Lentils',                             quantity: 1,   unit: 'bag',      approxCost:  2.59 },
      { itemId: 'ht-036', name: 'HT Large White Eggs',                        quantity: 1,   unit: 'dozen',    approxCost:  5.99 },
      { itemId: 'ht-034', name: 'HT Tuna Salad',                              quantity: 1,   unit: 'container',approxCost:  7.99 },
      { itemId: 'ht-059', name: 'NatureSweet Cherub Grape Tomatoes',          quantity: 1,   unit: 'container',approxCost:  4.99 },
      { itemId: 'ht-065', name: 'Sun Dried Tomatoes Julienne',               quantity: 1,   unit: 'jar',      approxCost:  5.99 },
      { itemId: 'ht-045', name: 'RITZ Fresh Stacks Crackers',                 quantity: 1,   unit: 'pack',     approxCost:  5.49 },
      { itemId: 'ht-063', name: 'Yellow Squash',                              quantity: 1.5, unit: 'lb',       approxCost:  2.25 },
      { itemId: 'ht-061', name: 'Sweet Jumbo Yellow Onions',                  quantity: 1,   unit: 'each',     approxCost:  2.45 },
      { itemId: 'ht-052', name: 'Stove Top Stuffing Chicken',                 quantity: 1,   unit: 'box',      approxCost:  3.49 },
      { itemId: 'ht-046', name: 'Triscuit Rosemary & Olive Oil',              quantity: 1,   unit: 'box',      approxCost:  4.99 },
    ],
  },
  {
    weekOf:     '2026-03-02',
    store:      'sams',
    status:     'complete',
    name:       "Sam's Club — Mar 06, 2026",
    actualSpend: 266.38,  // net after $15.08 Snickers refund
    items: [
      { itemId: 'sc-020', name: 'Bananas (3 lbs.)',                           quantity: 1,   unit: 'bag',      approxCost:  1.79 },
      { itemId: 'sc-028', name: 'Bounty Paper Towels Select-A-Size',          quantity: 1,   unit: 'pack',     approxCost: 31.33 },
      { itemId: 'sc-026', name: 'Coca-Cola Mini Cans',                        quantity: 1,   unit: 'pack',     approxCost: 20.72 },
      { itemId: 'sc-024', name: 'Cheerios',                                   quantity: 1,   unit: 'pack',     approxCost:  8.39 },
      { itemId: 'sc-025', name: 'Lucky Charms',                               quantity: 1,   unit: 'box',      approxCost:  9.61 },
      { itemId: 'sc-019', name: 'Green Seedless Grapes',                      quantity: 1,   unit: 'bag',      approxCost:  9.60 },
      { itemId: 'sc-023', name: 'Kraft Mac & Cheese Cups',                    quantity: 1,   unit: 'pack',     approxCost: 12.18 },
      { itemId: 'sc-002', name: '88% Lean Ground Beef',                       quantity: 4.5, unit: 'lb',       approxCost: 34.10 },
      { itemId: 'sc-010', name: 'Bone-In Center Cut Pork Chops',              quantity: 5.5, unit: 'lb',       approxCost: 20.80 },
      { itemId: 'sc-003', name: 'Boneless Skinless Chicken Thighs',           quantity: 6,   unit: 'lb',       approxCost: 22.82 },
      { itemId: 'sc-015', name: 'Members Mark Whole Milk',                    quantity: 2,   unit: 'jugs',     approxCost:  7.86 },
      { itemId: 'sc-009', name: 'Pork Loin Back Ribs',                        quantity: 10,  unit: 'lb',       approxCost: 26.01 },
      { itemId: 'sc-008', name: 'Pork Loin Roast Boneless',                   quantity: 7,   unit: 'lb',       approxCost: 19.09 },
      { itemId: 'sc-018', name: 'Strawberries',                               quantity: 1,   unit: 'bag',      approxCost:  6.06 },
      { itemId: 'sc-021', name: 'Sunkist Valencia Oranges',                   quantity: 1,   unit: 'bag',      approxCost:  9.96 },
      { itemId: 'sc-001', name: 'Wright Brand Thick Cut Bacon 64 oz',         quantity: 2,   unit: 'packs',    approxCost: 41.16 },
      // Snickers refunded — not included in net spend
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed runner
// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`Seeding ${HISTORIC_ORDERS.length} historic orders...\n`);

  for (const order of HISTORIC_ORDERS) {
    try {
      const resolvedItems = order.items.map(item => ({
        itemId:     item.itemId,
        name:       item.name,
        category:   item.itemId.startsWith('sc-') ? getSamsCategory(item.itemId) : getHTCategory(item.itemId),
        store:      item.itemId.startsWith('sc-') ? 'sams' : (item.itemId === 'custom' ? order.store : 'ht') as 'sams' | 'ht' | 'both',
        quantity:   item.quantity,
        unit:       item.unit,
        approxCost: item.approxCost,
        checked:    true,  // historic = already purchased
        notes:      '',
      }));

      const list = await gql.createShoppingList({
        name:       order.name,
        weekOf:     order.weekOf,
        store:      order.store as 'sams' | 'ht' | 'both',
        status:     'complete',
        totalSpend: order.actualSpend,
        items:      resolvedItems,
      });

      console.log(`✓  ${order.name}  →  ${list.id}  ($${order.actualSpend})`);
    } catch (err) {
      console.error(`✗  ${order.name}  →  ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log('\nDone.');
}

function getSamsCategory(id: string): string {
  const map: Record<string, string> = {
    'sc-001': 'Freezer — Protein', 'sc-002': 'Freezer — Protein', 'sc-003': 'Freezer — Protein',
    'sc-004': 'Freezer — Protein', 'sc-005': 'Freezer — Protein', 'sc-006': 'Freezer — Protein',
    'sc-007': 'Freezer — Protein', 'sc-008': 'Freezer — Protein', 'sc-009': 'Freezer — Protein',
    'sc-010': 'Freezer — Protein', 'sc-011': 'Freezer — Protein', 'sc-012': 'Freezer — Protein',
    'sc-013': 'Freezer — Protein', 'sc-014': 'Freezer — Protein',
    'sc-015': 'Dairy & Eggs',      'sc-016': 'Dairy & Eggs',      'sc-017': 'Dairy & Eggs',
    'sc-018': 'Fresh Fruit',       'sc-019': 'Fresh Fruit',       'sc-020': 'Fresh Fruit',
    'sc-021': 'Fresh Fruit',
    'sc-022': 'Pantry',            'sc-023': 'Pantry',            'sc-024': 'Pantry',
    'sc-025': 'Pantry',            'sc-033': 'Pantry',
    'sc-026': 'Beverages',         'sc-032': 'Beverages',
    'sc-027': 'Frozen Treats',     'sc-029': 'Frozen',            'sc-030': 'Frozen',
    'sc-028': 'Household',         'sc-031': 'Snacks & Kids',
  };
  return map[id] ?? 'Other';
}

function getHTCategory(id: string): string {
  const map: Record<string, string> = {
    'ht-001': 'Freezer — Protein', 'ht-002': 'Freezer — Protein', 'ht-003': 'Freezer — Protein',
    'ht-004': 'Freezer — Protein', 'ht-005': 'Freezer — Protein', 'ht-031': 'Freezer — Protein',
    'ht-032': 'Freezer — Protein',
    'ht-006': 'Deli',              'ht-033': 'Deli',              'ht-034': 'Deli',
    'ht-035': 'Deli',              'ht-075': 'Deli',
    'ht-007': 'Dairy & Eggs',      'ht-008': 'Dairy & Eggs',      'ht-036': 'Dairy & Eggs',
    'ht-037': 'Dairy & Eggs',      'ht-038': 'Dairy & Eggs',      'ht-039': 'Dairy & Eggs',
    'ht-040': 'Dairy & Eggs',      'ht-041': 'Dairy & Eggs',      'ht-076': 'Dairy & Eggs',
    'ht-009': 'Fresh Fruit',       'ht-010': 'Fresh Fruit',       'ht-011': 'Fresh Fruit',
    'ht-012': 'Fresh Fruit',       'ht-042': 'Fresh Fruit',       'ht-043': 'Fresh Fruit',
    'ht-013': 'Bread & Bakery',    'ht-014': 'Bread & Bakery',    'ht-015': 'Bread & Bakery',
    'ht-016': 'Bread & Bakery',
    'ht-017': 'Snacks & Kids',     'ht-018': 'Snacks & Kids',     'ht-019': 'Snacks & Kids',
    'ht-020': 'Snacks & Kids',     'ht-021': 'Snacks & Kids',     'ht-022': 'Snacks & Kids',
    'ht-044': 'Snacks & Kids',     'ht-045': 'Snacks & Kids',     'ht-046': 'Snacks & Kids',
    'ht-023': 'Beverages',         'ht-047': 'Beverages',
    'ht-024': 'Pantry',            'ht-025': 'Pantry',            'ht-026': 'Pantry',
    'ht-048': 'Pantry',            'ht-049': 'Pantry',            'ht-050': 'Pantry',
    'ht-051': 'Pantry',            'ht-052': 'Pantry',            'ht-074': 'Pantry',
    'ht-053': 'Baking',            'ht-054': 'Baking',            'ht-055': 'Baking',
    'ht-056': 'Baking',            'ht-057': 'Baking',
    'ht-027': 'Frozen',            'ht-028': 'Frozen',            'ht-029': 'Frozen',
    'ht-067': 'Frozen',            'ht-068': 'Frozen',
    'ht-030': 'Produce',           'ht-058': 'Produce',           'ht-059': 'Produce',
    'ht-060': 'Produce',           'ht-061': 'Produce',           'ht-062': 'Produce',
    'ht-063': 'Produce',           'ht-064': 'Produce',           'ht-065': 'Produce',
    'ht-066': 'Produce',
    'ht-069': 'Household',         'ht-070': 'Household',         'ht-071': 'Household',
    'ht-072': 'Household',         'ht-073': 'Household',
  };
  return map[id] ?? 'Other';
}

seed().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
