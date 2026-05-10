/**
 * Hook for managing household Member records.
 *
 * Responsibilities:
 *  - Auto-create a Member record on first authenticated login if one doesn't
 *    yet exist for the current Cognito sub.
 *  - Expose the full member list for use in the meal calendar UI.
 *  - Allow admins to update displayName / color for any member.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { Member } from '../types';
import { nextMemberColor } from './useMealCalendar';

type Client = ReturnType<typeof generateClient<Schema>>;

function mapMember(raw: Schema['Member']['type']): Member {
  return {
    id:          raw.id,
    cognitoSub:  raw.cognitoSub,
    displayName: raw.displayName,
    email:       raw.email,
    role:        (raw.role as Member['role']) ?? 'member',
    color:       raw.color ?? undefined,
    createdAt:   raw.createdAt,
    updatedAt:   raw.updatedAt,
  };
}

export function useMembers() {
  const clientRef = useRef<Client | null>(null);
  function getClient(): Client {
    if (!clientRef.current) {
      clientRef.current = generateClient<Schema>({ authMode: 'userPool' });
    }
    return clientRef.current;
  }

  const [members, setMembers]           = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // ── Load all Member records ─────────────────────────────────────────────────

  const loadMembers = useCallback(async () => {
    try {
      const client = getClient();
      const { data: raw = [] } = await client.models.Member.list();
      setMembers(raw.map(mapMember));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members.');
    }
  }, []);

  // ── Ensure current user has a Member record ─────────────────────────────────

  const ensureCurrentMember = useCallback(async () => {
    try {
      const attrs = await fetchUserAttributes();
      const sub   = attrs.sub;
      const email = attrs.email ?? '';
      if (!sub) return;

      const client = getClient();

      // List members filtered by cognitoSub
      const { data: existing = [] } = await client.models.Member.list({
        filter: { cognitoSub: { eq: sub } },
      });

      if (existing.length > 0) {
        setCurrentMember(mapMember(existing[0]));
        return;
      }

      // First login — derive a displayName from the email prefix and pick a color
      const { data: all = [] } = await client.models.Member.list();
      const existingMembers = all.map(mapMember);

      const displayName = (attrs.preferred_username ?? email.split('@')[0] ?? 'Member').trim();
      const color = nextMemberColor(existingMembers.map(m => ({
        id: m.id, name: m.displayName, color: m.color ?? '#3B82F6',
      })));

      const { data: created } = await client.models.Member.create({
        cognitoSub:  sub,
        displayName,
        email,
        role:  'member',
        color,
      });

      if (created) {
        setCurrentMember(mapMember(created));
        setMembers(prev => [...prev, mapMember(created)]);
      }
    } catch (err) {
      // Non-fatal — user can still use the app without a Member record
      console.error('useMembers: failed to ensure current member:', err);
    }
  }, []);

  // ── Update a Member's displayName and/or color ──────────────────────────────

  const updateMember = useCallback(
    async (id: string, updates: { displayName?: string; color?: string }) => {
      const client = getClient();
      const { data: updated } = await client.models.Member.update({ id, ...updates });
      if (updated) {
        const mapped = mapMember(updated);
        setMembers(prev => prev.map(m => m.id === id ? mapped : m));
        if (currentMember?.id === id) setCurrentMember(mapped);
      }
    },
    [currentMember]
  );

  // ── Initialise ──────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadMembers(), ensureCurrentMember()]);
      setLoading(false);
    })();
  }, [loadMembers, ensureCurrentMember]);

  return { members, currentMember, loading, error, loadMembers, updateMember };
}
