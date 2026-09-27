// Same Moon: the postcard as a real image, made from the two photos sent during a moment.
// It uses the web demo's own drawing code (web/draw.js) and fonts, rendered with @napi-rs/canvas.
// iPhone photos are often HEIC, which the canvas can't decode, so macOS `sips` converts them first.
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const D = require('../web/draw.js');
const WIDTH = 1200, HEIGHT = 760; // same as the web postcard canvas

let lib; // @napi-rs/canvas, loaded on first use; null if it isn't installed
async function canvasLib() {
  if (lib === undefined) {
    try {
      lib = await import('@napi-rs/canvas');
      const fonts = fileURLToPath(new URL('fonts/', import.meta.url));
      lib.GlobalFonts.registerFromPath(path.join(fonts, 'CormorantGaramond-SemiBold.ttf'), 'Cormorant Garamond');
      lib.GlobalFonts.registerFromPath(path.join(fonts, 'Karla-Regular.ttf'), 'Karla');
    } catch {
      lib = null;
    }
  }
  return lib;
}

/** HEIC/HEIF by MIME type, file name, or the ISO-BMFF brand in the first bytes. */
export function isHeic(bytes, mimeType, name) {
  if (/hei[cf]/i.test(mimeType || '') || /\.hei[cf]$/i.test(name || '')) return true;
  return bytes.length > 12 && bytes.toString('latin1', 4, 8) === 'ftyp' &&
    /^(heic|heix|hevc|hevx|heim|heis|hevm|hevs|mif1|msf1)$/.test(bytes.toString('latin1', 8, 12));
}

async function heicToJpeg(bytes) {
  if (process.platform !== 'darwin') throw new Error('HEIC photos need macOS (sips) to convert');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'same-moon-'));
  try {
    const src = path.join(dir, 'photo.heic'), dst = path.join(dir, 'photo.jpg');
    await fs.writeFile(src, bytes);
    await promisify(execFile)('sips', ['-s', 'format', 'jpeg', src, '--out', dst]);
    return await fs.readFile(dst);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

/**
 * shots: [{ person, date, photo: { read(): Promise<Buffer>, mimeType, name } }] (the first two are used),
 * as in the brain's 'postcard' action. Resolves to { buffer, mimeType, name } for a JPEG, or null when
 * @napi-rs/canvas isn't installed. A photo that can't be decoded is replaced by that person's sky, as on the web.
 */
export async function composePostcard(shots) {
  const c = await canvasLib();
  if (!c) return null;
  const panels = [];
  for (const s of shots.slice(0, 2)) {
    let photo = null;
    try {
      const bytes = await s.photo.read();
      photo = await c.loadImage(isHeic(bytes, s.photo.mimeType, s.photo.name) ? await heicToJpeg(bytes) : bytes);
    } catch (err) {
      console.error(`postcard: couldn't read ${s.person.name}'s photo (${err.message}); painting their sky instead`);
    }
    panels.push({ person: s.person, date: s.date, photo });
  }
  const canvas = c.createCanvas(WIDTH, HEIGHT);
  D.postcard(canvas.getContext('2d'), WIDTH, HEIGHT, panels);
  return { buffer: await canvas.encode('jpeg', 90), mimeType: 'image/jpeg', name: 'same-moon-postcard.jpg' };
}
