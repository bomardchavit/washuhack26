#!/usr/bin/env node
// Same Moon: terminal simulator of a family group chat. No accounts, no network needed.
//   node agent/sim.mjs            interactive
//   node agent/sim.mjs --demo     scripted Harvest Moon story (great as a demo fallback)
// In interactive mode:  type as Ethan by default;  "@mom 我在上海" speaks as Mom;
//   "photo @mom" sends a photo as Mom;  "clock 2026-09-27T11:05Z" moves time and runs the scheduler.
import readline from 'node:readline';
import './env.mjs';
import { createBrain } from './brain.mjs';
import { createLLM } from './llm.mjs';

const demo = process.argv.includes('--demo');
const offline = process.argv.includes('--offline') || demo;
const brain = createBrain({ useNetwork: !offline, llm: offline ? null : createLLM() });
const SPACE = 'family-chat';
let clock = demo ? new Date('2026-09-26T18:00:00Z') : new Date();
const names = { ethan: 'Ethan' };

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const moon = (s) => `\x1b[33m${s}\x1b[0m`;
function print(actions) {
  for (const a of actions) {
    if (a.type === 'send') console.log(moon('Same Moon') + ': ' + a.text.replace(/\n/g, '\n           ') + '\n');
    if (a.type === 'react') console.log(dim(`  (Same Moon reacted ${a.emoji})`));
  }
}

async function say(line) {
  let sender = 'ethan', text = line.trim();
  const at = text.match(/^@(\w+)\s+(.*)$/);
  if (at) { sender = at[1].toLowerCase(); text = at[2]; }
  names[sender] = names[sender] || sender[0].toUpperCase() + sender.slice(1);
  if (/^photo(\s+@(\w+))?$/i.test(text) || /^photo$/i.test(line.trim())) {
    const who = (line.match(/@(\w+)/) || [null, sender])[1].toLowerCase();
    console.log(dim(`${names[who] || who} sent a photo 📷`));
    return print(await brain.handle({ spaceId: SPACE, senderId: who, senderName: names[who], attachment: { name: 'moon.jpg' }, at: clock }));
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
