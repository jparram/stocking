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

  const [members, setMembers]             = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  // ── Update a Member's displayName and/or color ──────────────────────────────

  const updateMember = useCallback(
    async (id: string, updates: { displayName?: string; color?: string }) => {
      const client = getClient();
      const { data: updated } = await client.models.Member.update({ id, ...updates });
      if (updated) {
        const mapped = mapMember(updated);
        setMembers(prev => prev.map(m => m.id === id ? mapped : m));
        setCurrentMember(prev => (prev?.id === id ? mapped : prev));
      }
    },
    []
  );

  // ── Initialise: load all members + ensure current user has a record ─────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        const client = getClient();

        // Load all members (with a generous limit; household is typically < 20)
        const { data: raw = [] } = await client.models.Member.list({ limit: 200 });
        const allMembers = raw.map(mapMember);
        if (!cancelled) setMembers(allMembers);

        // Ensure current user has a Member record
        try {
          const attrs = await fetchUserAttributes();
          const sub   = attrs.sub;
          if (!sub) return;

          // Require a non-empty email — skip auto-create if Cognito didn't provide one
          const email = attrs.email?.trim();
          if (!email) {
            console.warn('useMembers: Cognito user has no email attribute — skipping Member auto-create.');
            return;
          }

          // Filter by cognitoSub directly to avoid false-negative from a truncated full-list scan
          const { data: existing = [] } = await client.models.Member.list({
            filter: { cognitoSub: { eq: sub } },
          });

          if (existing.length > 0) {
            if (!cancelled) setCurrentMember(mapMember(existing[0]));
          } else {
            // First login — derive displayName from email prefix and pick a color
            const displayName = (attrs.preferred_username || email.split('@')[0] || 'Member').trim();
            const color = nextMemberColor(allMembers.map(m => ({
              id: m.id, name: m.displayName, color: m.color ?? '#3B82F6',
            })));

            const { data: created } = await client.models.Member.create({
              cognitoSub:  sub,
              displayName,
              email,
              role:  'member',
              color,
            });

            if (created && !cancelled) {
              const mapped = mapMember(created);
              setCurrentMember(mapped);
              setMembers(prev => [...prev, mapped]);
            }
          }
        } catch (err) {
          // Non-fatal — user can still use the app without a Member record
          console.error('useMembers: failed to ensure current member:', err);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load members.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const client = getClient();
      const { data: raw = [] } = await client.models.Member.list({ limit: 200 });
      setMembers(raw.map(mapMember));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members.');
    }
  }, []);

  return { members, currentMember, loading, error, loadMembers, updateMember };
}
