import { access, cp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { generateTrips } from './generate-trips.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist', 'site');
await mkdir(output, { recursive: true });
// Only public site assets go to Pages. Never copy credentials, dependencies or tools.
const directories = new Set(['assets', 'css', 'js', 'assistant', 'eliminados', 'ejercicio', 'elsalvador2026', 'iceland2026', 'irlanda2026', 'italia2025', 'nyc2026', 'shenandoah2026', 'harpersferry2026', 'suiza2025']);
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
await generateTrips(root, output);
await cp(path.join(root, 'templates', 'trip.html'), path.join(output, 'trip-shell.html'));
// Templates are optional reader assets. Copy only runtime files; a missing bundle
// leaves the always-available basic reader and the chat operational.
const templateDirectory=path.join(root,'templates','halloween');
const templateOutput=path.resolve(output,'templates','halloween');
if(path.dirname(templateOutput)!==path.resolve(output,'templates') || !templateOutput.startsWith(path.resolve(output)+path.sep)) throw Error('Invalid template output boundary');
await rm(templateOutput,{recursive:true,force:true});
try {
  const files=await readdir(templateDirectory);
  await mkdir(templateOutput,{recursive:true});
  for(const file of files) if(['index.js','theme.css','tickets.css','moments.css'].includes(file)) await cp(path.join(templateDirectory,file),path.join(templateOutput,file));
} catch(error) {if(error.code!=='ENOENT') throw error;}
// Every page shares the same floating chat; its styles stay isolated in Shadow DOM.
async function addChat(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await addChat(target);
    else if (entry.name.endsWith('.html') && target !== path.join(output, 'assistant', 'index.html')) {
      const html = await readFile(target, 'utf8');
      if (!html.includes('src="/js/assistant.js"')) await writeFile(target, html.replace(/<\/body>/i, '<script type="module" src="/js/assistant.js"></script></body>'));
    }
  }
}
await addChat(output);
// Fail the build if essential public files are omitted; Pages must not publish an empty shell.
const requiredFiles = [
  'index.html',
  'css/home.css',
  'js/home.js',
  'js/trip-library.js',
  'assistant/index.html',
  'css/assistant.css',
  'css/chat-widget.css',
  'css/roadbook.css',
  'js/assistant.js',
  'js/permissions-panel.js',
  'eliminados/index.html',
  'js/archive.js',
  'css/archive.css',
  'js/trip-view.js',
  'js/trip-presentation.js',
  'js/trip-contract.js',
  'js/roadbook.js',
  'trips/catalog.json',
  'trip-shell.html',
  'shenandoah2026/index.html',
  'shenandoah2026/css/autumn.css',
  'shenandoah2026/js/app.js',
  'shenandoah2026/js/jarvis.js',
  'harpersferry2026/index.html',
  'harpersferry2026/css/halloween.css',
  'harpersferry2026/css/moments.css',
  'harpersferry2026/css/tickets.css',
  'harpersferry2026/js/app.js',
  'harpersferry2026/js/jarvis.js'
];
for (const file of requiredFiles) {
  try {
    await access(path.join(output, file));
  } catch {
    throw new Error(`Missing required Pages asset: ${file}`);
  }
}
console.log('Public site built in dist/site; verified essential assets');
