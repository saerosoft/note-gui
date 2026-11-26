import { createContext, useContext } from 'react';
import type { NoteAppearance, NoteColorScheme } from './host';

export interface NormalizedNoteAppearance {
  colorScheme?: NoteColorScheme;
  chrome: 'full' | 'embedded';
}

export function normalizeNoteAppearance(appearance?: NoteAppearance): NormalizedNoteAppearance {
  const colorScheme = appearance?.colorScheme;
  if (colorScheme !== undefined && colorScheme !== 'light' && colorScheme !== 'dark') {
    throw new RangeError(`Invalid colorScheme: ${String(colorScheme)}`);
  }
  const chrome = appearance?.chrome ?? 'full';
  if (chrome !== 'full' && chrome !== 'embedded') {
    throw new RangeError(`Invalid chrome: ${String(chrome)}`);
  }
  return { colorScheme, chrome };
}

export interface NoteAppearanceStore {
  get: () => NormalizedNoteAppearance;
  subscribe: (listener: () => void) => () => void;
  set: (appearance: NoteAppearance) => void;
  dispose: () => void;
}

export function createNoteAppearanceStore(initial?: NoteAppearance): NoteAppearanceStore {
  let current = normalizeNoteAppearance(initial);
  let disposed = false;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    subscribe: listener => {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    set: appearance => {
      if (disposed) return;
      const next = normalizeNoteAppearance(appearance);
      if (next.colorScheme === current.colorScheme && next.chrome === current.chrome) return;
      current = next;
      listeners.forEach(listener => listener());
    },
    dispose: () => {
      disposed = true;
      listeners.clear();
    },
  };
}

export const NoteAppearanceContext = createContext<NormalizedNoteAppearance>({ chrome: 'full' });

export function useNoteAppearance() {
  return useContext(NoteAppearanceContext);
}
