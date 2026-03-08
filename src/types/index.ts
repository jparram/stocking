export type Store = 'sams' | 'ht' | 'both';
export type Category = string;

export interface Item {
  id: string;
  name: string;
  category: Category;
  store: Store;
  parStock: number;
  unit: string;
  cadenceDays: number; // observed interval between purchases (days)
  approxCost: number;  // verified shelf price from 2025 receipts
  notes?: string;
  isHTOnly?: boolean;  // true = not available at Sam's Club
  parMin?: string;     // reorder trigger description
  buyQty?: string;     // how much to buy when restocking
}

export interface ShoppingListItem {
  id: string;
  itemId: string;
  name: string;
  category: string;
  store: Store;
  quantity: number;
  unit: string;
  approxCost: number;
  checked: boolean;
  notes?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  weekOf: string; // ISO date string (Monday of the week)
  store: Store;
  items: ShoppingListItem[];
  status: 'draft' | 'active' | 'complete';
  totalSpend?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyLog {
  id: string;
  listId: string;
  weekOf: string;
  store: Store;
  totalSpend: number;
  itemCount: number;
  completedAt: string;
}

export interface HouseholdSettings {
  name: string;
  memberCount: number;
  cadenceStartDate: string; // ISO date string — first Sam's Sunday
  defaultStore: Store;
  customItems: Item[];
}

export interface AppState {
  lists: ShoppingList[];
  weeklyLogs: WeeklyLog[];
  settings: HouseholdSettings;
}
