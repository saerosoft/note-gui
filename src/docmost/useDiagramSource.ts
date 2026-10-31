import { useEffect, useRef, useState } from 'react';
import type { NodeViewProps } from '@tiptap/react';
import { useAttachments } from '../editor/attachmentContext';
import { useNoteAccess } from '../hostRuntime';
import { defaultDiagramSource, diagramPayload } from './diagramFiles';

export function useDiagramSource({ node, editor, updateAttributes }: NodeViewProps) {
  const access = useNoteAccess();
  const { onAccessLost } = access;
  const { api, noteId, editable } = useAttachments();
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [source, setSource] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const saving = useRef(false);
  const request = useRef(0);
  const readable = useRef(false);
  const current = useRef({ node, editable }); current.current = { node, editable };
  useEffect(() => {
    alive.current = true;
    const stop = onAccessLost(() => { alive.current = false; readable.current = false; request.current++; setSource(''); setLoaded(false); setError(''); });
    return () => { alive.current = false; stop(); };
  }, []);
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
      readable.current = false; setLoaded(false); setError(''); setSource('');
      if (!visible || !alive.current) return;
      if (!node.attrs.fileId) { readable.current = true; setSource(node.attrs.source || defaultDiagramSource(node.type.name)); setLoaded(true); return; }
      try {
        const blob = await api.attachment(String(node.attrs.fileId), 1);
        const value = await blob.text();
        if (active && alive.current && sequence === request.current && epoch === access.generation) { diagramPayload(node.type.name, value); readable.current = true; setSource(value); setLoaded(true); }
      } catch (failure) { if (active && alive.current && sequence === request.current && epoch === access.generation) setError((failure as Error).message); }
    }
    void load();
    const stop = access.onAccessRefresh(load);
    return () => { active = false; request.current++; stop(); };
  }, [api, node.attrs.fileId, node.attrs.source, node.type.name, visible, access]);

  async function saveData(value: string) {
    if (saving.current || !alive.current || !readable.current || !current.current.editable || !editor.isEditable) return false;
    saving.current = true; setBusy(true); setError('');
    const fileId = current.current.node.attrs.fileId; const epoch = access.generation;
    try {
      const previous = fileId ? { attachmentId: String(fileId), revision: 1, name: '', mimeType: '' } : undefined;
      const attachment = await api.upload(noteId, diagramPayload(node.type.name, value), previous);
      if (!alive.current || epoch !== access.generation || editor.isDestroyed || !editor.isEditable || !current.current.editable || current.current.node.attrs.fileId !== fileId) return false;
      updateAttributes({ fileId: attachment.attachmentId, source: node.type.name === 'mermaid' ? value : null });
      return true;
    } catch (failure) { if (alive.current) setError((failure as Error).message); return false; }
    finally { saving.current = false; if (alive.current) setBusy(false); }
  }
  return { container, source, loaded, error, busy, saveData, editable: editable && editor.isEditable && loaded && alive.current };
}
