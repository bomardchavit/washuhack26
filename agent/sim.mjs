#!/usr/bin/env node
// Same Moon: terminal simulator of a family group chat. No accounts, no network needed.
//   node agent/sim.mjs            interactive
//   node agent/sim.mjs --demo     scripted Harvest Moon story (great as a demo fallback)
// In interactive mode:  type as Ethan by default;  "@mom 我在上海" speaks as Mom;
//   "photo @mom" sends a photo as Mom ("photo @mom ~/moon.heic" sends a real one; with two real photos
//   the postcard image is saved to agent/data/postcard.jpg);  "clock 2026-09-27T11:05Z" moves time.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import './env.mjs';
import { createBrain } from './brain.mjs';
import { createLLM } from './llm.mjs';
import { composePostcard } from './postcard.mjs';

const demo = process.argv.includes('--demo');
const offline = process.argv.includes('--offline') || demo;
const brain = createBrain({ useNetwork: !offline, llm: offline ? null : createLLM() });
const SPACE = 'family-chat';
let clock = demo ? new Date('2026-09-26T18:00:00Z') : new Date();
const names = { ethan: 'Ethan' };

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const moon = (s) => `\x1b[33m${s}\x1b[0m`;
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.heic': 'image/heic', '.heif': 'image/heif', '.webp': 'image/webp' };

async function print(actions) {
  for (const a of actions) {
    if (a.type === 'send') console.log(moon('Same Moon') + ': ' + a.text.replace(/\n/g, '\n           ') + '\n');
    if (a.type === 'react') console.log(dim(`  (Same Moon reacted ${a.emoji})`));
    if (a.type === 'poll') console.log(dim(`  (poll: ${a.title}: ${a.options.join(' | ')})`));
    if (a.type === 'postcard') {
      const card = await composePostcard(a.shots);
      if (!card) { console.log(dim('  (postcard image skipped: npm install first)')); continue; }
      const out = fileURLToPath(new URL('data/postcard.jpg', import.meta.url));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, card.buffer);
      console.log(dim(`  (Same Moon sent the postcard image, saved to ${out})`));
    }
  }
}

async function say(line) {
  let sender = 'ethan', text = line.trim();
  const at = text.match(/^@(\w+)\s+(.*)$/);
  if (at) { sender = at[1].toLowerCase(); text = at[2]; }
  names[sender] = names[sender] || sender[0].toUpperCase() + sender.slice(1);
  const ph = text.match(/^photo(?:\s+@(\w+))?(?:\s+(.+))?$/i);
  if (ph) {
    const who = (ph[1] || sender).toLowerCase();
    const file = ph[2] && ph[2].trim().replace(/^['"]|['"]$/g, '').replace(/^~(?=\/)/, os.homedir());
    let attachment = { name: 'moon.jpg' };
    if (file) {
      if (!fs.existsSync(file)) return console.log(dim(`(no file at ${file})`));
      attachment = { name: path.basename(file), mimeType: MIME[path.extname(file).toLowerCase()] || 'image/jpeg', read: () => fs.promises.readFile(file) };
    }
    console.log(dim(`${names[who] || who} sent a photo 📷${file ? ' ' + path.basename(file) : ''}`));
    return print(await brain.handle({ spaceId: SPACE, senderId: who, senderName: names[who], attachment, at: clock }));
  }
  const c = text.match(/^clock\s+(\S+)$/i);
  if (c) { clock = new Date(c[1]); console.log(dim(`clock -> ${clock.toISOString()}`)); return print(brain.tick(clock)); }
  if (/^tick$/i.test(text)) return print(brain.tick(clock));
  console.log(dim(`${names[sender]}: ${text}`));
  print(await brain.handle({ spaceId: SPACE, senderId: sender, senderName: names[sender], text, at: clock }));
}

if (demo) {
  const script = [
    'hi',
    "I'm at WashU, Mom's in Shanghai and prefers Chinese, Jia's in Toronto",
    '1',
    'clock 2026-09-27T11:02:00Z',
    '@mom 我在上海',
    'photo @mom',
    'photo @ethan',
    'status'
  ];
  for (const line of script) await say(line);
} else {
  console.log(dim('Same Moon chat simulator. You are Ethan. "@mom text" speaks as Mom, "photo @mom", "clock <ISO time>", Ctrl+C to quit.\n'));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
  rl.prompt();
  rl.on('line', async (line) => { if (line.trim()) await say(line); rl.prompt(); });
}
