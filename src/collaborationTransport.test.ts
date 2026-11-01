// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { kmsNoteAssociations } from './collaborationApi';
import { legacyAccess } from './access';

afterEach(() => { vi.unstubAllGlobals(); document.cookie = 'XSRF-TOKEN=;max-age=0'; });

it('keeps KMS identity alive on scoped association denial but revokes it on authentication loss', async () => {
  document.cookie = 'XSRF-TOKEN=test-token';
  const lost = vi.fn(); const stop = legacyAccess.onAccessLost(lost);
  let code = 'FORBIDDEN';
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ errors: [{ message: 'Association permission denied', extensions: { code } }] })));
  try {
    await expect(kmsNoteAssociations.list('note', null)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(lost).not.toHaveBeenCalled();
    code = 'UNAUTHENTICATED';
    await expect(kmsNoteAssociations.list('note', null)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(lost).toHaveBeenCalledOnce();
  } finally { stop(); }
});

it('keeps scoped HTTP 403 recoverable and treats HTTP 401 as identity loss', async () => {
  document.cookie = 'XSRF-TOKEN=test-token';
  const lost = vi.fn(); const stop = legacyAccess.onAccessLost(lost);
  let status = 403;
  vi.stubGlobal('fetch', async () => new Response('{}', { status }));
  try {
    await expect(kmsNoteAssociations.list('note', null)).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    expect(lost).not.toHaveBeenCalled();
    status = 401;
    await expect(kmsNoteAssociations.list('note', null)).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    expect(lost).toHaveBeenCalledOnce();
  } finally { stop(); }
});
