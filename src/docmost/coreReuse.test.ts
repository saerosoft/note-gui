import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const upstream = 'apps/client/src/';
const required = [
  ['application shell', 'components/layouts/global/global-app-shell.tsx'],
  ['application header', 'components/layouts/global/app-header.tsx'],
  ['space navigation', 'features/space/components/sidebar/space-sidebar.tsx'],
  ['space switcher', 'features/space/components/sidebar/switch-space.tsx'],
  ['search control', 'features/search/components/search-control.tsx'],
  ['native theme', 'theme.ts'],
  ['native shell styling', 'components/layouts/global/app-shell.module.css'],
  ['native accessibility styles', 'styles/a11y-overrides.css'],
  ['page renderer', 'pages/page/page.tsx'],
  ['page layout', 'features/editor/full-editor.tsx'],
  ['title', 'features/editor/title-editor.tsx'],
  ['editor', 'features/editor/page-editor.tsx'],
  ['toolbar', 'features/editor/components/fixed-toolbar/fixed-toolbar.tsx'],
  ['slash menu', 'features/editor/components/slash-menu/command-list.tsx'],
  ['table menu', 'features/editor/components/table/table-menu.tsx'],
  ['code block', 'features/editor/components/code-block/code-block-view.tsx'],
  ['link menu', 'features/editor/components/link/link-menu.tsx'],
  ['file', 'features/editor/components/attachment/attachment-view.tsx'],
  ['image', 'features/editor/components/image/image-view.tsx'],
  ['tree', 'features/page/tree/components/doc-tree.tsx'],
  ['tree drag and drop', 'features/page/tree/components/doc-tree-row.tsx'],
  ['comments', 'features/comment/components/comment-list-with-tabs.tsx'],
  ['comment editor', 'features/comment/components/comment-editor.tsx'],
  ['history', 'features/page-history/components/history-editor.tsx'],
  ['history list', 'features/page-history/components/history-list.tsx'],
  ['Draw.io', 'features/editor/components/drawio/drawio-view.tsx'],
  ['Excalidraw', 'features/editor/components/excalidraw/excalidraw-view.tsx'],
  ['Mermaid', 'features/editor/components/code-block/mermaid-view.tsx'],
] as const;
interface SourceEntry { source: string; destination: string; upstreamSha256: string; changes: string[] }
interface Manifest { commit: string; files: SourceEntry[] }
const manifest: Manifest = JSON.parse(readFileSync(resolve(root, 'upstream-manifest.json'), 'utf8'));

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\/|(?<![:\\])\/\/[^\n]*/g, '');
}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

function resolveLocalModule(specifier: string, fromPath: string, paths: Record<string, string[]>): string | null {
  let candidateBase: string | null = null;
  if (specifier.startsWith('.')) {
    candidateBase = resolve(dirname(fromPath), specifier);
  } else {
    for (const [pattern, targets] of Object.entries(paths)) {
      const prefix = pattern.replace(/\*$/, '');
      if (pattern.endsWith('*') && specifier.startsWith(prefix) && targets[0]) {
        candidateBase = resolve(root, targets[0].replace(/\*$/, '') + specifier.slice(prefix.length));
        break;
      }
    }
  }
  if (!candidateBase) return null;
  if (isFile(candidateBase)) return candidateBase;
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
  for (const ext of extensions) {
    if (isFile(candidateBase + ext)) return candidateBase + ext;
  }
  for (const ext of extensions) {
    if (isFile(resolve(candidateBase, 'index' + ext))) return resolve(candidateBase, 'index' + ext);
  }
  return null;
}

function isNamedTypeOnly(clause: string): boolean {
  const match = /^\{\s*([\s\S]*?)\s*\}$/.exec(clause.trim());
  if (!match) return false;
  const parts = match[1].split(',').map(part => part.trim()).filter(Boolean);
  return parts.length > 0 && parts.every(part => /^type\s+/.test(part));
}

function runtimeGraph() {
  const tsconfig = JSON.parse(readFileSync(resolve(root, 'tsconfig.json'), 'utf8')) as {
    compilerOptions?: { paths?: Record<string, string[]> };
  };
  const paths = tsconfig.compilerOptions?.paths ?? {};
  const files = new Set<string>();
  const imports = new Set<string>();
  const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

  function visit(path: string) {
    if (files.has(path)) return;
    files.add(path);
    const dot = path.lastIndexOf('.');
    if (dot < 0 || !sourceExtensions.has(path.slice(dot)) || path.endsWith('.d.ts')) return;
    const text = stripComments(readFileSync(path, 'utf8'));

    function dependency(specifier: string) {
      imports.add(specifier);
      const found = resolveLocalModule(specifier, path, paths);
      if (found && !found.endsWith('.d.ts')) visit(found);
    }

    const importFromRe = /\bimport\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
    for (const m of text.matchAll(importFromRe)) {
      if (m[1]) continue;
      if (isNamedTypeOnly(m[2])) continue;
      dependency(m[3]);
    }
    const sideEffectImportRe = /(?:^|[;\n])\s*import\s+['"]([^'"]+)['"]/g;
    for (const m of text.matchAll(sideEffectImportRe)) dependency(m[1]);

    const exportFromRe = /\bexport\s+(type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[\s\S]*?\})\s+from\s+['"]([^'"]+)['"]/g;
    for (const m of text.matchAll(exportFromRe)) {
      if (m[1]) continue;
      dependency(m[2]);
    }
    const dynamicImportRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    for (const m of text.matchAll(dynamicImportRe)) dependency(m[1]);
  }
  visit(resolve(root, 'src/main.tsx'));
  return { files, imports };
}

describe('the selected Docmost client is actual runtime source', () => {
  const graph = runtimeGraph();

  it.each(required)('uses the pinned upstream %s UI in the application import graph', (_area, source) => {
    expect(manifest.commit).toBe('9b3e5dd3dc21588fa20c02c5b8646d2f46ee73af');
    const retained = manifest.files.find(file => file.source === upstream + source);
    expect(retained, `The actual upstream UI must be retained: ${source}`).toBeDefined();
    if (!retained) return;
    expect(retained.upstreamSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(graph.files.has(resolve(root, retained.destination)), `Copied but unused UI does not satisfy reuse: ${retained.destination}`).toBe(true);
  });

  it('excludes Enterprise, upstream server and browser body persistence from production imports', () => {
    const forbidden = /(?:^|\/)(?:ee|server)(?:\/|$)|^@hocuspocus\/|^y(?:js|\-indexeddb|\-prosemirror)$|^@tiptap\/extension-collaboration(?:-caret)?$|^socket\.io-client$/;
    expect([...graph.imports].filter(path => forbidden.test(path))).toEqual([]);
    expect([...graph.files].map(path => relative(root, path)).filter(path => /(?:^|\/)ee\/|apps\/server\/|\.\.\/frontend\//.test(path))).toEqual([]);
    const dependencies: { dependencies: Record<string, string> } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    expect(Object.keys(dependencies.dependencies).filter(name => forbidden.test(name))).toEqual([]);
  });
});
