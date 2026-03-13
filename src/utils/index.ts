import type { Item, ShoppingList, ShoppingListItem, Store } from '../types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getMondayOf(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function isDueThisWeek(item: Item, cadenceStart: string): boolean {
  const start = new Date(cadenceStart + 'T12:00:00');
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceStart % item.cadenceDays < 7;
}

export function itemToListItem(item: Item, quantity?: number): ShoppingListItem {
  return {
    id: generateId(),
    itemId: item.id,
    name: item.name,
    category: item.category,
    store: item.store,
    quantity: quantity ?? item.parStock,
    unit: item.unit,
    approxCost: item.approxCost,
    checked: false,
    notes: item.notes,
  };
}

export function createShoppingList(
  store: Store,
  items: Item[],
  name?: string
): ShoppingList {
  const weekOf = getMondayOf();
  const now = new Date().toISOString();
  const listItems = items.map(i => itemToListItem(i));
  return {
    id: generateId(),
    name: name ?? `Week of ${formatDate(weekOf)} — ${storeLabel(store)}`,
    weekOf,
    store,
    items: listItems,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

export function storeLabel(store: Store): string {
  if (store === 'sams') return "Sam's Club";
  if (store === 'ht') return 'Harris Teeter';
  return "Sam's Club & Harris Teeter";
}

export function storeColor(store: Store): string {
  if (store === 'sams') return 'sams';
  if (store === 'ht') return 'ht';
  return 'sams';
}

export function listProgress(list: ShoppingList): number {
  if (list.items.length === 0) return 0;
  const checked = list.items.filter(i => i.checked).length;
  return Math.round((checked / list.items.length) * 100);
}

export function listTotalCost(list: ShoppingList): number {
  return list.items.reduce((sum, i) => sum + i.approxCost, 0);
}

export function groupByCategory<T extends { category: string }>(
  items: T[]
): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
}

export function exportToCSV(list: ShoppingList): void {
  const headers = ['Item', 'Category', 'Store', 'Quantity', 'Unit', 'Est. Cost', 'Checked', 'Notes'];
  const rows = list.items.map(i => [
    i.name,
    i.category,
    i.store === 'sams' ? "Sam's Club" : 'Harris Teeter',
    i.quantity.toString(),
    i.unit,
    formatCurrency(i.approxCost),
    i.checked ? 'Yes' : 'No',
    i.notes ?? '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grocery-list-${list.weekOf}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
