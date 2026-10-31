import { useEffect, useRef, useState } from 'react';
import { Button, Group, Modal, Select, TextInput } from '@mantine/core';
import type { Note, NoteCoreApi, PropertyValue } from './model';
import { useNoteAccess } from './hostRuntime';

interface Props { api: NoteCoreApi; note: Note; dirty: boolean; onRevision: (note: Note) => void }
export function NoteProperties({ api, note, dirty, onRevision }: Props) {
  const access = useNoteAccess();
  const [properties, setProperties] = useState<PropertyValue[]>([]);
  const [deleting, setDeleting] = useState<PropertyValue>();
  const [busy, setBusy] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [accessFailure, setAccessFailure] = useState(false);
  const baseline = useRef<PropertyValue[]>([]);
  const current = useRef(properties); current.current = properties;
  const propertyRevision = useRef(note.revision);
  const inFlight = useRef(false);
  const accepted = useRef(false);
  const loaded = useRef<{ id: string; revision: number } | undefined>(undefined);
  useEffect(() => {
    let alive = true; let sequence = 0;
    async function load() {
      const request = ++sequence; setBusy(true); setError('');
      try {
        const values = await api.properties(note.id);
        if (!alive || request !== sequence) return;
        const edited = JSON.stringify(current.current) !== JSON.stringify(baseline.current);
        loaded.current = { id: note.id, revision: note.revision }; baseline.current = values;
        if (!edited) { propertyRevision.current = note.revision; setProperties(values); }
        setAccessFailure(false);
      } catch (failure) { if (alive && request === sequence) { setError((failure as Error).message); setAccessFailure(true); } }
      finally { if (alive && request === sequence) setBusy(false); }
    }
    if (loaded.current?.id !== note.id || loaded.current.revision !== note.revision) void load();
    const stop = access.onAccessRefresh(load);
    return () => { alive = false; sequence++; stop(); };
  }, [api, note.id, note.revision, access]);
  async function reload() {
    const [values, current] = await Promise.all([api.properties(note.id), api.note(note.id)]);
    loaded.current = { id: current.id, revision: current.revision };
    baseline.current = values; propertyRevision.current = current.revision;
    setProperties(values); onRevision(current); setDeleting(undefined); setNeedsReload(false); setAccessFailure(false);
    accepted.current = false; setMessage('속성 변경을 저장했습니다.');
  }
  async function change(operation?: () => Promise<void>) {
    if (inFlight.current || (!operation && !accepted.current)) return;
    inFlight.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (!accepted.current && operation) { await operation(); accepted.current = true; setNeedsReload(true); setDeleting(undefined); }
      await reload();
    } catch (failure) { setError((failure as Error).message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const disabled = busy || dirty || needsReload || accessFailure || !note.canEdit;
  return <div aria-label="노트 속성">
    {error && !deleting && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {dirty && <p>노트 본문 변경을 먼저 저장한 뒤 속성을 변경해 주세요.</p>}
    {needsReload && <p>변경은 저장되었습니다. 최신 속성을 다시 읽어 주세요. <Button disabled={busy} onClick={() => void change()}>속성 새로고침</Button></p>}
    {!properties.length && !busy && <p>아직 속성이 없습니다.</p>}
    {properties.map((value, index) => <form key={value.id ?? `draft-${index}`} onSubmit={event => { event.preventDefault(); if (!disabled) void change(() => api.setProperties(note.id, [value], propertyRevision.current)); }}>
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
          const id = deleting?.id; if (id && !disabled) void change(() => api.deleteProperty(note.id, id, propertyRevision.current));
        }}>삭제 확인</Button></Group>
    </Modal>
  </div>;
}
