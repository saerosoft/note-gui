import { useEffect, useState } from 'react';
import type { NoteAccumulation, NoteKnowledgeContextApi, Page } from './model';
import { NoteEvidence } from './NoteEvidence';
import { NoteAccumulationChange } from './NoteAccumulationChange';
import { HostLink } from './hostRuntime';
import { useNoteDateTime } from './dateTime';

const operationLabels: Record<string, string> = { CREATE_NOTE: '노트 생성', APPEND_NOTE: '추가 제안 반영', REPLACE_NOTE: '교체 제안 반영' };

export function NoteAccumulations({ api, noteId }: { api: NoteKnowledgeContextApi; noteId: string }) {
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1) ?? null;
  const [page, setPage] = useState<Page<NoteAccumulation>>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setPage(undefined); setError('');
    api.accumulations(noteId, cursor).then(result => { if (alive) setPage(result); })
      .catch(failure => { if (alive) setError((failure as Error).message); });
    return () => { alive = false; };
  }, [api, noteId, cursor, attempt]);
  return <section className="context-card note-accumulations" aria-label="누적 이력">
    <h2>누적 이력</h2>
    <p className="context-muted">반영된 제안과 당시 근거를 최신순으로 보여 줍니다. 과거 자료는 현재 정리를 바꾸지 않고 이력에만 남을 수 있습니다. 실제 결과는 변경 전후에서 확인할 수 있으며, 사람이 작성한 본문과 이전 개정은 보존됩니다.</p>
    {error && <p role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>누적 이력 다시 읽기</button></p>}
    {!page && !error && <p role="status">누적 이력을 읽는 중…</p>}
    {page && <>
      {!page.items.length && <p>반영된 정리가 없습니다.</p>}
      {page.items.map(item => <Accumulation key={item.id} api={api} item={item}/>)}
      <nav className="context-pagination" aria-label="누적 이력 페이지">
        <button type="button" disabled={!cursors.length} onClick={() => setCursors(value => value.slice(0, -1))}>이전 반영 내역</button>
        <span>{cursors.length + 1}쪽</span>
        <button type="button" disabled={page.nextCursor === null} onClick={() => { if (page.nextCursor !== null) setCursors(value => [...value, page.nextCursor!]); }}>다음 반영 내역</button>
      </nav>
    </>}
  </section>;
}

function Accumulation({ api, item }: { api: NoteKnowledgeContextApi; item: NoteAccumulation }) {
  const date = useNoteDateTime();
  const [expanded, setExpanded] = useState(false);
  return <article className="accumulation-item">
    <details><summary><span className="accumulation-heading"><span>{operationLabels[item.kind] || item.kind}</span>{' · '}<span>개정 {item.resultRevision}</span></span>{' · '}<time className="context-muted" dateTime={item.appliedAt}>{date(item.appliedAt)}</time></summary>
    <h3>{item.title}</h3>
    <p className="preserve">{item.preview}</p>
    <p className="context-muted">반영 시각 <time dateTime={item.appliedAt}>{date(item.appliedAt)}</time> · {item.actorName || '알 수 없는 사용자'} · {item.automatic ? '정책에 따라 자동 반영' : `${item.reviewerName || '알 수 없는 사용자'} 검토 후 반영`}</p>
    <NoteEvidence evidence={item.evidence} evidenceCount={item.evidenceCount}/>
     <p className="applied-rules">적용 규칙: {item.rules.length ? item.rules.map(rule => <HostLink key={rule.versionId} destination={{ kind: 'rule', spaceId: item.spaceId, rulesetId: rule.rulesetId, versionId: rule.versionId }}>{rule.name} v{rule.versionNumber}</HostLink>) : '적용 기록 없음'}</p>
    <div className="context-actions">
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? '변경 전후·반영 기준 닫기' : '변경 전후·반영 기준 보기'}</button>
       <HostLink destination={{ kind: 'review', spaceId: item.spaceId, id: item.changeSetId, reviewKind: 'changeSet', operationId: item.id }}>반영 기록</HostLink>
       <HostLink destination={{ kind: 'ruleImprovements', spaceId: item.spaceId }}>규칙 개선 제안</HostLink>
    </div>
    {expanded && <NoteAccumulationChange api={api} id={item.id}/>}
    </details>
  </article>;
}
