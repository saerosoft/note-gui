import { createContext, useContext } from 'react';
import type { NoteCoreApi } from '../model';
import { useNoteCore } from '../hostRuntime';

export const AttachmentContext = createContext<{ api: NoteCoreApi; noteId: string; editable: boolean } | null>(null);
export function useAttachments() {
  const value = useContext(AttachmentContext);
  const api = useNoteCore(value?.api);
  if (!value || !api) throw new Error('Missing pane attachment context');
  return { ...value, api };
}
