import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { DayOfWeek, MealType, PlanType, MealCalendarEntry, MealPlanMember } from '../types';
import { generateId } from '../utils';

// Predefined distinct member colours
const MEMBER_COLORS = [
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#F97316', // orange
  '#EC4899', // pink
  '#EAB308', // yellow
  '#14B8A6', // teal
  '#EF4444', // red
  '#A855F7', // purple
];

export function nextMemberColor(existing: MealPlanMember[]): string {
  const used = new Set(existing.map(m => m.color));
  return MEMBER_COLORS.find(c => !used.has(c)) ?? MEMBER_COLORS[existing.length % MEMBER_COLORS.length];
}

export function useMealCalendar() {
  const [members, setMembers] = useLocalStorage<MealPlanMember[]>('meal-plan-members', []);
  const [entries, setEntries] = useLocalStorage<MealCalendarEntry[]>('meal-calendar-entries', []);

  // ── Members ──────────────────────────────────────────────────────────────

  const addMember = useCallback(
    (name: string) => {
      const trimmedName = name.trim();
      let member!: MealPlanMember;

      setMembers(prev => {
        member = {
          id: generateId(),
          name: trimmedName,
          color: nextMemberColor(prev),
        };
        return [...prev, member];
      });

      return member;
    },
    [setMembers]
  );

  const renameMember = useCallback(
    (id: string, name: string) => {
      setMembers(prev => prev.map(m => (m.id === id ? { ...m, name: name.trim() } : m)));
    },
    [setMembers]
  );

  const removeMember = useCallback(
    (id: string) => {
      setMembers(prev => prev.filter(m => m.id !== id));
      // Remove that member's entries too
      setEntries(prev => prev.filter(e => e.memberId !== id));
    },
    [setMembers, setEntries]
  );

  // ── Entries ───────────────────────────────────────────────────────────────

  const getEntry = useCallback(
    (
      weekOf: string,
      planType: PlanType,
      dayOfWeek: DayOfWeek,
      mealType: MealType,
      memberId?: string
    ): MealCalendarEntry | undefined => {
      return entries.find(
        e =>
          e.weekOf === weekOf &&
          e.planType === planType &&
          e.dayOfWeek === dayOfWeek &&
          e.mealType === mealType &&
          (planType === 'family' ? !e.memberId : e.memberId === memberId)
      );
    },
    [entries]
  );

  const upsertEntry = useCallback(
    (
      weekOf: string,
      planType: PlanType,
      dayOfWeek: DayOfWeek,
      mealType: MealType,
      data: { recipeId?: string; recipeName?: string; label?: string; notes?: string },
      memberId?: string
    ) => {
      setEntries(prev => {
        const idx = prev.findIndex(
          e =>
            e.weekOf === weekOf &&
            e.planType === planType &&
            e.dayOfWeek === dayOfWeek &&
            e.mealType === mealType &&
            (planType === 'family' ? !e.memberId : e.memberId === memberId)
        );
        const entry: MealCalendarEntry = {
          id: idx >= 0 ? prev[idx].id : generateId(),
          weekOf,
          planType,
          memberId: planType === 'individual' ? memberId : undefined,
          dayOfWeek,
          mealType,
          ...data,
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = entry;
          return next;
        }
        return [...prev, entry];
      });
    },
    [setEntries]
  );

  const deleteEntry = useCallback(
    (id: string) => {
      setEntries(prev => prev.filter(e => e.id !== id));
    },
    [setEntries]
  );

  const weekEntries = useCallback(
    (weekOf: string): MealCalendarEntry[] => {
      return entries.filter(e => e.weekOf === weekOf);
    },
    [entries]
  );

  return {
    members,
    entries,
    addMember,
    renameMember,
    removeMember,
    getEntry,
    upsertEntry,
    deleteEntry,
    weekEntries,
  };
}
