#!/usr/bin/env node
// A scripted stand-in for Photon's tuichat binary (https://github.com/photon-hq/tuichat, PROTOCOL.md),
// so tests can drive agent/photon.mjs through the real spectrum-ts terminal provider with several
// family members and real photo bytes. The provider spawns it via TUICHAT_BINARY.
//   FAKE_TUI_SCRIPT  JSON: [{ as, text } | { as, photo, mimeType } | { wait }]
//   FAKE_TUI_OUT     where to write the transcript (JSON lines)
//   FAKE_TUI_SAVE    optional folder to save attachments the agent sends
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const [host, port] = process.argv[process.argv.indexOf('--connect') + 1].split(':');
const script = JSON.parse(fs.readFileSync(process.env.FAKE_TUI_SCRIPT, 'utf8'));
const out = process.env.FAKE_TUI_OUT;
const SPACE = 'family';
let seq = 0;
const id = () => 'm' + (++seq);
const log = (entry) => fs.appendFileSync(out, JSON.stringify(entry) + '\n');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const socket = net.connect(+port, host);
function write(msg) {
  const body = Buffer.from(JSON.stringify(msg), 'utf8');
  socket.write(Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`), body]));
}
const notify = (method, params) => write({ jsonrpc: '2.0', method, params });

let buf = Buffer.alloc(0), initialized;
const ready = new Promise((r) => { initialized = r; });
socket.on('data', (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  for (;;) {
    const end = buf.indexOf('\r\n\r\n');
    if (end < 0) return;
    const len = +/content-length:\s*(\d+)/i.exec(buf.subarray(0, end).toString())[1];
    if (buf.length < end + 4 + len) return;
    const msg = JSON.parse(buf.subarray(end + 4, end + 4 + len).toString('utf8'));
    buf = buf.subarray(end + 4 + len);
    handle(msg);
  }
});

function handle(msg) {
  const reply = (result) => write({ jsonrpc: '2.0', id: msg.id, result });
  const p = msg.params || {};
  switch (msg.method) {
    case 'initialize': reply({ protocolVersion: '1', serverInfo: { name: 'tuichat', version: 'fake' } }); initialized(); break;
    case 'send': case 'replyToMessage': {
      const c = p.content;
      const mid = id();
      log(c.type === 'attachment'
        ? { from: 'agent', id: mid, attachment: { name: c.name, mimeType: c.mimeType, bytes: c.bytes ? Buffer.from(c.bytes, 'base64').length : 0 } }
        : { from: 'agent', id: mid, text: c.text });
      if (c.type === 'attachment' && c.bytes && process.env.FAKE_TUI_SAVE) {
        fs.writeFileSync(path.join(process.env.FAKE_TUI_SAVE, c.name), Buffer.from(c.bytes, 'base64'));
      }
      reply({ id: mid, timestamp: new Date().toISOString() });
      break;
    }
    case 'reactToMessage': log({ from: 'agent', react: p.reaction, to: p.messageId }); reply(null); break;
    case 'startTyping': case 'stopTyping': case 'ensureSpace': reply(null); break;
    case 'shutdown': reply(null); setTimeout(() => process.exit(0), 50); break;
    default:
      if (msg.id !== undefined) write({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'unknown method ' + msg.method } });
      else if (msg.method === 'log') log({ log: p.level, text: p.text });
  }
}

await ready;
for (const step of script) {
  if (step.wait) { await wait(step.wait); continue; }
  const mid = id();
  let content;
  if (step.text !== undefined) content = { type: 'text', text: step.text };
  else if (step.photo) {
    const bytes = fs.readFileSync(step.photo);
    content = { type: 'attachment', name: path.basename(step.photo), mimeType: step.mimeType || 'image/jpeg', size: bytes.length, bytes: bytes.toString('base64') };
  }
  log({ from: step.as, id: mid, ...(step.text !== undefined ? { text: step.text } : { photo: path.basename(step.photo) }) });
  notify('message', { id: mid, spaceId: SPACE, senderId: step.as, content, timestamp: new Date().toISOString() });
  await wait(step.gap ?? 150);
}
notify('streamEnd', null);
setTimeout(() => process.exit(0), 30000).unref();
