import type { Item, Store } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// MASTER CATALOG — All prices from 2025–2026 Instacart receipts
// cadenceDays = observed purchase interval | parMin = reorder trigger
// isHTOnly = not available at Sam's Club
// ─────────────────────────────────────────────────────────────────────────────

export const MASTER_CATALOG: Item[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // SAM'S CLUB
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── FREEZER — PROTEIN ────────────────────────────────────────────────────
  { id: 'sc-001', name: "Wright Thick Cut Bacon, 4 lb",         category: "Freezer — Protein", store: 'sams', parStock: 2, unit: 'packs',         cadenceDays: 10, approxCost: 26.19, isHTOnly: false, parMin: 'Down to 1 pack',          buyQty: '2 packs',    notes: 'Critical — runs out fastest. Buy 2.' },
  { id: 'sc-002', name: "88% Lean Ground Beef",                 category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'pack (~4–5 lb)', cadenceDays: 46, approxCost: 28.67, isHTOnly: false, parMin: 'Last 2 lbs',              buyQty: '1 pack',     notes: 'Reorder at last 2 lbs.' },
  { id: 'sc-003', name: "Boneless Skinless Chicken Thighs",     category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'bag (~5 lb)',    cadenceDays: 65, approxCost: 25.50, isHTOnly: false, parMin: 'Less than 1 lb left',    buyQty: '1 bag',      notes: 'Reorder under 1 lb remaining.' },
  { id: 'sc-004', name: "Whole Chicken Wings",                  category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'bag',            cadenceDays: 30, approxCost: 22.43, isHTOnly: false, parMin: 'Freezer wings gone',     buyQty: '1 bag',      notes: 'Monthly rotation.' },
  { id: 'sc-005', name: "Jimmy Dean Sausage Roll 32 oz",        category: "Freezer — Protein", store: 'sams', parStock: 2, unit: 'rolls',          cadenceDays: 30, approxCost:  8.52, isHTOnly: false, parMin: 'Opened last roll',       buyQty: '2 rolls',    notes: 'Buy 2 when restocking.' },
  { id: 'sc-006', name: "Pork Spareribs",                       category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'rack',           cadenceDays: 40, approxCost: 43.09, isHTOnly: false, parMin: 'No pork in freezer',    buyQty: '1 rack',     notes: 'Rotate monthly when no pork.' },
  { id: 'sc-007', name: "Pork Boston Butt",                     category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'butt',           cadenceDays: 60, approxCost: 29.59, isHTOnly: false, parMin: 'No pork in freezer',    buyQty: '1 butt',     notes: 'Every other month.' },
  { id: 'sc-008', name: "Pork Loin Roast Boneless",             category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'roast',          cadenceDays: 40, approxCost: 27.11, isHTOnly: false, parMin: 'No pork in freezer',    buyQty: '1 roast',    notes: 'Monthly rotation cut.' },
  { id: 'sc-009', name: "Pork Loin Back Ribs",                  category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'rack',           cadenceDays: 60, approxCost: 50.19, isHTOnly: false, parMin: 'Craving ribs',          buyQty: '1 rack',     notes: 'Occasional — special occasion.' },
  { id: 'sc-010', name: "Bone-In Center Cut Pork Chops",        category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'pack',           cadenceDays: 30, approxCost: 17.98, isHTOnly: false, parMin: 'No pork chops',         buyQty: '1 pack',     notes: 'Monthly rotation.' },
  { id: 'sc-011', name: "Members Mark Angus Ribeye Steak",      category: "Freezer — Protein", store: 'sams', parStock: 2, unit: 'steaks',         cadenceDays: 45, approxCost: 58.68, isHTOnly: false, parMin: 'Last steak used',       buyQty: '2 steaks',   notes: 'Monthly. Buy 2.' },
  { id: 'sc-012', name: "Beef Flank Steak",                     category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'pack',           cadenceDays: 60, approxCost: 64.99, isHTOnly: false, parMin: 'Freezer beef gone',     buyQty: '1 pack',     notes: 'Every other month.' },
  { id: 'sc-013', name: "Beef Short Ribs",                      category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'pack',           cadenceDays: 90, approxCost: 47.75, isHTOnly: false, parMin: 'When craving',          buyQty: '1 pack',     notes: 'Occasional / seasonal.' },
  { id: 'sc-014', name: "Beef Brisket Flat",                    category: "Freezer — Protein", store: 'sams', parStock: 1, unit: 'flat',           cadenceDays: 90, approxCost: 55.91, isHTOnly: false, parMin: 'Seasonal / event',      buyQty: '1 flat',     notes: 'Special occasion.' },
  // NEW from 2026 receipts
  { id: 'sc-029', name: "Members Mark Rising Crust Pepperoni Pizza", category: "Frozen",      store: 'sams', parStock: 1, unit: 'pack',           cadenceDays: 30, approxCost: 15.84, isHTOnly: false, parMin: 'Out of frozen pizza',   buyQty: '1 pack',     notes: 'Monthly.' },
  { id: 'sc-030', name: "Reser's Baked Scalloped Potatoes",     category: "Frozen",            store: 'sams', parStock: 1, unit: 'pack',           cadenceDays: 30, approxCost:  9.74, isHTOnly: false, parMin: 'Out',                   buyQty: '1 pack',     notes: 'Side dish rotation.' },
  { id: 'sc-031', name: "MadeGood Granola Bars",                category: "Snacks & Kids",     store: 'sams', parStock: 1, unit: 'box',            cadenceDays: 30, approxCost: 17.06, isHTOnly: false, parMin: 'Last few bars',         buyQty: '1 box',      notes: 'Organic snack bars.' },
  { id: 'sc-032', name: "Milo's Sweet Iced Tea (Sam's)",        category: "Beverages",         store: 'sams', parStock: 1, unit: 'jug',            cadenceDays: 30, approxCost:  4.32, isHTOnly: false, parMin: 'Out',                   buyQty: '1 jug',      notes: 'Large jug.' },
  { id: 'sc-033', name: "Bragg Apple Cider Vinegar",            category: "Pantry",            store: 'sams', parStock: 1, unit: 'bottle',         cadenceDays: 90, approxCost: 12.18, isHTOnly: false, parMin: 'Almost empty',          buyQty: '1 bottle',   notes: 'Bulk pantry item.' },

  // ─── DAIRY & EGGS ──────────────────────────────────────────────────────────
  { id: 'sc-015', name: "Members Mark Whole Milk",              category: "Dairy & Eggs",      store: 'sams', parStock: 2, unit: 'jugs',           cadenceDays: 10, approxCost:  4.32, isHTOnly: false, parMin: 'Down to 1 jug',         buyQty: '2 jugs',     notes: 'Per jug. Buy 2.' },
  { id: 'sc-016', name: "Members Mark OJ 100% Pulp Free",       category: "Dairy & Eggs",      store: 'sams', parStock: 2, unit: 'jugs',           cadenceDays: 41, approxCost:  9.37, isHTOnly: false, parMin: 'Down to 1 jug',         buyQty: '2 jugs',     notes: 'Per jug.' },
  { id: 'sc-017', name: "Cage-Free Large Eggs",                 category: "Dairy & Eggs",      store: 'sams', parStock: 1, unit: 'flat',           cadenceDays: 28, approxCost:  8.52, isHTOnly: false, parMin: 'Last 6 eggs',           buyQty: '1 flat',     notes: 'Per flat.' },

  // ─── FRESH FRUIT ───────────────────────────────────────────────────────────
  { id: 'sc-018', name: "Strawberries (Sam's bag)",             category: "Fresh Fruit",       store: 'sams', parStock: 2, unit: 'bags',           cadenceDays: 15, approxCost:  8.14, isHTOnly: false, parMin: 'Last carton nearly empty', buyQty: '2 bags',  notes: 'Vinegar wash on arrival.' },
  { id: 'sc-019', name: "Green Seedless Grapes",                category: "Fresh Fruit",       store: 'sams', parStock: 2, unit: 'bags',           cadenceDays: 20, approxCost:  8.32, isHTOnly: false, parMin: 'Last half bag',         buyQty: '2 bags',     notes: 'Keep unwashed in original bag.' },
  { id: 'sc-020', name: "Bananas (3 lb bag)",                   category: "Fresh Fruit",       store: 'sams', parStock: 1, unit: 'bag',            cadenceDays: 15, approxCost:  1.79, isHTOnly: false, parMin: 'Last 2–3 bananas',      buyQty: '1 bag',      notes: 'Separate stems, wrap tips.' },
  { id: 'sc-021', name: "Navel Oranges (bulk bag)",             category: "Fresh Fruit",       store: 'sams', parStock: 1, unit: 'bag',            cadenceDays: 30, approxCost: 13.00, isHTOnly: false, parMin: 'Down to 3–4 oranges',   buyQty: '1 bag',      notes: 'Fridge crisper — lasts 4–6 weeks.' },

  // ─── PANTRY ────────────────────────────────────────────────────────────────
  { id: 'sc-022', name: "McCafé K-Cup Pods",                    category: "Pantry",            store: 'sams', parStock: 1, unit: 'box',            cadenceDays: 25, approxCost: 51.83, isHTOnly: false, parMin: 'Last 10 pods',          buyQty: '1 box',      notes: 'Per box.' },
  { id: 'sc-023', name: "Kraft Mac & Cheese (bulk)",            category: "Pantry",            store: 'sams', parStock: 1, unit: 'pack',           cadenceDays: 45, approxCost: 12.18, isHTOnly: false, parMin: 'Last 2 boxes',          buyQty: '1 pack',     notes: 'Bulk multi-pack. Price updated from 2026 receipt.' },
  { id: 'sc-024', name: "Cheerios (bulk)",                      category: "Pantry",            store: 'sams', parStock: 1, unit: 'pack',           cadenceDays: 30, approxCost:  8.39, isHTOnly: false, parMin: 'Last box',              buyQty: '1 pack',     notes: '40 oz or 2-pack.' },
  { id: 'sc-025', name: "Lucky Charms (bulk)",                  category: "Pantry",            store: 'sams', parStock: 1, unit: 'box',            cadenceDays: 30, approxCost:  9.61, isHTOnly: false, parMin: 'Getting low',           buyQty: '1 box',      notes: 'Large box. From 2026 receipts.' },

  // ─── BEVERAGES ─────────────────────────────────────────────────────────────
  { id: 'sc-026', name: "Coca-Cola Mini Cans",                  category: "Beverages",         store: 'sams', parStock: 1, unit: 'pack',           cadenceDays: 69, approxCost: 20.72, isHTOnly: false, parMin: 'Last pack opened',      buyQty: '1 pack',     notes: 'Price updated from 2026 receipt.' },

  // ─── FROZEN TREATS ─────────────────────────────────────────────────────────
  { id: 'sc-027', name: "Snickers Ice Cream Bars",              category: "Frozen Treats",     store: 'sams', parStock: 1, unit: 'box',            cadenceDays: 14, approxCost: 15.08, isHTOnly: false, parMin: 'Last few bars',         buyQty: '1 box',      notes: 'Frequently out of stock.' },

  // ─── HOUSEHOLD ─────────────────────────────────────────────────────────────
  { id: 'sc-028', name: "Bounty Paper Towels Select-A-Size",    category: "Household",         store: 'sams', parStock: 1, unit: 'pack',           cadenceDays: 37, approxCost: 31.33, isHTOnly: false, parMin: 'Last 2 rolls',          buyQty: '1 pack',     notes: 'Price updated from 2026 receipt.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // HARRIS TEETER
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── FREEZER — PROTEIN ─────────────────────────────────────────────────────
  { id: 'ht-001', name: "Boneless Chicken Breast Value Pack",   category: "Freezer — Protein", store: 'ht',   parStock: 1, unit: 'pack',           cadenceDays: 30, approxCost: 18.50, isHTOnly: false, parMin: 'No chicken breast left', buyQty: '1 pack',    notes: 'Monthly.' },
  { id: 'ht-002', name: "Chicken Wings Value Pack",             category: "Freezer — Protein", store: 'ht',   parStock: 1, unit: 'pack',           cadenceDays: 30, approxCost: 39.81, isHTOnly: false, parMin: 'Wings gone',            buyQty: '1 pack',     notes: 'Varies by lb. Monthly.' },
  { id: 'ht-003', name: "Niman Ranch Center Cut Pork Chops",    category: "Freezer — Protein", store: 'ht',   parStock: 1, unit: 'pack',           cadenceDays: 30, approxCost: 22.77, isHTOnly: false, parMin: 'No pork chops',         buyQty: '1 pack',     notes: 'Premium monthly rotation.' },
  { id: 'ht-004', name: "Choice T-Bone Steak (4-pack)",         category: "Freezer — Protein", store: 'ht',   parStock: 1, unit: 'four-pack',       cadenceDays: 60, approxCost: 79.96, isHTOnly: false, parMin: 'Last steak used',       buyQty: '1 four-pack', notes: 'Plan ahead.' },
  { id: 'ht-005', name: "Wild Alaskan Pink Salmon",             category: "Freezer — Protein", store: 'ht',   parStock: 2, unit: 'packs',          cadenceDays: 30, approxCost: 11.38, isHTOnly: false, parMin: 'Freezer fish gone',     buyQty: '2 packs',    notes: 'Monthly seafood rotation.' },
  // NEW from 2026 receipts
  { id: 'ht-031', name: "HT Whole Rotisserie Chicken",          category: "Freezer — Protein", store: 'ht',   parStock: 1, unit: 'each',           cadenceDays: 14, approxCost:  7.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1',          notes: 'Available 11am–7pm.' },
  { id: 'ht-032', name: "Butterball Frozen Turkey Breast Roast",category: "Freezer — Protein", store: 'ht',   parStock: 1, unit: 'each',           cadenceDays: 60, approxCost: 15.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1',          notes: 'Occasional.' },

  // ─── DELI ──────────────────────────────────────────────────────────────────
  { id: 'ht-006', name: "Goodnight Brothers Ham Centers",       category: "Deli",              store: 'ht',   parStock: 2, unit: 'packs',          cadenceDays: 24, approxCost:  9.98, isHTOnly: false, parMin: 'Last pack',             buyQty: '2 packs',    notes: 'High frequency — 15x in 2025.' },
  // NEW from 2026 receipts
  { id: 'ht-033', name: "Boar's Head Deluxe Ham (deli)",        category: "Deli",              store: 'ht',   parStock: 1, unit: 'pack',           cadenceDays: 14, approxCost: 16.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1 pack',     notes: 'Pre-sliced deli pack. Appeared in 3 orders.' },
  { id: 'ht-034', name: "HT Tuna Salad",                        category: "Deli",              store: 'ht',   parStock: 1, unit: 'container',       cadenceDays: 30, approxCost:  7.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1',          notes: 'Occasional.' },
  { id: 'ht-035', name: "Neese's Hot Country Sausage",          category: "Deli",              store: 'ht',   parStock: 1, unit: 'pack',           cadenceDays: 30, approxCost:  6.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1 pack',     notes: 'Local brand.' },

  // ─── DAIRY & EGGS ──────────────────────────────────────────────────────────
  { id: 'ht-007', name: "HT Vitamin D Whole Milk Gallon",       category: "Dairy & Eggs",      store: 'ht',   parStock: 2, unit: 'jugs',           cadenceDays: 14, approxCost:  3.49, isHTOnly: false, parMin: 'Down to 1 jug',         buyQty: '2 jugs',     notes: 'Top-off between Sam\'s runs.' },
  { id: 'ht-008', name: "Simply Orange Pulp Free OJ",           category: "Dairy & Eggs",      store: 'ht',   parStock: 2, unit: 'bottles',        cadenceDays: 21, approxCost:  5.99, isHTOnly: false, parMin: 'Down to 1 bottle',      buyQty: '2 bottles',  notes: 'Top-off between Sam\'s runs.' },
  { id: 'ht-036', name: "HT Large White Eggs",                  category: "Dairy & Eggs",      store: 'ht',   parStock: 1, unit: 'dozen',          cadenceDays: 14, approxCost:  5.99, isHTOnly: false, parMin: 'Last 6 eggs',           buyQty: '1 dozen',    notes: 'Top-off when Sam\'s flat is low.' },
  { id: 'ht-037', name: "Daisy Cottage Cheese 4%",              category: "Dairy & Eggs",      store: 'ht',   parStock: 2, unit: 'containers',     cadenceDays: 14, approxCost:  4.99, isHTOnly: false, parMin: 'Last container',        buyQty: '2',          notes: 'Appeared in 2 orders.' },
  { id: 'ht-038', name: "Daisy Sour Cream",                     category: "Dairy & Eggs",      store: 'ht',   parStock: 1, unit: 'container',      cadenceDays: 21, approxCost:  2.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1',          notes: 'Occasional.' },
  { id: 'ht-039', name: "Sargento Whole Milk Mozzarella Shredded", category: "Dairy & Eggs", store: 'ht',   parStock: 2, unit: 'bags',           cadenceDays: 21, approxCost:  4.99, isHTOnly: false, parMin: 'Last bag',              buyQty: '2 bags',     notes: 'Appeared in 1 order, qty 4.' },
  { id: 'ht-040', name: "Land O Lakes Unsalted Butter",         category: "Dairy & Eggs",      store: 'ht',   parStock: 1, unit: 'box (4 sticks)', cadenceDays: 45, approxCost:  7.99, isHTOnly: false, parMin: 'Last stick',            buyQty: '1 box',      notes: 'Baking / cooking.' },
  { id: 'ht-041', name: "Coffee Mate French Vanilla Creamer",   category: "Dairy & Eggs",      store: 'ht',   parStock: 1, unit: 'bottle',         cadenceDays: 30, approxCost:  8.99, isHTOnly: false, parMin: 'Almost out',            buyQty: '1 bottle',   notes: 'Zero sugar variety.' },

  // ─── FRESH FRUIT ───────────────────────────────────────────────────────────
  { id: 'ht-009', name: "Strawberries 1 lb Clamshell",          category: "Fresh Fruit",       store: 'ht',   parStock: 2, unit: 'cartons',        cadenceDays: 15, approxCost:  5.99, isHTOnly: false, parMin: 'Last carton nearly empty', buyQty: '2 cartons', notes: 'Vinegar wash on arrival.' },
  { id: 'ht-010', name: "Green / White Seedless Grapes",        category: "Fresh Fruit",       store: 'ht',   parStock: 2, unit: 'bags',           cadenceDays: 38, approxCost:  8.38, isHTOnly: false, parMin: 'Down to last half bag', buyQty: '2 bags',     notes: 'Keep unwashed, crisper high humidity.' },
  { id: 'ht-011', name: "Bananas (HT bunch)",                   category: "Fresh Fruit",       store: 'ht',   parStock: 1, unit: 'bunch',          cadenceDays: 15, approxCost:  1.59, isHTOnly: false, parMin: 'Last 2–3 bananas',      buyQty: '1 bunch',    notes: 'Top-off between Sam\'s runs.' },
  { id: 'ht-012', name: "Navel Oranges bag",                    category: "Fresh Fruit",       store: 'ht',   parStock: 1, unit: 'bag',            cadenceDays: 30, approxCost:  7.74, isHTOnly: false, parMin: 'Down to 3–4 oranges',   buyQty: '1 bag',      notes: 'Fridge crisper 4–6 weeks.' },
  { id: 'ht-042', name: "HT Fuji Apples 3 lb Bag",              category: "Fresh Fruit",       store: 'ht',   parStock: 1, unit: 'bag',            cadenceDays: 14, approxCost:  5.99, isHTOnly: false, parMin: 'Out of apples',         buyQty: '1 bag',      notes: 'Bi-weekly fresh fruit rotation.' },
  { id: 'ht-043', name: "Pineapple Chunks",                     category: "Fresh Fruit",       store: 'ht',   parStock: 1, unit: 'container',      cadenceDays: 30, approxCost:  9.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1',          notes: 'Appeared in 2 orders.' },

  // ─── BREAD & BAKERY ────────────────────────────────────────────────────────
  { id: 'ht-013', name: "Thomas' Plain Bagels",                 category: "Bread & Bakery",    store: 'ht',   parStock: 2, unit: 'packs',          cadenceDays: 12, approxCost:  5.99, isHTOnly: false, parMin: 'Last pack opened',      buyQty: '2 packs',    notes: '#1 HT item by frequency — 28x in 2025.' },
  { id: 'ht-014', name: "Thomas' Blueberry Bagels",             category: "Bread & Bakery",    store: 'ht',   parStock: 2, unit: 'packs',          cadenceDays: 17, approxCost:  5.99, isHTOnly: false, parMin: 'Last pack opened',      buyQty: '2 packs',    notes: '17x in 2025.' },
  { id: 'ht-015', name: "Nature's Own WhiteWheat Bread",        category: "Bread & Bakery",    store: 'ht',   parStock: 2, unit: 'loaves',         cadenceDays: 24, approxCost:  3.99, isHTOnly: false, parMin: 'Down to last loaf',     buyQty: '2 loaves',   notes: '11x in 2025.' },
  { id: 'ht-016', name: "Pepperidge Farm Sourdough Bread",      category: "Bread & Bakery",    store: 'ht',   parStock: 1, unit: 'loaf',           cadenceDays: 30, approxCost:  5.06, isHTOnly: false, parMin: 'Out of sourdough',      buyQty: '1 loaf',     notes: 'Monthly variety.' },

  // ─── SNACKS & KIDS ─────────────────────────────────────────────────────────
  { id: 'ht-017', name: "Go-GURT Strawberry Tubes",             category: "Snacks & Kids",     store: 'ht',   parStock: 2, unit: 'boxes',          cadenceDays: 15, approxCost:  7.98, isHTOnly: true,  parMin: 'Last box opened',       buyQty: '2 boxes',    notes: '⚠️ HT ONLY. 15x in 2025.' },
  { id: 'ht-018', name: "Hormel Pepperoni Stix",                category: "Snacks & Kids",     store: 'ht',   parStock: 2, unit: 'bags',           cadenceDays: 29, approxCost: 11.98, isHTOnly: true,  parMin: 'Last bag opened',       buyQty: '2 bags',     notes: '⚠️ HT ONLY. 11x in 2025.' },
  { id: 'ht-019', name: "Hormel Pepperoni Minis",               category: "Snacks & Kids",     store: 'ht',   parStock: 2, unit: 'bags',           cadenceDays: 30, approxCost:  5.99, isHTOnly: false, parMin: 'Last bag',              buyQty: '2 bags',     notes: '5x in 2025.' },
  { id: 'ht-020', name: "SpongeBob / Paw Patrol String Cheese", category: "Snacks & Kids",     store: 'ht',   parStock: 2, unit: 'bags',           cadenceDays: 46, approxCost: 15.98, isHTOnly: false, parMin: 'Last few sticks',       buyQty: '2 bags',     notes: 'Kids string cheese — brand varies.' },
  { id: 'ht-021', name: "OREO Double Stuf Family Size",         category: "Snacks & Kids",     store: 'ht',   parStock: 2, unit: 'packs',          cadenceDays: 17, approxCost:  9.48, isHTOnly: false, parMin: 'Last pack half-gone',   buyQty: '2 packs',    notes: '12x in 2025.' },
  { id: 'ht-022', name: "Mott's Applesauce Cups",               category: "Snacks & Kids",     store: 'ht',   parStock: 2, unit: 'packs',          cadenceDays: 30, approxCost:  3.99, isHTOnly: false, parMin: 'Last pack',             buyQty: '2 packs',    notes: 'Monthly.' },
  // NEW
  { id: 'ht-044', name: "Cheez-It Extra Toasty",                category: "Snacks & Kids",     store: 'ht',   parStock: 1, unit: 'box',            cadenceDays: 30, approxCost:  6.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1 box',      notes: 'Occasional snack.' },
  { id: 'ht-045', name: "RITZ Fresh Stacks Crackers",           category: "Snacks & Kids",     store: 'ht',   parStock: 1, unit: 'pack',           cadenceDays: 30, approxCost:  5.49, isHTOnly: false, parMin: 'Out',                   buyQty: '1 pack',     notes: 'Occasional snack.' },
  { id: 'ht-046', name: "Triscuit Rosemary & Olive Oil",        category: "Snacks & Kids",     store: 'ht',   parStock: 1, unit: 'box',            cadenceDays: 30, approxCost:  4.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1 box',      notes: 'Occasional snack.' },

  // ─── BEVERAGES ─────────────────────────────────────────────────────────────
  { id: 'ht-023', name: "Mountain Dew Soda Mini Cans",          category: "Beverages",         store: 'ht',   parStock: 2, unit: 'packs',          cadenceDays: 23, approxCost:  8.99, isHTOnly: false, parMin: 'Last pack opened',      buyQty: '2 packs',    notes: '13x in 2025.' },
  { id: 'ht-047', name: "Milo's Sweet Iced Tea Gallon (HT)",    category: "Beverages",         store: 'ht',   parStock: 1, unit: 'gallon',         cadenceDays: 14, approxCost:  4.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1',          notes: 'Bi-weekly. Appeared in multiple orders.' },

  // ─── PANTRY ────────────────────────────────────────────────────────────────
  { id: 'ht-024', name: "Bush's Blackeye Peas 15.8 oz",         category: "Pantry",            store: 'ht',   parStock: 4, unit: 'cans',           cadenceDays: 43, approxCost:  1.99, isHTOnly: false, parMin: 'Last 2 cans',           buyQty: '4 cans',     notes: 'Per can. 8x in 2025.' },
  { id: 'ht-025', name: "Barilla Spaghetti (5-pack)",           category: "Pantry",            store: 'ht',   parStock: 1, unit: 'pack',           cadenceDays: 67, approxCost:  9.38, isHTOnly: false, parMin: 'Last box',              buyQty: '1 pack',     notes: '5x in 2025.' },
  { id: 'ht-026', name: "Rice-A-Roni Chicken",                  category: "Pantry",            store: 'ht',   parStock: 3, unit: 'boxes',          cadenceDays: 30, approxCost:  3.09, isHTOnly: false, parMin: 'Last box',              buyQty: '3 boxes',    notes: 'Per box. Buy 3.' },
  // NEW from 2026 receipts
  { id: 'ht-048', name: "Barilla Rotini Pasta",                 category: "Pantry",            store: 'ht',   parStock: 1, unit: 'box',            cadenceDays: 30, approxCost:  2.49, isHTOnly: false, parMin: 'Last box',              buyQty: '1 box',      notes: 'Pasta variety.' },
  { id: 'ht-049', name: "Barilla Oven-Ready Lasagne",           category: "Pantry",            store: 'ht',   parStock: 2, unit: 'boxes',          cadenceDays: 45, approxCost:  3.59, isHTOnly: false, parMin: 'Last box',              buyQty: '2 boxes',    notes: 'Occasional — lasagna night.' },
  { id: 'ht-050', name: "Kraft Mac N Cheese Cups",              category: "Pantry",            store: 'ht',   parStock: 1, unit: 'pack',           cadenceDays: 30, approxCost:  6.99, isHTOnly: false, parMin: 'Last cup',              buyQty: '1 pack',     notes: 'Easy mac cups.' },
  { id: 'ht-051', name: "Nestle Toll House Cookie Dough",       category: "Pantry",            store: 'ht',   parStock: 2, unit: 'rolls',          cadenceDays: 30, approxCost:  4.99, isHTOnly: false, parMin: 'Out',                   buyQty: '2 rolls',    notes: 'Baking.' },
  { id: 'ht-052', name: "Stove Top Stuffing Chicken",           category: "Pantry",            store: 'ht',   parStock: 1, unit: 'box',            cadenceDays: 30, approxCost:  3.49, isHTOnly: false, parMin: 'Out',                   buyQty: '1 box',      notes: 'Side dish.' },

  // ─── BAKING ────────────────────────────────────────────────────────────────
  { id: 'ht-053', name: "King Arthur All Purpose Flour",        category: "Baking",            store: 'ht',   parStock: 1, unit: 'bag (5 lb)',      cadenceDays: 60, approxCost:  5.99, isHTOnly: false, parMin: 'Almost empty',          buyQty: '1 bag',      notes: 'Non-GMO.' },
  { id: 'ht-054', name: "Swans Down Cake Flour",                category: "Baking",            store: 'ht',   parStock: 1, unit: 'box',            cadenceDays: 60, approxCost:  5.99, isHTOnly: false, parMin: 'Almost empty',          buyQty: '1 box',      notes: 'Baking.' },
  { id: 'ht-055', name: "HT Granulated Sugar",                  category: "Baking",            store: 'ht',   parStock: 1, unit: 'bag',            cadenceDays: 60, approxCost:  2.99, isHTOnly: false, parMin: 'Almost empty',          buyQty: '1 bag',      notes: 'Baking staple.' },
  { id: 'ht-056', name: "HT Light Brown Sugar",                 category: "Baking",            store: 'ht',   parStock: 1, unit: 'bag',            cadenceDays: 60, approxCost:  3.99, isHTOnly: false, parMin: 'Almost empty',          buyQty: '1 bag',      notes: 'Baking staple.' },
  { id: 'ht-057', name: "McCormick Pure Vanilla Extract",       category: "Baking",            store: 'ht',   parStock: 1, unit: 'bottle',         cadenceDays: 90, approxCost:  8.99, isHTOnly: false, parMin: 'Almost empty',          buyQty: '1 bottle',   notes: 'Baking staple.' },

  // ─── PRODUCE ───────────────────────────────────────────────────────────────
  { id: 'ht-030', name: "Bonduelle Caesar Salad Bowl",          category: "Produce",           store: 'ht',   parStock: 2, unit: 'bowls',          cadenceDays: 14, approxCost:  4.99, isHTOnly: false, parMin: 'Out of salad',          buyQty: '2 bowls',    notes: 'Bi-weekly.' },
  // NEW
  { id: 'ht-058', name: "Baby Spinach Bag",                     category: "Produce",           store: 'ht',   parStock: 1, unit: 'bag',            cadenceDays: 14, approxCost:  3.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1 bag',      notes: 'Bi-weekly greens.' },
  { id: 'ht-059', name: "NatureSweet Cherub Grape Tomatoes",    category: "Produce",           store: 'ht',   parStock: 1, unit: 'container',      cadenceDays: 14, approxCost:  4.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1',          notes: 'Snacking tomatoes.' },
  { id: 'ht-060', name: "Fresh Garlic",                         category: "Produce",           store: 'ht',   parStock: 2, unit: 'heads',          cadenceDays: 14, approxCost:  1.58, isHTOnly: false, parMin: 'Out of garlic',         buyQty: '2 heads',    notes: 'Per head. Cooking staple.' },
  { id: 'ht-061', name: "Sweet Yellow Onions",                  category: "Produce",           store: 'ht',   parStock: 1, unit: 'each',           cadenceDays: 14, approxCost:  2.45, isHTOnly: false, parMin: 'Out',                   buyQty: '1',          notes: 'Cooking staple.' },
  { id: 'ht-062', name: "Fresh Jalapeño Peppers",               category: "Produce",           store: 'ht',   parStock: 1, unit: 'each',           cadenceDays: 14, approxCost:  1.08, isHTOnly: false, parMin: 'Out',                   buyQty: '1',          notes: 'Occasional.' },
  { id: 'ht-063', name: "Yellow Squash",                        category: "Produce",           store: 'ht',   parStock: 1, unit: 'each',           cadenceDays: 14, approxCost:  1.50, isHTOnly: false, parMin: 'Out',                   buyQty: '1',          notes: 'Occasional.' },
  { id: 'ht-064', name: "Fresh Parsley",                        category: "Produce",           store: 'ht',   parStock: 1, unit: 'bunch',          cadenceDays: 14, approxCost:  1.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1 bunch',    notes: 'Cooking herb.' },
  { id: 'ht-065', name: "Sun Dried Tomatoes (julienne)",        category: "Produce",           store: 'ht',   parStock: 1, unit: 'jar',            cadenceDays: 60, approxCost:  5.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1 jar',      notes: 'Pantry/produce.' },
  { id: 'ht-066', name: "Dry Lentils",                          category: "Produce",           store: 'ht',   parStock: 1, unit: 'bag',            cadenceDays: 60, approxCost:  2.59, isHTOnly: false, parMin: 'Out',                   buyQty: '1 bag',      notes: 'Pantry staple.' },

  // ─── FROZEN ────────────────────────────────────────────────────────────────
  { id: 'ht-027', name: "Stouffer's French Bread Pizza",        category: "Frozen",            store: 'ht',   parStock: 2, unit: 'boxes',          cadenceDays: 30, approxCost: 13.77, isHTOnly: false, parMin: 'Out of frozen pizza',   buyQty: '2 boxes',    notes: 'Monthly.' },
  { id: 'ht-028', name: "Sister Schubert's Yeast Rolls",        category: "Frozen",            store: 'ht',   parStock: 2, unit: 'bags',           cadenceDays: 30, approxCost: 11.00, isHTOnly: false, parMin: 'Last bag',              buyQty: '2 bags',     notes: 'Monthly.' },
  { id: 'ht-029', name: "Checkers / Arby's Seasoned Fries",     category: "Frozen",            store: 'ht',   parStock: 2, unit: 'bags',           cadenceDays: 14, approxCost:  6.00, isHTOnly: false, parMin: 'Last bag',              buyQty: '2 bags',     notes: 'Bi-weekly.' },
  // NEW
  { id: 'ht-067', name: "Stouffer's Classic Lasagna Large",     category: "Frozen",            store: 'ht',   parStock: 2, unit: 'boxes',          cadenceDays: 30, approxCost:  5.99, isHTOnly: false, parMin: 'Out',                   buyQty: '2 boxes',    notes: 'Appeared in 2026 orders.' },
  { id: 'ht-068', name: "ALEXIA House Cut Fries",               category: "Frozen",            store: 'ht',   parStock: 1, unit: 'bag',            cadenceDays: 14, approxCost:  7.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1 bag',      notes: 'Premium fries alternative.' },

  // ─── HOUSEHOLD ─────────────────────────────────────────────────────────────
  { id: 'ht-069', name: "Finish Jet Dry Rinse Aid",             category: "Household",         store: 'ht',   parStock: 1, unit: 'bottle',         cadenceDays: 90, approxCost: 11.99, isHTOnly: false, parMin: 'Almost empty',          buyQty: '1 bottle',   notes: 'Dishwasher supply.' },
  { id: 'ht-070', name: "HT Quart Resealable Storage Bags",     category: "Household",         store: 'ht',   parStock: 1, unit: 'box',            cadenceDays: 60, approxCost:  3.99, isHTOnly: false, parMin: 'Almost out',            buyQty: '1 box',      notes: 'Storage bags.' },
  { id: 'ht-071', name: "HT Snack Resealable Bags",             category: "Household",         store: 'ht',   parStock: 1, unit: 'box',            cadenceDays: 60, approxCost:  3.99, isHTOnly: false, parMin: 'Almost out',            buyQty: '1 box',      notes: 'Storage bags.' },
  { id: 'ht-072', name: "Ziploc Gallon Freezer Bags",           category: "Household",         store: 'ht',   parStock: 1, unit: 'box',            cadenceDays: 60, approxCost:  8.99, isHTOnly: false, parMin: 'Almost out',            buyQty: '1 box',      notes: 'Freezer bags.' },
  { id: 'ht-073', name: "Handi-foil Loaf Pans with Lids",       category: "Household",         store: 'ht',   parStock: 3, unit: 'pans',           cadenceDays: 60, approxCost:  5.99, isHTOnly: false, parMin: 'Out',                   buyQty: '3',          notes: 'Baking / meal prep.' },
  { id: 'ht-074', name: "Roasted Red Peppers (jar)",            category: "Pantry",            store: 'ht',   parStock: 1, unit: 'jar',            cadenceDays: 60, approxCost:  3.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1 jar',      notes: 'Pantry staple.' },
  { id: 'ht-075', name: "Nathan's Skinless Beef Franks",        category: "Deli",              store: 'ht',   parStock: 1, unit: 'pack',           cadenceDays: 30, approxCost:  8.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1 pack',     notes: 'Occasional.' },
  { id: 'ht-076', name: "HT Sharp Cheddar Cheese Chunk",        category: "Dairy & Eggs",      store: 'ht',   parStock: 1, unit: 'block',          cadenceDays: 30, approxCost:  5.99, isHTOnly: false, parMin: 'Out',                   buyQty: '1 block',    notes: 'Cooking cheese.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper exports
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORIES = Array.from(
  new Set(MASTER_CATALOG.map(i => i.category))
).sort();

export const getItemsByStore = (store: Store): Item[] => {
  if (store === 'both') return MASTER_CATALOG;
  return MASTER_CATALOG.filter(item => item.store === store);
};

export const getItemsByCategory = (category: string): Item[] =>
  MASTER_CATALOG.filter(item => item.category === category);

export const getHTOnlyItems = (): Item[] =>
  MASTER_CATALOG.filter(item => item.isHTOnly);

export const getCriticalItems = (): Item[] =>
  MASTER_CATALOG.filter(item => item.cadenceDays <= 14);
