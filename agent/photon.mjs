#!/usr/bin/env node
// Same Moon over iMessage, via Photon Spectrum (https://photon.codes).
//
//   npm install
//   PHOTON_PROJECT_ID=... PHOTON_PROJECT_SECRET=... ANTHROPIC_API_KEY=... npm run agent
//   SAME_MOON_TERMINAL=1 npm run agent     # Photon's terminal provider, no credentials needed
//
// API used (from Photon's docs): Spectrum({ projectId, projectSecret, providers }),
// `for await (const [space, message] of app.messages)`, space.send(string),
// space.responding(fn) for typing indicators, message.react(emoji).
// If the SDK changes shape, only this file needs updating; the brain is platform-agnostic.
import { Spectrum } from 'spectrum-ts';
import { createBrain } from './brain.mjs';
import { createLLM } from './llm.mjs';
import { fileStore } from './store.mjs';

const projectId = process.env.PHOTON_PROJECT_ID || process.env.PROJECT_ID;
const projectSecret = process.env.PHOTON_PROJECT_SECRET || process.env.PROJECT_SECRET;
const useTerminal = process.env.SAME_MOON_TERMINAL === '1' || !projectId;

const providers = [];
if (useTerminal) {
  const { terminal } = await import('spectrum-ts/providers/terminal');
  providers.push(terminal.config());
} else {
  const { imessage } = await import('spectrum-ts/providers/imessage');
  providers.push(imessage.config());
}

const app = await Spectrum(useTerminal ? { providers } : { projectId, projectSecret, providers });
const llm = createLLM();
const brain = createBrain({ store: fileStore(), llm });
const spaces = new Map();   // spaceId -> live Space, so the scheduler can post later
const lastMessage = new Map(); // spaceId -> last inbound message (for reactions)

console.log(`Same Moon is listening on ${useTerminal ? 'the terminal' : 'iMessage'}${llm ? ` with ${llm.model}` : ' (no ANTHROPIC_API_KEY: rules only)'}.`);

function spaceIdOf(space) {
  return String(space.id ?? space.spaceId ?? space.chatId ?? 'default');
}

async function deliver(actions) {
  for (const a of actions) {
    const space = spaces.get(a.spaceId);
    if (!space) continue;
    try {
      if (a.type === 'send') await space.send(a.text);
      if (a.type === 'react') {
        const msg = lastMessage.get(a.spaceId);
        if (msg && typeof msg.react === 'function') await msg.react(a.emoji);
      }
    } catch (err) {
      console.error('deliver failed:', err.message);
    }
  }
}

// Scheduler: fire moments exactly when the Moon is up for everyone.
setInterval(() => { deliver(brain.tick(new Date())).catch((e) => console.error(e)); }, 20_000);

for await (const [space, message] of app.messages) {
  const spaceId = spaceIdOf(space);
  spaces.set(spaceId, space);
  lastMessage.set(spaceId, message);
  const c = message.content || {};
  const evt = {
    spaceId,
    senderId: String(message.sender?.id ?? 'unknown'),
    senderName: message.sender?.name || message.sender?.displayName || undefined,
    at: new Date()
  };
  if (c.type === 'text') evt.text = c.text;
  else if (c.type === 'attachment' || c.type === 'image' || c.type === 'photo') evt.attachment = { name: c.name, mimeType: c.mimeType };
  else continue; // reactions, typing, etc.

  try {
    const actions = await brain.handle(evt);
    if (typeof space.responding === 'function') await space.responding(() => deliver(actions));
    else await deliver(actions);
  } catch (err) {
    console.error('handle failed:', err);
  }
}
