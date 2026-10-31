import { ApiError } from './access';
import type { Comment, Note, NoteCoreApi, NoteFile, Page, PropertyValue, Revision, Space } from './model';

export interface LocalNoteStoreOptions {
  namespace: string;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  locks?: { request<T>(name: string, callback: () => T | Promise<T>): Promise<T> };
}
interface StoredNote { note: Note; history: Revision[]; comments: Comment[]; properties: PropertyValue[] }
interface StoredFile { noteId: string; metadata: NoteFile; base64: string }
interface Receipt { intent: string; result: unknown }
interface Store { version: 1; notes: Record<string, StoredNote>; files: Record<string, StoredFile>; receipts: Record<string, Receipt> }
const space: Space = { id: 'local', name: 'Local notes', accessEpoch: 1, myRole: 'OWNER' };
const invalid = (message: string): never => { throw new ApiError(message, 'INVALID_INPUT'); };
function page<T>(items: T[], cursor: string | null, size = 20): Page<T> {
  const offset = cursor === null ? 0 : Number(cursor);
  if (!Number.isSafeInteger(offset) || offset < 0) invalid('Invalid page cursor.');
  return { items: items.slice(offset, offset + size), nextCursor: offset + size < items.length ? String(offset + size) : null };
}
function record(store: Store, id: string) {
  const value = store.notes[id];
  if (!value) throw new ApiError('Note not found.', 'NOT_FOUND');
  return value;
}
function expected(value: StoredNote, revision: number) {
  if (value.note.revision !== revision) throw new ApiError('A newer revision exists. Your draft has been preserved.', 'CONFLICT');
}
function snapshot(value: StoredNote) {
  const { id, revision, title, bodyJson, presentation } = value.note;
  value.history.unshift({ id: `${id}:${revision}`, revision, title, bodyJson: structuredClone(bodyJson), presentation, createdAt: new Date().toISOString() });
}
function advance(value: StoredNote) { value.note.revision++; snapshot(value); }
function replay<T>(store: Store, operation: string, key: string, intent: unknown, write: () => T): T {
  if (!key.trim()) invalid('An idempotency key is required.');
  const id = `${operation}:${key}`; const serialized = JSON.stringify(intent); const previous = store.receipts[id];
  if (previous) {
    if (previous.intent !== serialized) invalid('The idempotency key was already used for another intent.');
    return structuredClone(previous.result) as T;
  }
  const result = write(); store.receipts[id] = { intent: serialized, result: structuredClone(result) };
  return result;
}
function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new ApiError('The file could not be read.', 'STORAGE'));
    reader.readAsDataURL(file);
  });
}

/** Durable, single-user browser example. Web Locks serialize commits across tabs on the same origin. */
export function createLocalNoteApi(options: LocalNoteStoreOptions): NoteCoreApi {
  const storage = options.storage ?? window.localStorage;
  const locks = options.locks ?? navigator.locks;
  if (!options.namespace.trim() || !locks) throw new ApiError('Local persistence requires a namespace and Web Locks on a secure origin.', 'STORAGE');
  const key = `note-gui:${options.namespace}:v1`;
  async function transaction<T>(write: boolean, action: (store: Store) => T): Promise<T> {
    return locks.request(key, () => {
      let store: Store;
      try {
        const saved = storage.getItem(key);
        store = saved ? JSON.parse(saved) : { version: 1, notes: {}, files: {}, receipts: {} };
        if (store.version !== 1) throw new Error('Unsupported storage version.');
      } catch { throw new ApiError('Local storage could not be read. Existing data was not replaced.', 'STORAGE'); }
      const result = action(store);
      if (write) {
        try { storage.setItem(key, JSON.stringify(store)); }
        catch { throw new ApiError('Local storage could not save this change. Check available browser storage.', 'STORAGE'); }
      }
      return structuredClone(result);
    });
  }
  function requireSpace(id: string) { if (id !== space.id) throw new ApiError('Workspace not found.', 'NOT_FOUND'); }
  return {
    async spaces() { return [{ ...space }]; },
    async tree(spaceId, parentId, cursor) {
      requireSpace(spaceId);
      return transaction(false, store => {
        if (parentId) record(store, parentId);
        const notes = Object.values(store.notes).map(value => value.note);
        return page(notes.filter(note => note.parentId === parentId).sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
          .map(note => ({ id: note.id, title: note.title, parentId: note.parentId, revision: note.revision, hasChildren: notes.some(child => child.parentId === note.id) })), cursor, 50);
      });
    },
    ancestors(id) { return transaction(false, store => {
      const result = []; let parent = record(store, id).note.parentId;
      while (parent) { const note = record(store, parent).note; result.unshift({ id: note.id, title: note.title }); parent = note.parentId; }
      return result;
    }); },
    note(id) { return transaction(false, store => record(store, id).note); },
    async findNotes(spaceId, query) {
      requireSpace(spaceId);
      return transaction(false, store => Object.values(store.notes).map(value => value.note).filter(note => note.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
        .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id)).slice(0, 20).map(({ id, title }) => ({ id, title })));
    },
    async create(input) {
      requireSpace(input.spaceId);
      return transaction(true, store => replay(store, 'create', input.idempotencyKey, input, () => {
        if (input.parentId) record(store, input.parentId);
        const note: Note = { id: crypto.randomUUID(), spaceId: space.id, title: input.title, revision: 1, bodyJson: { type: 'doc', content: [{ type: 'paragraph' }] }, visibility: input.visibility, parentId: input.parentId, canEdit: true };
        const value = { note, history: [], comments: [], properties: [] }; snapshot(value); store.notes[note.id] = value;
        return note;
      }));
    },
    save(id, input) { return transaction(true, store => replay(store, `save:${id}`, input.idempotencyKey, input, () => {
      const value = record(store, id); expected(value, input.expectedRevision);
      if (input.bodyJson.type !== 'doc') invalid('The note body must be a document.');
      value.note.title = input.title; value.note.bodyJson = structuredClone(input.bodyJson); advance(value); return value.note;
    })); },
    async move(ids, parentId, spaceId) {
      requireSpace(spaceId);
      return transaction(true, store => {
        if (parentId) record(store, parentId);
        const unique = [...new Set(ids)]; unique.forEach(id => record(store, id));
        let ancestor = parentId;
        while (ancestor) { if (unique.includes(ancestor)) invalid('A note cannot be moved into its own subtree.'); ancestor = record(store, ancestor).note.parentId; }
        const roots = unique.filter(id => {
          let parent = record(store, id).note.parentId;
          while (parent) { if (unique.includes(parent)) return false; parent = record(store, parent).note.parentId; }
          return true;
        });
        roots.forEach(id => { const value = record(store, id); if (value.note.parentId !== parentId) { value.note.parentId = parentId; advance(value); } });
      });
    },
    history(id, cursor) { return transaction(false, store => page(record(store, id).history, cursor)); },
    restore(id, revision, expectedRevision) { return transaction(true, store => {
      const value = record(store, id); expected(value, expectedRevision);
      const source = value.history.find(item => item.revision === revision);
      if (!source) throw new ApiError('Revision not found.', 'NOT_FOUND');
      value.note.title = source.title; value.note.bodyJson = structuredClone(source.bodyJson); advance(value); return value.note;
    }); },
    comments(id, cursor) { return transaction(false, store => page(record(store, id).comments, cursor)); },
    comment(id, input) { return transaction(true, store => replay(store, `comment:${id}`, input.idempotencyKey, input, () => {
      if (!input.body.trim()) invalid('A comment must contain text.');
      record(store, id).comments.push({ id: crypto.randomUUID(), body: input.body, createdAt: new Date().toISOString(), authorName: 'Local user' });
    })); },
    properties(id) { return transaction(false, store => record(store, id).properties); },
    setProperties(id, values, expectedRevision) { return transaction(true, store => {
      const value = record(store, id); expected(value, expectedRevision);
      if (values.some(item => !item.key.trim()) || new Set(values.map(item => item.key)).size !== values.length) invalid('Property names must be nonempty and unique.');
      for (const item of values) {
        const index = value.properties.findIndex(saved => saved.key === item.key);
        if (index < 0) value.properties.push({ ...item, id: crypto.randomUUID() });
        else value.properties[index] = { ...item, id: value.properties[index].id };
      }
      advance(value);
    }); },
    deleteProperty(id, propertyId, expectedRevision) { return transaction(true, store => {
      const value = record(store, id); expected(value, expectedRevision);
      if (!value.properties.some(item => item.id === propertyId)) throw new ApiError('Property not found.', 'NOT_FOUND');
      value.properties = value.properties.filter(item => item.id !== propertyId); advance(value);
    }); },
    files(id, cursor) { return transaction(false, store => {
      record(store, id);
      return page(Object.values(store.files).filter(file => file.noteId === id).map(file => file.metadata)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)), cursor, 50);
    }); },
    async upload(id, file, previous) {
      const base64 = await readFile(file);
      const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
      const checksum = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
      return transaction(true, store => {
        record(store, id);
        const prior = previous && store.files[previous.attachmentId];
        if (previous && (!prior || prior.noteId !== id || previous.revision !== 1)) throw new ApiError('The previous attachment is not available at this revision.', 'CONFLICT');
        const attachmentId = crypto.randomUUID();
        store.files[attachmentId] = { noteId: id, base64, metadata: { id: attachmentId, fileName: file.name, mediaType: file.type || 'application/octet-stream', byteSize: file.size, checksum, revision: prior ? prior.metadata.revision + 1 : 1, previousId: previous?.attachmentId ?? null, createdAt: new Date().toISOString() } };
        return { attachmentId, revision: 1, name: file.name, mimeType: file.type || 'application/octet-stream' };
      });
    },
    async attachment(id, revision) {
      const file = await transaction(false, store => {
        const file = store.files[id];
        if (!file || revision !== 1) throw new ApiError('Attachment not found.', 'NOT_FOUND');
        record(store, file.noteId); return file;
      });
      return new Blob([Uint8Array.from(atob(file.base64), character => character.charCodeAt(0))], { type: file.metadata.mediaType });
    },
  };
}
