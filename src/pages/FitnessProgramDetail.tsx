import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFitness } from '../hooks/useFitness';
import type { WorkoutDayType, WorkoutExerciseSpec } from '../types';

const TYPE_BADGE_STYLES: Record<WorkoutDayType, string> = {
  STRENGTH: 'bg-sams/10 text-sams',
  HIIT: 'bg-ht/10 text-ht',
  REST: 'bg-brand-bg text-brand-muted',
};

function DayTypeBadge({ type }: { type: WorkoutDayType }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${TYPE_BADGE_STYLES[type]}`}>
      {type}
    </span>
  );
}

function getExerciseKey(exercise: WorkoutExerciseSpec): string {
  return exercise.id ?? `${exercise.name}:${exercise.sets}:${exercise.reps}:${exercise.rest}:${exercise.notes ?? ''}`;
}

export default function FitnessProgramDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { activeProgram, days, loading } = useFitness();
  const day = days.find(item => item.id === id) ?? null;

  if (!activeProgram && !loading) {
    return (
      <div className="rounded-2xl border border-brand-border bg-white p-6 text-center shadow-sm">
        <div className="text-4xl">🏋️</div>
        <h1 className="mt-3 text-xl font-bold text-brand-text">No active program</h1>
        <p className="mt-2 text-sm text-brand-muted">Create a program first before opening workout day details.</p>
        <Link
          to="/fitness/program/new"
          className="mt-5 inline-flex rounded-lg bg-sams px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sams-dark"
        >
          New Program
        </Link>
      </div>
    );
  }

  if (loading && !day) {
    return (
      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Program Detail</p>
        <h1 className="mt-2 text-xl font-bold text-brand-text">Loading workout day…</h1>
      </div>
    );
  }

  if (!day) {
    return (
      <div className="rounded-2xl border border-brand-border bg-white p-6 text-center shadow-sm">
        <div className="text-4xl">📅</div>
        <h1 className="mt-3 text-xl font-bold text-brand-text">Workout day not found</h1>
        <p className="mt-2 text-sm text-brand-muted">
          This workout day isn't available in the active program right now.
        </p>
        <button
          onClick={() => navigate('/fitness')}
          className="mt-5 rounded-lg bg-sams px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sams-dark"
        >
          Back to Fitness
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Program Day</p>
          <h1 className="mt-1 text-2xl font-bold text-brand-text">{day.dayLabel}</h1>
          <p className="mt-1 text-sm text-brand-muted">{activeProgram?.name ?? 'Active program'}</p>
        </div>
        <DayTypeBadge type={day.type} />
      </div>

      <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Exercises</p>
            <h2 className="mt-1 text-xl font-bold text-brand-text">
              {day.exercises?.length ?? 0} exercise{day.exercises?.length === 1 ? '' : 's'}
            </h2>
          </div>
        </div>

        {day.exercises && day.exercises.length > 0 ? (
          <div className="mt-4 space-y-3">
            {day.exercises.map(exercise => (
              <div key={getExerciseKey(exercise)} className="rounded-xl bg-brand-bg px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-brand-text">{exercise.name}</p>
                    <p className="mt-1 text-sm text-brand-muted">
                      {exercise.sets} sets · {exercise.reps} · Rest {exercise.rest}
                    </p>
                  </div>
                </div>
                {exercise.notes && (
                  <p className="mt-2 text-sm text-brand-muted">{exercise.notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-brand-muted">No exercises have been added for this day yet.</p>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/fitness')}
          className="rounded-lg bg-sams px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sams-dark"
        >
          Back to Fitness
        </button>
      </div>
    </div>
  );
}
