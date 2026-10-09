import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist', 'site');
await mkdir(output, { recursive: true });
// Only public site assets go to Pages. Never copy credentials, dependencies or tools.
const directories = new Set(['assets', 'css', 'js', 'ejercicio', 'elsalvador2026', 'iceland2026', 'irlanda2026', 'italia2025', 'nyc2026', 'suiza2025']);
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isDirectory() ? directories.has(entry.name) : /\.(html|png|pdf)$/i.test(entry.name) || ['.nojekyll', '_routes.json'].includes(entry.name)) {
    await cp(path.join(root, entry.name), path.join(output, entry.name), { recursive: true });
  }
}
console.log('Public site built in dist/site');
