import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = resolve(root, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.zip': 'application/zip' };
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const file = path === '/' || path === '/example/' ? resolve(root, 'examples/independent.html')
      : path.startsWith('/note-gui/') ? resolve(dist, path.slice('/note-gui/'.length)) : undefined;
    if (!file || !(file.startsWith(dist + sep) || file === resolve(root, 'examples/independent.html'))) { response.writeHead(404).end(); return; }
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
server.listen(Number(process.env.NOTE_GUI_EXAMPLE_PORT || 18139), '127.0.0.1', () => console.log('Independent host ready.'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
