import { createRoot } from 'react-dom/client';
import { lazy, Suspense, useLayoutEffect, useSyncExternalStore } from 'react';
import { DEFAULT_THEME, localStorageColorSchemeManager, MantineProvider, type MantineColorSchemeManager } from '@mantine/core';
import { I18nextProvider } from 'react-i18next';
import { docmostI18n } from './docmost/i18n';
import '@mantine/core/styles.layer.css';
import '@excalidraw/excalidraw/index.css';
import '@fontsource-variable/noto-sans-kr/wght.css';
import './vendor/docmost/client/styles/a11y-overrides.css';
import { theme, mantineCssResolver } from './vendor/docmost/client/theme';
import './integration.css';
import { Workspace } from './Workspace';
import { createNoteSession, NoteDirtyContext, NoteHostProvider, type NoteSession } from './hostRuntime';
import { createNoteDateTimeFormatter, NoteDateTimeContext } from './dateTime';
import { createNoteAppearanceStore, NoteAppearanceContext, type NoteAppearanceStore } from './appearance';
import type { MountedNoteGui, NoteAppearance, NoteColorScheme, NoteCoreGuiOptions, NoteGuiOptions } from './host';
export type { MountedNoteGui, NoteAppearance, NoteColorScheme, NoteCoreGuiOptions, NoteDestination, NoteGuiHostModule, NoteGuiOptions, NoteHost } from './host';

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

function createHostAwareColorSchemeManager(getForced: () => NoteColorScheme | undefined): MantineColorSchemeManager {
  const storage = localStorageColorSchemeManager();
  return {
    get: defaultValue => storage.get(defaultValue),
    set: value => { if (!getForced()) storage.set(value); },
    subscribe: onUpdate => storage.subscribe(onUpdate),
    unsubscribe: () => storage.unsubscribe(),
    clear: () => { if (!getForced()) storage.clear(); },
  };
}

/** The extracted Docmost workspace, including its original theme and editor styles. */
function NoteGui({ appearanceStore, colorSchemeManager, session, ...options }: (NoteGuiOptions | NoteCoreGuiOptions) & {
  appearanceStore: NoteAppearanceStore;
  colorSchemeManager: MantineColorSchemeManager;
  session?: NoteSession;
}) {
  const appearance = useSyncExternalStore(appearanceStore.subscribe, appearanceStore.get);
  useLayoutEffect(() => {
    if (appearance.colorScheme && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-mantine-color-scheme', appearance.colorScheme);
    }
  }, [appearance.colorScheme]);
  return <I18nextProvider i18n={docmostI18n}><MantineProvider theme={noteTheme} cssVariablesResolver={mantineCssResolver} defaultColorScheme="light" colorSchemeManager={colorSchemeManager} forceColorScheme={appearance.colorScheme}>
    <NoteAppearanceContext.Provider value={appearance}>
      {'host' in options ? <NoteHostProvider {...options} session={session}><Workspace api={options.api}/></NoteHostProvider> : <Suspense fallback={<p role="status">Loading notes…</p>}><LegacyApp {...options}/></Suspense>}
    </NoteAppearanceContext.Provider>
  </MantineProvider></I18nextProvider>;
}

/** Mounts an isolated React root; the host must import the distributed CSS as well. */
export function mountNoteGui(container: HTMLElement, options: NoteGuiOptions | NoteCoreGuiOptions = {}): MountedNoteGui {
  const dateTime = createNoteDateTimeFormatter(options.timeZone);
  const appearanceStore = createNoteAppearanceStore(options.appearance);
  const colorSchemeManager = createHostAwareColorSchemeManager(() => appearanceStore.get().colorScheme);
  const root = createRoot(container);
  const session = 'host' in options ? createNoteSession(options) : undefined;
  let disposed = false;
  let dirty = false;
  const reportDirty = (value: boolean) => {
    if (disposed || value === dirty) return;
    dirty = value; options.onDirtyChange?.(value);
  };
  session?.connect();
  root.render(<NoteDirtyContext.Provider value={reportDirty}><NoteDateTimeContext.Provider value={dateTime}><NoteGui {...options} appearanceStore={appearanceStore} colorSchemeManager={colorSchemeManager} session={session}/></NoteDateTimeContext.Provider></NoteDirtyContext.Provider>);
  return {
    hasUnsavedChanges: () => !disposed && dirty,
    setAppearance: (appearance: NoteAppearance) => {
      if (disposed) return;
      appearanceStore.set(appearance);
    },
    unmount: () => {
      if (disposed) return;
      disposed = true;
      const wasDirty = dirty; dirty = false;
      appearanceStore.dispose();
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
