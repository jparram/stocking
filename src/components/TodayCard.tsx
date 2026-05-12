import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMealCalendar } from '../hooks/useMealCalendar';
import { getMondayOf } from '../utils';
import type { DailyBrief } from '../utils/dailyBrief';
import DayTypeBadge from './DayTypeBadge';

interface TodayCardProps {
  brief: DailyBrief;
}

const DAY_KEYS: Array<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'> = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function TodayCardContent({ brief, dinner }: { brief: DailyBrief; dinner: string | null }) {
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  const household = brief.household;
  const shoppingDue = household?.shopping_due === true;
  const shoppingStore = household?.shopping_store?.trim();
  const shoppingListId = household?.shopping_list_id?.trim();
  const todayWorkout = household?.today_workout;
  const isHarrisTeeter = shoppingStore?.toLowerCase().includes('harris') ?? false;
  const buttonColorClasses = isHarrisTeeter
    ? 'bg-ht hover:bg-ht-dark'
    : 'bg-sams hover:bg-sams-dark';

  return (
    <section className="bg-white rounded-xl border border-brand-border p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-brand-text mb-3">Today — {dateLabel}</h2>

      <div className="space-y-2 text-sm text-brand-text">
        <p>
          🛒{' '}
          {shoppingDue
            ? `${shoppingStore || 'Shopping'} due today`
            : 'No shopping run due today'}
        </p>

        {dinner && <p>🍽️ Tonight: {dinner}</p>}

        {brief.headline && <p>📋 {brief.headline}</p>}

        {todayWorkout && (
          <Link
            to="/fitness"
            aria-label="Open fitness plan"
            className="flex items-center justify-between gap-2 rounded-lg border border-brand-border px-3 py-2 hover:bg-brand-bg transition-colors"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span>🏋️</span>
              <span className="font-medium truncate">{todayWorkout.dayLabel}</span>
              <DayTypeBadge type={todayWorkout.type} />
            </span>
            <span className="text-brand-muted whitespace-nowrap">
              {todayWorkout.completedToday
                ? '✓ Done'
                : `${todayWorkout.exerciseCount} exercise${todayWorkout.exerciseCount === 1 ? '' : 's'}`}
            </span>
          </Link>
        )}
      </div>

      {shoppingDue && shoppingListId && (
        <Link
          to={`/list/${shoppingListId}`}
          aria-label={`Open ${shoppingStore || 'shopping'} list`}
          className={`inline-flex mt-4 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${buttonColorClasses}`}
        >
          Open list
        </Link>
      )}
    </section>
  );
}

function TodayDinnerFallback({ brief }: { brief: DailyBrief }) {
  const { weekEntries } = useMealCalendar();
  const weekOf = getMondayOf();
  const todayDayKey = DAY_KEYS[new Date().getDay()];

  const fallbackDinner = useMemo(() => {
    const current = weekEntries(weekOf);
    const familyDinner = current.find(
      e => e.planType === 'family' && e.mealType === 'dinner' && e.dayOfWeek === todayDayKey
    );
    const individualDinner = current.find(
      e => e.planType === 'individual' && e.mealType === 'dinner' && e.dayOfWeek === todayDayKey
    );
    const todayDinnerEntry = familyDinner ?? individualDinner;
    return todayDinnerEntry?.recipeName?.trim() || todayDinnerEntry?.label?.trim() || null;
  }, [todayDayKey, weekEntries, weekOf]);

  return <TodayCardContent brief={brief} dinner={fallbackDinner} />;
}

export default function TodayCard({ brief }: TodayCardProps) {
  const briefDinner = brief.household?.today_dinner?.trim() || null;
  if (briefDinner) {
    return <TodayCardContent brief={brief} dinner={briefDinner} />;
  }

  return <TodayDinnerFallback brief={brief} />;
}
