/**
 * Master catalog for the MCP server.
 * Mirrors src/data/masterCatalog.ts — keep in sync when adding items.
 * Prices verified from 2025 Instacart receipts.
 * Cadence intervals derived from actual 2025 order history.
 */

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  store: 'sams' | 'ht' | 'both';
  parStock: number;
  unit: string;
  cadenceDays: number;
  approxCost: number;
  notes?: string;
  isHTOnly?: boolean;
  parMin?: string;
  buyQty?: string;
}

export const MASTER_CATALOG: CatalogItem[] = [
  // ─── SAM'S CLUB ───────────────────────────────────────────────────────────
  { id: 'sc-001', name: "Wright Thick Cut Bacon, 4 lb",           category: "Freezer — Protein", store: 'sams', parStock: 2, unit: 'packs',          cadenceDays: 10, approxCost: 26.19, parMin: 'Down to 1 pack',           buyQty: '2 packs',     isHTOnly: false },
  { id: 'sc-002', name: "88% Lean Ground Beef",                   category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'pack (~4–5 lb)',  cadenceDays: 46, approxCost: 28.67, parMin: 'Last 2 lbs',               buyQty: '1 pack',      isHTOnly: false },
  { id: 'sc-003', name: "Boneless Skinless Chicken Thighs",       category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'bag (~5 lb)',     cadenceDays: 65, approxCost: 25.50, parMin: 'Less than 1 lb left',     buyQty: '1 bag',       isHTOnly: false },
  { id: 'sc-004', name: "Whole Chicken Wings",                    category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'bag',             cadenceDays: 30, approxCost: 22.43, parMin: 'Freezer wings gone',       buyQty: '1 bag',       isHTOnly: false },
  { id: 'sc-005', name: "Jimmy Dean Sausage Roll 32 oz",          category: "Freezer — Protein", store: 'sams', parStock: 2, unit: 'rolls',           cadenceDays: 30, approxCost:  8.52, parMin: 'Opened last roll',         buyQty: '2 rolls',     isHTOnly: false },
  { id: 'sc-006', name: "Pork Spareribs",                         category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'rack',            cadenceDays: 40, approxCost: 43.09, parMin: 'No pork in freezer',       buyQty: '1 rack',      isHTOnly: false },
  { id: 'sc-007', name: "Pork Boston Butt",                       category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'butt',            cadenceDays: 60, approxCost: 29.59, parMin: 'No pork in freezer',       buyQty: '1 butt',      isHTOnly: false },
  { id: 'sc-008', name: "Pork Loin Roast Boneless",               category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'roast',           cadenceDays: 40, approxCost: 27.11, parMin: 'No pork in freezer',       buyQty: '1 roast',     isHTOnly: false },
  { id: 'sc-009', name: "Pork Loin Back Ribs",                    category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'rack',            cadenceDays: 60, approxCost: 50.19, parMin: 'Craving ribs',             buyQty: '1 rack',      isHTOnly: false },
  { id: 'sc-010', name: "Bone-In Center Cut Pork Chops",          category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'pack',            cadenceDays: 30, approxCost: 17.98, parMin: 'No pork chops',            buyQty: '1 pack',      isHTOnly: false },
  { id: 'sc-011', name: "Members Mark Angus Ribeye Steak",        category: "Freezer — Protein", store: 'sams', parStock: 2, unit: 'steaks',          cadenceDays: 45, approxCost: 58.68, parMin: 'Last steak used',          buyQty: '2 steaks',    isHTOnly: false },
  { id: 'sc-012', name: "Beef Flank Steak",                       category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'pack',            cadenceDays: 60, approxCost: 64.99, parMin: 'Freezer beef variety gone',buyQty: '1 pack',      isHTOnly: false },
  { id: 'sc-013', name: "Beef Short Ribs",                        category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'pack',            cadenceDays: 90, approxCost: 47.75, parMin: 'When craving',             buyQty: '1 pack',      isHTOnly: false },
  { id: 'sc-014', name: "Beef Brisket Flat",                      category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'flat',            cadenceDays: 90, approxCost: 55.91, parMin: 'Seasonal / event',         buyQty: '1 flat',      isHTOnly: false },
  { id: 'sc-015', name: "Members Mark Whole Milk",                category: "Dairy & Eggs",      store: 'sams', parStock: 2, unit: 'jugs',            cadenceDays: 10, approxCost:  4.32, parMin: 'Down to 1 jug',            buyQty: '2 jugs',      isHTOnly: false },
  { id: 'sc-016', name: "Members Mark OJ 100% Pulp Free",         category: "Dairy & Eggs",      store: 'sams', parStock: 2, unit: 'jugs',            cadenceDays: 41, approxCost:  9.37, parMin: 'Down to 1 jug',            buyQty: '2 jugs',      isHTOnly: false },
  { id: 'sc-017', name: "Cage-Free Large Eggs",                   category: "Dairy & Eggs",      store: 'sams', parStock: 1, unit: 'flat',            cadenceDays: 28, approxCost:  8.52, parMin: 'Last 6 eggs',              buyQty: '1 flat',      isHTOnly: false },
  { id: 'sc-018', name: "Strawberries (Sam's bag)",               category: "Fresh Fruit",       store: 'sams', parStock: 2, unit: 'bags',            cadenceDays: 15, approxCost:  8.14, parMin: 'Last carton nearly empty', buyQty: '2 bags',      isHTOnly: false },
  { id: 'sc-019', name: "Green Seedless Grapes",                  category: "Fresh Fruit",       store: 'sams', parStock: 2, unit: 'bags',            cadenceDays: 20, approxCost:  8.32, parMin: 'Last half bag',            buyQty: '2 bags',      isHTOnly: false },
  { id: 'sc-020', name: "Bananas (3 lb bag)",                     category: "Fresh Fruit",       store: 'sams', parStock: 1, unit: 'bag',             cadenceDays: 15, approxCost:  1.79, parMin: 'Last 2–3 bananas',         buyQty: '1 bag',       isHTOnly: false },
  { id: 'sc-021', name: "Navel Oranges (bulk bag)",               category: "Fresh Fruit",       store: 'sams', parStock: 1, unit: 'bag',             cadenceDays: 30, approxCost: 13.00, parMin: 'Down to 3–4 oranges',      buyQty: '1 bag',       isHTOnly: false },
  { id: 'sc-022', name: "McCafé K-Cup Pods",                      category: "Pantry",            store: 'sams', parStock: 1, unit: 'box',             cadenceDays: 25, approxCost: 51.83, parMin: 'Last 10 pods',             buyQty: '1 box',       isHTOnly: false },
  { id: 'sc-023', name: "Kraft Mac & Cheese (bulk)",              category: "Pantry",            store: 'sams', parStock: 1, unit: 'pack',            cadenceDays: 45, approxCost: 12.00, parMin: 'Last 2 boxes',             buyQty: '1 pack',      isHTOnly: false },
  { id: 'sc-024', name: "Cheerios (bulk)",                        category: "Pantry",            store: 'sams', parStock: 1, unit: 'pack',            cadenceDays: 30, approxCost:  8.00, parMin: 'Last box',                 buyQty: '1 pack',      isHTOnly: false },
  { id: 'sc-025', name: "Frosted Flakes (bulk)",                  category: "Pantry",            store: 'sams', parStock: 1, unit: 'box',             cadenceDays: 30, approxCost:  8.00, parMin: 'Getting low',              buyQty: '1 box',       isHTOnly: false },
  { id: 'sc-026', name: "Coca-Cola Mini Cans",                    category: "Beverages",         store: 'sams', parStock: 1, unit: 'pack',            cadenceDays: 69, approxCost: 19.98, parMin: 'Last pack opened',         buyQty: '1 pack',      isHTOnly: false },
  { id: 'sc-027', name: "Snickers Ice Cream Bars",                category: "Frozen Treats",     store: 'sams', parStock: 1, unit: 'box',             cadenceDays: 14, approxCost: 15.08, parMin: 'Last few bars',            buyQty: '1 box',       isHTOnly: false },
  { id: 'sc-028', name: "Bounty Paper Towels Select-A-Size",      category: "Household",         store: 'sams', parStock: 1, unit: 'pack',            cadenceDays: 37, approxCost: 33.89, parMin: 'Last 2 rolls',             buyQty: '1 pack',      isHTOnly: false },
  // ─── HARRIS TEETER ────────────────────────────────────────────────────────
  { id: 'ht-001', name: "Boneless Chicken Breast Value Pack",     category: "Freezer — Protein", store: 'ht',   parStock: 1, unit: 'pack',            cadenceDays: 30, approxCost: 18.50, parMin: 'No chicken breast left',   buyQty: '1 pack',      isHTOnly: false },
  { id: 'ht-002', name: "Chicken Wings Value Pack",               category: "Freezer — Protein", store: 'ht',   parStock: 1, unit: 'pack',            cadenceDays: 30, approxCost: 39.81, parMin: 'Wings gone',               buyQty: '1 pack',      isHTOnly: false },
  { id: 'ht-003', name: "Niman Ranch Center Cut Pork Chops",      category: "Freezer — Protein", store: 'ht',   parStock: 1, unit: 'pack',            cadenceDays: 30, approxCost: 22.77, parMin: 'No pork chops',            buyQty: '1 pack',      isHTOnly: false },
  { id: 'ht-004', name: "Choice T-Bone Steak (4-pack)",           category: "Freezer — Protein", store: 'ht',   parStock: 1, unit: 'four-pack',       cadenceDays: 60, approxCost: 79.96, parMin: 'Last steak used',          buyQty: '1 four-pack', isHTOnly: false },
  { id: 'ht-005', name: "Wild Alaskan Pink Salmon",               category: "Freezer — Protein", store: 'ht',   parStock: 2, unit: 'packs',           cadenceDays: 30, approxCost: 11.38, parMin: 'Freezer fish gone',        buyQty: '2 packs',     isHTOnly: false },
  { id: 'ht-006', name: "Goodnight Brothers Ham Centers",         category: "Deli",              store: 'ht',   parStock: 2, unit: 'packs',           cadenceDays: 24, approxCost:  9.98, parMin: 'Last pack',                buyQty: '2 packs',     isHTOnly: false },
  { id: 'ht-007', name: "HT Vitamin D Whole Milk Gallon",         category: "Dairy & Eggs",      store: 'ht',   parStock: 2, unit: 'jugs',            cadenceDays: 14, approxCost:  3.49, parMin: 'Down to 1 jug',            buyQty: '2 jugs',      isHTOnly: false },
  { id: 'ht-008', name: "Simply Orange Pulp Free OJ",             category: "Dairy & Eggs",      store: 'ht',   parStock: 2, unit: 'bottles',         cadenceDays: 21, approxCost:  5.99, parMin: 'Down to 1 bottle',         buyQty: '2 bottles',   isHTOnly: false },
  { id: 'ht-009', name: "Strawberries 1 lb Clamshell",            category: "Fresh Fruit",       store: 'ht',   parStock: 2, unit: 'cartons',         cadenceDays: 15, approxCost:  5.99, parMin: 'Last carton nearly empty', buyQty: '2 cartons',   isHTOnly: false },
  { id: 'ht-010', name: "Green / White Seedless Grapes",          category: "Fresh Fruit",       store: 'ht',   parStock: 2, unit: 'bags',            cadenceDays: 38, approxCost:  8.38, parMin: 'Down to last half bag',    buyQty: '2 bags',      isHTOnly: false },
  { id: 'ht-011', name: "Bananas (HT bunch)",                     category: "Fresh Fruit",       store: 'ht',   parStock: 1, unit: 'bunch',           cadenceDays: 15, approxCost:  1.59, parMin: 'Last 2–3 bananas',         buyQty: '1 bunch',     isHTOnly: false },
  { id: 'ht-012', name: "Navel Oranges bag",                      category: "Fresh Fruit",       store: 'ht',   parStock: 1, unit: 'bag',             cadenceDays: 30, approxCost:  7.74, parMin: 'Down to 3–4 oranges',      buyQty: '1 bag',       isHTOnly: false },
  { id: 'ht-013', name: "Thomas' Plain Bagels",                   category: "Bread & Bakery",    store: 'ht',   parStock: 2, unit: 'packs',           cadenceDays: 12, approxCost:  5.99, parMin: 'Last pack opened',         buyQty: '2 packs',     isHTOnly: false },
  { id: 'ht-014', name: "Thomas' Blueberry Bagels",               category: "Bread & Bakery",    store: 'ht',   parStock: 2, unit: 'packs',           cadenceDays: 17, approxCost:  5.99, parMin: 'Last pack opened',         buyQty: '2 packs',     isHTOnly: false },
  { id: 'ht-015', name: "Nature's Own WhiteWheat Bread",          category: "Bread & Bakery",    store: 'ht',   parStock: 2, unit: 'loaves',          cadenceDays: 24, approxCost:  3.99, parMin: 'Down to last loaf',        buyQty: '2 loaves',    isHTOnly: false },
  { id: 'ht-016', name: "Pepperidge Farm Sourdough Bread",        category: "Bread & Bakery",    store: 'ht',   parStock: 1, unit: 'loaf',            cadenceDays: 30, approxCost:  5.06, parMin: 'Out of sourdough',         buyQty: '1 loaf',      isHTOnly: false },
  { id: 'ht-017', name: "Go-GURT Strawberry Tubes",               category: "Snacks & Kids",     store: 'ht',   parStock: 2, unit: 'boxes',           cadenceDays: 15, approxCost:  7.98, parMin: 'Last box opened',          buyQty: '2 boxes',     isHTOnly: true  },
  { id: 'ht-018', name: "Hormel Pepperoni Stix",                  category: "Snacks & Kids",     store: 'ht',   parStock: 2, unit: 'bags',            cadenceDays: 29, approxCost: 11.98, parMin: 'Last bag opened',          buyQty: '2 bags',      isHTOnly: true  },
  { id: 'ht-019', name: "Hormel Pepperoni Minis",                 category: "Snacks & Kids",     store: 'ht',   parStock: 2, unit: 'bags',            cadenceDays: 30, approxCost:  5.99, parMin: 'Last bag',                 buyQty: '2 bags',      isHTOnly: false },
  { id: 'ht-020', name: "SpongeBob String Cheese",                category: "Snacks & Kids",     store: 'ht',   parStock: 2, unit: 'bags',            cadenceDays: 46, approxCost: 15.98, parMin: 'Last few sticks',          buyQty: '2 bags',      isHTOnly: false },
  { id: 'ht-021', name: "OREO Double Stuf Family Size",           category: "Snacks & Kids",     store: 'ht',   parStock: 2, unit: 'packs',           cadenceDays: 17, approxCost:  9.48, parMin: 'Last pack half-gone',      buyQty: '2 packs',     isHTOnly: false },
  { id: 'ht-022', name: "Mott's Applesauce Cups",                 category: "Snacks & Kids",     store: 'ht',   parStock: 2, unit: 'packs',           cadenceDays: 30, approxCost:  3.99, parMin: 'Last pack',                buyQty: '2 packs',     isHTOnly: false },
  { id: 'ht-023', name: "Mountain Dew Soda Mini Cans",            category: "Beverages",         store: 'ht',   parStock: 2, unit: 'packs',           cadenceDays: 23, approxCost:  8.99, parMin: 'Last pack opened',         buyQty: '2 packs',     isHTOnly: false },
  { id: 'ht-024', name: "Bush's Blackeye Peas 15.8 oz",           category: "Pantry",            store: 'ht',   parStock: 4, unit: 'cans',            cadenceDays: 43, approxCost:  7.96, parMin: 'Last 2 cans',              buyQty: '4 cans',      isHTOnly: false },
  { id: 'ht-025', name: "Barilla Spaghetti (5-pack)",             category: "Pantry",            store: 'ht',   parStock: 1, unit: 'pack',            cadenceDays: 67, approxCost:  9.38, parMin: 'Last box',                 buyQty: '1 pack',      isHTOnly: false },
  { id: 'ht-026', name: "Rice-A-Roni Chicken",                    category: "Pantry",            store: 'ht',   parStock: 3, unit: 'boxes',           cadenceDays: 30, approxCost:  7.17, parMin: 'Last box',                 buyQty: '3 boxes',     isHTOnly: false },
  { id: 'ht-027', name: "Stouffer's French Bread Pizza",          category: "Frozen",            store: 'ht',   parStock: 2, unit: 'boxes',           cadenceDays: 30, approxCost: 13.77, parMin: 'Out of frozen pizza',      buyQty: '2 boxes',     isHTOnly: false },
  { id: 'ht-028', name: "Sister Schubert's Yeast Rolls",          category: "Frozen",            store: 'ht',   parStock: 2, unit: 'bags',            cadenceDays: 30, approxCost: 11.00, parMin: 'Last bag',                 buyQty: '2 bags',      isHTOnly: false },
  { id: 'ht-029', name: "Checkers / Arby's Seasoned Fries",       category: "Frozen",            store: 'ht',   parStock: 2, unit: 'bags',            cadenceDays: 14, approxCost:  6.00, parMin: 'Last bag',                 buyQty: '2 bags',      isHTOnly: false },
  { id: 'ht-030', name: "Bonduelle Caesar Salad Bowl",            category: "Produce",           store: 'ht',   parStock: 2, unit: 'bowls',           cadenceDays: 14, approxCost:  5.00, parMin: 'Out of salad',             buyQty: '2 bowls',     isHTOnly: false },
];
