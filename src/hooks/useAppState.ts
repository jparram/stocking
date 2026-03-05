import type { AppState, HouseholdSettings, ShoppingList, WeeklyLog } from '../types';
import { useLocalStorage } from './useLocalStorage';

const DEFAULT_SETTINGS: HouseholdSettings = {
  name: 'Our Household',
  memberCount: 4,
  cadenceStartDate: new Date().toISOString().split('T')[0],
  defaultStore: 'both',
  customItems: [],
};

const DEFAULT_STATE: AppState = {
  lists: [],
  weeklyLogs: [],
  settings: DEFAULT_SETTINGS,
};

export function useAppState() {
  const [state, setState] = useLocalStorage<AppState>('grocery-app-state', DEFAULT_STATE);

  const updateSettings = (settings: HouseholdSettings) =>
    setState(s => ({ ...s, settings }));

  const addList = (list: ShoppingList) =>
    setState(s => ({ ...s, lists: [list, ...s.lists] }));

  const updateList = (list: ShoppingList) =>
    setState(s => ({
      ...s,
      lists: s.lists.map(l => (l.id === list.id ? list : l)),
    }));

  const deleteList = (id: string) =>
    setState(s => ({ ...s, lists: s.lists.filter(l => l.id !== id) }));

  const addLog = (log: WeeklyLog) =>
    setState(s => ({ ...s, weeklyLogs: [log, ...s.weeklyLogs] }));

  return {
    state,
    updateSettings,
    addList,
    updateList,
    deleteList,
    addLog,
  };
}
