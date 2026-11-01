import { useEffect, useRef, useState } from 'react';
import { Button, Group, Text, TextInput } from '@mantine/core';
import type { Note } from './model';
import type { NoteAssociation, NoteAssociationPage, NoteAssociationsApi, NoteAssociationState, NoteAssociationTarget, SetNoteAssociation } from './collaboration';
import { ApiError } from './access';
import { useNoteAccess, useNoteContentAccess, useNotePolicy } from './hostRuntime';

interface Props { api: NoteAssociationsApi; note: Note; onOpen: (id: string) => void }
interface Selection { target: { id: string; title: string }; state: NoteAssociationState | null }

export function NoteAssociations({ api, note, onOpen }: Props) {
  const access = useNoteAccess();
  const policyApi = useNotePolicy();
  const policy = useNoteContentAccess(note.spaceId);
  const canWrite = policyApi ? !!(policy?.capabilities.read && policy.capabilities.write) : note.canEdit;
  const [page, setPage] = useState<NoteAssociationPage<NoteAssociation>>();
  const [targets, setTargets] = useState<NoteAssociationPage<NoteAssociationTarget>>();
  const [cursor, setCursor] = useState<string | null>(null);
  const [previous, setPrevious] = useState<(string | null)[]>([]);
  const [targetCursor, setTargetCursor] = useState<string | null>(null);
  const [targetPrevious, setTargetPrevious] = useState<(string | null)[]>([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [selection, setSelection] = useState<Selection>();
  const [pending, setPending] = useState<SetNoteAssociation>();
  const [replayable, setReplayable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revoked, setRevoked] = useState(false);
  const generation = useRef(0);
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const current = (epoch: number) => mounted.current && generation.current === epoch;

  async function load(epoch: number, listCursor: string | null = null, searchCursor: string | null = null, search = '') {
    setLoaded(false);
    const [list, options] = await Promise.all([api.list(note.id, listCursor), api.targets(note.id, search, searchCursor)]);
    if (!current(epoch)) return;
    setPage(list); setTargets(options); setCursor(listCursor); setTargetCursor(searchCursor); setLoaded(true);
  }
  async function perform(action: (epoch: number) => Promise<void>) {
    if (!mounted.current || inFlight.current || revoked) return;
    const epoch = generation.current;
    inFlight.current = true; setBusy(true); setError('');
    try { await action(epoch); }
    catch (failure) { if (current(epoch)) setError((failure as Error).message); }
    finally { if (current(epoch)) { inFlight.current = false; setBusy(false); } }
  }
  useEffect(() => {
    mounted.current = true;
    void perform(epoch => load(epoch));
    const lost = access.onAccessLost(() => {
      generation.current++; setRevoked(true); setPage(undefined); setTargets(undefined);
      setSelection(undefined); setPending(undefined); setLoaded(false); setBusy(false); setError('');
    });
    const refresh = access.onAccessRefresh(async () => {
      const epoch = ++generation.current;
      inFlight.current = true; setBusy(true); setError(''); setPage(undefined); setTargets(undefined);
      setSelection(undefined); setPending(undefined); setPrevious([]); setTargetPrevious([]); setQuery(''); setAppliedQuery('');
      try { await load(epoch); }
      catch (failure) { if (current(epoch)) setError((failure as Error).message); throw failure; }
      finally { if (current(epoch)) { inFlight.current = false; setBusy(false); } }
    });
    return () => { mounted.current = false; generation.current++; lost(); refresh(); };
  }, [api, note.id, access]);

  function select(target: Selection['target']) {
    if (pending) return;
    void perform(async epoch => {
      setSelection(undefined);
      const state = await api.state(note.id, target.id);
      if (current(epoch)) setSelection({ target, state });
    });
  }
  async function write(input: SetNoteAssociation, epoch: number) {
    setPending(input); setReplayable(true);
    let acknowledged = false;
    try {
      const state = await api.set(note.id, input);
      if (!current(epoch)) return;
      acknowledged = true;
      setPending(undefined); setReplayable(false);
      setSelection(value => value?.target.id === input.targetNoteId ? { ...value, state } : value);
      setPrevious([]); setTargetPrevious([]); setQuery(''); setAppliedQuery('');
      await load(epoch);
    } catch (failure) {
      if (current(epoch) && !acknowledged && failure instanceof ApiError && ['CONFLICT', 'INVALID_INPUT', 'NOT_FOUND', 'FORBIDDEN', 'ACCESS_DENIED'].includes(failure.code)) setReplayable(false);
      throw failure;
    }
  }
  function change(targetNoteId: string, revision: number, linked: boolean) {
    if (!canWrite || !loaded || pending) return;
    void perform(epoch => write({ targetNoteId, expectedRevision: revision, linked, requestId: crypto.randomUUID() }, epoch));
  }
  if (revoked) return <p role="alert">접근 권한이 변경되었습니다. 노트를 다시 열어 주세요.</p>;
  return <section aria-label="노트 연결">
    {error && <p role="alert">{error}</p>}{busy && <p role="status">연결 읽는 중…</p>}
    {pending && !busy && <Group>
      {replayable && canWrite && <Button onClick={() => void perform(epoch => write(pending, epoch))}>동일 요청 다시 시도</Button>}
      <Button variant="subtle" onClick={() => void perform(async epoch => {
        const state = await api.state(note.id, pending.targetNoteId);
        if (!current(epoch)) return;
        setPending(undefined); setReplayable(false);
        setSelection(value => value?.target.id === pending.targetNoteId ? { ...value, state } : value);
        setPrevious([]); setTargetPrevious([]); setQuery(''); setAppliedQuery('');
        await load(epoch);
      })}>연결 상태 다시 읽기</Button>
    </Group>}
    {error && !pending && !busy && <Button variant="subtle" onClick={() => void perform(epoch => load(epoch, cursor, targetCursor, appliedQuery))}>연결 목록 다시 읽기</Button>}
    {page && <Text size="sm">연결 {page.total}개</Text>}
    {loaded && page?.total === 0 && <p>연결된 노트가 없습니다.</p>}
    {page?.items.map(item => <article key={item.id}>
      <Button variant="subtle" onClick={() => onOpen(item.targetNoteId)}>{item.title}</Button>
      <Text size="xs" c="dimmed">작성자: {item.creatorName ?? item.creatorId} · 연결 개정 {item.revision}</Text>
      {item.authoredBody !== null && <p>{item.authoredBody}{item.authoredBodyTruncated ? '…' : ''}</p>}
      {canWrite && <Button size="xs" disabled={busy || !!pending || !loaded} onClick={() => change(item.targetNoteId, item.revision, false)}>연결 해제</Button>}
    </article>)}
    <Group>
      <Button size="xs" disabled={!previous.length || busy || !!pending} onClick={() => void perform(async epoch => { await load(epoch, previous.at(-1) ?? null, targetCursor, appliedQuery); if (current(epoch)) setPrevious(values => values.slice(0, -1)); })}>연결 이전</Button>
      <Button size="xs" disabled={!page?.nextCursor || busy || !!pending} onClick={() => void perform(async epoch => { await load(epoch, page!.nextCursor, targetCursor, appliedQuery); if (current(epoch)) setPrevious(values => [...values.slice(-30), cursor]); })}>연결 다음</Button>
    </Group>
    {canWrite && <>
      <form onSubmit={event => { event.preventDefault(); if (pending || busy) return; setSelection(undefined); const search = query.trim(); setAppliedQuery(search); setTargetCursor(null); setTargetPrevious([]); void perform(epoch => load(epoch, cursor, null, search)); }}>
        <TextInput label="연결 대상 검색" value={query} maxLength={200} disabled={busy || !!pending} onChange={event => setQuery(event.currentTarget.value)}/>
        <Button type="submit" size="xs" disabled={busy || !!pending}>대상 검색</Button>
      </form>
      <div aria-label="연결 대상">{targets?.items.map(target => <Button key={target.id} size="xs" variant="subtle" disabled={busy || !!pending || !loaded} onClick={() => select(target)}>{target.title}</Button>)}</div>
      {loaded && targets?.total === 0 && <p>연결할 수 있는 노트가 없습니다.</p>}
      <Group>
        <Button size="xs" disabled={!targetPrevious.length || busy || !!pending} onClick={() => void perform(async epoch => { await load(epoch, cursor, targetPrevious.at(-1) ?? null, appliedQuery); if (current(epoch)) setTargetPrevious(values => values.slice(0, -1)); })}>대상 이전</Button>
        <Button size="xs" disabled={!targets?.nextCursor || busy || !!pending} onClick={() => void perform(async epoch => { await load(epoch, cursor, targets!.nextCursor, appliedQuery); if (current(epoch)) setTargetPrevious(values => [...values.slice(-30), targetCursor]); })}>대상 다음</Button>
      </Group>
      {selection && <Group><Text size="sm">선택: {selection.target.title}</Text><Button size="xs" disabled={busy || !!pending || !loaded} onClick={() => change(selection.target.id, selection.state?.revision ?? 0, !selection.state?.linked)}>{selection.state?.linked ? '선택 연결 해제' : '연결'}</Button></Group>}
    </>}
  </section>;
}
