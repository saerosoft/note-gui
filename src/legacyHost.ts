import type { NoteDestination, NoteHost } from './host';
import { legacyAccess } from './access';
import { webUrl } from './webOrigin';

/** The product's historical routes live only in this explicitly selected compatibility binding. */
export function createKmsNoteHost(onNavigate?: NoteHost['onNavigate']): NoteHost {
  const enc = encodeURIComponent;
  function resolve(value: NoteDestination): string {
    if (value.kind === 'home') return webUrl('/');
    if (value.kind === 'login') return webUrl('/login');
    const path = `/spaces/${enc(value.spaceId)}`;
    switch (value.kind) {
      case 'ask': return webUrl(`${path}/ask`);
      case 'overview': return webUrl(`${path}/knowledge`);
      case 'settings': return webUrl(`${path}/settings`);
      case 'ruleImprovements': return webUrl(`${path}/rules?stage=improvements`);
      case 'conflicts': return webUrl(`${path}/knowledge/conflicts?note=${enc(value.noteId)}`);
      case 'createAction': return webUrl(`${path}/actions/new?note=${enc(value.noteId)}`);
      case 'source': return webUrl(`${path}/source-revisions/${enc(value.revisionId)}`);
      case 'rule': return webUrl(`${path}/rules?stage=history&ruleset=${enc(value.rulesetId)}&version=${enc(value.versionId)}`);
      case 'review': return webUrl(`${path}/reviews?${value.reviewKind === 'proposal' ? 'proposal' : 'changeSet'}=${enc(value.id)}${value.operationId ? `&operation=${enc(value.operationId)}` : ''}`);
      case 'action': return webUrl(`${path}/actions/${enc(value.id)}`);
    }
  }
  return { access: legacyAccess, destinations: { resolve }, onNavigate, attachmentUrl: id => `/api/files/${enc(id)}` };
}
