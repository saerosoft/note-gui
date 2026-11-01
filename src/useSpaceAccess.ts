import { useCallback, useEffect, useRef, useState } from 'react';
import type { NoteCoreApi, Space } from './model';
import { useNoteAccess, useNoteAuthorityRefresh, useNotePolicy } from './hostRuntime';
import { validateNoteContentAccess, type NoteContentAccess } from './collaboration';

// A 30-second interval and deadline bound stale display to 60 seconds, excluding browser scheduling; focus/visibility also checks.
const ACCESS_CHECK_INTERVAL = 30_000;
const ACCESS_CHECK_DEADLINE = 30_000;

function withinAccessDeadline<T>(operation: Promise<T>): Promise<T> {
  let timer = 0;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = window.setTimeout(() => reject(new Error('접근 권한 확인 시간이 초과되었습니다. 다시 시도해 주세요.')), ACCESS_CHECK_DEADLINE);
  });
  return Promise.race([operation, deadline]).finally(() => window.clearTimeout(timer));
}

export function useSpaceAccess(api: NoteCoreApi) {
  const { revoke: clearAccess, onAccessLost, onAccessRefresh } = useNoteAccess();
  const refreshAccess = useNoteAuthorityRefresh();
  const policy = useNotePolicy();
  const [policies, setPolicies] = useState<ReadonlyMap<string, NoteContentAccess>>();
  const policySnapshot = useRef('');
  const authorityRefresh = useRef(false);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [failure, setFailure] = useState<Error>();
  const snapshot = useRef<Space[] | undefined>(undefined);
  const active = useRef(false);
  const pending = useRef(false);
  const stopped = useRef(false);
  const request = useRef(0);
  const version = useRef(0);
  const blocked = useRef(false);
  const recheck = useCallback(async (hostRefresh = false) => {
    if (stopped.current || (pending.current && !hostRefresh) || (hostRefresh && authorityRefresh.current)) return;
    pending.current = true;
    if (hostRefresh) setRefreshing(true);
    const sequence = ++request.current;
    try {
      const current = await withinAccessDeadline(api.spaces());
      const currentPolicies = policy ? new Map(await withinAccessDeadline(Promise.all(current.map(async space => {
        const value = validateNoteContentAccess(await policy.contentAccess(space.id), space.id);
        if (!value.capabilities.read) throw new Error('공간의 현재 읽기 권한을 확인해 주세요.');
        return [space.id, value] as const;
      })))) : undefined;
      const policyStamp = JSON.stringify([...currentPolicies?.values() ?? []].map(value => [value.spaceId, value.organizationId, value.mode, value.policyRevision, value.accessEpoch, ...['read', 'write', 'review', 'manageSource', 'manageRule'].map(key => Reflect.get(value.capabilities, key))]).sort());
      if (!active.current || stopped.current || sequence !== request.current) return;
      const previous = snapshot.current;
      snapshot.current = current;
      const byId = new Map(current.map(space => [space.id, space.accessEpoch]));
      if (previous?.some(space => !byId.has(space.id))) { clearAccess(); return; }
      if (!hostRefresh && (previous?.some(space => byId.get(space.id) !== space.accessEpoch) || (previous && policySnapshot.current !== policyStamp) || blocked.current)) {
        const refreshVersion = ++version.current;
        blocked.current = false;
        setFailure(undefined);
        setRefreshing(true);
        authorityRefresh.current = true;
        try { await withinAccessDeadline(refreshAccess()); } finally { authorityRefresh.current = false; }
        if (!active.current || stopped.current || version.current !== refreshVersion) return;
        setRefreshing(false);
      }
      if (!active.current || stopped.current || sequence !== request.current) return;
      policySnapshot.current = policyStamp;
      setPolicies(currentPolicies);
      blocked.current = false; setFailure(undefined);
      setSpaces(current);
      setReady(true);
      setRefreshing(false);
    } catch (error) {
      if (!active.current || stopped.current || sequence !== request.current) return;
      version.current++;
      blocked.current = true;
      setFailure(error instanceof Error ? error : new Error('접근 권한을 확인하지 못했습니다. 다시 시도해 주세요.'));
      setRefreshing(false);
      if (hostRefresh) throw error;
    } finally {
      if (sequence === request.current) pending.current = false;
    }
  }, [api, policy, clearAccess, refreshAccess]);

  useEffect(() => {
    active.current = true;
    const stop = onAccessLost(() => {
      stopped.current = true;
      request.current++;
      version.current++;
      setSpaces([]);
      setReady(true);
      setRefreshing(false);
      setFailure(undefined);
    });
    void recheck();
    const stopRefresh = onAccessRefresh(() => recheck(true));
    const check = () => { void recheck(); };
    const visible = () => { if (document.visibilityState !== 'hidden') check(); };
    const timer = window.setInterval(check, ACCESS_CHECK_INTERVAL);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', visible);
    return () => {
      active.current = false;
      pending.current = false;
      request.current++;
      version.current++;
      stop(); stopRefresh();
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [recheck]);
  return { spaces, policies, ready, refreshing, failure, recheck: () => recheck() };
}
