import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFitness } from '../hooks/useFitness';
import type { WorkoutDay, WorkoutDayType } from '../types';

function formatLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const TODAY_WEEKDAY = new Date().toLocaleDateString('en-US', { weekday: 'long' });
const TODAY_ISO = formatLocalIsoDate(new Date());

const TYPE_BADGE_STYLES: Record<WorkoutDayType, string> = {
  STRENGTH: 'bg-sams/10 text-sams',
  HIIT: 'bg-ht/10 text-ht',
  REST: 'bg-brand-bg text-brand-muted',
};

function normalizeDayLabel(value: string): string {
  return value.trim().toLowerCase();
}

function isTodayMatch(dayLabel: string): boolean {
  const normalized = normalizeDayLabel(dayLabel);
  const long = normalizeDayLabel(TODAY_WEEKDAY);
  const short = normalizeDayLabel(
    new Date().toLocaleDateString('en-US', { weekday: 'short' }),
  );
  return normalized === long || normalized === short;
}

function getDayTypeBadge(type: WorkoutDayType) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${TYPE_BADGE_STYLES[type]}`}>
      {type}
    </span>
  );
}

function buildRecentDays() {
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    return {
      iso: formatLocalIsoDate(date),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  });
}

interface LogSessionModalProps {
  day: WorkoutDay;
  saving: boolean;
  onClose: () => void;
  onSubmit: (options: { durationMinutes?: number; notes?: string }) => Promise<void>;
}

function LogSessionModal({ day, saving, onClose, onSubmit }: LogSessionModalProps) {
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    const trimmedNotes = notes.trim();
    const parsedDuration = duration.trim() ? Number.parseInt(duration, 10) : Number.NaN;

    await onSubmit({
      durationMinutes: Number.isFinite(parsedDuration) ? parsedDuration : undefined,
      notes: trimmedNotes || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={event => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full rounded-t-2xl bg-white shadow-xl sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-brand-text">Log Session</h2>
            <p className="text-xs text-brand-muted">{day.dayLabel} · {TODAY_WEEKDAY}</p>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none text-brand-muted transition-colors hover:text-brand-text"
            aria-label="Close log session modal"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl bg-brand-bg px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-brand-text">{day.dayLabel}</p>
                <p className="text-sm text-brand-muted">
                  {day.exercises?.length ?? 0} exercise{day.exercises?.length === 1 ? '' : 's'}
                </p>
              </div>
              {getDayTypeBadge(day.type)}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-brand-text">Duration (minutes)</span>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={duration}
              onChange={event => setDuration(event.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-brand-text">Notes</span>
            <textarea
              value={notes}
              onChange={event => setNotes(event.target.value)}
              rows={4}
              placeholder="Optional training notes"
              className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
            />
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-muted transition-colors hover:bg-brand-bg hover:text-brand-text"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-sams px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sams-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Log Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FitnessHome() {
  const navigate = useNavigate();
  const { activeProgram, days, sessions, loading, logSession } = useFitness();
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);

  const todayDay = useMemo(
    () => days.find(day => isTodayMatch(day.dayLabel)) ?? null,
    [days],
  );

  const recentDays = useMemo(() => buildRecentDays(), []);
  const recentDaySet = useMemo(() => new Set(recentDays.map(day => day.iso)), [recentDays]);
  const completedRecentDays = useMemo(
    () => new Set(sessions.filter(session => recentDaySet.has(session.completedAt)).map(session => session.completedAt)),
    [recentDaySet, sessions],
  );
  const recentSessionCount = useMemo(
    () => sessions.filter(session => recentDaySet.has(session.completedAt)).length,
    [recentDaySet, sessions],
  );
  const isTodayDone = Boolean(
    todayDay && sessions.some(session => session.dayId === todayDay.id && session.completedAt === TODAY_ISO),
  );

  const handleLogSession = async (options: { durationMinutes?: number; notes?: string }) => {
    if (!todayDay) return;
    setIsSavingSession(true);
    try {
      await logSession(todayDay.id, TODAY_ISO, options);
      setIsLogModalOpen(false);
    } finally {
      setIsSavingSession(false);
    }
  };

  if (loading && !activeProgram) {
    return (
      <div className="rounded-xl border border-brand-border bg-white p-6 text-center shadow-sm">
        <div className="text-4xl">💪</div>
        <h1 className="mt-3 text-xl font-bold text-brand-text">Loading fitness…</h1>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Fitness</h1>
          <p className="text-sm text-brand-muted">
            {activeProgram ? 'Your active training plan at a glance.' : 'Create a program to start tracking sessions.'}
          </p>
        </div>
        <Link
          to="/fitness/program/new"
          className="rounded-lg bg-sams px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sams-dark"
        >
          New Program
        </Link>
      </div>

      {!activeProgram ? (
        <div className="rounded-2xl border border-dashed border-brand-border bg-white px-6 py-12 text-center shadow-sm">
          <div className="text-5xl">🏋️</div>
          <h2 className="mt-4 text-xl font-semibold text-brand-text">No active program</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-brand-muted">
            Create a workout program to see today&apos;s plan, track your streak, and log sessions from the gym.
          </p>
          <Link
            to="/fitness/program/new"
            className="mt-6 inline-flex rounded-lg bg-sams px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sams-dark"
          >
            Create Program
          </Link>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Active Program</p>
                <h2 className="mt-1 text-xl font-bold text-brand-text">{activeProgram.name}</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  {activeProgram.split ? `${activeProgram.split} · ` : ''}{days.length} day{days.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </section>

          {todayDay ? (
            <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">
                    Today — {TODAY_WEEKDAY}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-brand-text">{todayDay.dayLabel}</h2>
                    {getDayTypeBadge(todayDay.type)}
                  </div>
                  <p className="mt-2 text-sm text-brand-muted">
                    {todayDay.exercises?.length ?? 0} exercise{todayDay.exercises?.length === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  onClick={() => setIsLogModalOpen(true)}
                  disabled={isTodayDone}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    isTodayDone
                      ? 'cursor-not-allowed bg-green-100 text-green-700'
                      : 'bg-sams text-white hover:bg-sams-dark'
                  }`}
                >
                  {isTodayDone ? '✓ Done' : 'Log Complete'}
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">
                Today — {TODAY_WEEKDAY}
              </p>
              <h2 className="mt-2 text-xl font-bold text-brand-text">No scheduled workout today</h2>
              <p className="mt-2 text-sm text-brand-muted">
                This program doesn&apos;t have a day matching today&apos;s weekday, so the full plan is shown below.
              </p>
            </section>
          )}

          <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">14-Day Streak</p>
            <div className="mt-4 grid grid-cols-7 gap-2 sm:grid-cols-14">
              {recentDays.map(day => {
                const isComplete = completedRecentDays.has(day.iso);
                return (
                  <div key={day.iso} className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        isComplete ? 'bg-sams text-white' : 'bg-brand-bg text-brand-muted'
                      }`}
                      title={`${day.label} ${day.iso}`}
                    >
                      {isComplete ? '✓' : '·'}
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-brand-muted">{day.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-brand-muted">{recentSessionCount} sessions logged</p>
          </section>

          <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Program</p>
                <h2 className="mt-1 text-xl font-bold text-brand-text">{days.length} days</h2>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {days.map(day => (
                <button
                  key={day.id}
                  onClick={() => navigate(`/fitness/program/${day.id}`)}
                  className="flex w-full items-center justify-between rounded-xl border border-brand-border px-4 py-3 text-left transition-colors hover:border-sams hover:bg-brand-bg"
                >
                  <div>
                    <p className="font-medium text-brand-text">{day.dayLabel}</p>
                    <p className="text-sm text-brand-muted">
                      {day.exercises?.length ?? 0} exercise{day.exercises?.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  {getDayTypeBadge(day.type)}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {isLogModalOpen && todayDay && (
        <LogSessionModal
          day={todayDay}
          saving={isSavingSession}
          onClose={() => !isSavingSession && setIsLogModalOpen(false)}
          onSubmit={handleLogSession}
        />
      )}
    </div>
  );
}
