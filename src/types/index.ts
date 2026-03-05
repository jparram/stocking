export type Store = 'sams' | 'ht' | 'both';
export type Category = string;

export interface Item {
  id: string;
  name: string;
  category: Category;
  store: Store;
  parStock: number;
  unit: string;
  cadenceDays: number; // how often to buy (7 = weekly, 14 = biweekly, etc.)
  approxCost: number;
  notes?: string;
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
  cadenceStartDate: string; // ISO date string
  defaultStore: Store;
  customItems: Item[];
}

export interface AppState {
  lists: ShoppingList[];
  weeklyLogs: WeeklyLog[];
  settings: HouseholdSettings;
}
