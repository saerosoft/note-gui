import type { Note, NoteKnowledgeContextApi } from './model';
import { NoteAccumulations } from './NoteAccumulations';
import { NoteProvenance } from './NoteProvenance';
import { HostLink } from './hostRuntime';

export function NoteKnowledgeContext({ api, note }: { api: NoteKnowledgeContextApi; note: Note }) {
  return <aside className="knowledge-context" aria-label="노트의 근거와 누적 이력">
    <nav className="context-actions" aria-label="이 노트에서 이어서 하기">
       <HostLink destination={{ kind: 'conflicts', spaceId: note.spaceId, noteId: note.id }}>갱신 검토·미결</HostLink>
       <HostLink destination={{ kind: 'createAction', spaceId: note.spaceId, noteId: note.id }}>업무 만들기</HostLink>
    </nav>
    <section className="context-card" aria-label="새 소스 반영 기준">
      <h2>새 소스 반영 기준</h2>
      <ul>
        <li>새 사실은 기존 지식에 누적합니다.</li>
        <li>명확한 변경은 소스의 반영 정책을 따릅니다.</li>
        <li>불확실·상충·사람 편집 변경은 검토합니다.</li>
        <li>뒤늦게 수집한 옛 자료도 이력·근거로 보존합니다.</li>
      </ul>
      <p className="context-muted">수집 순서와 원본 발생·효력 시점을 구분합니다. 실제 적용 규칙은 각 반영 내역에서 확인할 수 있습니다.</p>
    </section>
    <NoteProvenance api={api} note={note}/>
    <NoteAccumulations key={`${note.id}:${note.revision}`} api={api} noteId={note.id}/>
  </aside>;
}
