import { closeSync, mkdirSync, openSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

mkdirSync('.tmp', { recursive: true });
const log = openSync('.tmp/native-drawio-build.log', 'w');
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.library.config.ts', '--outDir', '.tmp/native-drawio-dist'], {
  env: { ...process.env, NOTE_GUI_DRAWIO_ORIGIN: 'https://127.0.0.1:18143', NOTE_GUI_ASSET_BASE: '/native-note-gui/' },
  stdio: ['ignore', log, log],
});
closeSync(log);
if (result.error) throw result.error;
if (result.status !== 0) throw new Error('Native diagram fixture build failed; read .tmp/native-drawio-build.log.');
