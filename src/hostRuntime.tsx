import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { ApiError, createNoteAccess, legacyAccess } from './access';
import type { NoteCoreGuiOptions, NoteDestination, NoteHost } from './host';
import type { NoteCoreApi, NoteKnowledgeContextApi, NoteRelationsApi } from './model';

const Runtime = createContext<ReturnType<typeof createNoteSession> | null>(null);
const emptyHost: NoteHost = { access: legacyAccess, destinations: {} };
export const NoteHostContext = createContext<NoteHost>(emptyHost);
const readOperations = new Set(['spaces', 'tree', 'ancestors', 'note', 'findNotes', 'history', 'comments', 'properties', 'files', 'attachment', 'provenance', 'accumulations', 'currentKnowledge', 'accumulationChange', 'findRelationNotes', 'relations', 'relationEvidence']);

/** Guards every adapter result, including extension data and attachment bytes, by mount/access generation. */
export function createNoteSession(options: NoteCoreGuiOptions) {
  const access = createNoteAccess();
  let disposed = false;
  let revoked = false;
  let unsubscribe: (() => void)[] = [];
  interface Refresh { generation: number; pending: Set<Promise<unknown>>; failures: { reason: unknown; core: boolean }[] }
  let refreshing: Refresh | undefined;
  const notifyRefresh = access.refresh;
  async function refresh(scope: 'host' | 'authority') {
    const cycle: Refresh = { generation: access.generation + 1, pending: new Set(), failures: [] };
    refreshing = cycle;
    try {
      // Flush invalidation first so reads started by its React effects join this generation's barrier.
      let notification!: Promise<void>;
      flushSync(() => { notification = notifyRefresh(); });
      try { await notification; } catch (failure) {
        if (!cycle.failures.some(value => value.reason === failure)) cycle.failures.push({ reason: failure, core: true });
      }
      for (;;) {
        await Promise.resolve();
        flushSync(() => {});
        if (!cycle.pending.size) break;
        await Promise.allSettled([...cycle.pending]);
      }
      if (cycle.generation !== access.generation) throw new ApiError('Access changed during revalidation.', 'STALE_ACCESS');
      const coreFailure = cycle.failures.find(value => value.core);
      if (coreFailure) throw coreFailure.reason;
      if (scope === 'host' && cycle.failures.length) throw cycle.failures[0].reason;
    } finally { if (refreshing === cycle) refreshing = undefined; }
  }
  access.refresh = () => refresh('host');
  function guard<T extends object>(client: T, core = false): T {
    return new Proxy(client, { get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        const cycle = readOperations.has(String(key)) ? refreshing : undefined;
        const operation = (async () => {
          if (disposed || revoked) throw new ApiError('Access is no longer available.', 'ACCESS_DENIED');
          const generation = access.generation;
          try {
            const result = await Reflect.apply(value, target, args);
            if (disposed || generation !== access.generation) throw new ApiError('Access changed while loading.', 'STALE_ACCESS');
            return result;
          } catch (failure) {
            if (disposed || generation !== access.generation) throw new ApiError('Access changed while loading.', 'STALE_ACCESS');
            if (core && failure instanceof ApiError && ['ACCESS_DENIED', 'UNAUTHENTICATED', 'UNAUTHORIZED', 'FORBIDDEN'].includes(failure.code)) access.revoke();
            throw failure;
          }
        })();
        if (cycle && cycle.generation === access.generation) {
          cycle.pending.add(operation);
          operation.then(() => cycle.pending.delete(operation), failure => { cycle.pending.delete(operation); cycle.failures.push({ reason: failure, core }); });
        }
        return operation;
      };
    } });
  }
  access.onAccessLost(() => { revoked = true; });
  return {
    api: guard(options.api, true),
    knowledgeContext: options.knowledgeContext && guard(options.knowledgeContext),
    relations: options.relations && guard(options.relations),
    host: options.host, access,
    refreshAuthority: () => refresh('authority'),
    connect() {
      if (disposed || unsubscribe.length) return;
      unsubscribe = [options.host.access.onAccessLost(() => access.revoke()), options.host.access.onAccessRefresh(() => access.refresh())];
    },
    dispose() { if (disposed) return; disposed = true; access.revoke(); unsubscribe.forEach(stop => stop()); unsubscribe = []; },
  };
}

export type NoteSession = ReturnType<typeof createNoteSession>;
export function NoteHostProvider({ children, session: suppliedSession, ...options }: NoteCoreGuiOptions & { children: ReactNode; session?: NoteSession }) {
  const session = useMemo(() => suppliedSession ?? createNoteSession(options), [suppliedSession, options.api, options.host, options.knowledgeContext, options.relations]);
  useLayoutEffect(() => { if (!suppliedSession) { session.connect(); return () => session.dispose(); } }, [session, suppliedSession]);
  return <Runtime.Provider value={session}>{children}</Runtime.Provider>;
}
export function useNoteAccess() { return useContext(Runtime)?.access ?? legacyAccess; }
export function useNoteAuthorityRefresh() { return useContext(Runtime)?.refreshAuthority ?? legacyAccess.refresh; }
export function useNoteHost() { const runtime = useContext(Runtime); const host = useContext(NoteHostContext); return runtime?.host ?? host; }
export function useNoteCore(api: NoteCoreApi): NoteCoreApi;
export function useNoteCore(api: NoteCoreApi | undefined): NoteCoreApi | undefined;
export function useNoteCore(api: NoteCoreApi | undefined) { return useContext(Runtime)?.api ?? api; }
export function useKnowledgeContext(api?: NoteKnowledgeContextApi) { const runtime = useContext(Runtime); return runtime ? runtime.knowledgeContext : api; }
export function useRelations(api?: NoteRelationsApi) { const runtime = useContext(Runtime); return runtime ? runtime.relations : api; }
export function useNoteDestination() {
  const host = useNoteHost();
  return (value: NoteDestination) => value.kind === 'home' || value.kind === 'login'
    ? host.destinations[value.kind] ?? host.destinations.resolve?.(value) : host.destinations.resolve?.(value);
}
export function HostLink({ destination, children }: { destination: NoteDestination; children: ReactNode }) {
  const resolve = useNoteDestination(); const href = resolve(destination);
  return href ? <a href={href} target="_blank" rel="noreferrer">{children}</a> : <span>{children}</span>;
}
