import { createContext } from 'react';

export const NativeDraftContext = createContext<((owner: symbol, dirty: boolean) => void) | undefined>(undefined);
