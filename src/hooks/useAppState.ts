import { useState, useEffect, useRef } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { AppState, HouseholdSettings, ShoppingList, ShoppingListItem, WeeklyLog } from '../types';
import { useLocalStorage } from './useLocalStorage';

type Client = ReturnType<typeof generateClient<Schema>>;

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
  // Lazy-init client inside the hook so Amplify.configure() has already run
  const clientRef = useRef<Client | null>(null);
  function getClient(): Client {
    if (!clientRef.current) {
      clientRef.current = generateClient<Schema>({ authMode: 'userPool' });
    }
    return clientRef.current;
  }

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
      const client = getClient();
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
    } catch (err) {
      console.error('Failed to load data from DynamoDB:', err);
    } finally {
      setLoading(false);
    }
  }

  const updateSettings = (s: HouseholdSettings) => setSettings(s);

  const addList = async (list: ShoppingList) => {
    const client = getClient();
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
    // Optimistic update first so the UI is always responsive
    const existing = lists.find(l => l.id === list.id);
    setLists(prev => prev.map(l => (l.id === list.id ? list : l)));

    const client = getClient();
    const existingIds = new Set(existing?.items.map(i => i.id) ?? []);
    const newIds = new Set(list.items.map(i => i.id));

    const toCreate = list.items.filter(item => !existingIds.has(item.id));
    const toUpdate = list.items.filter(item => existingIds.has(item.id));
    const toDelete = (existing?.items ?? []).filter(item => !newIds.has(item.id));

    console.log('[updateList] create:', toCreate.length, 'update:', toUpdate.length, 'delete:', toDelete.length, toDelete.map(i => i.name));

    try {
      await client.models.ShoppingList.update({
        id: list.id,
        status: list.status,
        totalSpend: list.totalSpend,
      });

      const results = await Promise.allSettled([
        // Create new items
        ...toCreate.map(item => client.models.ShoppingListItem.create({
            id: item.id, listId: list.id, itemId: item.itemId,
            name: item.name, category: item.category, store: item.store,
            quantity: item.quantity, unit: item.unit, approxCost: item.approxCost,
            checked: item.checked, notes: item.notes,
          }).then(r => { if (r.errors) throw new Error(r.errors.map(e => e.message).join(', ')); return r; })),
        // Update existing items
        ...toUpdate.map(item => client.models.ShoppingListItem.update({
            id: item.id, checked: item.checked, quantity: item.quantity, notes: item.notes,
          }).then(r => { if (r.errors) throw new Error(r.errors.map(e => e.message).join(', ')); return r; })),
        // Delete removed items
        ...toDelete.map(item => client.models.ShoppingListItem.delete({ id: item.id })
          .then(r => { if (r.errors) throw new Error(r.errors.map(e => e.message).join(', ')); return r; })),
      ]);

      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        failed.forEach(r => console.error('[updateList] operation failed:', (r as PromiseRejectedResult).reason));
      }
    } catch (err) {
      console.error('[updateList] DynamoDB save failed:', err);
    }
  };

  const deleteList = async (id: string) => {
    const client = getClient();
    const { data: items } = await client.models.ShoppingListItem.list({ filter: { listId: { eq: id } } });
    await Promise.all(items.map(item => client.models.ShoppingListItem.delete({ id: item.id })));
    await client.models.ShoppingList.delete({ id });
    setLists(prev => prev.filter(l => l.id !== id));
  };

  const addLog = async (log: WeeklyLog) => {
    const client = getClient();
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
