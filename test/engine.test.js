// Validates the engine against published data for St. Louis, September 2026
// (sunrise-sunset.org and geotimedate.org tables), plus the shared-window logic.
const test = require('node:test');
const assert = require('node:assert');
const A = require('../engine/astro.js');
const C = require('../engine/cities.js');
const W = require('../engine/windows.js');
const M = require('../engine/messages.js');
const P = require('../engine/parse.js');

const STL = { lat: 38.627, lon: -90.199 };
const minutesBetween = (a, b) => Math.abs(a - b) / 60000;
const cdt = (iso) => new Date(iso + '-05:00');

test('Harvest Moon full-moon time matches published 11:50 AM CDT, Sep 26 2026', () => {
  const full = A.nextFullMoon(new Date('2026-09-20T00:00:00Z'));
  assert.ok(minutesBetween(full, cdt('2026-09-26T11:50:00')) < 5, full.toISOString());
});

test('St. Louis moonrise/moonset within 3 minutes of published tables', () => {
  const published = [
    ['set', '2026-09-20T00:23:00'], ['rise', '2026-09-20T15:59:00'],
    ['set', '2026-09-24T04:35:00'], ['rise', '2026-09-24T17:54:00'],
    ['set', '2026-09-25T05:40:00'], ['rise', '2026-09-25T18:17:00']
  ];
  const events = A.moonRiseSet(STL.lat, STL.lon, new Date('2026-09-20T04:00:00Z'), new Date('2026-09-26T06:00:00Z'));
  for (const [type, iso] of published) {
    const target = cdt(iso);
    const match = events.find((e) => e.type === type && minutesBetween(e.date, target) < 60);
    assert.ok(match, `no ${type} near ${iso}`);
    assert.ok(minutesBetween(match.date, target) <= 3, `${type} ${iso}: got ${match.date.toISOString()}`);
  }
});

test('Moon transit altitude on Sep 20 matches published 26 degrees, due south', () => {
  const o = A.observe(A.positionsAt(cdt('2026-09-20T20:39:00')), STL.lat, STL.lon);
  assert.ok(Math.abs(o.moon.alt - 26) < 0.6, String(o.moon.alt));
  assert.ok(Math.abs(o.moon.az - 180) < 2, String(o.moon.az));
});

test('Illumination matches published 64.8% on Sep 20', () => {
  const k = A.positionsAt(cdt('2026-09-20T05:09:00')).illumination;
  assert.ok(Math.abs(k - 0.648) < 0.01, String(k));
});

test('St. Louis and Shanghai share the Moon around St. Louis dawn on Sunday Sep 27', () => {
  const fam = [C.person('Ethan', 'st-louis'), C.person('Mom', 'shanghai')];
  const ws = W.findSharedWindows(fam, { start: new Date('2026-09-26T17:45:00Z'), hours: 24, requireAwake: false });
  assert.ok(ws.length >= 1);
  const w = ws[0];
  const startLocal = W.localMinutes(w.start, 'America/Chicago');
  assert.ok(startLocal > 4 * 60 && startLocal < 6 * 60, 'starts ' + w.people[0].startLocal);
  assert.ok(w.durationMin > 60 && w.durationMin < 180, String(w.durationMin));
  assert.strictEqual(w.people[0].rising, false, 'setting in St. Louis');
  assert.strictEqual(w.people[1].rising, true, 'rising in Shanghai');
});

test('every city has a valid time zone and sane coordinates', () => {
  for (const c of C.list) {
    assert.doesNotThrow(() => new Intl.DateTimeFormat('en-US', { timeZone: c.tz }), c.name);
    assert.ok(Math.abs(c.lat) <= 90 && Math.abs(c.lon) <= 180, c.name);
  }
});

test('parser understands a typical group-chat sentence', () => {
  const r = P.parseFamily("I'm at WashU, Mom's in Shanghai and prefers Chinese, my brother's in Toronto").people;
  assert.deepStrictEqual(r.map((p) => [p.self, p.name, p.city.name, p.lang]), [
    [true, null, 'St. Louis', null], [false, 'Mom', 'Shanghai', 'zh'], [false, 'Brother', 'Toronto', null]
  ]);
  assert.strictEqual(P.parseFamily('妈妈在上海，我在St. Louis').people.length, 2);
});

test('messages exist for every language and never leave template gaps', () => {
  const you = C.person('Ethan', 'st-louis');
  for (const code of Object.keys(M.LANGS)) {
    const p = C.person('Test', 'shanghai', { lang: code });
    const line = M.personLine(p, W.describe(p, new Date('2026-09-27T11:00:00Z')), [you]);
    assert.ok(line.length > 20 && !/undefined|NaN/.test(line), code + ': ' + line);
  }
});
