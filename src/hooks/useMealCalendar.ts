import { useState, useEffect, useRef, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { useLocalStorage } from './useLocalStorage';
import type { DayOfWeek, MealType, MealCalendarEntry, MealPlanMember } from '../types';

type Client = ReturnType<typeof generateClient<Schema>>;

type EntryData = { recipeId?: string; recipeName?: string; label?: string; notes?: string };

/** Overloaded type: family entries never take memberId; individual entries require it. */
type GetEntryFn = {
  (weekOf: string, planType: 'family', dayOfWeek: DayOfWeek, mealType: MealType): MealCalendarEntry | undefined;
  (weekOf: string, planType: 'individual', dayOfWeek: DayOfWeek, mealType: MealType, memberId: string): MealCalendarEntry | undefined;
};

type UpsertEntryFn = {
  (weekOf: string, planType: 'family', dayOfWeek: DayOfWeek, mealType: MealType, data: EntryData): void;
  (weekOf: string, planType: 'individual', dayOfWeek: DayOfWeek, mealType: MealType, data: EntryData, memberId: string): void;
};

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

/** planKey: stable key for MealPlan lookup cache */
function planKey(weekOf: string, type: 'family' | 'individual', memberId?: string | null): string {
  return `${weekOf}|${type}|${memberId ?? ''}`;
}

export function useMealCalendar() {
  const clientRef = useRef<Client | null>(null);
  function getClient(): Client {
    if (!clientRef.current) {
      clientRef.current = generateClient<Schema>({ authMode: 'apiKey' });
    }
    return clientRef.current;
  }

  // members stay in localStorage — not part of the backend schema
  const [members, setMembers] = useLocalStorage<MealPlanMember[]>('meal-plan-members', []);
  const [entries, setEntries] = useState<MealCalendarEntry[]>([]);

  // Cache of weekOf|type|memberId → AppSync MealPlan id
  const planIds = useRef<Map<string, string>>(new Map());

  // ── Load all entries from AppSync ─────────────────────────────────────────

  const loadAll = useCallback(async () => {
    try {
      const client = getClient();
      const { data: plans = [] } = await client.models.MealPlan.list();

      const planMap = new Map<string, { weekOf: string; type: 'family' | 'individual'; memberId?: string | null }>();
      for (const p of plans) {
        const pType = (p.type ?? 'family') as 'family' | 'individual';
        planMap.set(p.id, { weekOf: p.weekOf, type: pType, memberId: p.memberId });
        planIds.current.set(planKey(p.weekOf, pType, p.memberId), p.id);
      }

      const { data: rawEntries = [] } = await client.models.MealEntry.list();

      // Resolve recipe names for entries that have recipeId but no label
      const recipeIdsToFetch = [
        ...new Set(rawEntries.filter(e => e.recipeId && !e.label).map(e => e.recipeId!)),
      ];
      const recipeNameMap = new Map<string, string>();
      await Promise.all(
        recipeIdsToFetch.map(async id => {
          try {
            const { data: r } = await client.models.Recipe.get({ id });
            if (r) recipeNameMap.set(id, r.name);
          } catch { /* ignore */ }
        }),
      );

      const mapped: MealCalendarEntry[] = rawEntries.flatMap(e => {
        const plan = planMap.get(e.planId);
        if (!plan) return [];
        return [{
          id: e.id,
          weekOf: plan.weekOf,
          planType: plan.type,
          memberId: plan.memberId ?? undefined,
          dayOfWeek: (e.dayOfWeek ?? 'mon') as DayOfWeek,
          mealType: (e.mealType ?? 'dinner') as MealType,
          recipeId: e.recipeId ?? undefined,
          recipeName: e.recipeId ? (recipeNameMap.get(e.recipeId) ?? undefined) : undefined,
          label: e.label ?? undefined,
          notes: e.notes ?? undefined,
        }];
      });

      setEntries(mapped);
    } catch (err) {
      console.error('Failed to load meal calendar from AppSync:', err);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Members ───────────────────────────────────────────────────────────────

  const addMember = useCallback(
    (name: string) => {
      const trimmedName = name.trim();
      let member!: MealPlanMember;
      setMembers(prev => {
        member = { id: crypto.randomUUID(), name: trimmedName, color: nextMemberColor(prev) };
        return [...prev, member];
      });
      return member;
    },
    [setMembers],
  );

  const renameMember = useCallback(
    (id: string, name: string) => {
      setMembers(prev => prev.map(m => (m.id === id ? { ...m, name: name.trim() } : m)));
    },
    [setMembers],
  );

  const removeMember = useCallback(
    (id: string) => {
      setMembers(prev => prev.filter(m => m.id !== id));
      setEntries(prev => prev.filter(e => e.memberId !== id));
    },
    [setMembers],
  );

  // ── Entries ───────────────────────────────────────────────────────────────

  const getEntry = useCallback(
    (
      weekOf: string,
      planType: 'family' | 'individual',
      dayOfWeek: DayOfWeek,
      mealType: MealType,
      memberId?: string,
    ): MealCalendarEntry | undefined => {
      return entries.find(
        e =>
          e.weekOf === weekOf &&
          e.planType === planType &&
          e.dayOfWeek === dayOfWeek &&
          e.mealType === mealType &&
          (planType === 'family' ? !e.memberId : e.memberId === memberId),
      );
    },
    [entries],
  ) as GetEntryFn;

  const upsertEntry = useCallback(
    (
      weekOf: string,
      planType: 'family' | 'individual',
      dayOfWeek: DayOfWeek,
      mealType: MealType,
      data: EntryData,
      memberId?: string,
    ) => {
      if (planType === 'individual' && !memberId) {
        throw new Error('memberId is required for individual meal plan entries');
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      let existingLocalId: string | undefined;

      // Optimistic update
      setEntries(prev => {
        const idx = prev.findIndex(
          e =>
            e.weekOf === weekOf &&
            e.planType === planType &&
            e.dayOfWeek === dayOfWeek &&
            e.mealType === mealType &&
            (planType === 'family' ? !e.memberId : e.memberId === memberId),
        );
        existingLocalId = idx >= 0 ? prev[idx].id : undefined;
        const entry: MealCalendarEntry = {
          id: existingLocalId ?? tempId,
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

      // Async write to AppSync
      (async () => {
        try {
          const client = getClient();
          const key = planKey(weekOf, planType, planType === 'individual' ? memberId : undefined);
          let pId = planIds.current.get(key);
          if (!pId) {
            const { data: plan, errors } = await client.models.MealPlan.create({
              weekOf,
              type: planType,
              memberId: planType === 'individual' ? memberId : undefined,
            });
            if (errors?.length || !plan) {
              throw new Error(errors?.map(e => e.message).join(', ') ?? 'Failed to create plan');
            }
            pId = plan.id;
            planIds.current.set(key, pId);
          }

          if (existingLocalId && !existingLocalId.startsWith('temp-')) {
            // Update existing AppSync entry
            const { errors } = await client.models.MealEntry.update({
              id: existingLocalId,
              recipeId: data.recipeId ?? null,
              label: data.label ?? null,
              notes: data.notes ?? null,
            });
            if (errors?.length) throw new Error(errors.map(e => e.message).join(', '));
          } else {
            // Find or create entry in AppSync
            const { data: existing = [] } = await client.models.MealEntry.list({
              filter: { planId: { eq: pId }, dayOfWeek: { eq: dayOfWeek }, mealType: { eq: mealType } },
            });
            const existingEntry = existing[0];
            if (existingEntry) {
              const { errors } = await client.models.MealEntry.update({
                id: existingEntry.id,
                recipeId: data.recipeId ?? null,
                label: data.label ?? null,
                notes: data.notes ?? null,
              });
              if (errors?.length) throw new Error(errors.map(e => e.message).join(', '));
              // Replace temp id with real id
              setEntries(prev => prev.map(e => e.id === tempId ? { ...e, id: existingEntry.id } : e));
            } else {
              const { data: created, errors } = await client.models.MealEntry.create({
                planId: pId,
                dayOfWeek,
                mealType,
                recipeId: data.recipeId ?? null,
                label: data.label ?? null,
                notes: data.notes ?? null,
              });
              if (errors?.length || !created) {
                throw new Error(errors?.map(e => e.message).join(', ') ?? 'Failed to create entry');
              }
              setEntries(prev => prev.map(e => e.id === tempId ? { ...e, id: created.id } : e));
            }
          }
        } catch (err) {
          console.error('Failed to upsert meal entry:', err);
          // Revert optimistic update
          setEntries(prev => prev.filter(e => e.id !== (existingLocalId ?? tempId)));
        }
      })();
    },
    [],
  ) as UpsertEntryFn;

  const deleteEntry = useCallback(
    (id: string) => {
      setEntries(prev => prev.filter(e => e.id !== id));
      (async () => {
        try {
          const client = getClient();
          const { errors } = await client.models.MealEntry.delete({ id });
          if (errors?.length) throw new Error(errors.map(e => e.message).join(', '));
        } catch (err) {
          console.error('Failed to delete meal entry:', err);
          loadAll(); // reload to restore consistency
        }
      })();
    },
    [loadAll],
  );

  const weekEntries = useCallback(
    (weekOf: string): MealCalendarEntry[] => {
      return entries.filter(e => e.weekOf === weekOf);
    },
    [entries],
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
