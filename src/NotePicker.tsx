import { useEffect, useRef, useState } from 'react';
import { Button, TextInput } from '@mantine/core';
import type { NoteCoreApi, NoteRelationsApi, NoteSummary } from './model';
import { RelationNotePicker } from './RelationNotePicker';
import { useNoteAccess } from './hostRuntime';

interface Props { api: NoteCoreApi & Partial<NoteRelationsApi>; relations?: NoteRelationsApi; spaceId: string; label: string; selected: NoteSummary | null; onSelect: (note: NoteSummary | null) => void; exclude?: string[]; disabled?: boolean; relationNoteId?: string; error?: string }

/** Relation targets use their authorized selector; navigation keeps its existing readable-note search. */
export function NotePicker(props: Props) {
  return props.relationNoteId
     ? <RelationNotePicker key={props.spaceId + ':' + props.relationNoteId} api={props.relations ?? props.api as NoteRelationsApi} noteId={props.relationNoteId} label={props.label} selected={props.selected} onSelect={props.onSelect} disabled={props.disabled} error={props.error}/>
    : <ReadableNotePicker {...props}/>;
}

function ReadableNotePicker({ api, spaceId, label, selected, onSelect, exclude = [], disabled = false }: Props) {
  const access = useNoteAccess();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteSummary[] | null>(null);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const revoked = useRef(false);
  const selection = useRef({ selected, onSelect }); selection.current = { selected, onSelect };
  useEffect(() => {
    const text = query.trim();
    let alive = true;
    let timer = 0;
    async function load() {
      window.clearTimeout(timer);
      const epoch = ++generation.current;
      setResults(null); setError('');
      if (!text || revoked.current) return;
      try { const values = await api.findNotes(spaceId, text); if (alive && epoch === generation.current) setResults(values); }
      catch (failure) { if (alive && epoch === generation.current) setError((failure as Error).message); }
    }
    setResults(null); setError('');
    timer = window.setTimeout(() => { void load(); }, 250);
    const stopRefresh = access.onAccessRefresh(() => {
      if (selection.current.selected) selection.current.onSelect(null);
      return load();
    });
    const stopLost = access.onAccessLost(() => {
      revoked.current = true; generation.current++; window.clearTimeout(timer);
      setResults(null); setError('');
      if (selection.current.selected) selection.current.onSelect(null);
    });
    return () => { alive = false; generation.current++; window.clearTimeout(timer); stopRefresh(); stopLost(); };
  }, [api, spaceId, query, access]);
  if (selected) {
    return <div className="note-picker">
      <span>{label}: <strong>{selected.title}</strong></span>
      <Button size="xs" variant="subtle" disabled={disabled} onClick={() => onSelect(null)}>다시 선택</Button>
    </div>;
  }
  const candidates = results?.filter(value => !exclude.includes(value.id)) ?? [];
  return <div className="note-picker">
    <TextInput label={label} placeholder="노트 제목으로 찾기" value={query} disabled={disabled} maxLength={200} onChange={event => setQuery(event.currentTarget.value)} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}/>
    {error && <p role="alert">{error}</p>}
    {results && !candidates.length && <p>찾은 노트가 없습니다.</p>}
    {candidates.length > 0 && <ul aria-label={`${label} 검색 결과`}>
      {candidates.map(value => <li key={value.id}><Button size="xs" variant="subtle" disabled={disabled} onClick={() => { onSelect(value); setQuery(''); }}>{value.title}</Button></li>)}
    </ul>}
  </div>;
}
