import { useCallback, useContext, useEffect, useRef, useState, type MouseEvent } from 'react';
import { ActionIcon, Alert, Button, Modal, Text, Tooltip } from '@mantine/core';
import { IconLayoutColumns, IconLayoutSidebar } from '@tabler/icons-react';
import type { NoteCoreApi } from './model';
import { NoteTree } from './NoteTree';
import { NotePicker } from './NotePicker';
import { Pane } from './Pane';
import { NoteDirtyContext, NotePolicyContext, useNoteAccess, useNoteCore, useNoteDestination, useNoteHost } from './hostRuntime';
import { useSpaceAccess } from './useSpaceAccess';
import { useNoteAppearance } from './appearance';
import GlobalAppShell from './vendor/docmost/client/components/layouts/global/global-app-shell';
import SidebarToggle from './vendor/docmost/client/components/ui/sidebar-toggle-button';
import { SpaceSidebar } from './vendor/docmost/client/features/space/components/sidebar/space-sidebar';

export function Workspace({ api: suppliedApi }: { api: NoteCoreApi }) {
  const api = useNoteCore(suppliedApi);
  const { onAccessLost } = useNoteAccess();
  const { onNavigate } = useNoteHost();
  const destination = useNoteDestination();
  const { chrome } = useNoteAppearance();
  const embedded = chrome === 'embedded';
  const params = new URLSearchParams(window.location.search);
  const access = useSpaceAccess(api);
  const { spaces } = access;
  const [spaceId, setSpaceId] = useState<string | null>(params.get('space'));
  const [left, setLeft] = useState<string | null>(params.get('note'));
  const [right, setRight] = useState<string | null>(params.get('right'));
  const [split, setSplit] = useState(params.has('right'));
  const [target, setTarget] = useState('left');
  const [searchOpened, setSearchOpened] = useState(false);
  const [error, setError] = useState('');
  const dirty = useRef({ left: false, right: false });
  const reportDirty = useContext(NoteDirtyContext);
  const accessLost = useRef(false);
  const leftDirty = useCallback((value: boolean) => { dirty.current.left = value; reportDirty(value || dirty.current.right); }, [reportDirty]);
  const rightDirty = useCallback((value: boolean) => { dirty.current.right = value; reportDirty(value || dirty.current.left); }, [reportDirty]);
  useEffect(() => {
    if (access.ready && !accessLost.current) setSpaceId(current => spaces.some(value => value.id === current) ? current : spaces[0]?.id || null);
  }, [spaces, access.ready]);
  useEffect(() => onAccessLost(() => {
    accessLost.current = true; setSpaceId(null); setLeft(null); setRight(null); setSearchOpened(false);
    dirty.current = { left: false, right: false };
    reportDirty(false);
    setError('로그인 또는 공간 접근 권한을 확인해 주세요. 메인 화면에서 같은 계정으로 로그인한 뒤 새로고침하면 요청한 공간과 노트를 다시 엽니다.');
  }), []);
  useEffect(() => {
    // Preserve the requested URL after access loss so a later sign-in can restore authorized locations.
    if (accessLost.current) return;
    const query = new URLSearchParams();
    if (spaceId) query.set('space', spaceId);
    if (left) query.set('note', left);
    if (right && split) query.set('right', right);
    window.history.replaceState(null, '', `${window.location.pathname}?${query}`);
  }, [spaceId, left, right, split]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (dirty.current.left || dirty.current.right) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, []);
  useEffect(() => {
    if (embedded) return;
    const search = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && access.ready && !access.refreshing && !access.failure && spaceId) {
        event.preventDefault(); setSearchOpened(true);
      }
    };
    window.addEventListener('keydown', search);
    return () => window.removeEventListener('keydown', search);
  }, [embedded, access.ready, access.refreshing, access.failure, spaceId]);

  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0 || event.currentTarget.target === '_blank') return;
    if ((dirty.current.left || dirty.current.right) && !window.confirm('저장하지 않은 변경이 있습니다. 메인 화면으로 이동할까요?')) {
      event.preventDefault(); return;
    }
    if (onNavigate?.(event.currentTarget.href)) event.preventDefault();
  }
  function changeSpace(value: string) {
    if (value === spaceId) return;
    if ((dirty.current.left || dirty.current.right) && !window.confirm('공간을 바꾸고 저장하지 않은 변경을 버릴까요?')) return;
    setSpaceId(value); setLeft(null); setRight(null); setSearchOpened(false); setTarget('left');
    dirty.current = { left: false, right: false };
    reportDirty(false);
  }
  function toggleSplit() {
    if (split && dirty.current.right && !window.confirm('오른쪽 창의 저장하지 않은 변경을 버릴까요?')) return;
    if (split) { dirty.current.right = false; reportDirty(dirty.current.left); }
    setSplit(value => !value); setTarget('left');
  }
  function open(id: string) {
    if (target === 'right' && split) setRight(id); else setLeft(id);
  }
  const currentSpace = spaces.find(value => value.id === spaceId);
  const askHref = spaceId ? destination({ kind: 'ask', spaceId }) : undefined;
  return <NotePolicyContext.Provider value={access.policies}><div className="note-gui-root" data-chrome={chrome}>
    {access.failure && <Alert color="red" role="alert">{access.failure.message} <Button onClick={() => void access.recheck()}>접근 권한 다시 확인</Button></Alert>}
    {(!access.ready || access.refreshing) && <Text p="md" role="status">접근 권한 확인 중…</Text>}
    <div className="note-gui-shell-wrap" data-chrome={chrome} hidden={!access.ready || access.refreshing || !!access.failure}>
      <GlobalAppShell embedded={embedded} header={{
        homeHref: destination({ kind: 'home' }), askHref,
        onNavigate: navigate, onSearch: () => setSearchOpened(true), searchDisabled: !spaceId,
        split, onSplit: toggleSplit,
      }} sidebar={closeMobile => <SpaceSidebar spaces={spaces} spaceId={spaceId} onSpaceChange={changeSpace}
        overviewHref={spaceId ? destination({ kind: 'overview', spaceId }) : undefined}
        askHref={embedded ? askHref : undefined}
        settingsHref={spaceId && currentSpace?.myRole === 'OWNER' ? destination({ kind: 'settings', spaceId }) : undefined}
        sourceHref={`${import.meta.env.BASE_URL}source.html`} onNavigate={navigate}
        onSearch={() => { closeMobile(); setSearchOpened(true); }} split={split} target={target} onTargetChange={setTarget}>
        {spaceId && <NoteTree key={spaceId} api={api} spaceId={spaceId} activeNoteId={target === 'right' && split ? right : left}
          onOpen={id => { open(id); closeMobile(); }}/>}
      </SpaceSidebar>}>{controls => {
        const navControls = embedded ? <>
          <Tooltip label="페이지 탐색" withinPortal={false}>
            <SidebarToggle aria-label="페이지 탐색" aria-controls="page-navigation" opened={controls.mobileOpened}
              onClick={controls.toggleMobile} hiddenFrom="sm" size="sm"/>
          </Tooltip>
          <Tooltip label="페이지 탐색" withinPortal={false}>
            <SidebarToggle aria-label="페이지 탐색" aria-controls="page-navigation" opened={controls.desktopOpened}
              onClick={controls.toggleDesktop} visibleFrom="sm" size="sm"/>
          </Tooltip>
        </> : undefined;
        const splitControl = embedded ? <Tooltip label={split ? '한 창으로' : '두 창으로'} withinPortal={false}>
          <ActionIcon variant="subtle" color="gray" size="sm" onClick={toggleSplit}
            aria-label={split ? '한 창으로' : '두 창으로'} aria-pressed={split}>
            {split ? <IconLayoutSidebar size={18}/> : <IconLayoutColumns size={18}/>}
          </ActionIcon>
        </Tooltip> : undefined;
        return <>
          {error && <Alert color="red" role="alert">{error} {destination({ kind: 'login' }) && <a href={destination({ kind: 'login' })} onClick={navigate}>로그인</a>}</Alert>}
          <div className="note-gui-panes" data-split={split}>
            <Pane key={`${spaceId}:left`} api={api} paneId="왼쪽" requestedId={left} onLocation={setLeft}
              onDirty={leftDirty} onActivate={() => setTarget('left')} onOpenTree={spaceId ? controls.openMobile : undefined}
              leadingTabControls={navControls} trailingTabControls={!split ? splitControl : undefined}/>
            {split && <Pane key={`${spaceId}:right`} api={api} paneId="오른쪽" requestedId={right} onLocation={setRight}
              onDirty={rightDirty} onActivate={() => setTarget('right')} onOpenTree={spaceId ? controls.openMobile : undefined}
              trailingTabControls={splitControl}/>}
          </div>
        </>;
      }}</GlobalAppShell>
      {searchOpened && spaceId && access.ready && !access.refreshing && !access.failure && <Modal opened onClose={() => setSearchOpened(false)} title="노트 검색" centered>
        <NotePicker key={spaceId} api={api} spaceId={spaceId} label="노트 제목" selected={null}
          onSelect={note => { if (note) { open(note.id); setSearchOpened(false); } }}/>
      </Modal>}
    </div>
  </div></NotePolicyContext.Provider>;
}
