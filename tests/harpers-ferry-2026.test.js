import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const read = relative => readFile(fileURLToPath(new URL('../' + relative, import.meta.url)), 'utf8');

test('Harpers Ferry booking ticket preserves confirmed October 31 / November 1 Hertz schedule', async () => {
  const page = await read('harpersferry2026/index.html');
  assert.match(page, /datetime="2026-10-31T08:00">8:00 a\. m\./);
  assert.match(page, /datetime="2026-11-01T19:00">7:00 p\. m\./);
  assert.match(page, /Compact SUV/);
  assert.doesNotMatch(page, /L738E634411|devoluci[oó]n reservada es a las 3:30/i);
});

test('Sunday hike includes authorized Visitor Center parking, Lock 34 shuttle, and no outdated trail detour', async () => {
  const page = await read('harpersferry2026/index.html');
  const sunday = page.split('<section id="domingo"')[1].split('<section id="navegacion">')[0];
  assert.match(sunday, /Maryland Heights Overlook/);
  assert.match(sunday, /171 Shoreline Drive/);
  assert.match(sunday, /Lock 34/);
  assert.match(sunday, /www\.nps\.gov\/choh\/planyourvisit\/byron-bridge\.htm/);
  assert.match(sunday, /Bolivar Heights permanece como alternativa/);
  assert.match(sunday, /ruta corta al mirador|Ruta corta al mirador/);
  assert.equal([...sunday.matchAll(/id="dom-\d{3}"/g)].length, 10);
});

test('JARVIS has nine Saturday and ten Sunday stops, with road geometry limited to drives', async () => {
  const script = await read('harpersferry2026/js/jarvis.js');
  assert.doesNotThrow(() => new Function(script));
  const match = script.match(/const days=(\[[\s\S]*?\]);\nconst \$=id=>/);
  assert.ok(match);
  const [saturday, sunday] = JSON.parse(match[1]);
  assert.equal(saturday.length, 9);
  assert.equal(sunday.length, 10);
  assert.match(saturday[0].desc, /8:00 a\. m\./);
  assert.match(sunday.at(-1).desc, /7:00 p\. m\./);
  assert.match(sunday[4].desc, /no en la cima/);
  assert.match(script, /const groups=d===1\?\[\[1,2\],\[6,8\]\]/);
  assert.match(script, /El shuttle y la caminata NO est[aá]n trazados/);
});
