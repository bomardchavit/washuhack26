// The real postcard image: two photos composed with the web demo's drawing code.
// Skipped until `npm install` has fetched @napi-rs/canvas.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { composePostcard, isHeic } from '../agent/postcard.mjs';

const require = createRequire(import.meta.url);
const C = require('../engine/cities.js');
let canvas = null;
try { canvas = await import('@napi-rs/canvas'); } catch { /* not installed */ }
const skip = !canvas && 'run npm install first';

/** A stand-in photo: a flat colour, so we can find it again on the postcard. */
export function fakePhoto(color, width = 900, height = 1200) {
  const c = canvas.createCanvas(width, height), ctx = c.getContext('2d');
  ctx.fillStyle = color; ctx.fillRect(0, 0, width, height);
  return c.toBuffer('image/jpeg', 92);
}
const asAttachment = (bytes, name, mimeType) => ({ name, mimeType, read: async () => bytes });
const at = new Date('2026-09-27T11:02:00Z');
const shots = (a, b) => [
  { person: C.person('Mom', 'shanghai', { lang: 'zh' }), date: at, photo: a },
  { person: C.person('Ethan', 'st-louis'), date: at, photo: b }
];

async function pixel(jpeg, x, y) {
  const img = await canvas.loadImage(jpeg);
  const c = canvas.createCanvas(img.width, img.height), ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return { width: img.width, height: img.height, rgb: Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3)) };
}
const near = (rgb, target) => rgb.every((v, i) => Math.abs(v - target[i]) < 30);

test('postcard: two photos side by side, 1200x760 JPEG', { skip }, async () => {
  const card = await composePostcard(shots(
    asAttachment(fakePhoto('#c0392b'), 'mom.jpg', 'image/jpeg'),
    asAttachment(fakePhoto('#2e86c1'), 'ethan.jpg', 'image/jpeg')));
  assert.strictEqual(card.mimeType, 'image/jpeg');
  assert.deepStrictEqual([...card.buffer.subarray(0, 2)], [0xff, 0xd8]);
  const left = await pixel(card.buffer, 48 + 270, 48 + 235), right = await pixel(card.buffer, 612 + 270, 48 + 235);
  assert.deepStrictEqual([left.width, left.height], [1200, 760]);
  assert.ok(near(left.rgb, [0xc0, 0x39, 0x2b]), 'Mom on the left: ' + left.rgb);
  assert.ok(near(right.rgb, [0x2e, 0x86, 0xc1]), 'Ethan on the right: ' + right.rgb);
});

test('postcard: iPhone HEIC photos are converted', { skip: skip || (process.platform !== 'darwin' && 'needs macOS sips') }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'same-moon-heic-'));
  fs.writeFileSync(path.join(dir, 'in.jpg'), fakePhoto('#c0392b'));
  execFileSync('sips', ['-s', 'format', 'heic', path.join(dir, 'in.jpg'), '--out', path.join(dir, 'IMG_0001.HEIC')]);
  const heic = fs.readFileSync(path.join(dir, 'IMG_0001.HEIC'));
  assert.ok(isHeic(heic, 'application/octet-stream', 'photo'), 'detected from the bytes alone');
  const card = await composePostcard(shots(asAttachment(heic, 'IMG_0001.HEIC', 'image/heic'), asAttachment(fakePhoto('#2e86c1'), 'b.jpg', 'image/jpeg')));
  assert.ok(near((await pixel(card.buffer, 48 + 270, 48 + 235)).rgb, [0xc0, 0x39, 0x2b]));
});

test('postcard: a photo that cannot be read becomes that person\'s sky, not an error', { skip }, async () => {
  const card = await composePostcard(shots(asAttachment(Buffer.from('not an image'), 'x.jpg', 'image/jpeg'), asAttachment(fakePhoto('#2e86c1'), 'b.jpg', 'image/jpeg')));
  const { rgb } = await pixel(card.buffer, 48 + 270, 48 + 235);
  assert.ok(!near(rgb, [0xc0, 0x39, 0x2b]) && card.buffer.length > 10000);
});

test('isHeic: by type, by name, by bytes', () => {
  assert.ok(isHeic(Buffer.alloc(0), 'image/heic', 'a'));
  assert.ok(isHeic(Buffer.alloc(0), '', 'IMG_1.HEIC'));
  assert.ok(isHeic(Buffer.from('\0\0\0\x18ftypheic\0\0\0\0', 'latin1'), '', 'photo'));
  assert.ok(!isHeic(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 'image/jpeg', 'a.jpg'));
});
