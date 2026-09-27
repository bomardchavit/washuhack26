// Drives agent/photon.mjs end to end through the real spectrum-ts terminal provider, with
// test/fake-tuichat.mjs standing in for the tuichat binary so several family members can talk
// and send photos. Skipped until `npm install` has fetched spectrum-ts.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const hasSpectrum = fs.existsSync(path.join(root, 'node_modules', 'spectrum-ts'));
const ETHAN = '+13145550100', MOM = '+8613800138000';

/** Run the agent against a script; resolves to the transcript (one entry per line). */
export function runAgent(script, { clock = '2026-09-26T18:00:00Z', env = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'same-moon-'));
  const files = { script: path.join(dir, 'script.json'), out: path.join(dir, 'out.jsonl'), store: path.join(dir, 'store.json') };
  fs.writeFileSync(files.script, JSON.stringify(script));
  fs.writeFileSync(files.out, '');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'agent', 'photon.mjs')], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env, SAME_MOON_TERMINAL: '1', SAME_MOON_OFFLINE: '1', SAME_MOON_CLOCK: clock,
        SAME_MOON_STORE: files.store, TUICHAT_BINARY: path.join(root, 'test', 'fake-tuichat.mjs'),
        FAKE_TUI_SCRIPT: files.script, FAKE_TUI_OUT: files.out, ANTHROPIC_API_KEY: '', ...env
      }
    });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('agent timed out\n' + stderr)); }, 30000);
    child.on('exit', (code) => {
      clearTimeout(timer);
      const lines = fs.readFileSync(files.out, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
      const store = fs.existsSync(files.store) ? fs.readFileSync(files.store, 'utf8') : '';
      if (code !== 0) return reject(new Error('agent exited ' + code + '\n' + stderr));
      resolve({ lines, store, dir });
    });
  });
}

const said = (lines) => lines.filter((l) => l.from === 'agent' && l.text).map((l) => l.text);

test('photon.mjs: setup, naming, schedule, preview, photos and postcard over the Spectrum terminal provider', { skip: !hasSpectrum && 'run npm install first' }, async () => {
  const photo = path.join(os.tmpdir(), 'same-moon-test-photo.jpg');
  fs.writeFileSync(photo, Buffer.from('not really a jpeg'));
  const { lines, store } = await runAgent([
    { as: ETHAN, text: "I'm at WashU, Mom's in Shanghai and prefers Chinese, Jia's in Toronto" },
    { as: ETHAN, text: 'call me Ethan' },
    { as: ETHAN, text: '1' },
    { as: ETHAN, text: 'sim' },
    { as: MOM, text: '我在上海' },
    { as: MOM, photo },
    { as: ETHAN, photo }
  ]);
  const texts = said(lines);
  assert.match(texts[0], /Got it: You in St\. Louis; Mom in Shanghai \(中文\); Jia in Toronto\./);
  assert.match(texts[0], /What should I call you\?/);
  assert.match(texts[0], /1\) You Sun 6:00 AM/);
  assert.ok(texts.includes('Nice to meet you, Ethan.'));
  assert.ok(texts.some((t) => /^Locked in 🌕 .*Ethan at Sun 6:00 AM/.test(t)), 'locked in with the new name');
  assert.ok(texts.some((t) => /^\[Simulation\] 🌕 Look up, everyone/.test(t) && /现在往东方看/.test(t)));
  assert.ok(texts.some((t) => /^Welcome, Mom\./.test(t)));
  assert.ok(texts.some((t) => /^📷 Mom's Moon, rising over Shanghai/.test(t)));
  assert.ok(texts.some((t) => /11,600 km apart\. One Moon\./.test(t)), 'postcard caption');

  // Reactions land on the photo that was just sent, not on some other message.
  const photos = lines.filter((l) => l.photo).map((l) => l.id);
  const reacted = lines.filter((l) => l.react).map((l) => l.to);
  assert.deepStrictEqual(reacted, photos);

  // Only anonymous ids reach the store, never phone numbers.
  assert.ok(store.length > 0 && !store.includes(ETHAN) && !store.includes(MOM));
});
