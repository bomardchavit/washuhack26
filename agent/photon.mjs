#!/usr/bin/env node
// Same Moon over iMessage, via Photon Spectrum (https://photon.codes/spectrum).
//
//   npm install
//   cp .env.example .env                    # PHOTON_PROJECT_ID, PHOTON_PROJECT_SECRET, optional ANTHROPIC_API_KEY
//   npm run agent                           # iMessage
//   SAME_MOON_TERMINAL=1 npm run agent      # Photon's terminal chat (tuichat), no credentials needed
//   SAME_MOON_CLOCK=2026-09-27T10:59:00Z    # rehearsal: start the clock there; moments are labeled [Simulation]
//
// Checked against the spectrum-ts 12.10 type definitions (node_modules/@spectrum-ts/core):
//   app.messages yields [space, message]; space.id; message.sender?.id (users carry no display name);
//   message.content is {type:'text', text} | {type:'attachment', name, mimeType, read()} |
//   {type:'poll_option', option:{title}, selected} | reactions, typing, ...;
//   app.send(space, content) takes a string or a builder; space.responding(fn) shows the typing indicator;
//   message.react(emoji); <provider>(app).space.get(id) rebuilds a Space after a restart.
// If the SDK changes shape, only this file needs updating; the brain is platform-agnostic.
import './env.mjs';
import { fileURLToPath } from 'node:url';
import { Spectrum, attachment, poll } from 'spectrum-ts';
import { createBrain } from './brain.mjs';
import { toEvent } from './events.mjs';
import { createLLM } from './llm.mjs';
import { composePostcard } from './postcard.mjs';
import { fileStore } from './store.mjs';

const projectId = process.env.PHOTON_PROJECT_ID || process.env.PROJECT_ID;
const projectSecret = process.env.PHOTON_PROJECT_SECRET || process.env.PROJECT_SECRET;
const useTerminal = process.env.SAME_MOON_TERMINAL === '1' || !projectId || !projectSecret;

const clockOffset = process.env.SAME_MOON_CLOCK ? Date.parse(process.env.SAME_MOON_CLOCK) - Date.now() : 0;
if (Number.isNaN(clockOffset)) throw new Error('SAME_MOON_CLOCK must be an ISO time, like 2026-09-27T10:59:00Z');
const now = () => new Date(Date.now() + clockOffset);

const provider = useTerminal
  ? (await import('spectrum-ts/providers/terminal')).terminal
  : (await import('spectrum-ts/providers/imessage')).imessage;
const app = await Spectrum({
  ...(useTerminal ? {} : { projectId, projectSecret }),
  providers: [provider.config()],
  options: { flattenGroups: true } // a photo sent together with text arrives as separate messages
});

// Terminal runs get their own store so rehearsals never touch a real family's schedule.
const storeFile = process.env.SAME_MOON_STORE ||
  fileURLToPath(new URL(useTerminal ? 'data/families-terminal.json' : 'data/families.json', import.meta.url));
const llm = createLLM();
const brain = createBrain({
  store: fileStore(storeFile), llm, rehearsal: clockOffset !== 0,
  useNetwork: process.env.SAME_MOON_OFFLINE !== '1' // offline: built-in cities only, no cloud forecast
});
const spaces = new Map(); // spaceId -> Space, so the scheduler can post later
const noPolls = new Set(); // spaces where the platform skipped a poll (the terminal has none); the text list covers it

console.log(`Same Moon is listening on ${useTerminal ? 'the terminal' : 'iMessage'}` +
  (llm ? ` with ${llm.model}` : ' (no ANTHROPIC_API_KEY: rules only)') +
  (clockOffset ? `. Rehearsal clock: ${now().toISOString()}` : '') + '.');

async function spaceFor(spaceId) {
  let space = spaces.get(spaceId);
  if (!space) {
    space = await provider(app).space.get(spaceId); // e.g. a moment scheduled before a restart
    spaces.set(spaceId, space);
  }
  return space;
}

async function sendPostcard(space, shots) {
  const card = await composePostcard(shots);
  if (card) await app.send(space, attachment(card.buffer, { name: card.name, mimeType: card.mimeType }));
}

async function deliver(actions, inbound) {
  for (const a of actions) {
    try {
      const space = await spaceFor(a.spaceId);
      if (a.type === 'send') await app.send(space, a.text);
      else if (a.type === 'react' && inbound) await inbound.react(a.emoji);
      else if (a.type === 'poll' && !noPolls.has(a.spaceId)) {
        if (!(await app.send(space, poll(a.title, a.options)))) noPolls.add(a.spaceId);
      }
      else if (a.type === 'postcard') await sendPostcard(space, a.shots); // the text caption follows as its own action
    } catch (err) {
      console.error(`Could not ${a.type}:`, err && err.message || err);
    }
  }
}

// Scheduler: fire each moment when the Moon is up for everyone.
const timer = setInterval(() => {
  deliver(brain.tick(now())).catch((err) => console.error('tick failed:', err));
}, 20_000);

async function stop() {
  clearInterval(timer);
  await app.stop().catch(() => {});
}
process.once('SIGINT', () => stop().then(() => process.exit(0)));
process.once('SIGTERM', () => stop().then(() => process.exit(0)));

for await (const [space, message] of app.messages) {
  if (message.direction === 'outbound' || (message.sender && message.sender.kind === 'agent')) continue;
  spaces.set(space.id, space);
  const evt = toEvent(space.id, message, now());
  if (!evt) continue;
  try {
    await space.responding(async () => deliver(await brain.handle(evt), message));
  } catch (err) {
    console.error('handle failed:', err);
  }
}
await stop();
