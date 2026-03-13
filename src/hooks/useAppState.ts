import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { AppState, HouseholdSettings, ShoppingList, ShoppingListItem, WeeklyLog } from '../types';
import { useLocalStorage } from './useLocalStorage';

const client = generateClient<Schema>({ authMode: 'apiKey' });

const DEFAULT_SETTINGS: HouseholdSettings = {
  name: 'Our Household',
  memberCount: 4,
  cadenceStartDate: new Date().toISOString().split('T')[0],
  defaultStore: 'both',
  customItems: [],
};

function mapItem(item: Schema['ShoppingListItem']['type']): ShoppingListItem {
  return {
    id: item.id,
    itemId: item.itemId,
    name: item.name,
    category: item.category,
    store: item.store as ShoppingListItem['store'],
    quantity: item.quantity,
    unit: item.unit,
    approxCost: item.approxCost,
    checked: item.checked ?? false,
    notes: item.notes ?? undefined,
  };
}

function mapList(list: Schema['ShoppingList']['type'], items: ShoppingListItem[]): ShoppingList {
  return {
    id: list.id,
    name: list.name,
    weekOf: list.weekOf,
    store: list.store as ShoppingList['store'],
    status: list.status as ShoppingList['status'],
    totalSpend: list.totalSpend ?? undefined,
    items,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  };
}

export function useAppState() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [weeklyLogs, setWeeklyLogs] = useState<WeeklyLog[]>([]);
  const [settings, setSettings] = useLocalStorage<HouseholdSettings>('grocery-settings', DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [{ data: rawLists }, { data: rawLogs }] = await Promise.all([
        client.models.ShoppingList.list(),
        client.models.WeeklyLog.list(),
      ]);

      const listsWithItems = await Promise.all(
        rawLists.map(async list => {
          const { data: rawItems } = await client.models.ShoppingListItem.list({
            filter: { listId: { eq: list.id } },
          });
          return mapList(list, rawItems.map(mapItem));
        })
      );

      setLists(listsWithItems.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

      setWeeklyLogs(
        rawLogs
          .map(log => ({
            id: log.id,
            listId: log.listId,
            weekOf: log.weekOf,
            store: log.store as WeeklyLog['store'],
            totalSpend: log.totalSpend,
            itemCount: log.itemCount,
            completedAt: log.completedAt,
          }))
          .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      );
    } finally {
      setLoading(false);
    }
  }

  const updateSettings = (s: HouseholdSettings) => setSettings(s);

  const addList = async (list: ShoppingList) => {
    const { data: created } = await client.models.ShoppingList.create({
      id: list.id,
      name: list.name,
      weekOf: list.weekOf,
      store: list.store,
      status: list.status,
      totalSpend: list.totalSpend,
    });
    if (!created) return;
    await Promise.all(
      list.items.map(item =>
        client.models.ShoppingListItem.create({
          id: item.id,
          listId: list.id,
          itemId: item.itemId,
          name: item.name,
          category: item.category,
          store: item.store,
          quantity: item.quantity,
          unit: item.unit,
          approxCost: item.approxCost,
          checked: item.checked,
          notes: item.notes,
        })
      )
    );
    setLists(prev => [mapList(created, list.items), ...prev]);
  };

  const updateList = async (list: ShoppingList) => {
    await client.models.ShoppingList.update({
      id: list.id,
      status: list.status,
      totalSpend: list.totalSpend,
    });
    await Promise.all(
      list.items.map(item =>
        client.models.ShoppingListItem.update({
          id: item.id,
          checked: item.checked,
          quantity: item.quantity,
          notes: item.notes,
        })
      )
    );
    setLists(prev => prev.map(l => (l.id === list.id ? list : l)));
  };

  const deleteList = async (id: string) => {
    const { data: items } = await client.models.ShoppingListItem.list({ filter: { listId: { eq: id } } });
    await Promise.all(items.map(item => client.models.ShoppingListItem.delete({ id: item.id })));
    await client.models.ShoppingList.delete({ id });
    setLists(prev => prev.filter(l => l.id !== id));
  };

  const addLog = async (log: WeeklyLog) => {
    await client.models.WeeklyLog.create({
      id: log.id,
      listId: log.listId,
      weekOf: log.weekOf,
      store: log.store,
      totalSpend: log.totalSpend,
      itemCount: log.itemCount,
      completedAt: log.completedAt,
    });
    setWeeklyLogs(prev => [log, ...prev]);
  };

  const state: AppState = { lists, weeklyLogs, settings };

  return { state, loading, updateSettings, addList, updateList, deleteList, addLog };
}
