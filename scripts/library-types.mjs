import { cp, readFile, rm, writeFile } from 'node:fs/promises';
await cp('.tmp/types', 'dist/types', { recursive: true });
await rm('.tmp/types', { recursive: true });
const entryTypesPath = 'dist/types/index.d.ts';
const entryTypes = await readFile(entryTypesPath, 'utf8');
const cleaned = entryTypes.replace(/^import\s+['"][^'"]+\.css['"];?\r?\n/gm, '');
await writeFile(entryTypesPath, cleaned, 'utf8');
