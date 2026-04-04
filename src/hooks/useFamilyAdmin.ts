/**
 * Hook for calling the Lambda admin API to manage Cognito family members.
 * Requires VITE_ADMIN_API_URL to be set in the environment pointing at the
 * stocking-mcp Lambda (or API Gateway endpoint).
 */

import { useState, useCallback } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

export interface FamilyMember {
  sub: string;
  email: string;
  username: string;
  status: string;
  enabled: boolean;
  createdAt?: string;
}

const ADMIN_API_URL = import.meta.env.VITE_ADMIN_API_URL as string | undefined;

async function callAdminApi<T>(
  method: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  if (!ADMIN_API_URL) {
    throw new Error('VITE_ADMIN_API_URL is not configured.');
  }

  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  if (!token) {
    throw new Error('Not authenticated — please sign in again.');
  }

  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ method, params, id: Date.now() }),
  });

  const json = (await response.json()) as {
    result?: T;
    error?: { message?: string; code?: number };
  };

  if (json.error) {
    throw new Error(json.error.message ?? 'Admin API error');
  }

  return json.result as T;
}

export function useFamilyAdmin() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callAdminApi<{ members: FamilyMember[] }>(
        'admin.listMembers'
      );
      setMembers(result.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  }, []);

  const inviteMember = useCallback(
    async (email: string): Promise<FamilyMember> => {
      setError(null);
      const result = await callAdminApi<FamilyMember>('admin.inviteMember', {
        email,
      });
      await loadMembers();
      return result;
    },
    [loadMembers]
  );

  const removeMember = useCallback(
    async (username: string): Promise<void> => {
      setError(null);
      await callAdminApi('admin.removeMember', { username });
      await loadMembers();
    },
    [loadMembers]
  );

  return { members, loading, error, loadMembers, inviteMember, removeMember };
}
