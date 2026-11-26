import { AppShell } from '@mantine/core';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppHeader, type AppHeaderProps } from './app-header';
import classes from './app-shell.module.css';
import { SkipToMain } from '@/components/ui/skip-to-main';
import layout from '@knowledge/docmost/HostLayout.module.css';

export interface ShellControls {
  mobileOpened: boolean;
  desktopOpened: boolean;
  openMobile: () => void;
  toggleMobile: () => void;
  toggleDesktop: () => void;
}

interface Props {
  children: ReactNode | ((controls: ShellControls) => ReactNode);
  embedded?: boolean;
  header: Omit<AppHeaderProps, 'mobileOpened' | 'desktopOpened' | 'toggleMobile' | 'toggleDesktop'>;
  sidebar: (closeMobile: () => void) => ReactNode;
}

/** Docmost's core AppShell, with explicit slots instead of upstream routes and global account state. */
export default function GlobalAppShell({ children, embedded = false, header, sidebar }: Props) {
  const [mobileOpened, setMobileOpened] = useState(false);
  const [desktopOpened, setDesktopOpened] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const openMobile = useCallback(() => setMobileOpened(true), []);
  const toggleMobile = useCallback(() => setMobileOpened(value => !value), []);
  const toggleDesktop = useCallback(() => setDesktopOpened(value => !value), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((event: MouseEvent) => {
    if (!isResizing || !sidebarRef.current) return;
    setSidebarWidth(Math.min(600, Math.max(220, event.clientX - sidebarRef.current.getBoundingClientRect().left)));
  }, [isResizing]);
  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const controls: ShellControls = { mobileOpened, desktopOpened, openMobile, toggleMobile, toggleDesktop };
  return <>
    <SkipToMain/>
    <AppShell mode={embedded ? 'static' : 'fixed'} zIndex={120} header={embedded ? undefined : { height: 45 }} navbar={{
      width: sidebarWidth, breakpoint: 'sm',
      collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
    }} padding={0} className={embedded ? layout.embeddedShell : undefined} data-chrome={embedded ? 'embedded' : 'full'}>
      {!embedded && <AppShell.Header className={classes.header + " " + layout.header}>
        <AppHeader {...header} mobileOpened={mobileOpened} desktopOpened={desktopOpened}
          toggleMobile={toggleMobile} toggleDesktop={toggleDesktop}/>
      </AppShell.Header>}
      {mobileOpened && <button type="button" className={embedded ? layout.mobileBackdrop + " " + layout.embeddedBackdrop : layout.mobileBackdrop}
        aria-label="페이지 탐색 닫기" onClick={() => setMobileOpened(false)}/>}
      <AppShell.Navbar id="page-navigation" className={classes.navbar + " " + layout.navbar + (embedded ? " " + layout.embeddedNavbar : "")} withBorder={false}
        ref={sidebarRef} aria-label="공간 탐색" onKeyDown={event => {
          if (event.key === 'Escape') setMobileOpened(false);
        }}>
        <div className={classes.resizeHandle + " " + layout.resizeHandle} role="separator" aria-label="탐색 영역 너비"
          aria-orientation="vertical" aria-valuemin={220} aria-valuemax={600}
          aria-valuenow={sidebarWidth} tabIndex={0}
          onMouseDown={event => { event.preventDefault(); setIsResizing(true); }}
          onKeyDown={event => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            setSidebarWidth(value => Math.min(600, Math.max(220, value + (event.key === 'ArrowRight' ? 20 : -20))));
          }}/>
        {sidebar(() => setMobileOpened(false))}
      </AppShell.Navbar>
      <AppShell.Main id="main-content" tabIndex={-1} className={embedded ? layout.main + " " + layout.embeddedMain : layout.main}>{typeof children === 'function' ? children(controls) : children}</AppShell.Main>
    </AppShell>
  </>;
}
