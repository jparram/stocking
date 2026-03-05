import type { Item, Store } from '../types';

export const MASTER_CATALOG: Item[] = [
  // ─── SAM'S CLUB ITEMS ──────────────────────────────────────────────────────
  // Proteins / Meat
  {
    id: 'sc-001', name: 'Chicken Breasts (Boneless)', category: 'Proteins', store: 'sams',
    parStock: 6, unit: 'lbs', cadenceDays: 7, approxCost: 18.00,
    notes: '4-pack family size'
  },
  {
    id: 'sc-002', name: 'Ground Beef (80/20)', category: 'Proteins', store: 'sams',
    parStock: 5, unit: 'lbs', cadenceDays: 14, approxCost: 22.00,
  },
  {
    id: 'sc-003', name: 'Salmon Fillets', category: 'Proteins', store: 'sams',
    parStock: 3, unit: 'lbs', cadenceDays: 14, approxCost: 28.00,
  },
  {
    id: 'sc-004', name: 'Rotisserie Chicken', category: 'Proteins', store: 'sams',
    parStock: 2, unit: 'count', cadenceDays: 7, approxCost: 10.00,
  },
  {
    id: 'sc-005', name: 'Bacon (Thick Cut)', category: 'Proteins', store: 'sams',
    parStock: 2, unit: 'lbs', cadenceDays: 14, approxCost: 14.00,
  },
  {
    id: 'sc-006', name: 'Italian Sausage', category: 'Proteins', store: 'sams',
    parStock: 3, unit: 'lbs', cadenceDays: 14, approxCost: 12.00,
  },
  {
    id: 'sc-007', name: 'Shrimp (Frozen, Raw)', category: 'Proteins', store: 'sams',
    parStock: 2, unit: 'lbs', cadenceDays: 21, approxCost: 16.00,
  },
  {
    id: 'sc-008', name: 'Pork Tenderloin', category: 'Proteins', store: 'sams',
    parStock: 2, unit: 'lbs', cadenceDays: 14, approxCost: 15.00,
  },

  // Dairy
  {
    id: 'sc-009', name: 'Milk (Whole, 2%)', category: 'Dairy', store: 'sams',
    parStock: 2, unit: 'gallons', cadenceDays: 7, approxCost: 7.00,
  },
  {
    id: 'sc-010', name: 'Eggs (Large)', category: 'Dairy', store: 'sams',
    parStock: 5, unit: 'dozen', cadenceDays: 14, approxCost: 18.00,
  },
  {
    id: 'sc-011', name: 'Butter (Unsalted)', category: 'Dairy', store: 'sams',
    parStock: 2, unit: 'lbs', cadenceDays: 21, approxCost: 9.00,
  },
  {
    id: 'sc-012', name: 'Shredded Cheese (Variety)', category: 'Dairy', store: 'sams',
    parStock: 3, unit: 'bags', cadenceDays: 14, approxCost: 12.00,
  },
  {
    id: 'sc-013', name: 'Greek Yogurt', category: 'Dairy', store: 'sams',
    parStock: 12, unit: 'cups', cadenceDays: 14, approxCost: 10.00,
  },
  {
    id: 'sc-014', name: 'Cream Cheese', category: 'Dairy', store: 'sams',
    parStock: 2, unit: 'blocks', cadenceDays: 21, approxCost: 7.00,
  },

  // Produce
  {
    id: 'sc-015', name: 'Bananas', category: 'Produce', store: 'sams',
    parStock: 3, unit: 'lbs', cadenceDays: 7, approxCost: 4.00,
  },
  {
    id: 'sc-016', name: 'Apples (Gala)', category: 'Produce', store: 'sams',
    parStock: 5, unit: 'lbs', cadenceDays: 7, approxCost: 8.00,
  },
  {
    id: 'sc-017', name: 'Avocados', category: 'Produce', store: 'sams',
    parStock: 6, unit: 'count', cadenceDays: 7, approxCost: 6.00,
  },
  {
    id: 'sc-018', name: 'Baby Spinach', category: 'Produce', store: 'sams',
    parStock: 2, unit: 'bags', cadenceDays: 7, approxCost: 7.00,
  },
  {
    id: 'sc-019', name: 'Blueberries (Frozen)', category: 'Produce', store: 'sams',
    parStock: 2, unit: 'lbs', cadenceDays: 14, approxCost: 8.00,
  },
  {
    id: 'sc-020', name: 'Strawberries', category: 'Produce', store: 'sams',
    parStock: 2, unit: 'lbs', cadenceDays: 7, approxCost: 6.00,
  },
  {
    id: 'sc-021', name: 'Broccoli Florets', category: 'Produce', store: 'sams',
    parStock: 2, unit: 'bags', cadenceDays: 7, approxCost: 6.00,
  },
  {
    id: 'sc-022', name: 'Sweet Potatoes', category: 'Produce', store: 'sams',
    parStock: 5, unit: 'lbs', cadenceDays: 14, approxCost: 7.00,
  },

  // Pantry / Dry Goods
  {
    id: 'sc-023', name: 'Olive Oil (Extra Virgin)', category: 'Pantry', store: 'sams',
    parStock: 1, unit: 'bottle (3L)', cadenceDays: 60, approxCost: 22.00,
  },
  {
    id: 'sc-024', name: 'Rice (Long Grain White)', category: 'Pantry', store: 'sams',
    parStock: 1, unit: 'bag (25 lbs)', cadenceDays: 90, approxCost: 18.00,
  },
  {
    id: 'sc-025', name: 'Pasta (Variety)', category: 'Pantry', store: 'sams',
    parStock: 6, unit: 'boxes', cadenceDays: 60, approxCost: 10.00,
  },
  {
    id: 'sc-026', name: 'Canned Diced Tomatoes', category: 'Pantry', store: 'sams',
    parStock: 12, unit: 'cans', cadenceDays: 60, approxCost: 14.00,
  },
  {
    id: 'sc-027', name: 'Black Beans (Canned)', category: 'Pantry', store: 'sams',
    parStock: 8, unit: 'cans', cadenceDays: 60, approxCost: 10.00,
  },
  {
    id: 'sc-028', name: 'Chicken Broth (32oz)', category: 'Pantry', store: 'sams',
    parStock: 6, unit: 'cartons', cadenceDays: 60, approxCost: 12.00,
  },
  {
    id: 'sc-029', name: 'Almond Butter', category: 'Pantry', store: 'sams',
    parStock: 2, unit: 'jars', cadenceDays: 30, approxCost: 14.00,
  },
  {
    id: 'sc-030', name: 'Oatmeal (Old Fashioned)', category: 'Pantry', store: 'sams',
    parStock: 1, unit: 'canister (10 lbs)', cadenceDays: 60, approxCost: 10.00,
  },

  // Snacks & Beverages
  {
    id: 'sc-031', name: 'Mixed Nuts', category: 'Snacks', store: 'sams',
    parStock: 1, unit: 'canister (3 lbs)', cadenceDays: 30, approxCost: 20.00,
  },
  {
    id: 'sc-032', name: 'Sparkling Water (Variety)', category: 'Beverages', store: 'sams',
    parStock: 2, unit: 'cases (24ct)', cadenceDays: 14, approxCost: 16.00,
  },
  {
    id: 'sc-033', name: 'Orange Juice (100%)', category: 'Beverages', store: 'sams',
    parStock: 2, unit: 'jugs (89oz)', cadenceDays: 14, approxCost: 11.00,
  },
  {
    id: 'sc-034', name: 'Coffee (Ground)', category: 'Beverages', store: 'sams',
    parStock: 1, unit: 'bag (2.5 lbs)', cadenceDays: 30, approxCost: 18.00,
  },
  {
    id: 'sc-035', name: 'Granola Bars (Variety)', category: 'Snacks', store: 'sams',
    parStock: 1, unit: 'box (48ct)', cadenceDays: 21, approxCost: 15.00,
  },
  {
    id: 'sc-036', name: 'Tortilla Chips', category: 'Snacks', store: 'sams',
    parStock: 2, unit: 'bags (large)', cadenceDays: 14, approxCost: 10.00,
  },

  // Household
  {
    id: 'sc-037', name: 'Paper Towels (12-roll)', category: 'Household', store: 'sams',
    parStock: 1, unit: 'pack', cadenceDays: 45, approxCost: 22.00,
  },
  {
    id: 'sc-038', name: 'Toilet Paper (30-roll)', category: 'Household', store: 'sams',
    parStock: 1, unit: 'pack', cadenceDays: 60, approxCost: 28.00,
  },
  {
    id: 'sc-039', name: 'Laundry Detergent (Liquid)', category: 'Household', store: 'sams',
    parStock: 1, unit: 'jug (128 loads)', cadenceDays: 60, approxCost: 18.00,
  },
  {
    id: 'sc-040', name: 'Dish Soap (3-pack)', category: 'Household', store: 'sams',
    parStock: 1, unit: 'pack', cadenceDays: 60, approxCost: 10.00,
  },
  {
    id: 'sc-041', name: 'Zip-Lock Bags (Variety)', category: 'Household', store: 'sams',
    parStock: 1, unit: 'set', cadenceDays: 90, approxCost: 15.00,
  },
  {
    id: 'sc-042', name: 'Trash Bags (Large)', category: 'Household', store: 'sams',
    parStock: 1, unit: 'box (90ct)', cadenceDays: 90, approxCost: 20.00,
  },

  // Frozen
  {
    id: 'sc-043', name: 'Frozen Vegetables (Variety)', category: 'Frozen', store: 'sams',
    parStock: 4, unit: 'bags', cadenceDays: 21, approxCost: 12.00,
  },
  {
    id: 'sc-044', name: 'Pizza (Frozen, 4-pack)', category: 'Frozen', store: 'sams',
    parStock: 1, unit: 'pack', cadenceDays: 21, approxCost: 18.00,
  },
  {
    id: 'sc-045', name: 'Ice Cream (Tub)', category: 'Frozen', store: 'sams',
    parStock: 1, unit: 'tub (5qt)', cadenceDays: 30, approxCost: 10.00,
  },

  // ─── HARRIS TEETER ITEMS ───────────────────────────────────────────────────
  // Fresh Deli & Specialty
  {
    id: 'ht-001', name: 'Sliced Turkey (Deli)', category: 'Deli', store: 'ht',
    parStock: 1, unit: 'lb', cadenceDays: 7, approxCost: 9.00,
  },
  {
    id: 'ht-002', name: 'Sliced Ham (Deli)', category: 'Deli', store: 'ht',
    parStock: 0.5, unit: 'lb', cadenceDays: 7, approxCost: 5.00,
  },
  {
    id: 'ht-003', name: 'Provolone Cheese (Deli)', category: 'Deli', store: 'ht',
    parStock: 0.5, unit: 'lb', cadenceDays: 7, approxCost: 5.00,
  },
  {
    id: 'ht-004', name: 'Fresh Salmon (Wild-Caught)', category: 'Seafood', store: 'ht',
    parStock: 1.5, unit: 'lbs', cadenceDays: 7, approxCost: 18.00,
  },
  {
    id: 'ht-005', name: 'Fresh Sourdough Bread', category: 'Bakery', store: 'ht',
    parStock: 1, unit: 'loaf', cadenceDays: 7, approxCost: 5.00,
  },
  {
    id: 'ht-006', name: 'Croissants (6-pack)', category: 'Bakery', store: 'ht',
    parStock: 1, unit: 'pack', cadenceDays: 7, approxCost: 5.00,
  },
  {
    id: 'ht-007', name: 'Rotisserie Chicken', category: 'Proteins', store: 'ht',
    parStock: 1, unit: 'count', cadenceDays: 7, approxCost: 9.00,
  },

  // Fresh Produce (specialty items)
  {
    id: 'ht-008', name: 'Organic Kale', category: 'Produce', store: 'ht',
    parStock: 1, unit: 'bunch', cadenceDays: 7, approxCost: 3.00,
  },
  {
    id: 'ht-009', name: 'Heirloom Tomatoes', category: 'Produce', store: 'ht',
    parStock: 1, unit: 'lb', cadenceDays: 7, approxCost: 5.00,
  },
  {
    id: 'ht-010', name: 'Asparagus', category: 'Produce', store: 'ht',
    parStock: 1, unit: 'bunch', cadenceDays: 7, approxCost: 4.00,
  },
  {
    id: 'ht-011', name: 'Bell Peppers (Variety)', category: 'Produce', store: 'ht',
    parStock: 4, unit: 'count', cadenceDays: 7, approxCost: 5.00,
  },
  {
    id: 'ht-012', name: 'Lemons', category: 'Produce', store: 'ht',
    parStock: 4, unit: 'count', cadenceDays: 7, approxCost: 3.00,
  },
  {
    id: 'ht-013', name: 'Fresh Herbs (Basil / Parsley)', category: 'Produce', store: 'ht',
    parStock: 2, unit: 'bunches', cadenceDays: 7, approxCost: 4.00,
  },
  {
    id: 'ht-014', name: 'Garlic (Fresh)', category: 'Produce', store: 'ht',
    parStock: 1, unit: 'head', cadenceDays: 7, approxCost: 1.50,
  },
  {
    id: 'ht-015', name: 'Zucchini', category: 'Produce', store: 'ht',
    parStock: 2, unit: 'count', cadenceDays: 7, approxCost: 2.50,
  },
  {
    id: 'ht-016', name: 'Mushrooms (Cremini)', category: 'Produce', store: 'ht',
    parStock: 1, unit: 'container (10oz)', cadenceDays: 7, approxCost: 4.00,
  },

  // Dairy & Refrigerated
  {
    id: 'ht-017', name: 'Heavy Whipping Cream', category: 'Dairy', store: 'ht',
    parStock: 1, unit: 'pint', cadenceDays: 14, approxCost: 4.00,
  },
  {
    id: 'ht-018', name: 'Sour Cream', category: 'Dairy', store: 'ht',
    parStock: 1, unit: 'container (16oz)', cadenceDays: 14, approxCost: 3.00,
  },
  {
    id: 'ht-019', name: 'Parmesan (Fresh Grated)', category: 'Dairy', store: 'ht',
    parStock: 1, unit: 'container (5oz)', cadenceDays: 14, approxCost: 5.00,
  },
  {
    id: 'ht-020', name: 'Orange Juice (Fresh-Squeezed)', category: 'Beverages', store: 'ht',
    parStock: 1, unit: 'half-gallon', cadenceDays: 7, approxCost: 7.00,
  },

  // Condiments & Pantry
  {
    id: 'ht-021', name: 'Dijon Mustard', category: 'Condiments', store: 'ht',
    parStock: 1, unit: 'jar', cadenceDays: 60, approxCost: 4.00,
  },
  {
    id: 'ht-022', name: 'Honey (Local)', category: 'Pantry', store: 'ht',
    parStock: 1, unit: 'jar', cadenceDays: 60, approxCost: 9.00,
  },
  {
    id: 'ht-023', name: 'Pasta Sauce (Premium)', category: 'Pantry', store: 'ht',
    parStock: 2, unit: 'jars', cadenceDays: 30, approxCost: 10.00,
  },
  {
    id: 'ht-024', name: 'Balsamic Vinegar', category: 'Condiments', store: 'ht',
    parStock: 1, unit: 'bottle', cadenceDays: 90, approxCost: 7.00,
  },
  {
    id: 'ht-025', name: 'Capers', category: 'Condiments', store: 'ht',
    parStock: 1, unit: 'jar', cadenceDays: 90, approxCost: 3.50,
  },

  // Wine & Beer
  {
    id: 'ht-026', name: 'Red Wine (Cabernet)', category: 'Beverages', store: 'ht',
    parStock: 1, unit: 'bottle', cadenceDays: 7, approxCost: 14.00,
  },
  {
    id: 'ht-027', name: 'White Wine (Chardonnay)', category: 'Beverages', store: 'ht',
    parStock: 1, unit: 'bottle', cadenceDays: 14, approxCost: 12.00,
  },
  {
    id: 'ht-028', name: 'Craft Beer (6-pack)', category: 'Beverages', store: 'ht',
    parStock: 1, unit: '6-pack', cadenceDays: 14, approxCost: 12.00,
  },

  // HT Brand / Weekly Deal Items
  {
    id: 'ht-029', name: 'HT Brand Greek Yogurt', category: 'Dairy', store: 'ht',
    parStock: 4, unit: 'cups', cadenceDays: 7, approxCost: 5.00,
  },
  {
    id: 'ht-030', name: 'HT Organics Salad Mix', category: 'Produce', store: 'ht',
    parStock: 2, unit: 'bags', cadenceDays: 7, approxCost: 6.00,
  },

  // Personal Care
  {
    id: 'ht-031', name: 'Shampoo & Conditioner', category: 'Personal Care', store: 'ht',
    parStock: 1, unit: 'set', cadenceDays: 45, approxCost: 12.00,
  },
  {
    id: 'ht-032', name: 'Toothpaste', category: 'Personal Care', store: 'ht',
    parStock: 2, unit: 'tubes', cadenceDays: 60, approxCost: 7.00,
  },
  {
    id: 'ht-033', name: 'Hand Soap (2-pack)', category: 'Personal Care', store: 'ht',
    parStock: 1, unit: 'pack', cadenceDays: 60, approxCost: 6.00,
  },
];

export const CATEGORIES = Array.from(new Set(MASTER_CATALOG.map(i => i.category))).sort();

export const getItemsByStore = (store: Store): Item[] => {
  if (store === 'both') return MASTER_CATALOG;
  return MASTER_CATALOG.filter(item => item.store === store);
};

export const getItemsByCategory = (category: string): Item[] =>
  MASTER_CATALOG.filter(item => item.category === category);
