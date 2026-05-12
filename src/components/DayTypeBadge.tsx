import type { WorkoutDayType } from '../types';

const TYPE_BADGE_STYLES: Record<WorkoutDayType, string> = {
  STRENGTH: 'bg-sams/10 text-sams',
  HIIT: 'bg-ht/10 text-ht',
  REST: 'bg-brand-bg text-brand-muted',
};

export default function DayTypeBadge({ type }: { type: WorkoutDayType }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${TYPE_BADGE_STYLES[type]}`}>
      {type}
    </span>
  );
}
