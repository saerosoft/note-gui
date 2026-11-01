import { useContext, useEffect, useRef } from 'react';
import { NativeDraftContext } from './nativeDraft';

export function useDiagramUnload(dirty: boolean) {
  const report = useContext(NativeDraftContext);
  const owner = useRef(Symbol('native-diagram-draft'));
  useEffect(() => {
    report?.(owner.current, dirty);
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    if (dirty) window.addEventListener('beforeunload', leave);
    return () => { report?.(owner.current, false); window.removeEventListener('beforeunload', leave); };
  }, [dirty, report]);
}
