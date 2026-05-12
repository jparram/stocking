import type { WorkoutDayType } from '../types';

const DAILY_BRIEF_BASE_URL = (import.meta.env['VITE_DAILY_BRIEF_BASE_URL'] as string | undefined)
  ?.trim()
  .replace(/\/+$/, '');

export interface DailyBriefTodayWorkout {
  dayLabel: string;
  type: WorkoutDayType;
  exerciseCount: number;
  completedToday: boolean;
}

export interface DailyBriefHousehold {
  shopping_due?: boolean;
  shopping_store?: string | null;
  shopping_list_id?: string | null;
  meal_plan_week_of?: string | null;
  today_dinner?: string | null;
  today_workout?: DailyBriefTodayWorkout | null;
  pantry_flags?: string[];
}

export interface DailyBrief {
  available: boolean;
  date: string;
  headline: string | null;
  household: DailyBriefHousehold | null;
}

export function unavailableDailyBrief(date?: string): DailyBrief {
  return { available: false, date: date ?? '', headline: null, household: null };
}

export async function getDailyBrief(date?: string): Promise<DailyBrief> {
  if (!DAILY_BRIEF_BASE_URL) return unavailableDailyBrief(date);

  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const url = `${DAILY_BRIEF_BASE_URL}/briefs/${targetDate}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) return unavailableDailyBrief(targetDate);

    const data = (await response.json()) as unknown;
    if (typeof data !== 'object' || data === null) return unavailableDailyBrief(targetDate);

    // Support both flat `{ date, headline, household, ... }` and wrapped `{ brief: { ... } }`
    const root = data as Record<string, unknown>;
    const brief = (typeof root['brief'] === 'object' && root['brief'] !== null)
      ? root['brief'] as Record<string, unknown>
      : root;

    return {
      available: true,
      date: typeof brief['date'] === 'string' ? brief['date'] : targetDate,
      headline: typeof brief['headline'] === 'string' ? brief['headline'] : null,
      household: (typeof brief['household'] === 'object' && brief['household'] !== null)
        ? brief['household'] as DailyBriefHousehold
        : null,
    };
  } catch (error) {
    console.error('Failed to fetch daily brief:', error);
    return unavailableDailyBrief(targetDate);
  }
}
