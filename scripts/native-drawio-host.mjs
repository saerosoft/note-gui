import { createServer } from 'node:https';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = process.env.NOTE_GUI_DRAWIO_WEB_ROOT;
const certificate = process.env.NOTE_GUI_DRAWIO_CERT;
const key = process.env.NOTE_GUI_DRAWIO_KEY;
if (!root || !certificate || !key) throw new Error('Set NOTE_GUI_DRAWIO_WEB_ROOT, NOTE_GUI_DRAWIO_CERT and NOTE_GUI_DRAWIO_KEY to the approved isolated native editor fixture.');
const web = resolve(root);
await readFile(resolve(web, 'index.html'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const server = createServer({ cert: await readFile(certificate), key: await readFile(key) }, async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'https://127.0.0.1:18143').pathname);
    const file = resolve(web, path === '/' ? 'index.html' : '.' + path);
    if (!file.startsWith(web + sep)) { response.writeHead(404).end(); return; }
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
server.listen(18143, '127.0.0.1', () => console.log('Approved native Draw.io fixture ready.'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
