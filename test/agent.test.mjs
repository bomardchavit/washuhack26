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
