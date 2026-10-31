import { useEffect, useRef, useState } from 'react';
import { useAttachments } from '../editor/attachmentContext';
import { useNoteAccess } from '../hostRuntime';

export function useAuthorizedFile(fileId: string | null) {
  const access = useNoteAccess();
  const { api } = useAttachments();
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState<string>();
  const [size, setSize] = useState<number>();
  const [error, setError] = useState('');
  const authorized = useRef(true);
  const currentUrl = useRef<string | undefined>(undefined);
  const request = useRef(0);
  function clear() {
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    currentUrl.current = undefined; setUrl(undefined); setSize(undefined); setError('');
  }
  useEffect(() => {
    authorized.current = true;
    return access.onAccessLost(() => { authorized.current = false; request.current++; clear(); });
  }, [access]);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: '200px' });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      const sequence = ++request.current; const epoch = access.generation;
      clear();
      if (!visible || !fileId || !authorized.current) return;
      try {
        const blob = await api.attachment(fileId, 1);
        if (!active || !authorized.current || sequence !== request.current || epoch !== access.generation) return;
        const objectUrl = URL.createObjectURL(blob); currentUrl.current = objectUrl; setUrl(objectUrl); setSize(blob.size);
      } catch (failure) { if (active && authorized.current && sequence === request.current && epoch === access.generation) setError((failure as Error).message); }
    }
    void load();
    const stop = access.onAccessRefresh(load);
    return () => { active = false; request.current++; stop(); if (currentUrl.current) URL.revokeObjectURL(currentUrl.current); currentUrl.current = undefined; };
  }, [api, fileId, visible, access]);
  return { container, url, size, error, visible, load: () => setVisible(true) };
}
