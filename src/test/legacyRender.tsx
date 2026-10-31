import { render as renderBase } from '@testing-library/react';
import type { ReactNode } from 'react';
import { NoteHostContext } from '../hostRuntime';
import { createKmsNoteHost } from '../legacyHost';

export function render(ui: ReactNode) {
  return renderBase(ui, { wrapper: ({ children }) => <NoteHostContext.Provider value={createKmsNoteHost()}>{children}</NoteHostContext.Provider> });
}
