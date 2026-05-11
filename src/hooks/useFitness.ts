import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type {
  WorkoutProgram,
  WorkoutDay,
  WorkoutSession,
  WorkoutExerciseSpec,
  WorkoutDayType,
} from '../types';
import { useMembers } from './useMembers';

type Client = ReturnType<typeof generateClient<Schema>>;
const LIST_PAGE_LIMIT = 1000;

export interface WorkoutProgramInput {
  name: string;
  description?: string;
  split?: string;
  isActive?: boolean;
}

export interface WorkoutProgramPatch {
  name?: string;
  description?: string;
  split?: string;
  isActive?: boolean;
}

export interface WorkoutDayInput {
  programId: string;
  dayLabel: string;
  type: WorkoutDayType;
  sortOrder: number;
  exercises?: WorkoutExerciseSpec[];
}

export interface WorkoutDayPatch {
  dayLabel?: string;
  type?: WorkoutDayType;
  sortOrder?: number;
  exercises?: WorkoutExerciseSpec[];
}

export interface LogSessionOptions {
  durationMinutes?: number;
  notes?: string;
}

function mapProgram(raw: Schema['WorkoutProgram']['type']): WorkoutProgram {
  return {
    id: raw.id,
    memberId: raw.memberId,
    name: raw.name,
    description: raw.description ?? undefined,
    split: raw.split ?? undefined,
    isActive: Boolean(raw.isActive),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function parseExercises(raw: unknown): WorkoutExerciseSpec[] | undefined {
  if (raw == null) return undefined;

  let parsed: unknown = raw;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      console.warn('useFitness: failed to parse WorkoutDay exercises JSON blob.');
      return undefined;
    }
  }

  if (!Array.isArray(parsed)) return undefined;

  return parsed
    .flatMap(item => {
      if (!item || typeof item !== 'object') return [];
      const value = item as Record<string, unknown>;
      const name = typeof value.name === 'string' ? value.name.trim() : '';
      const reps = typeof value.reps === 'string' ? value.reps : '';
      const rest = typeof value.rest === 'string' ? value.rest : '';
      const setsRaw = value.sets;
      const sets =
        typeof setsRaw === 'number'
          ? setsRaw
          : typeof setsRaw === 'string' && setsRaw.trim() !== ''
            ? Number(setsRaw)
            : Number.NaN;

      if (!name || !reps || !rest || !Number.isFinite(sets)) return [];

      return [{
        ...(typeof value.id === 'string' && value.id ? { id: value.id } : {}),
        name,
        sets,
        reps,
        rest,
        ...(typeof value.notes === 'string' && value.notes ? { notes: value.notes } : {}),
      }];
    });
}

/**
 * Preserves existing exercise IDs and assigns UUIDs to legacy rows that do not have one yet,
 * so rendered exercise lists can use stable keys across edits and reloads.
 */
function ensureExerciseIds(exercises?: WorkoutExerciseSpec[]): WorkoutExerciseSpec[] | undefined {
  return exercises?.map(exercise => (
    exercise.id
      ? exercise
      : {
          ...exercise,
          id: crypto.randomUUID(),
        }
  ));
}

function serializeExercises(exercises?: WorkoutExerciseSpec[]): string | undefined {
  return exercises ? JSON.stringify(exercises) : undefined;
}

function mapDay(raw: Schema['WorkoutDay']['type']): WorkoutDay {
  return {
    id: raw.id,
    programId: raw.programId,
    memberId: raw.memberId,
    dayLabel: raw.dayLabel,
    type: raw.type as WorkoutDayType,
    sortOrder: raw.sortOrder,
    exercises: parseExercises(raw.exercises),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function mapSession(raw: Schema['WorkoutSession']['type']): WorkoutSession {
  return {
    id: raw.id,
    memberId: raw.memberId,
    programId: raw.programId,
    dayId: raw.dayId,
    completedAt: raw.completedAt,
    durationMinutes: raw.durationMinutes ?? undefined,
    notes: raw.notes ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function getNinetyDayCutoff(): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  return cutoff.toISOString().slice(0, 10);
}

function toIsoDate(value: string): string {
  return value.slice(0, 10);
}

function sortDaysByOrder(items: WorkoutDay[]): WorkoutDay[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

function sortSessionsByDate(items: WorkoutSession[]): WorkoutSession[] {
  return [...items].sort((a, b) => {
    const completed = b.completedAt.localeCompare(a.completedAt);
    return completed !== 0 ? completed : b.createdAt.localeCompare(a.createdAt);
  });
}

export function useFitness() {
  const clientRef = useRef<Client | null>(null);
  const { currentMember, loading: membersLoading } = useMembers();

  function getClient(): Client {
    if (!clientRef.current) {
      clientRef.current = generateClient<Schema>({ authMode: 'userPool' });
    }
    return clientRef.current;
  }

  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  const activeProgram = useMemo(
    () => programs.find(program => program.isActive) ?? null,
    [programs],
  );

  const loadPrograms = useCallback(async (memberId: string) => {
    const client = getClient();
    const allPrograms: Schema['WorkoutProgram']['type'][] = [];
    let nextToken: string | null | undefined = undefined;

    for (;;) {
      const page: {
        data: Schema['WorkoutProgram']['type'][];
        errors?: { message: string }[];
        nextToken?: string | null;
      } = await client.models.WorkoutProgram.list({
        filter: { memberId: { eq: memberId } },
        limit: LIST_PAGE_LIMIT,
        ...(nextToken ? { nextToken } : {}),
      });
      if (page.errors?.length) {
        throw new Error(`Failed to load workout programs: ${page.errors.map(error => error.message).join(', ')}`);
      }
      allPrograms.push(...(page.data ?? []));
      if (!page.nextToken) break;
      nextToken = page.nextToken;
    }

    return allPrograms.map(mapProgram);
  }, []);

  const loadDays = useCallback(async (memberId: string, programId: string) => {
    const client = getClient();
    const allDays: Schema['WorkoutDay']['type'][] = [];
    let nextToken: string | null | undefined = undefined;

    for (;;) {
      const page: {
        data: Schema['WorkoutDay']['type'][];
        errors?: { message: string }[];
        nextToken?: string | null;
      } = await client.models.WorkoutDay.list({
        filter: {
          memberId: { eq: memberId },
          programId: { eq: programId },
        },
        limit: LIST_PAGE_LIMIT,
        ...(nextToken ? { nextToken } : {}),
      });
      if (page.errors?.length) {
        throw new Error(`Failed to load workout days: ${page.errors.map(error => error.message).join(', ')}`);
      }
      allDays.push(...(page.data ?? []));
      if (!page.nextToken) break;
      nextToken = page.nextToken;
    }

    return sortDaysByOrder(allDays.map(mapDay));
  }, []);

  const loadSessions = useCallback(async (memberId: string) => {
    const client = getClient();
    const allSessions: Schema['WorkoutSession']['type'][] = [];
    let nextToken: string | null | undefined = undefined;

    for (;;) {
      const page: {
        data: Schema['WorkoutSession']['type'][];
        errors?: { message: string }[];
        nextToken?: string | null;
      } = await client.models.WorkoutSession.list({
        filter: {
          memberId: { eq: memberId },
          completedAt: { ge: getNinetyDayCutoff() },
        },
        limit: LIST_PAGE_LIMIT,
        ...(nextToken ? { nextToken } : {}),
      });
      if (page.errors?.length) {
        throw new Error(`Failed to load workout sessions: ${page.errors.map(error => error.message).join(', ')}`);
      }
      allSessions.push(...(page.data ?? []));
      if (!page.nextToken) break;
      nextToken = page.nextToken;
    }

    return sortSessionsByDate(allSessions.map(mapSession));
  }, []);

  useEffect(() => {
    const memberId = currentMember?.id;
    if (membersLoading) {
      setLoading(true);
      return;
    }
    if (!memberId) {
      setPrograms([]);
      setDays([]);
      setSessions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const nextPrograms = await loadPrograms(memberId);
        if (!cancelled) {
          setPrograms(nextPrograms);
        }
      } catch (error) {
        console.error(`useFitness: failed to load programs for member ${memberId}`, error);
        if (!cancelled) setPrograms([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentMember?.id, membersLoading, loadPrograms]);

  useEffect(() => {
    const memberId = currentMember?.id;
    const programId = activeProgram?.id;
    if (!memberId || !programId) {
      setDays([]);
      setSessions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [nextDays, nextSessions] = await Promise.all([
          loadDays(memberId, programId),
          loadSessions(memberId),
        ]);
        if (!cancelled) {
          setDays(nextDays);
          setSessions(nextSessions);
        }
      } catch (error) {
        console.error(`useFitness: failed to load active program details for member ${memberId}`, error);
        if (!cancelled) {
          setDays([]);
          setSessions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProgram?.id, currentMember?.id, loadDays, loadSessions]);

  const requireMemberId = useCallback((): string => {
    const memberId = currentMember?.id;
    if (!memberId) throw new Error('No active member found.');
    return memberId;
  }, [currentMember?.id]);

  const getProgramForMember = useCallback(async (id: string, memberId: string) => {
    const local = programs.find(item => item.id === id);
    if (local?.memberId === memberId) return local;

    const client = getClient();
    const { data } = await client.models.WorkoutProgram.get({ id });
    if (!data || data.memberId !== memberId) {
      throw new Error('Workout program not found for this member.');
    }
    return mapProgram(data);
  }, [programs]);

  const getDayForMember = useCallback(async (id: string, memberId: string) => {
    const local = days.find(item => item.id === id);
    if (local?.memberId === memberId) return local;

    const client = getClient();
    const { data } = await client.models.WorkoutDay.get({ id });
    if (!data || data.memberId !== memberId) {
      throw new Error('Workout day not found for this member.');
    }
    return mapDay(data);
  }, [days]);

  const getSessionForMember = useCallback(async (id: string, memberId: string) => {
    const local = sessions.find(item => item.id === id);
    if (local?.memberId === memberId) return local;

    const client = getClient();
    const { data } = await client.models.WorkoutSession.get({ id });
    if (!data || data.memberId !== memberId) {
      throw new Error('Workout session not found for this member.');
    }
    return mapSession(data);
  }, [sessions]);

  const setActiveProgram = useCallback(async (id: string): Promise<void> => {
    const memberId = requireMemberId();
    const client = getClient();
    const scopedPrograms = await loadPrograms(memberId);
    if (!scopedPrograms.some(program => program.id === id)) {
      throw new Error('Workout program not found for this member.');
    }

    const results = await Promise.all(
      scopedPrograms.map(program =>
        client.models.WorkoutProgram.update({
          id: program.id,
          isActive: program.id === id,
        }),
      ),
    );

    const updateError = results.flatMap(result => result.errors ?? [])[0];
    if (updateError) {
      throw new Error(updateError.message);
    }

    setPrograms(await loadPrograms(memberId));
  }, [loadPrograms, requireMemberId]);

  const createProgram = useCallback(async (input: WorkoutProgramInput): Promise<WorkoutProgram> => {
    const memberId = requireMemberId();
    const client = getClient();
    const { data, errors } = await client.models.WorkoutProgram.create({
      memberId,
      name: input.name,
      description: input.description,
      split: input.split,
      isActive: input.isActive ?? false,
    });

    if (errors?.length || !data) {
      throw new Error(errors?.map(error => error.message).join(', ') ?? 'Workout program was not created.');
    }

    const mapped = mapProgram(data);
    setPrograms(prev => [...prev, mapped]);

    if (mapped.isActive) {
      await setActiveProgram(mapped.id);
    }

    return mapped;
  }, [requireMemberId, setActiveProgram]);

  const updateProgram = useCallback(async (id: string, patch: WorkoutProgramPatch): Promise<void> => {
    const memberId = requireMemberId();
    await getProgramForMember(id, memberId);

    const client = getClient();
    const { errors } = await client.models.WorkoutProgram.update({
      id,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.split !== undefined ? { split: patch.split } : {}),
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
    });

    if (errors?.length) {
      throw new Error(errors.map(error => error.message).join(', '));
    }

    if (patch.isActive === true) {
      await setActiveProgram(id);
      return;
    }

    setPrograms(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }, [getProgramForMember, requireMemberId, setActiveProgram]);

  const deleteProgram = useCallback(async (id: string): Promise<void> => {
    const memberId = requireMemberId();
    await getProgramForMember(id, memberId);

    const client = getClient();

    const rawDays: Schema['WorkoutDay']['type'][] = [];
    const rawSessions: Schema['WorkoutSession']['type'][] = [];
    let nextDayToken: string | null | undefined = undefined;
    let nextSessionToken: string | null | undefined = undefined;

    for (;;) {
      const page: {
        data: Schema['WorkoutDay']['type'][];
        errors?: { message: string }[];
        nextToken?: string | null;
      } = await client.models.WorkoutDay.list({
        filter: {
          memberId: { eq: memberId },
          programId: { eq: id },
        },
        limit: LIST_PAGE_LIMIT,
        ...(nextDayToken ? { nextToken: nextDayToken } : {}),
      });
      if (page.errors?.length) {
        throw new Error(`Failed to load workout days for deletion: ${page.errors.map(error => error.message).join(', ')}`);
      }
      rawDays.push(...(page.data ?? []));
      if (!page.nextToken) break;
      nextDayToken = page.nextToken;
    }

    for (;;) {
      const page: {
        data: Schema['WorkoutSession']['type'][];
        errors?: { message: string }[];
        nextToken?: string | null;
      } = await client.models.WorkoutSession.list({
        filter: {
          memberId: { eq: memberId },
          programId: { eq: id },
        },
        limit: LIST_PAGE_LIMIT,
        ...(nextSessionToken ? { nextToken: nextSessionToken } : {}),
      });
      if (page.errors?.length) {
        throw new Error(`Failed to load workout sessions for deletion: ${page.errors.map(error => error.message).join(', ')}`);
      }
      rawSessions.push(...(page.data ?? []));
      if (!page.nextToken) break;
      nextSessionToken = page.nextToken;
    }

    const deleteResults = await Promise.all([
      ...rawSessions.map(session => client.models.WorkoutSession.delete({ id: session.id })),
      ...rawDays.map(day => client.models.WorkoutDay.delete({ id: day.id })),
    ]);
    const childDeleteError = deleteResults.flatMap(result => result.errors ?? [])[0];
    if (childDeleteError) {
      throw new Error(childDeleteError.message);
    }

    const { errors } = await client.models.WorkoutProgram.delete({ id });
    if (errors?.length) {
      throw new Error(errors.map(error => error.message).join(', '));
    }

    setPrograms(prev => prev.filter(item => item.id !== id));
    if (activeProgram?.id === id) {
      setDays([]);
      setSessions([]);
    }
  }, [activeProgram?.id, getProgramForMember, requireMemberId]);

  const createDay = useCallback(async (input: WorkoutDayInput): Promise<WorkoutDay> => {
    const memberId = requireMemberId();
    await getProgramForMember(input.programId, memberId);
    const exercises = ensureExerciseIds(input.exercises);

    const client = getClient();
    const { data, errors } = await client.models.WorkoutDay.create({
      programId: input.programId,
      memberId,
      dayLabel: input.dayLabel,
      type: input.type,
      sortOrder: input.sortOrder,
      exercises: serializeExercises(exercises),
    });

    if (errors?.length || !data) {
      throw new Error(errors?.map(error => error.message).join(', ') ?? 'Workout day was not created.');
    }

    const mapped = mapDay(data);
    if (activeProgram?.id === input.programId) {
      setDays(prev => sortDaysByOrder([...prev, mapped]));
    }

    return mapped;
  }, [activeProgram?.id, getProgramForMember, requireMemberId]);

  const updateDay = useCallback(async (id: string, patch: WorkoutDayPatch): Promise<void> => {
    const memberId = requireMemberId();
    await getDayForMember(id, memberId);
    const exercises = patch.exercises === undefined ? undefined : ensureExerciseIds(patch.exercises);

    const client = getClient();
    const { errors } = await client.models.WorkoutDay.update({
      id,
      ...(patch.dayLabel !== undefined ? { dayLabel: patch.dayLabel } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
      ...(patch.exercises !== undefined ? { exercises: serializeExercises(exercises) } : {}),
    });

    if (errors?.length) {
      throw new Error(errors.map(error => error.message).join(', '));
    }

    setDays(prev =>
      sortDaysByOrder(
        prev.map(item =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                  ...(exercises !== undefined ? { exercises } : {}),
                }
              : item,
        ),
      ),
    );
  }, [getDayForMember, requireMemberId]);

  const deleteDay = useCallback(async (id: string): Promise<void> => {
    const memberId = requireMemberId();
    await getDayForMember(id, memberId);

    const client = getClient();
    const { errors } = await client.models.WorkoutDay.delete({ id });
    if (errors?.length) {
      throw new Error(errors.map(error => error.message).join(', '));
    }

    setDays(prev => prev.filter(item => item.id !== id));
    setSessions(prev => prev.filter(item => item.dayId !== id));
  }, [getDayForMember, requireMemberId]);

  const logSession = useCallback(
    async (dayId: string, completedAt: string, options?: LogSessionOptions): Promise<WorkoutSession> => {
      const memberId = requireMemberId();
      const day = await getDayForMember(dayId, memberId);
      const normalizedCompletedAt = toIsoDate(completedAt);

      const client = getClient();
      const { data: existing = [] } = await client.models.WorkoutSession.list({
        filter: {
          memberId: { eq: memberId },
          dayId: { eq: dayId },
          completedAt: { eq: normalizedCompletedAt },
        },
        limit: 1,
      });

      const duplicate = existing[0];
      if (duplicate) {
        return mapSession(duplicate);
      }

      const { data, errors } = await client.models.WorkoutSession.create({
        memberId,
        programId: day.programId,
        dayId,
        completedAt: normalizedCompletedAt,
        durationMinutes: options?.durationMinutes,
        notes: options?.notes,
      });

      if (errors?.length || !data) {
        throw new Error(errors?.map(error => error.message).join(', ') ?? 'Workout session was not created.');
      }

      const mapped = mapSession(data);
      if (toIsoDate(mapped.completedAt) >= getNinetyDayCutoff()) {
        setSessions(prev => sortSessionsByDate([mapped, ...prev]));
      }
      return mapped;
    },
    [getDayForMember, requireMemberId],
  );

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    const memberId = requireMemberId();
    await getSessionForMember(id, memberId);

    const client = getClient();
    const { errors } = await client.models.WorkoutSession.delete({ id });
    if (errors?.length) {
      throw new Error(errors.map(error => error.message).join(', '));
    }

    setSessions(prev => prev.filter(item => item.id !== id));
  }, [getSessionForMember, requireMemberId]);

  return {
    programs,
    activeProgram,
    days,
    sessions,
    loading,
    createProgram,
    updateProgram,
    deleteProgram,
    setActiveProgram,
    createDay,
    updateDay,
    deleteDay,
    logSession,
    deleteSession,
  };
}
