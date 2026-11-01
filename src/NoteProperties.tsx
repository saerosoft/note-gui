import { useEffect, useRef, useState } from 'react';
import { Button, Group, Modal, Select, TextInput } from '@mantine/core';
import type { Note, NoteCoreApi, PropertyValue } from './model';
import { useNoteAccess } from './hostRuntime';

export interface PropertyDraft {
  values: PropertyValue[]; baseline: PropertyValue[]; revision: number; dirty: boolean;
  busy: boolean; needsReload: boolean; accepted: boolean; accessFailure: boolean;
  message: string; error: string; deleting?: PropertyValue; loaded?: { id: string; revision: number };
}
export function createPropertyDraft(revision: number): PropertyDraft {
  return { values: [], baseline: [], revision, dirty: false, busy: false, needsReload: false, accepted: false, accessFailure: false, message: '', error: '' };
}
interface Props { api: NoteCoreApi; note: Note; dirty: boolean; draft?: PropertyDraft; onDraftChange?: (transform: (draft: PropertyDraft) => PropertyDraft) => void; isCurrent?: () => boolean; onRevision: (note: Note) => void }
export function NoteProperties({ api, note, dirty, draft: suppliedDraft, onDraftChange, isCurrent, onRevision }: Props) {
  const access = useNoteAccess();
  const [localDraft, setLocalDraft] = useState(() => createPropertyDraft(note.revision));
  const state = suppliedDraft ?? localDraft;
  const write = onDraftChange ?? setLocalDraft;
  const update = (transform: (value: PropertyDraft) => PropertyDraft) => write(value => {
    const next = transform(value);
    return next.values === value.values && next.baseline === value.baseline ? next : { ...next, dirty: JSON.stringify(next.values) !== JSON.stringify(next.baseline) };
  });
  const { values: properties, deleting, needsReload, message, error, accessFailure } = state;
  const current = useRef(state); current.current = state;
  const [loading, setLoading] = useState(false);
  const busy = loading || state.busy;
  const setProperties = (transform: (values: PropertyValue[]) => PropertyValue[]) => update(value => ({ ...value, values: transform(value.values) }));
  const setDeleting = (deleting?: PropertyValue) => update(value => ({ ...value, deleting }));
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const ownsTab = isCurrent ?? (() => mounted.current);
  useEffect(() => {
    let alive = true; let sequence = 0;
    async function load() {
      const request = ++sequence; setLoading(true); update(value => ({ ...value, error: '' }));
      try {
        const values = await api.properties(note.id);
        if (!alive || request !== sequence) return;
        update(value => ({ ...value, loaded: { id: note.id, revision: note.revision }, baseline: values, ...(!value.dirty ? { revision: note.revision, values } : {}), accessFailure: false }));
      } catch (failure) { if (alive && request === sequence) update(value => ({ ...value, error: (failure as Error).message, accessFailure: true })); }
      finally { if (alive && request === sequence) setLoading(false); }
    }
    if (current.current.loaded?.id !== note.id || current.current.loaded.revision !== note.revision) void load();
    const stop = access.onAccessRefresh(load);
    return () => { alive = false; sequence++; stop(); };
  }, [api, note.id, note.revision, access]);
  async function reload(acknowledged: boolean) {
    const [values, current] = await Promise.all([api.properties(note.id), api.note(note.id)]);
    if (!ownsTab()) return;
    update(value => ({ ...value, loaded: { id: current.id, revision: current.revision }, baseline: values, ...(!value.dirty || acknowledged ? { values, revision: current.revision } : {}), deleting: undefined, needsReload: false, accessFailure: false, accepted: false, error: '', message: acknowledged ? '속성 변경을 저장했습니다.' : '' }));
    onRevision(current);
  }
  async function change(operation?: () => Promise<void>) {
    if (inFlight.current || busy || (!operation && !state.accepted)) return;
    inFlight.current = true; update(value => ({ ...value, busy: true, error: '', message: '' }));
    try {
      if (!state.accepted && operation) { await operation(); if (!ownsTab()) return; update(value => ({ ...value, accepted: true, needsReload: true, deleting: undefined })); }
      await reload(true);
    } catch (failure) { update(value => ({ ...value, error: (failure as Error).message })); }
    finally { inFlight.current = false; update(value => ({ ...value, busy: false })); }
  }
  async function retryRead() {
    if (inFlight.current || busy) return;
    inFlight.current = true; update(value => ({ ...value, busy: true, error: '', message: '' }));
    try { await reload(false); }
    catch (failure) { update(value => ({ ...value, error: (failure as Error).message, accessFailure: true })); }
    finally { inFlight.current = false; update(value => ({ ...value, busy: false })); }
  }
  const disabled = busy || dirty || needsReload || accessFailure || !note.canEdit;
  return <div aria-label="노트 속성">
    {error && !deleting && <p role="alert">{error}</p>}
    {accessFailure && !busy && <Button variant="subtle" onClick={() => void retryRead()}>속성 다시 읽기</Button>}
    {message && <p role="status">{message}</p>}
    {dirty && <p>노트 본문 변경을 먼저 저장한 뒤 속성을 변경해 주세요.</p>}
    {needsReload && <p>변경은 저장되었습니다. 최신 속성을 다시 읽어 주세요. <Button disabled={busy} onClick={() => void change()}>속성 새로고침</Button></p>}
    {!properties.length && !busy && !accessFailure && state.loaded && <p>아직 속성이 없습니다.</p>}
    {properties.map((value, index) => <form key={value.id ?? `draft-${index}`} onSubmit={event => { event.preventDefault(); if (!disabled) void change(() => api.setProperties(note.id, [value], state.revision)); }}>
      <TextInput label="속성 이름" value={value.key} readOnly={!note.canEdit || !!value.id} disabled={busy || needsReload} required maxLength={100}
        onChange={event => { const key = event.currentTarget.value; setProperties(values => values.map((item, i) => i === index ? { ...item, key } : item)); }}/>
      <Select label="유형" data={['TEXT', 'NUMBER', 'BOOLEAN', 'DATE']} value={value.valueType} disabled={disabled}
        onChange={type => type && setProperties(values => values.map((item, i) => i === index ? { ...item, valueType: type as PropertyValue['valueType'] } : item))}/>
      <TextInput label="값" value={value.value} readOnly={!note.canEdit} disabled={disabled}
        type={value.valueType === 'NUMBER' ? 'number' : value.valueType === 'DATE' ? 'date' : 'text'}
        onChange={event => { const text = event.currentTarget.value; setProperties(values => values.map((item, i) => i === index ? { ...item, value: text } : item)); }}/>
      {note.canEdit && <Group><Button type="submit" disabled={disabled || !value.key.trim()}>이 속성 저장</Button>
        <Button type="button" color="red" variant="subtle" disabled={disabled} aria-label={`${value.key || '새'} 속성 삭제`}
          onClick={() => value.id ? setDeleting(value) : setProperties(values => values.filter((_, i) => i !== index))}>속성 삭제</Button></Group>}
    </form>)}
    {note.canEdit && <Button variant="subtle" disabled={disabled || properties.length >= 100}
      onClick={() => setProperties(values => [...values, { key: '', valueType: 'TEXT', value: '' }])}>속성 추가</Button>}
    <Modal opened={!!deleting} onClose={() => !busy && setDeleting(undefined)} title="속성 삭제 확인" closeOnEscape={!busy} closeOnClickOutside={!busy}>
      <p>“{deleting?.key}” 속성을 삭제할까요? 노트 본문과 개정 이력은 보존됩니다.</p>
      {error && <p role="alert">{error}</p>}
      <Group><Button data-autofocus variant="default" disabled={busy} onClick={() => setDeleting(undefined)}>취소</Button>
        <Button color="red" disabled={disabled || !deleting?.id} onClick={() => {
          const id = deleting?.id; if (id && !disabled) void change(() => api.deleteProperty(note.id, id, state.revision));
        }}>삭제 확인</Button></Group>
    </Modal>
  </div>;
}
