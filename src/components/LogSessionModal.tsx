import { useEffect, useRef, useState } from 'react';
import { useFitness } from '../hooks/useFitness';
import type { WorkoutDay, WorkoutDayType } from '../types';
import { formatLocalIsoDate } from '../utils';

const TYPE_BADGE_STYLES: Record<WorkoutDayType, string> = {
  STRENGTH: 'bg-sams/10 text-sams',
  HIIT: 'bg-ht/10 text-ht',
  REST: 'bg-brand-bg text-brand-muted',
};

interface LogSessionModalProps {
  day: WorkoutDay;
  onClose: () => void;
  onLogged: () => void;
}

export default function LogSessionModal({ day, onClose, onLogged }: LogSessionModalProps) {
  const { logSession } = useFitness();
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape, focus trap on Tab
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!saving) onClose();
        return;
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saving, onClose]);

  // Focus the first focusable element on mount
  useEffect(() => {
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled])',
    );
    firstFocusable?.focus();
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      const trimmedNotes = notes.trim();
      const parsedDuration = Number.parseInt(duration.trim(), 10);
      await logSession(day.id, formatLocalIsoDate(new Date()), {
        durationMinutes: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined,
        notes: trimmedNotes || undefined,
      });
      onLogged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const todayWeekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={event => event.target === event.currentTarget && !saving && onClose()}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-session-title"
        className="w-full rounded-t-2xl bg-white shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
          <div>
            <h2 id="log-session-title" className="text-sm font-semibold text-brand-text">
              Log Session
            </h2>
            <p className="text-xs text-brand-muted">
              {day.dayLabel} · {todayWeekday}
            </p>
          </div>
          <button
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="text-xl leading-none text-brand-muted transition-colors hover:text-brand-text disabled:opacity-50"
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
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${TYPE_BADGE_STYLES[day.type]}`}
              >
                {day.type}
              </span>
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

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={() => !saving && onClose()}
              disabled={saving}
              className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-muted transition-colors hover:bg-brand-bg hover:text-brand-text disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-sams px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sams-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving…' : '✓ Log Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
