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

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  tags?: string[];
  sourceUrl?: string;
  notes?: string;
  isFavorite?: boolean;
  lastMadeDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  name: string;
  amount?: number;
  unit?: string;
  catalogItemId?: string;
  notes?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type PlanType = 'family' | 'individual';

export interface MealPlan {
  id: string;
  weekOf: string;        // ISO date of Monday of the week
  type: PlanType;
  memberId?: string | null; // null for family plans; Cognito sub for individual
  createdAt: string;
  updatedAt: string;
}

export interface MealEntry {
  id: string;
  planId: string;
  dayOfWeek: DayOfWeek;
  mealType: MealType;
  recipeId?: string | null; // optional link to a Recipe record
  label?: string | null;    // free-text fallback when no recipe
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanMember {
  id: string;
  name: string;
  color: string; // hex colour, e.g. '#3B82F6'
}

export interface MealCalendarEntry {
  id: string;
  weekOf: string;       // Monday ISO date, e.g. '2026-04-06'
  planType: PlanType;
  memberId?: string;    // undefined / null for family entries
  dayOfWeek: DayOfWeek;
  mealType: MealType;
  recipeId?: string;
  recipeName?: string;  // cached display name
  label?: string;       // free-text fallback
  notes?: string;
}

export interface AppState {
  lists: ShoppingList[];
  weeklyLogs: WeeklyLog[];
  settings: HouseholdSettings;
}
