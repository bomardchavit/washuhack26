import test from 'node:test';
import assert from 'node:assert';
import { createBrain } from '../agent/brain.mjs';

test('full group-chat flow: setup, schedule, moment, photos, postcard', async () => {
  const b = createBrain({ useNetwork: false });
  const at = new Date('2026-09-26T18:00:00Z');
  let out = await b.handle({ spaceId: 'f', senderId: 'ethan', senderName: 'Ethan', text: "I'm at WashU, Mom's in Shanghai and prefers Chinese, Jia's in Toronto", at });
  assert.match(out[0].text, /Ethan in St\. Louis; Mom in Shanghai \(中文\); Jia in Toronto/);
  assert.match(out[0].text, /1\) Ethan Sun 6:00 AM/);
  out = await b.handle({ spaceId: 'f', senderId: 'ethan', text: '1', at });
  assert.match(out[0].text, /Locked in/);
  out = b.tick(new Date('2026-09-27T11:02:00Z'));
  assert.match(out[0].text, /现在往东方看/);
  assert.match(out[0].text, /Ethan, look toward the west/);
  out = await b.handle({ spaceId: 'f', senderId: 'mom', text: '我在上海', at: new Date('2026-09-27T11:03:00Z') });
  assert.match(out[0].text, /Welcome, Mom/);
  out = await b.handle({ spaceId: 'f', senderId: 'mom', attachment: {}, at: new Date('2026-09-27T11:04:00Z') });
  assert.match(out[1].text, /Mom's Moon, rising over Shanghai/);
  out = await b.handle({ spaceId: 'f', senderId: 'ethan', attachment: {}, at: new Date('2026-09-27T11:05:00Z') });
  assert.ok(out.some((a) => /11,600 km apart\. One Moon\./.test(a.text || '')));
});

test('postcard action: both photos, in order, before the caption; a photo survives "who took this?"', async () => {
  const b = createBrain({ useNetwork: false });
  const at = new Date('2026-09-26T18:00:00Z');
  const photo = (name) => ({ name, mimeType: 'image/jpeg', read: async () => Buffer.from(name) });
  await b.handle({ spaceId: 'f', senderId: 'ethan', senderName: 'Ethan', text: "I'm at WashU, Mom's in Shanghai, Jia's in Toronto", at });
  await b.handle({ spaceId: 'f', senderId: 'ethan', text: 'sim', at });
  // An unknown sender with two unbound people (Mom, Jia): we ask, then use the photo they already sent.
  let out = await b.handle({ spaceId: 'f', senderId: 'mom', attachment: photo('mom.jpg'), at });
  assert.match(out[0].text, /Who took this, Mom or Jia\?/);
  out = await b.handle({ spaceId: 'f', senderId: 'mom', text: 'Mom', at });
  assert.match(out[1].text, /Mom's Moon/);
  out = await b.handle({ spaceId: 'f', senderId: 'ethan', attachment: photo('ethan.jpg'), at });
  const card = out.findIndex((a) => a.type === 'postcard');
  const caption = out.findIndex((a) => /One Moon\./.test(a.text || ''));
  assert.ok(card >= 0 && card < caption);
  assert.deepStrictEqual(out[card].shots.map((s) => [s.person.name, s.photo.name]), [['Mom', 'mom.jpg'], ['Ethan', 'ethan.jpg']]);
});

test('no postcard image without real photo bytes (e.g. the offline demo): caption only', async () => {
  const b = createBrain({ useNetwork: false });
  const at = new Date('2026-09-26T18:00:00Z');
  await b.handle({ spaceId: 'f', senderId: 'ethan', senderName: 'Ethan', text: "I'm at WashU, Mom's in Shanghai", at });
  await b.handle({ spaceId: 'f', senderId: 'ethan', text: 'sim', at });
  await b.handle({ spaceId: 'f', senderId: 'mom', attachment: {}, at });
  const out = await b.handle({ spaceId: 'f', senderId: 'ethan', attachment: {}, at });
  assert.ok(!out.some((a) => a.type === 'postcard') && out.some((a) => /One Moon\./.test(a.text || '')));
});

test('Spectrum messages become brain events: text, photos (HEIC too), poll votes; ids are anonymous', async () => {
  const { toEvent, personId } = await import('../agent/events.mjs');
  const sender = { __platform: 'imessage', id: '+13145550100' };
  const text = toEvent('chat', { sender, content: { type: 'text', text: 'when' } });
  assert.strictEqual(text.text, 'when');
  assert.strictEqual(text.senderId, personId(sender));
  assert.ok(!/3145550100/.test(text.senderId));
  const heic = toEvent('chat', { sender, content: { type: 'attachment', name: 'IMG_0001.HEIC', mimeType: 'application/octet-stream', read: async () => Buffer.from('x') } });
  assert.strictEqual(heic.attachment.name, 'IMG_0001.HEIC');
  assert.deepStrictEqual(await heic.attachment.read(), Buffer.from('x'));
  assert.strictEqual(toEvent('chat', { sender, content: { type: 'attachment', name: 'notes.pdf', mimeType: 'application/pdf' } }), null);
  const vote = (title, selected) => toEvent('chat', { sender, content: { type: 'poll_option', option: { title }, selected, title } });
  assert.strictEqual(vote('2) Mon 6:00 AM St. Louis time, 2 hours', true).text, '2');
  assert.strictEqual(vote('2) Mon 6:00 AM St. Louis time, 2 hours', false), null); // un-vote
  assert.strictEqual(toEvent('chat', { sender, content: { type: 'reaction', emoji: '❤️' } }), null);
});

test('window choices also go out as a poll whose options map back to 1-3', async () => {
  const b = createBrain({ useNetwork: false });
  const out = await b.handle({ spaceId: 'f', senderId: 'ethan', senderName: 'Ethan', text: "I'm at WashU, Mom's in Shanghai", at: new Date('2026-09-26T18:00:00Z') });
  const poll = out.find((a) => a.type === 'poll');
  assert.strictEqual(poll.options.length, 3);
  assert.match(poll.options[0], /^1\) Sun 6:00 AM St\. Louis time, /);
  const { toEvent } = await import('../agent/events.mjs');
  const vote = toEvent('f', { sender: { id: 'x' }, content: { type: 'poll_option', option: { title: poll.options[1] }, selected: true } });
  assert.match((await b.handle(Object.assign(vote, { at: new Date('2026-09-26T18:01:00Z') })))[0].text, /^Locked in/);
});
