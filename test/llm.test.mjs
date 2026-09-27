// The Claude layer with a mocked fetch: no API key, no network, no cost.
// Checks the request we send, how replies are read, and that the brain only passes on
// answers whose times and numbers came from the engine.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { createLLM } from '../agent/llm.mjs';
import { createBrain, grounded } from '../agent/brain.mjs';

const hasSdk = fs.existsSync(new URL('../node_modules/@anthropic-ai/sdk', import.meta.url));
const skip = !hasSdk && 'run npm install first';

/** A fake Messages API: reply(body) returns the assistant text (or {status, text, stop_reason}). */
function mockFetch(reply) {
  const calls = [];
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url: String(typeof url === 'string' ? url : url.url), method: init.method, headers: new Headers(init.headers), body });
    let r = reply(body);
    if (typeof r === 'string') r = { text: r };
    const payload = r.status && r.status >= 400
      ? { type: 'error', error: { type: 'invalid_request_error', message: 'bad request' } }
      : { id: 'msg_test', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: r.text }],
          stop_reason: r.stop_reason || 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 5 } };
    return new Response(JSON.stringify(payload), { status: r.status || 200, headers: { 'content-type': 'application/json' } });
  };
  return { fetch, calls };
}

test('no key, no LLM: everything runs on rules', () => {
  assert.strictEqual(createLLM({ apiKey: '' }), null);
});

test('parsePeople sends a proper Messages API request and reads JSON, even wrapped in prose or fences', { skip }, async () => {
  const m = mockFetch(() => 'Sure!\n```json\n{"people":[{"name":"Nana","self":false,"place":"Oaxaca","language":"es"}]}\n```');
  const llm = createLLM({ apiKey: 'test-key', fetch: m.fetch });
  const people = await llm.parsePeople("my nana's back home near Oaxaca, she only reads Spanish");
  assert.deepStrictEqual(people, [{ name: 'Nana', self: false, place: 'Oaxaca', language: 'es' }]);
  const [call] = m.calls;
  assert.strictEqual(call.url, 'https://api.anthropic.com/v1/messages');
  assert.strictEqual(call.method, 'POST');
  assert.strictEqual(call.headers.get('x-api-key'), 'test-key');
  assert.strictEqual(call.headers.get('anthropic-version'), '2023-06-01');
  assert.strictEqual(call.body.model, 'claude-haiku-4-5-20251001');
  assert.strictEqual(call.body.max_tokens, 400);
  assert.match(call.body.system, /Respond with ONLY JSON/);
  assert.deepStrictEqual(call.body.messages, [{ role: 'user', content: "my nana's back home near Oaxaca, she only reads Spanish" }]);
});

test('answer passes the engine facts and the question; model is configurable', { skip }, async () => {
  const m = mockFetch(() => 'Mom will see it rising in the east.');
  const llm = createLLM({ apiKey: 'k', model: 'claude-sonnet-5', fetch: m.fetch });
  assert.strictEqual(await llm.answer('where will Mom look?', { people: [{ name: 'Mom', moonDirection: 'east' }] }), 'Mom will see it rising in the east.');
  assert.strictEqual(m.calls[0].body.model, 'claude-sonnet-5');
  assert.match(m.calls[0].body.messages[0].content, /^FACTS:\n[\s\S]*"moonDirection": "east"[\s\S]*QUESTION: where will Mom look\?$/);
});

test('API errors and cut-off replies reject, so the brain can fall back to rules', { skip }, async () => {
  const bad = mockFetch(() => ({ status: 400 }));
  await assert.rejects(createLLM({ apiKey: 'k', fetch: bad.fetch }).parsePeople('x'));
  assert.strictEqual(bad.calls.length, 1, '4xx is not retried');
  const cut = mockFetch(() => ({ text: '{"people":[{"na', stop_reason: 'max_tokens' }));
  await assert.rejects(createLLM({ apiKey: 'k', fetch: cut.fetch }).parsePeople('x'), /max_tokens/);
});

test('grounded: times and numbers in an answer must come from the facts', () => {
  const facts = { people: [{ name: 'Ethan', localTime: 'Sun 6:00 AM', moonAltitudeDeg: 23 }], illuminatedPercent: 99,
    upcomingSharedMoons: [[{ name: 'Mom', from: 'Sun 7:00 PM', to: '7:45 PM' }]] };
  assert.ok(grounded('Mom can look at 7:00 PM, the Moon is 23° up and 99% lit.', facts));
  assert.ok(grounded('妈妈19:00可以看到月亮。', facts), '24-hour form of a known time');
  assert.ok(!grounded('It rises at 6:41 PM.', facts), 'invented time');
  assert.ok(!grounded('It is 40° up.', facts), 'invented angle');
  assert.ok(grounded('Say "when" and I will check.', facts));
});

test('brain + Claude (mocked): understands a sentence the rules miss, keeps only known languages, and never forwards invented numbers', { skip }, async () => {
  let answerText = '';
  const m = mockFetch((body) => {
    if (!/extract who is where/.test(body.system)) return answerText;
    return /Mexico/.test(body.messages[0].content) // like the real model: people only when the message places someone
      ? '{"people":[{"name":"Nana","self":false,"place":"Mexico City","language":"es"},{"name":"Opa","self":false,"place":"Mexico City","language":"de"}]}'
      : '{"people":[]}';
  });
  const b = createBrain({ useNetwork: false, llm: createLLM({ apiKey: 'k', fetch: m.fetch }) });
  const at = new Date('2026-09-26T18:00:00Z');
  await b.handle({ spaceId: 'f', senderId: 'ethan', senderName: 'Ethan', text: "I'm at WashU", at });
  let out = await b.handle({ spaceId: 'f', senderId: 'ethan', text: 'Nana and Opa live way out past the capital of Mexico', at });
  assert.match(out[0].text, /Nana in Mexico City \(Español\); Opa in Mexico City\./, 'unsupported "de" falls back to English');

  answerText = 'The next shared Moon starts for Ethan at 6:00 AM Sunday.';
  out = await b.handle({ spaceId: 'f', senderId: 'ethan', text: 'why not tonight?', at });
  assert.strictEqual(out[0].text, answerText);

  answerText = 'Look at 4:44 PM, it will be 37° up.';
  out = await b.handle({ spaceId: 'f', senderId: 'ethan', text: 'why not tonight?', at });
  assert.match(out[0].text, /^I didn't catch that\./, 'an answer with invented numbers is not sent');
});
