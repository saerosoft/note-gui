import { useEffect, useRef, useState } from 'react';
import { Button, Group, Modal, Select, TextInput } from '@mantine/core';
import type { Note, NoteCoreApi, PropertyValue } from './model';
import { useNoteAccess } from './hostRuntime';
import { ApiError } from './access';

export interface PropertyDraft {
  values: PropertyValue[]; baseline: PropertyValue[]; revision: number; dirty: boolean;
  busy: boolean; needsReload: boolean; accepted: boolean; accessFailure: boolean;
  message: string; error: string; deleting?: PropertyValue; loaded?: { id: string; revision: number; generation: number };
  comparison?: { values: PropertyValue[]; revision: number; generation: number };
}
export function createPropertyDraft(revision: number): PropertyDraft {
  return { values: [], baseline: [], revision, dirty: false, busy: false, needsReload: false, accepted: false, accessFailure: false, message: '', error: '' };
}
function samePropertyValues(first: PropertyValue[], second: PropertyValue[]) {
  const entries = (values: PropertyValue[]) => values.map(({ key, valueType, value }) => [key, valueType, value]).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return JSON.stringify(entries(first)) === JSON.stringify(entries(second));
}
interface Props { api: NoteCoreApi; note: Note; dirty: boolean; draft?: PropertyDraft; onDraftChange?: (transform: (draft: PropertyDraft) => PropertyDraft) => void; isCurrent?: () => boolean; onRevision: (note: Note) => void }
export function NoteProperties({ api, note, dirty, draft: suppliedDraft, onDraftChange, isCurrent, onRevision }: Props) {
  const access = useNoteAccess();
  const [localDraft, setLocalDraft] = useState(() => createPropertyDraft(note.revision));
  const state = suppliedDraft ?? localDraft;
  const write = onDraftChange ?? setLocalDraft;
  const update = (transform: (value: PropertyDraft) => PropertyDraft) => write(value => {
    const next = transform(value);
    return next.values === value.values && next.baseline === value.baseline && next.comparison === value.comparison ? next : { ...next, dirty: JSON.stringify(next.values) !== JSON.stringify(next.comparison?.values ?? next.baseline) };
  });
  const { values: properties, deleting, needsReload, message, error, accessFailure } = state;
  const current = useRef(state); current.current = state;
  const [loading, setLoading] = useState(false);
  const busy = loading || state.busy;
  const authorized = state.loaded?.id === note.id && state.loaded.generation === access.generation;
  const setProperties = (transform: (values: PropertyValue[]) => PropertyValue[]) => update(value => ({ ...value, values: transform(value.values) }));
  const setDeleting = (deleting?: PropertyValue) => update(value => ({ ...value, deleting }));
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const ownsTab = isCurrent ?? (() => mounted.current);
  useEffect(() => {
    let alive = true; let sequence = 0;
    async function load() {
      const request = ++sequence; const epoch = access.generation; setLoading(true); update(value => ({ ...value, error: value.needsReload || value.comparison ? value.error : '' }));
      try {
        const values = await api.properties(note.id);
        if (!alive || request !== sequence || epoch !== access.generation) return;
        update(value => ({ ...value, loaded: { id: note.id, revision: note.revision, generation: epoch }, ...(!value.dirty ? { baseline: values, revision: note.revision, values } : {}), deleting: value.deleting ? values.find(saved => saved.id === value.deleting?.id) : undefined, accessFailure: false }));
      } catch (failure) { if (alive && request === sequence) update(value => ({ ...value, error: (failure as Error).message, accessFailure: true })); }
      finally { if (alive && request === sequence) setLoading(false); }
    }
    if (current.current.loaded?.id !== note.id || current.current.loaded.revision !== note.revision || current.current.loaded.generation !== access.generation) void load();
    const stop = access.onAccessRefresh(load);
    return () => { alive = false; sequence++; stop(); };
  }, [api, note.id, note.revision, access]);
  async function reload(acknowledged: boolean) {
    const generation = access.generation;
    const before = await api.note(note.id);
    if (!ownsTab() || generation !== access.generation) return;
    const values = await api.properties(note.id);
    if (!ownsTab() || generation !== access.generation) return;
    const current = await api.note(note.id);
    if (!ownsTab() || generation !== access.generation) return;
    if (before.revision !== current.revision) throw new ApiError('속성을 읽는 동안 개정이 변경되었습니다. 초안은 보존했으니 다시 읽어 주세요.', 'CONFLICT');
    update(value => {
      const matching = samePropertyValues(value.values, values);
      const unchanged = samePropertyValues(value.baseline, values);
      const conflict = !acknowledged && value.dirty && !matching && !unchanged;
      return { ...value, loaded: { id: current.id, revision: current.revision, generation }, ...(conflict ? {} : { baseline: values, revision: current.revision, ...(!value.dirty || matching || acknowledged ? { values } : {}) }), comparison: conflict ? { values, revision: current.revision, generation } : undefined, deleting: undefined, needsReload: false, accessFailure: false, accepted: false, error: conflict ? '저장된 속성이 변경되었습니다. 입력 초안은 보존했습니다. 조회한 속성을 확인해 주세요.' : '', message: acknowledged ? '속성 변경을 저장했습니다.' : '' };
    });
    onRevision(current);
  }
  async function change(operation?: () => Promise<void>) {
    if (inFlight.current || busy || (!operation && !state.accepted)) return;
    inFlight.current = true; update(value => ({ ...value, busy: true, needsReload: true, error: '', message: '' }));
    try {
      if (!state.accepted && operation) { await operation(); if (!ownsTab()) return; update(value => ({ ...value, accepted: true, needsReload: true, deleting: undefined })); }
      await reload(true);
    } catch (failure) { update(value => ({ ...value, error: (failure as Error).message })); }
    finally { inFlight.current = false; update(value => ({ ...value, busy: false })); }
  }
  async function retryRead() {
    if (inFlight.current || busy) return;
    inFlight.current = true; update(value => ({ ...value, busy: true, error: '', message: '' }));
    try { await reload(state.accepted); }
    catch (failure) { update(value => ({ ...value, error: (failure as Error).message, accessFailure: true })); }
    finally { inFlight.current = false; update(value => ({ ...value, busy: false })); }
  }
  const disabled = busy || dirty || needsReload || accessFailure || !authorized || !note.canEdit;
  const writeDisabled = disabled || !!error || !!state.comparison;
  const acknowledgedReadback = state.accepted && !accessFailure;
  return <div aria-label="노트 속성">
    {error && (!deleting || !authorized || accessFailure) && <p role="alert">{error}</p>}
    {(accessFailure || needsReload || error || state.comparison) && !busy && <Button variant="subtle" onClick={() => { if (acknowledgedReadback) void change(); else void retryRead(); }}>{acknowledgedReadback ? '속성 새로고침' : '속성 다시 읽기'}</Button>}
    {(loading || !authorized) && !error && <p role="status">속성을 읽는 중…</p>}
    {message && <p role="status">{message}</p>}
    {dirty && <p>노트 본문 변경을 먼저 저장한 뒤 속성을 변경해 주세요.</p>}
    {needsReload && <p>{state.accepted ? '변경은 저장되었습니다. 최신 속성을 다시 읽어 주세요.' : '변경 결과를 최신 속성에서 확인해 주세요. 확인 전에는 쓰기를 반복하지 않습니다.'}</p>}
    {authorized && state.comparison?.generation === access.generation && <section aria-label="조회한 현재 속성"><p>조회한 개정 {state.comparison.revision}</p><ul>{state.comparison.values.map(value => <li key={value.id ?? value.key}>{value.key}: {value.value}</li>)}</ul><Button variant="subtle" disabled={busy} onClick={() => {
      const comparison = state.comparison;
      if (comparison && ownsTab() && window.confirm('입력한 속성 초안만 버리고 조회한 속성으로 되돌릴까요?')) update(value => comparison.generation === access.generation ? { ...value, values: comparison.values, baseline: comparison.values, revision: comparison.revision, comparison: undefined, accepted: false, needsReload: false, error: '', message: '조회한 속성을 불러왔습니다.' } : value);
    }}>조회한 속성으로 되돌리기</Button></section>}
    {authorized && !accessFailure && <>
    {!properties.length && !busy && <p>아직 속성이 없습니다.</p>}
    {properties.map((value, index) => <form key={value.id ?? `draft-${index}`} onSubmit={event => { event.preventDefault(); if (!writeDisabled) void change(() => api.setProperties(note.id, [value], state.revision)); }}>
      <TextInput label="속성 이름" value={value.key} readOnly={!note.canEdit || !!value.id} disabled={busy || needsReload} required maxLength={100}
        onChange={event => { const key = event.currentTarget.value; setProperties(values => values.map((item, i) => i === index ? { ...item, key } : item)); }}/>
      <Select label="유형" data={['TEXT', 'NUMBER', 'BOOLEAN', 'DATE']} value={value.valueType} disabled={disabled}
        onChange={type => type && setProperties(values => values.map((item, i) => i === index ? { ...item, valueType: type as PropertyValue['valueType'] } : item))}/>
      <TextInput label="값" value={value.value} readOnly={!note.canEdit} disabled={disabled}
        type={value.valueType === 'NUMBER' ? 'number' : value.valueType === 'DATE' ? 'date' : 'text'}
        onChange={event => { const text = event.currentTarget.value; setProperties(values => values.map((item, i) => i === index ? { ...item, value: text } : item)); }}/>
      {note.canEdit && <Group><Button type="submit" disabled={writeDisabled || !value.key.trim()}>이 속성 저장</Button>
        <Button type="button" color="red" variant="subtle" disabled={disabled || (!!value.id && writeDisabled)} aria-label={`${value.key || '새'} 속성 삭제`}
          onClick={() => value.id ? setDeleting(value) : setProperties(values => values.filter((_, i) => i !== index))}>속성 삭제</Button></Group>}
    </form>)}
    {note.canEdit && <Button variant="subtle" disabled={disabled || properties.length >= 100}
      onClick={() => setProperties(values => [...values, { key: '', valueType: 'TEXT', value: '' }])}>속성 추가</Button>}
    </>}
    <Modal opened={!!deleting && authorized && !accessFailure} onClose={() => !busy && setDeleting(undefined)} title="속성 삭제 확인" closeOnEscape={!busy} closeOnClickOutside={!busy}>
      <p>“{deleting?.key}” 속성을 삭제할까요? 노트 본문과 개정 이력은 보존됩니다.</p>
      {error && <p role="alert">{error}</p>}
      <Group><Button data-autofocus variant="default" disabled={busy} onClick={() => setDeleting(undefined)}>취소</Button>
        <Button color="red" disabled={writeDisabled || !deleting?.id} onClick={() => {
          const id = deleting?.id; if (id && !writeDisabled) void change(() => api.deleteProperty(note.id, id, state.revision));
        }}>삭제 확인</Button></Group>
    </Modal>
  </div>;
}
