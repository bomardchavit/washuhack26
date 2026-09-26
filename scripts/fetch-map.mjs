// Download the world outline once so the map works on flaky venue Wi-Fi.
import fs from 'node:fs';
const url = 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json';
const res = await fetch(url);
if (!res.ok) throw new Error('Download failed: ' + res.status);
fs.writeFileSync(new URL('../web/land-110m.json', import.meta.url), await res.text());
console.log('Saved web/land-110m.json');
