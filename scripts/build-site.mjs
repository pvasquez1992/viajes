import { access, cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist', 'site');
await mkdir(output, { recursive: true });
// Only public site assets go to Pages. Never copy credentials, dependencies or tools.
const directories = new Set(['assets', 'css', 'js', 'ejercicio', 'elsalvador2026', 'iceland2026', 'irlanda2026', 'italia2025', 'nyc2026', 'shenandoah2026', 'suiza2025']);
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isDirectory() ? directories.has(entry.name) : /\.(html|png|pdf)$/i.test(entry.name) || ['.nojekyll', '_routes.json'].includes(entry.name)) {
    await cp(path.join(root, entry.name), path.join(output, entry.name), { recursive: true });
  }
}
// Serve the pinned map library ourselves, without a runtime CDN dependency.
const leafletOutput = path.join(output, 'assets', 'leaflet');
await mkdir(leafletOutput, { recursive: true });
for (const file of ['leaflet.js', 'leaflet.css', 'images']) {
  await cp(path.join(root, 'node_modules', 'leaflet', 'dist', file), path.join(leafletOutput, file), { recursive: true });
}
await cp(path.join(root, 'node_modules', 'leaflet', 'LICENSE'), path.join(leafletOutput, 'LICENSE'));
// Fail the build if essential public files are omitted; Pages must not publish an empty shell.
const requiredFiles = [
  'index.html',
  'css/home.css',
  'js/home.js',
  'shenandoah2026/index.html',
  'shenandoah2026/css/autumn.css',
  'shenandoah2026/js/app.js',
  'shenandoah2026/js/jarvis.js'
];
for (const file of requiredFiles) {
  try {
    await access(path.join(output, file));
  } catch {
    throw new Error(`Missing required Pages asset: ${file}`);
  }
}
console.log('Public site built in dist/site; verified essential assets');
