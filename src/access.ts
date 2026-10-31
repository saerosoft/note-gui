export class ApiError extends Error {
  constructor(message: string, public code: string, public field?: string) { super(message); }
}

export interface NoteAccessLifecycle {
  onAccessLost(listener: () => void): () => void;
  onAccessRefresh(listener: () => void | Promise<void>): () => void;
}
export interface NoteAccessController extends NoteAccessLifecycle {
  readonly generation: number;
  revoke(): void;
  refresh(): Promise<void>;
}
/** Creates an isolated access channel. The host publishes identity/authority changes here. */
export function createNoteAccess(): NoteAccessController {
  let generation = 0;
  const lost = new Set<() => void>();
  const refresh = new Set<() => void | Promise<void>>();
  return {
    get generation() { return generation; },
    onAccessLost(listener) { lost.add(listener); return () => { lost.delete(listener); }; },
    onAccessRefresh(listener) { refresh.add(listener); return () => { refresh.delete(listener); }; },
    revoke() { generation++; [...lost].forEach(listener => listener()); },
    async refresh() {
      const epoch = ++generation;
      const outcomes = await Promise.allSettled([...refresh].map(async listener => listener()));
      if (epoch !== generation) throw new ApiError('Access changed during revalidation.', 'STALE_ACCESS');
      const failure = outcomes.find(outcome => outcome.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    },
  };
}

export const legacyAccess = createNoteAccess();
