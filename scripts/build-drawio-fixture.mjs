import { mkdirSync, openSync, closeSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

mkdirSync('.tmp', { recursive: true });
const log = openSync('.tmp/drawio-fixture-build.log', 'w');
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.library.config.ts', '--outDir', '.tmp/drawio-dist'], {
  env: { ...process.env, NOTE_GUI_DRAWIO_ORIGIN: 'https://drawio.example.test', NOTE_GUI_ASSET_BASE: '/drawio-note-gui/' },
  stdio: ['ignore', log, log],
});
closeSync(log);
if (result.error) throw result.error;
if (result.status !== 0) throw new Error('Configured diagram fixture build failed; read .tmp/drawio-fixture-build.log.');
console.log('Configured diagram test bundle built under .tmp/drawio-dist.');
