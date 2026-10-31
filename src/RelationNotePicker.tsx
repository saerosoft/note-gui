import { useEffect, useRef, useState } from 'react';
import { Button, Group, TextInput } from '@mantine/core';
import type { NoteRelationsApi, NoteSummary, RelationTargetPage } from './model';
import { useNoteAccess } from './hostRuntime';
import { ApiError } from './access';

interface Props {
  api: NoteRelationsApi; noteId: string; label: string; selected: NoteSummary | null;
  onSelect: (note: NoteSummary | null) => void; disabled?: boolean; error?: string;
}
interface Revalidation { resolve: () => void; reject: (reason: unknown) => void }

/** The server applies relation audience/owner rules before counting and paging. */
export function RelationNotePicker({ api, noteId, label, selected, onSelect, disabled = false, error: fieldError }: Props) {
  const { onAccessLost, onAccessRefresh } = useNoteAccess();
  const [query, setQuery] = useState('');
  const [cursors, setCursors] = useState<string[]>([]);
  const [answer, setAnswer] = useState<RelationTargetPage | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [revoked, setRevoked] = useState(false);
  const generation = useRef(0);
  const revalidation = useRef<Revalidation | undefined>(undefined);
  const typing = useRef(false);
  const denied = useRef(false);
  const select = useRef(onSelect); select.current = onSelect;
  const cursor = cursors.at(-1) ?? null;
  useEffect(() => {
    function retire() {
      const pending = revalidation.current; revalidation.current = undefined;
      // No projection remains to install after retirement; the session still awaits guarded adapter work.
      pending?.resolve();
    }
    const lost = onAccessLost(() => {
      denied.current = true; generation.current++; retire();
      setRevoked(true); setAnswer(null); setError(''); setLoading(false); select.current(null);
    });
    const refresh = onAccessRefresh(() => {
      if (denied.current) return Promise.reject(new ApiError('Relation target access is no longer available.', 'ACCESS_DENIED'));
      generation.current++; retire(); typing.current = false;
      setAnswer(null); setError(''); setLoading(true); setCursors([]); select.current(null);
      const pending = new Promise<void>((resolve, reject) => { revalidation.current = { resolve, reject }; });
      setRefresh(value => value + 1);
      return pending;
    });
    return () => { generation.current++; retire(); lost(); refresh(); };
  }, [onAccessLost, onAccessRefresh]);
  useEffect(() => {
    setAnswer(null); setError('');
    if (revoked || selected) { setLoading(!!revalidation.current && !revoked); return; }
    let alive = true;
    let timer = 0;
    const pending = revalidation.current;
    const load = async () => {
      window.clearTimeout(timer);
      const epoch = ++generation.current;
      setAnswer(null); setError('');
      setLoading(true);
      try {
        const page = await api.findRelationNotes(noteId, query.trim(), cursor);
        if (alive && epoch === generation.current) {
          setAnswer(page);
          if (pending && pending === revalidation.current) { revalidation.current = undefined; pending.resolve(); }
        }
      } catch (failure) {
        if (alive && epoch === generation.current) {
          setError((failure as Error).message);
          if (pending && pending === revalidation.current) { revalidation.current = undefined; pending.reject(failure); }
        }
      } finally {
        if (alive && epoch === generation.current) setLoading(false);
      }
    };
    const debounce = typing.current && !pending; typing.current = false; setLoading(true);
    if (debounce) timer = window.setTimeout(() => { void load(); }, 250); else void load();
    return () => { alive = false; generation.current++; window.clearTimeout(timer); };
  }, [api, noteId, query, cursor, refresh, revoked, selected]);
  if (revoked) return <p role="alert">접근 권한이 변경되었습니다. 노트를 다시 열어 주세요.</p>;
  if (selected && !revalidation.current) return <div className="note-picker">
    <span>{label}: <strong>{selected.title}</strong></span>
    <Button size="xs" variant="subtle" disabled={disabled} onClick={() => onSelect(null)}>다시 선택</Button>
    {fieldError && <p role="alert">{fieldError}</p>}
  </div>;
  const page = answer?.noteId === noteId ? answer : null;
  const pagingLimit = Number(cursor ?? 0) >= 100000 && !!page?.nextCursor;
  return <div className="note-picker" aria-busy={loading}>
    <TextInput
      label={label}
      description="같은 공간과 공개 범위의 노트만 연결할 수 있습니다. 개인 노트끼리는 소유자도 같아야 합니다."
      placeholder="노트 제목이나 본문으로 찾기"
      value={query}
      disabled={disabled}
      maxLength={200}
      error={fieldError ? <span role="alert">{fieldError}</span> : undefined}
      onChange={event => { typing.current = event.currentTarget.value !== query; setQuery(event.currentTarget.value); setCursors([]); setAnswer(null); setError(''); }}
      onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}/>
    {loading && <p role="status">연결할 노트를 읽는 중…</p>}
    {error && <div><p role="alert">{error}</p><Button size="xs" variant="subtle" disabled={disabled || loading} onClick={() => setRefresh(value => value + 1)}>검색 다시 시도</Button></div>}
    {page && <>
      <p>연결 가능한 노트 {page.total.toLocaleString('ko-KR')}개</p>
      {!page.items.length && <p>{page.total ? '이 페이지에 남은 대상이 없습니다. 이전 페이지로 돌아가거나 검색어를 바꿔 주세요.' : '연결 가능한 노트를 찾지 못했습니다.'}</p>}
      {page.items.length > 0 && <ul aria-label={label + ' 검색 결과'}>
        {page.items.map(value => <li key={value.id}><Button size="xs" variant="subtle" disabled={disabled || loading} onClick={() => onSelect(value)}>{value.title}</Button></li>)}
      </ul>}
      <Group aria-label={label + ' 페이지'}>
        <Button size="xs" variant="subtle" disabled={disabled || loading || !cursors.length} onClick={() => { setAnswer(null); setCursors(value => value.slice(0, -1)); }}>이전 대상</Button>
        <span>{cursors.length + 1}페이지</span>
        <Button size="xs" variant="subtle" disabled={disabled || loading || !page.nextCursor || pagingLimit} onClick={() => {
          if (page.nextCursor) { setAnswer(null); setCursors(value => [...value, page.nextCursor!]); }
        }}>다음 대상</Button>
      </Group>
      {pagingLimit && <p>조회 한도에 도달했습니다. 검색어를 구체적으로 입력해 남은 대상을 찾아 주세요.</p>}
    </>}
  </div>;
}
