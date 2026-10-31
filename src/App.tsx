import { useMemo } from 'react';
import { api as defaultApi } from './api';
import type { NoteGuiOptions } from './host';
import { createKmsNoteHost } from './legacyHost';
import { NoteHostProvider } from './hostRuntime';
import { Workspace } from './Workspace';

/** Compatibility entry for the existing complete KMS adapter. */
export function App({ api = defaultApi, onNavigate }: NoteGuiOptions) {
  const host = useMemo(() => createKmsNoteHost(onNavigate), [onNavigate]);
  return <NoteHostProvider api={api} host={host} knowledgeContext={api} relations={api}><Workspace api={api}/></NoteHostProvider>;
}
