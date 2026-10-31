import { cp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = join(root, '.tmp/package-consumer');
const packageRoot = join(fixture, 'node_modules/@knowledge-engine/note-gui');
await rm(fixture, { recursive: true, force: true });
await mkdir(packageRoot, { recursive: true });
for (const path of ['dist', 'package.json', 'LICENSE', 'NOTICE']) await cp(join(root, path), join(packageRoot, path), { recursive: true });
await symlink(join(root, 'node_modules/@tiptap'), join(fixture, 'node_modules/@tiptap'), process.platform === 'win32' ? 'junction' : 'dir');
await writeFile(join(fixture, 'package.json'), JSON.stringify({ name: 'note-gui-clean-consumer', private: true, type: 'module' }));
await cp(join(root, 'scripts/fixtures/package-consumer.ts'), join(fixture, 'consumer.ts'));
await writeFile(join(fixture, 'tsconfig.json'), JSON.stringify({
  compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', lib: ['ES2022', 'DOM', 'DOM.Iterable'], strict: true, noEmit: true, skipLibCheck: false, esModuleInterop: true, types: [] },
  include: ['consumer.ts'],
}));
await writeFile(join(fixture, 'resolve.mjs'), `import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
for (const [specifier, target] of ${JSON.stringify([['@knowledge-engine/note-gui', '/dist/note-gui.js'], ['@knowledge-engine/note-gui/kms', '/dist/kms.js'], ['@knowledge-engine/note-gui/style.css', '/dist/note-gui.css']])}) {
  const path = fileURLToPath(import.meta.resolve(specifier));
  assert.equal(path, ${JSON.stringify(packageRoot)} + target);
  assert.ok(existsSync(path));
  console.log(specifier + ' -> ' + path);
}
`);
const compile = spawnSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.json'], { cwd: fixture, encoding: 'utf8' });
await writeFile(join(root, '.tmp/package-consumer-types.log'), (compile.stdout ?? '') + (compile.stderr ?? ''));
if (compile.error) throw compile.error;
if (compile.status !== 0) throw new Error('Clean package consumer type-check failed; read .tmp/package-consumer-types.log.');
const resolve = spawnSync(process.execPath, ['resolve.mjs'], { cwd: fixture, encoding: 'utf8' });
await writeFile(join(root, '.tmp/package-consumer-resolution.log'), (resolve.stdout ?? '') + (resolve.stderr ?? ''));
if (resolve.error) throw resolve.error;
if (resolve.status !== 0) throw new Error('Clean package consumer export resolution failed; read .tmp/package-consumer-resolution.log.');
console.log('Clean package-name consumer passed strict declaration checking (skipLibCheck=false) and root/KMS/CSS export-map resolution.');
