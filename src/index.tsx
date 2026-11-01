import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import { DEFAULT_THEME, MantineProvider } from '@mantine/core';
import { I18nextProvider } from 'react-i18next';
import { docmostI18n } from './docmost/i18n';
import '@mantine/core/styles.css';
import '@excalidraw/excalidraw/index.css';
import '@fontsource-variable/noto-sans-kr/wght.css';
import './vendor/docmost/client/styles/a11y-overrides.css';
import { theme, mantineCssResolver } from './vendor/docmost/client/theme';
import './integration.css';
import { Workspace } from './Workspace';
import { createNoteSession, NoteDirtyContext, NoteHostProvider, type NoteSession } from './hostRuntime';
import { createNoteDateTimeFormatter, NoteDateTimeContext } from './dateTime';
import type { MountedNoteGui, NoteGuiOptions, NoteCoreGuiOptions } from './host';
export type { MountedNoteGui, NoteGuiHostModule, NoteGuiOptions, NoteCoreGuiOptions, NoteHost, NoteDestination } from './host';

export type * from './model';
export type * from './collaboration';
export { ApiError, createNoteAccess } from './access';
export type { NoteAccessLifecycle, NoteAccessController } from './access';
export { createLocalNoteApi } from './localPersistence';
export type { LocalNoteStoreOptions } from './localPersistence';
const LegacyApp = lazy(() => import('./App').then(module => ({ default: module.App })));
const noteTheme = {
  ...theme,
  fontFamily: `"Noto Sans KR Variable", ${DEFAULT_THEME.fontFamily}`,
  fontFamilyMonospace: `"Noto Sans KR Variable", ${DEFAULT_THEME.fontFamilyMonospace}`,
};

/** The extracted Docmost workspace, including its original theme and editor styles. */
function NoteGui(options: (NoteGuiOptions | NoteCoreGuiOptions) & { session?: NoteSession }) {
  return <I18nextProvider i18n={docmostI18n}><MantineProvider theme={noteTheme} cssVariablesResolver={mantineCssResolver} defaultColorScheme="light">
    {'host' in options ? <NoteHostProvider {...options}><Workspace api={options.api}/></NoteHostProvider> : <Suspense fallback={<p role="status">Loading notes…</p>}><LegacyApp {...options}/></Suspense>}
  </MantineProvider></I18nextProvider>;
}

/** Mounts an isolated React root; the host must import the distributed CSS as well. */
export function mountNoteGui(container: HTMLElement, options: NoteGuiOptions | NoteCoreGuiOptions = {}): MountedNoteGui {
  const dateTime = createNoteDateTimeFormatter(options.timeZone);
  const root = createRoot(container);
  const session = 'host' in options ? createNoteSession(options) : undefined;
  let disposed = false;
  let dirty = false;
  const reportDirty = (value: boolean) => {
    if (disposed || value === dirty) return;
    dirty = value; options.onDirtyChange?.(value);
  };
  session?.connect();
  root.render(<NoteDirtyContext.Provider value={reportDirty}><NoteDateTimeContext.Provider value={dateTime}><NoteGui {...options} session={session}/></NoteDateTimeContext.Provider></NoteDirtyContext.Provider>);
  return {
    hasUnsavedChanges: () => !disposed && dirty,
    unmount: () => {
      if (disposed) return;
      disposed = true;
      const wasDirty = dirty; dirty = false;
      session?.dispose(); root.unmount();
      if (wasDirty) options.onDirtyChange?.(false);
    },
  };
}
/** Mounts only supplied capabilities; never imports the compatibility HTTP adapter. */
export function mountNoteCoreGui(container: HTMLElement, options: NoteCoreGuiOptions): MountedNoteGui {
  if (!options?.api || !options.host?.access || !options.host.destinations) throw new Error('A core API, access lifecycle and host destinations are required.');
  return mountNoteGui(container, options);
}
