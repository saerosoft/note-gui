import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import type { NoteCoreApi } from '../src/model';
import type { MountedNoteGui, NoteAppearance, NoteColorScheme, NoteHost } from '../src/host';
import type { NoteAccessController } from '../src/access';

declare global {
  interface Window {
    noteExample: {
      api: NoteCoreApi;
      access: NoteAccessController;
      host: NoteHost;
      mounted: MountedNoteGui;
    };
  }
}

const SCREENSHOT_DIR = resolve('.tmp/embed-0.10/screenshots');

async function seedRichNotes(page: Page) {
  return page.evaluate(async () => {
    const api = window.noteExample.api;
    const primary = await api.create({
      spaceId: 'local',
      title: '임베드 다크 테마 검증 노트',
      parentId: null,
      visibility: 'SPACE',
      idempotencyKey: `appearance-primary-${crypto.randomUUID()}`,
    });
    const updated = await api.save(primary.id, {
      title: '임베드 다크 테마 검증 노트',
      expectedRevision: primary.revision,
      idempotencyKey: `appearance-body-${crypto.randomUUID()}`,
      bodyJson: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '개요 및 대비 확인' }] },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: '호스트 애플리케이션의 다크 표면 위에서도 본문, 링크, 보조 메타데이터가 선명하게 읽혀야 합니다. ' },
              { type: 'text', text: '참고 문서 링크', marks: [{ type: 'link', attrs: { href: 'https://example.com/guide' } }] },
            ],
          },
          {
            type: 'codeBlock',
            attrs: { language: 'typescript' },
            content: [{ type: 'text', text: '// 다크 모드 주석 가독성 확인\nconst appearance = { colorScheme: "dark", chrome: "embedded" };' }],
          },
          {
            type: 'callout',
            attrs: { type: 'info' },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: '임베드 모드에서는 상단 앱 헤더만 제거됩니다.' }] }],
          },
        ],
      },
    });
    await api.comment(primary.id, {
      body: '다크 표면 댓글 대비 확인용 메모입니다.',
      idempotencyKey: `appearance-comment-${crypto.randomUUID()}`,
    });
    await api.setProperties(primary.id, [{ key: '상태', valueType: 'TEXT', value: '검증 중' }], updated.revision);

    const sibling = await api.create({
      spaceId: 'local',
      title: '아키텍처 결정 기록',
      parentId: null,
      visibility: 'SPACE',
      idempotencyKey: `appearance-sibling-${crypto.randomUUID()}`,
    });
    await api.create({
      spaceId: 'local',
      title: '하위 설계 메모',
      parentId: primary.id,
      visibility: 'PRIVATE',
      idempotencyKey: `appearance-child-${crypto.randomUUID()}`,
    });
    return { primaryId: primary.id, siblingId: sibling.id };
  });
}

async function remountWithAppearance(
  page: Page,
  appearance: NoteAppearance,
  options: { framed?: boolean } = {},
) {
  await page.evaluate(async ({ appearance, framed }) => {
    const entry = '/note-gui/note-gui.js';
    const gui: typeof import('../src/index') = await import(entry);
    const { api, access, mounted } = window.noteExample;
    mounted.unmount();

    const host: NoteHost = {
      access,
      destinations: {
        home: '/example/',
        resolve: dest => {
          if (dest.kind === 'ask') return `/spaces/${dest.spaceId}/ask`;
          if (dest.kind === 'overview') return `/spaces/${dest.spaceId}/overview`;
          if (dest.kind === 'settings') return `/spaces/${dest.spaceId}/settings`;
          return undefined;
        },
      },
      onNavigate: () => true,
    };

    const existing = document.getElementById('notes')!;
    existing.innerHTML = '';
    const existingFrame = document.getElementById('host-shell-frame');
    if (existingFrame) existingFrame.remove();

    let mountTarget: HTMLElement = existing;
    if (framed) {
      document.documentElement.style.height = '100%';
      document.body.style.margin = '0';
      document.body.style.height = '100%';
      document.body.style.overflow = 'hidden';
      const dark = appearance.colorScheme === 'dark';
      const frame = document.createElement('div');
      frame.id = 'host-shell-frame';
      frame.style.cssText = [
        'display:grid',
        'grid-template-rows:40px minmax(0,1fr) 26px',
        'grid-template-columns:48px minmax(0,1fr)',
        'width:100vw',
        'height:100vh',
        'overflow:hidden',
        `background:${dark ? '#141414' : '#f4f5f7'}`,
        `color:${dark ? '#e5e7eb' : '#1f2937'}`,
        'font-family:system-ui,sans-serif',
      ].join(';');

      const titleBar = document.createElement('div');
      titleBar.id = 'host-title-bar';
      titleBar.textContent = 'Host App · Knowledge Engine Workspace';
      titleBar.style.cssText = [
        'grid-column:1 / -1',
        'display:flex',
        'align-items:center',
        'padding:0 12px',
        'font-size:13px',
        'font-weight:600',
        `border-bottom:1px solid ${dark ? '#2b2b2b' : '#d1d5db'}`,
        `background:${dark ? '#181818' : '#ffffff'}`,
      ].join(';');

      const rail = document.createElement('aside');
      rail.id = 'host-icon-rail';
      rail.textContent = 'KE';
      rail.style.cssText = [
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'padding-top:10px',
        'font-size:12px',
        'font-weight:700',
        `border-right:1px solid ${dark ? '#2b2b2b' : '#d1d5db'}`,
        `background:${dark ? '#181818' : '#f9fafb'}`,
      ].join(';');

      const slot = document.createElement('div');
      slot.id = 'host-note-slot';
      slot.style.cssText = 'position:relative;min-width:0;min-height:0;width:100%;height:100%;overflow:hidden;';

      const statusBar = document.createElement('footer');
      statusBar.id = 'host-status-bar';
      statusBar.textContent = 'Host Status · Ready';
      statusBar.style.cssText = [
        'grid-column:1 / -1',
        'display:flex',
        'align-items:center',
        'padding:0 12px',
        'font-size:11px',
        `border-top:1px solid ${dark ? '#2b2b2b' : '#d1d5db'}`,
        `background:${dark ? '#181818' : '#ffffff'}`,
      ].join(';');

      frame.append(titleBar, rail, slot, statusBar);
      document.body.append(frame);
      existing.style.display = 'none';
      mountTarget = slot;
    } else {
      existing.style.display = '';
      document.body.style.margin = '0';
      document.body.style.overflow = '';
    }

    const nextMounted = gui.mountNoteCoreGui(mountTarget, { api, host, appearance });
    window.noteExample = { api, access, host, mounted: nextMounted };
  }, { appearance, framed: Boolean(options.framed) });
}

interface ContrastViolation {
  selector: string;
  text: string;
  fg: string;
  bg: string;
  ratio: number;
}

async function auditDarkTextContrast(page: Page, rootSelector: string): Promise<{ checked: number; minRatio: number; violations: ContrastViolation[] }> {
  return page.evaluate((selector: string) => {
    type RGBA = [number, number, number, number];

    function parseColor(value: string): RGBA | null {
      const m = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/i);
      if (!m) return null;
      const r = Number(m[1]);
      const g = Number(m[2]);
      const b = Number(m[3]);
      let a = 1;
      if (m[4] !== undefined) {
        a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : Number(m[4]);
      }
      return [r, g, b, a];
    }

    function composite(fg: RGBA, bg: RGBA): RGBA {
      const a = fg[3] + bg[3] * (1 - fg[3]);
      if (a === 0) return [0, 0, 0, 0];
      return [
        (fg[0] * fg[3] + bg[0] * bg[3] * (1 - fg[3])) / a,
        (fg[1] * fg[3] + bg[1] * bg[3] * (1 - fg[3])) / a,
        (fg[2] * fg[3] + bg[2] * bg[3] * (1 - fg[3])) / a,
        a,
      ];
    }

    function luminance([r, g, b]: RGBA): number {
      const toLinear = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    }

    function contrastRatio(fg: RGBA, bg: RGBA): number {
      const effectiveFg = fg[3] < 1 ? composite(fg, bg) : fg;
      const l1 = luminance(effectiveFg);
      const l2 = luminance(bg);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    function effectiveBackground(el: Element): RGBA {
      const layers: RGBA[] = [];
      let cur: Element | null = el;
      while (cur) {
        const bg = parseColor(getComputedStyle(cur).backgroundColor);
        if (bg && bg[3] > 0) layers.push(bg);
        cur = cur.parentElement;
      }
      // Base canvas fallback in dark mode (html/body)
      let result: RGBA = [36, 36, 36, 1];
      for (let i = layers.length - 1; i >= 0; i--) {
        result = composite(layers[i], result);
      }
      return result;
    }

    function isDisabledOrHidden(el: HTMLElement): boolean {
      let cur: HTMLElement | null = el;
      while (cur) {
        const style = getComputedStyle(cur);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return true;
        if (cur.hasAttribute('disabled') || cur.getAttribute('aria-disabled') === 'true' || cur.hasAttribute('data-disabled')) return true;
        cur = cur.parentElement;
      }
      const rect = el.getBoundingClientRect();
      return rect.width === 0 || rect.height === 0;
    }

    const roots: Element[] = [];
    const mainRoot = document.querySelector(selector);
    if (mainRoot) roots.push(mainRoot);
    // Include Mantine portals (menus, modals, popovers) rendered on body
    for (const portal of document.querySelectorAll('[data-portal="true"]')) {
      roots.push(portal);
    }

    const violations: ContrastViolation[] = [];
    let checked = 0;
    let minRatio = Infinity;
    const seen = new Set<HTMLElement>();

    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent?.trim();
        if (!text) continue;
        const el = node.parentElement;
        if (!el || seen.has(el)) continue;
        seen.add(el);
        if (isDisabledOrHidden(el)) continue;
        // Skip visually hidden sr-only helpers (1px clip)
        const rect = el.getBoundingClientRect();
        if (rect.width <= 1 && rect.height <= 1) continue;

        const style = getComputedStyle(el);
        const fg = parseColor(style.color);
        if (!fg || fg[3] === 0) continue;
        const bg = effectiveBackground(el);
        const ratio = contrastRatio(fg, bg);
        checked++;
        if (ratio < minRatio) minRatio = ratio;
        if (ratio < 4.5) {
          const idPart = el.id ? `#${el.id}` : '';
          const classPart = typeof el.className === 'string' && el.className.trim()
            ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
            : '';
          violations.push({
            selector: `${el.tagName.toLowerCase()}${idPart}${classPart}`,
            text: text.slice(0, 60),
            fg: style.color,
            bg: `rgb(${Math.round(bg[0])}, ${Math.round(bg[1])}, ${Math.round(bg[2])})`,
            ratio: Number(ratio.toFixed(2)),
          });
        }
      }
    }

    return { checked, minRatio: Number((minRatio === Infinity ? 0 : minRatio).toFixed(2)), violations };
  }, rootSelector);
}

test.beforeAll(async () => {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.waitForFunction(() => !!window.noteExample);
});

const MATRIX: Array<{ colorScheme: NoteColorScheme; chrome: 'full' | 'embedded' }> = [
  { colorScheme: 'light', chrome: 'full' },
  { colorScheme: 'dark', chrome: 'full' },
  { colorScheme: 'light', chrome: 'embedded' },
  { colorScheme: 'dark', chrome: 'embedded' },
];

for (const { colorScheme, chrome } of MATRIX) {
  test(`renders ${colorScheme} × ${chrome} cleanly on desktop and mobile with screenshots`, async ({ page }) => {
    const { primaryId } = await seedRichNotes(page);
    await page.goto(`?space=local&note=${primaryId}`);
    await page.waitForFunction(() => !!window.noteExample);

    // Pre-seed localStorage to verify host colorScheme does not overwrite it.
    const sentinel = colorScheme === 'dark' ? 'light' : 'dark';
    await page.evaluate(value => localStorage.setItem('mantine-color-scheme-value', value), sentinel);

    // Desktop viewport (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await remountWithAppearance(page, { colorScheme, chrome }, { framed: chrome === 'embedded' });

    await expect(page.getByRole('textbox', { name: '노트 본문', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-mantine-color-scheme'))).toBe(colorScheme);
    expect(await page.evaluate(() => localStorage.getItem('mantine-color-scheme-value'))).toBe(sentinel);

    const rootLocator = chrome === 'embedded' ? page.locator('#host-note-slot') : page.locator('#notes');
    if (chrome === 'embedded') {
      await expect(rootLocator.locator('header')).toHaveCount(0);
      await expect(rootLocator.getByRole('link', { name: /^홈$/ })).toHaveCount(0);
      await expect(rootLocator.getByRole('button', { name: '페이지 탐색' }).first()).toBeVisible();
      await expect(rootLocator.getByRole('button', { name: '두 창으로', exact: true })).toBeVisible();
      await expect(rootLocator.getByRole('link', { name: 'AI 대화', exact: true })).toBeVisible();
      await expect(rootLocator.getByRole('button', { name: '검색', exact: true })).toBeVisible();
    } else {
      await expect(rootLocator.locator('header')).toHaveCount(1);
      await expect(rootLocator.getByRole('link', { name: /^홈$/ })).toBeVisible();
    }

    // No horizontal overflow
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

    // Verify dark surface background is genuinely dark, light is genuinely light
    const rootBgLuminance = await rootLocator.locator('.note-gui-root').evaluate(el => {
      const m = getComputedStyle(el).backgroundColor.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
      if (!m) return -1;
      return (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3;
    });
    if (colorScheme === 'dark') {
      expect(rootBgLuminance).toBeLessThan(60);
    } else {
      expect(rootBgLuminance).toBeGreaterThan(220);
    }

    await page.screenshot({ path: resolve(SCREENSHOT_DIR, `desktop-${chrome}-${colorScheme}.png`) });

    if (colorScheme === 'dark') {
      // Audit dark contrast on the main workspace + open detail panel + open page menu + open search dialog
      const baseAudit = await auditDarkTextContrast(page, chrome === 'embedded' ? '#host-note-slot' : '#notes');
      expect(baseAudit.checked).toBeGreaterThan(15);
      expect(baseAudit.violations, `Dark contrast violations (${chrome} desktop): ${JSON.stringify(baseAudit.violations)}`).toEqual([]);

      await rootLocator.getByRole('button', { name: '댓글 및 노트 상세', exact: true }).click();
      await expect(rootLocator.getByText('다크 표면 댓글 대비 확인용 메모입니다.')).toBeVisible();
      const detailAudit = await auditDarkTextContrast(page, chrome === 'embedded' ? '#host-note-slot' : '#notes');
      expect(detailAudit.violations, `Dark contrast violations (${chrome} detail panel): ${JSON.stringify(detailAudit.violations)}`).toEqual([]);
      await rootLocator.getByRole('button', { name: '댓글 및 노트 상세', exact: true }).click();

      await rootLocator.getByRole('button', { name: '페이지 메뉴', exact: true }).click();
      await expect(page.getByRole('menuitem', { name: '페이지 이력', exact: true })).toBeVisible();
      const menuAudit = await auditDarkTextContrast(page, chrome === 'embedded' ? '#host-note-slot' : '#notes');
      expect(menuAudit.violations, `Dark contrast violations (${chrome} page menu): ${JSON.stringify(menuAudit.violations)}`).toEqual([]);
      await page.keyboard.press('Escape');

      await rootLocator.getByRole('button', { name: '검색', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '노트 검색' });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('textbox').fill('임베드');
      await expect(dialog.getByText('임베드 다크 테마 검증 노트')).toBeVisible();
      const modalAudit = await auditDarkTextContrast(page, chrome === 'embedded' ? '#host-note-slot' : '#notes');
      expect(modalAudit.violations, `Dark contrast violations (${chrome} search modal): ${JSON.stringify(modalAudit.violations)}`).toEqual([]);
      await page.keyboard.press('Escape');
    }

    // Mobile viewport (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('textbox', { name: '노트 본문', exact: true })).toBeVisible();
    // Wait for navbar collapse transition to complete and confirm navbar is fully off-canvas.
    const nav = rootLocator.getByRole('navigation', { name: '공간 탐색' });
    await expect.poll(async () => {
      const slotLeft = chrome === 'embedded' ? (await rootLocator.boundingBox())!.x : 0;
      const box = await nav.boundingBox();
      return box ? Math.round(box.x + box.width - slotLeft) : -1;
    }).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, `mobile-${chrome}-${colorScheme}.png`) });

    if (chrome === 'embedded' && colorScheme === 'dark') {
      // Open mobile drawer inside the embedded host slot and ensure it stays within the slot bounds
      const mobileToggle = rootLocator.locator('.note-gui-tabs-controls button[aria-label="페이지 탐색"]').filter({ visible: true }).first();
      await mobileToggle.click();
      await expect(nav).toBeVisible();
      const slotBox = (await rootLocator.boundingBox())!;
      await expect.poll(async () => {
        const box = await nav.boundingBox();
        return box ? Math.round(box.x) : -1;
      }).toBeGreaterThanOrEqual(Math.floor(slotBox.x));
      const navBox = (await nav.boundingBox())!;
      expect(navBox.y).toBeGreaterThanOrEqual(slotBox.y - 1);
      expect(navBox.x).toBeGreaterThanOrEqual(slotBox.x - 1);
      expect(navBox.y + navBox.height).toBeLessThanOrEqual(slotBox.y + slotBox.height + 1);
      await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'mobile-embedded-dark-drawer.png') });
      const mobileDrawerAudit = await auditDarkTextContrast(page, '#host-note-slot');
      expect(mobileDrawerAudit.violations, `Dark contrast violations (mobile embedded drawer): ${JSON.stringify(mobileDrawerAudit.violations)}`).toEqual([]);
    }
  });
}

test('live setAppearance preserves editor DOM, unsaved edits, split/sidebar controls, and does not hijack Ctrl+K or mutate localStorage', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const { primaryId } = await seedRichNotes(page);
  await page.goto(`?space=local&note=${primaryId}`);
  await page.waitForFunction(() => !!window.noteExample);

  await page.evaluate(() => localStorage.setItem('mantine-color-scheme-value', 'light'));
  await remountWithAppearance(page, { colorScheme: 'light', chrome: 'full' });

  const body = page.getByRole('textbox', { name: '노트 본문', exact: true });
  await expect(body).toBeVisible();
  const originalBodyHandle = await body.elementHandle();

  await body.click();
  await body.press('Control+End');
  await body.press('Enter');
  await body.pressSequentially('실시간 테마 전환 중 보존되어야 할 미저장 텍스트.');

  expect(await page.evaluate(() => window.noteExample.mounted.hasUnsavedChanges())).toBe(true);
  await expect(page.locator('#notes header')).toHaveCount(1);

  // Live switch to dark + embedded without remount
  await page.evaluate(() => window.noteExample.mounted.setAppearance({ colorScheme: 'dark', chrome: 'embedded' }));
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-mantine-color-scheme'))).toBe('dark');
  await expect(page.locator('#notes header')).toHaveCount(0);
  expect(await body.evaluate((el, orig) => el === orig, originalBodyHandle)).toBe(true);
  await expect(body).toContainText('실시간 테마 전환 중 보존되어야 할 미저장 텍스트.');
  expect(await page.evaluate(() => window.noteExample.mounted.hasUnsavedChanges())).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('mantine-color-scheme-value'))).toBe('light');

  // Ctrl+K is not hijacked in embedded mode
  const ctrlKPrevented = await page.evaluate(() => {
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(ctrlKPrevented).toBe(false);
  await expect(page.getByRole('dialog', { name: '노트 검색' })).toHaveCount(0);

  // Embedded sidebar collapse/expand and split toggle preserve draft
  const sidebarToggle = page.locator('.note-gui-tabs-controls button[aria-label="페이지 탐색"]').filter({ visible: true }).first();
  await sidebarToggle.click();
  expect(await body.evaluate((el, orig) => el === orig, originalBodyHandle)).toBe(true);
  await sidebarToggle.click();
  await page.getByRole('button', { name: '두 창으로', exact: true }).click();
  await expect(page.getByRole('button', { name: '한 창으로', exact: true })).toBeVisible();
  await expect(body).toContainText('실시간 테마 전환 중 보존되어야 할 미저장 텍스트.');
  await page.getByRole('button', { name: '한 창으로', exact: true }).click();

  // Live switch back to light + full without remount
  await page.evaluate(() => window.noteExample.mounted.setAppearance({ colorScheme: 'light', chrome: 'full' }));
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-mantine-color-scheme'))).toBe('light');
  await expect(page.locator('#notes header')).toHaveCount(1);
  expect(await body.evaluate((el, orig) => el === orig, originalBodyHandle)).toBe(true);
  await expect(body).toContainText('실시간 테마 전환 중 보존되어야 할 미저장 텍스트.');
  expect(await page.evaluate(() => window.noteExample.mounted.hasUnsavedChanges())).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('mantine-color-scheme-value'))).toBe('light');
});
