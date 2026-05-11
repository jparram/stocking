import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFitness } from '../hooks/useFitness';
import type { WorkoutDayType, WorkoutExerciseSpec } from '../types';

type FormStep = 1 | 2;

interface ExerciseDraft {
  localId: string;
  id?: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
}

interface DayDraft {
  localId: string;
  id?: string;
  dayLabel: string;
  type: WorkoutDayType;
  exercises: ExerciseDraft[];
  isOpen: boolean;
}

const DAY_TYPES: WorkoutDayType[] = ['STRENGTH', 'HIIT', 'REST'];
const DAY_LABEL_SUGGESTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function createLocalId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyExercise(): ExerciseDraft {
  return {
    localId: createLocalId(),
    name: '',
    sets: '',
    reps: '',
    rest: '',
    notes: '',
  };
}

function emptyDay(dayIndex = 0): DayDraft {
  return {
    localId: createLocalId(),
    dayLabel: DAY_LABEL_SUGGESTIONS[dayIndex % DAY_LABEL_SUGGESTIONS.length] ?? `Day ${dayIndex + 1}`,
    type: 'STRENGTH',
    exercises: [emptyExercise()],
    isOpen: true,
  };
}

function exerciseFromPersisted(exercise: WorkoutExerciseSpec): ExerciseDraft {
  return {
    localId: exercise.id ?? createLocalId(),
    id: exercise.id,
    name: exercise.name,
    sets: String(exercise.sets),
    reps: exercise.reps,
    rest: exercise.rest,
    notes: exercise.notes ?? '',
  };
}

function dayFromPersisted(
  day: { id: string; dayLabel: string; type: WorkoutDayType; exercises?: WorkoutExerciseSpec[] },
): DayDraft {
  const exercises = day.exercises && day.exercises.length > 0
    ? day.exercises.map(exerciseFromPersisted)
    : [emptyExercise()];

  return {
    localId: day.id,
    id: day.id,
    dayLabel: day.dayLabel,
    type: day.type,
    exercises,
    isOpen: false,
  };
}

function hasValidExerciseFields(exercise: ExerciseDraft): boolean {
  const sets = Number.parseInt(exercise.sets.trim(), 10);
  return Boolean(
    exercise.name.trim()
    && Number.isFinite(sets)
    && sets > 0
    && exercise.reps.trim()
    && exercise.rest.trim(),
  );
}

export default function ProgramForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const {
    programs,
    loading,
    getProgram,
    getDays,
    createProgram,
    updateProgram,
    createDay,
    updateDay,
    deleteDay,
  } = useFitness();

  const [step, setStep] = useState<FormStep>(1);
  const [name, setName] = useState('');
  const [split, setSplit] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState<DayDraft[]>([]);
  const [initialDayIds, setInitialDayIds] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [dayError, setDayError] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;

    void (async () => {
      setLoadingData(true);
      setSaveError('');
      try {
        const [program, programDays] = await Promise.all([
          getProgram(id),
          getDays(id),
        ]);
        if (cancelled) return;

        setName(program.name);
        setSplit(program.split ?? '');
        setDescription(program.description ?? '');
        setDays(programDays.map(dayFromPersisted));
        setInitialDayIds(programDays.map(day => day.id));
      } catch (error) {
        console.error('ProgramForm: failed to load workout program for edit', error);
        if (!cancelled) navigate('/fitness');
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getDays, getProgram, id, isEdit, navigate]);

  const setDayPatch = (index: number, patch: Partial<DayDraft>) => {
    setDays(prev => prev.map((day, dayIndex) => (dayIndex === index ? { ...day, ...patch } : day)));
  };

  const setExercisePatch = (dayIndex: number, exerciseIndex: number, patch: Partial<ExerciseDraft>) => {
    setDays(prev =>
      prev.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? {
              ...day,
              exercises: day.exercises.map((exercise, currentExerciseIndex) => (
                currentExerciseIndex === exerciseIndex ? { ...exercise, ...patch } : exercise
              )),
            }
          : day,
      ),
    );
  };

  const addDay = () => {
    setDays(prev => [
      ...prev.map(day => ({ ...day, isOpen: false })),
      emptyDay(prev.length),
    ]);
  };

  const removeDay = (index: number) => {
    setDays(prev => prev.filter((_, dayIndex) => dayIndex !== index));
  };

  const moveDay = (index: number, direction: 'up' | 'down') => {
    setDays(prev => {
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  };

  const addExercise = (dayIndex: number) => {
    setDays(prev =>
      prev.map((day, currentDayIndex) => (
        currentDayIndex === dayIndex
          ? { ...day, exercises: [...day.exercises, emptyExercise()] }
          : day
      )),
    );
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    setDays(prev =>
      prev.map((day, currentDayIndex) => (
        currentDayIndex === dayIndex
          ? { ...day, exercises: day.exercises.filter((_, currentExerciseIndex) => currentExerciseIndex !== exerciseIndex) }
          : day
      )),
    );
  };

  const validateProgramDetails = (): boolean => {
    const error = name.trim() ? '' : 'Program name is required.';
    setNameError(error);
    return !error;
  };

  const validateDays = (): boolean => {
    if (days.length === 0) {
      setDayError('Add at least one day before saving.');
      return false;
    }

    for (const day of days) {
      if (!day.dayLabel.trim()) {
        setDayError('Each day needs a label.');
        return false;
      }
      if (day.exercises.length === 0) {
        setDayError('Each day needs at least one exercise.');
        return false;
      }
      for (const exercise of day.exercises) {
        if (!hasValidExerciseFields(exercise)) {
          setDayError('Every exercise requires name, sets, reps, and rest.');
          return false;
        }
      }
    }

    setDayError('');
    return true;
  };

  const handleNext = () => {
    if (!validateProgramDetails()) return;
    setStep(2);
  };

  const toExerciseInput = (exercise: ExerciseDraft): WorkoutExerciseSpec => ({
    ...(exercise.id ? { id: exercise.id } : {}),
    name: exercise.name.trim(),
    sets: Number.parseInt(exercise.sets.trim(), 10),
    reps: exercise.reps.trim(),
    rest: exercise.rest.trim(),
    ...(exercise.notes.trim() ? { notes: exercise.notes.trim() } : {}),
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaveError('');

    if (!validateProgramDetails()) {
      setStep(1);
      return;
    }
    if (!validateDays()) {
      setStep(2);
      return;
    }

    setSaving(true);

    try {
      const programInput = {
        name: name.trim(),
        split: split.trim() || undefined,
        description: description.trim() || undefined,
      };

      if (isEdit && id) {
        await updateProgram(id, programInput);
        const currentDayIds = new Set(days.filter(day => day.id).map(day => day.id as string));
        const removedDayIds = initialDayIds.filter(dayId => !currentDayIds.has(dayId));
        for (const dayId of removedDayIds) {
          await deleteDay(dayId);
        }

        for (const [sortOrder, day] of days.entries()) {
          const dayInput = {
            dayLabel: day.dayLabel.trim(),
            type: day.type,
            sortOrder,
            exercises: day.exercises.map(toExerciseInput),
          };

          if (day.id) {
            await updateDay(day.id, dayInput);
          } else {
            await createDay({ programId: id, ...dayInput });
          }
        }
      } else {
        const program = await createProgram({
          ...programInput,
          isActive: programs.length === 0,
        });

        for (const [sortOrder, day] of days.entries()) {
          await createDay({
            programId: program.id,
            dayLabel: day.dayLabel.trim(),
            type: day.type,
            sortOrder,
            exercises: day.exercises.map(toExerciseInput),
          });
        }
      }

      navigate('/fitness');
    } catch (error) {
      console.error('ProgramForm: failed to save workout program', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save program. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingData || (loading && isEdit)) {
    return (
      <div className="rounded-2xl border border-brand-border bg-white p-6 text-center shadow-sm">
        <div className="text-4xl">🏋️</div>
        <h1 className="mt-3 text-xl font-bold text-brand-text">Loading program…</h1>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">{isEdit ? 'Edit Program' : 'New Program'}</h1>
          <p className="mt-1 text-sm text-brand-muted">Step {step} of 2</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/fitness')}
          className="rounded-lg border border-brand-border px-3 py-2 text-sm font-medium text-brand-muted transition-colors hover:bg-brand-bg hover:text-brand-text"
        >
          Cancel
        </button>
      </div>

      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
      )}

      {step === 1 ? (
        <section className="space-y-4 rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">
              Program name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="e.g. Summer Strength"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams ${
                nameError ? 'border-red-400' : 'border-brand-border'
              }`}
            />
            {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">Split</label>
            <input
              type="text"
              value={split}
              onChange={event => setSplit(event.target.value)}
              placeholder="e.g. Push/Pull/Lower"
              className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">Description</label>
            <textarea
              value={description}
              onChange={event => setDescription(event.target.value)}
              rows={3}
              placeholder="Optional notes for this program"
              className="w-full resize-none rounded-lg border border-brand-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-sams px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sams-dark"
            >
              Next →
            </button>
          </div>
        </section>
      ) : (
        <section className="space-y-4 rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
          <button
            type="button"
            onClick={addDay}
            className="rounded-lg border border-brand-border px-3 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-brand-bg"
          >
            + Add Day
          </button>

          {dayError && <p className="text-sm text-red-600">{dayError}</p>}

          <div className="space-y-3">
            {days.length === 0 ? (
              <div className="rounded-xl border border-dashed border-brand-border px-4 py-6 text-center text-sm text-brand-muted">
                Add at least one workout day.
              </div>
            ) : (
              days.map((day, dayIndex) => (
                <div key={day.localId} className="rounded-xl border border-brand-border">
                  <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-brand-text">
                        {day.dayLabel || `Day ${dayIndex + 1}`} · {day.exercises.length} exercise{day.exercises.length === 1 ? '' : 's'}
                      </p>
                      <p className="text-xs font-semibold tracking-wide text-brand-muted">{day.type}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => moveDay(dayIndex, 'up')}
                        disabled={dayIndex === 0}
                        className="rounded border border-brand-border px-2 py-1 text-xs text-brand-text disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDay(dayIndex, 'down')}
                        disabled={dayIndex === days.length - 1}
                        className="rounded border border-brand-border px-2 py-1 text-xs text-brand-text disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setDayPatch(dayIndex, { isOpen: !day.isOpen })}
                        className="rounded border border-brand-border px-2 py-1 text-xs text-brand-text"
                      >
                        {day.isOpen ? 'Close' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDay(dayIndex)}
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {day.isOpen && (
                    <div className="space-y-3 border-t border-brand-border px-4 py-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-brand-text">Day label</span>
                          <input
                            type="text"
                            value={day.dayLabel}
                            onChange={event => setDayPatch(dayIndex, { dayLabel: event.target.value })}
                            className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-brand-text">Type</span>
                          <select
                            value={day.type}
                            onChange={event => setDayPatch(dayIndex, { type: event.target.value as WorkoutDayType })}
                            className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
                          >
                            {DAY_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => addExercise(dayIndex)}
                          className="rounded-lg border border-brand-border px-3 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-brand-bg"
                        >
                          + Add exercise
                        </button>

                        {day.exercises.map((exercise, exerciseIndex) => (
                          <div key={exercise.localId} className="rounded-xl bg-brand-bg px-4 py-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block sm:col-span-2">
                                <span className="mb-1 block text-sm font-medium text-brand-text">Exercise</span>
                                <input
                                  type="text"
                                  value={exercise.name}
                                  onChange={event => setExercisePatch(dayIndex, exerciseIndex, { name: event.target.value })}
                                  className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-brand-text">Sets</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={exercise.sets}
                                  onChange={event => setExercisePatch(dayIndex, exerciseIndex, { sets: event.target.value })}
                                  className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-brand-text">Reps</span>
                                <input
                                  type="text"
                                  value={exercise.reps}
                                  onChange={event => setExercisePatch(dayIndex, exerciseIndex, { reps: event.target.value })}
                                  className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
                                />
                              </label>

                              <label className="block sm:col-span-2">
                                <span className="mb-1 block text-sm font-medium text-brand-text">Rest</span>
                                <input
                                  type="text"
                                  value={exercise.rest}
                                  onChange={event => setExercisePatch(dayIndex, exerciseIndex, { rest: event.target.value })}
                                  className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
                                />
                              </label>

                              <label className="block sm:col-span-2">
                                <span className="mb-1 block text-sm font-medium text-brand-text">Notes</span>
                                <textarea
                                  value={exercise.notes}
                                  onChange={event => setExercisePatch(dayIndex, exerciseIndex, { notes: event.target.value })}
                                  rows={2}
                                  className="w-full resize-none rounded-lg border border-brand-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
                                />
                              </label>
                            </div>

                            <div className="mt-3 flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeExercise(dayIndex, exerciseIndex)}
                                className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                              >
                                ✕ Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-brand-bg"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-sams px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sams-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Save Program'}
            </button>
          </div>
        </section>
      )}
    </form>
  );
}
