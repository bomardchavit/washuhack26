// Same Moon: the conversation brain. Platform-agnostic: it takes chat events and returns
// actions ({type:'send'|'react', spaceId, text}). photon.mjs delivers them over iMessage;
// sim.mjs prints them in a terminal so the whole flow works offline.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const astro = require('../engine/astro.js');
const Cities = require('../engine/cities.js');
const W = require('../engine/windows.js');
const M = require('../engine/messages.js');
const Parse = require('../engine/parse.js');
const Online = require('../engine/online.js');

export const INTRO = [
  "Hi, I'm Same Moon 🌕",
  "I find the moments when everyone in this chat can see the same Moon, and at that moment I tell each of you exactly where to look, in your own language.",
  "",
  'Tell me where everyone is, like:',
  '"I\'m at WashU, Mom\'s in Shanghai and prefers Chinese, Jia\'s in Toronto."',
  '',
  "I only keep city names, and I only message around shared Moons (a few times a month). Say \"stop\" anytime."
].join('\n');

export const HELP = [
  'Things you can say:',
  '"when": find the next shared Moons',
  '"1", "2", "3": pick one and I\'ll message everyone at that moment',
  '"sim": preview the moment right now',
  '"status": who\'s here and what\'s scheduled',
  '"call me Ethan", "night owl", "remove Jia", "stop", "start"'
].join('\n');

// iMessage gives us a sender's handle but not their name, so the person who sets things up
// starts as "You" until they say "call me Ethan".
const UNNAMED = 'You';

export function memoryStore() {
  let data = {};
  return { load: () => data, save: (d) => { data = d; } };
}

function toPerson(m) {
  return { name: m.name, city: m.city, cityKey: m.cityKey, lat: m.lat, lon: m.lon, tz: m.tz, lang: m.lang || 'en', nightOwl: !!m.nightOwl };
}

export function createBrain(opts = {}) {
  const store = opts.store || memoryStore();
  const llm = opts.llm || null;
  const useNetwork = opts.useNetwork !== false;
  const searchHours = opts.searchHours || 72;
  const rehearsal = !!opts.rehearsal; // clock moved forward for a rehearsal: label every moment as a simulation
  const families = store.load() || {};
  const liveWindows = {}; // spaceId -> last computed windows (not persisted)
  const photos = {}; // spaceId -> { name -> attachment } for the postcard; kept in memory only, never saved
  const pendingPhotos = {}; // spaceId -> a photo whose sender we're still asking about

  const save = () => store.save(families);
  const send = (spaceId, text) => ({ type: 'send', spaceId, text });

  function family(spaceId) {
    if (!families[spaceId]) {
      families[spaceId] = { members: [], scheduled: null, active: null, shots: [], paused: false, postcardSent: false };
    }
    return families[spaceId];
  }

  const people = (f) => f.members.map(toPerson);
  const bySender = (f, id) => (id ? f.members.find((m) => m.id === id) : null) || null;
  const byName = (f, name) => f.members.find((m) => m.name.toLowerCase() === String(name).toLowerCase()) || null;

  function placeFields(city) {
    return { city: city.name, cityKey: city.key || null, lat: city.lat, lon: city.lon, tz: city.tz };
  }

  function upsert(f, entry, evt) {
    let m = null;
    if (entry.self) {
      m = bySender(f, evt.senderId);
      if (!m) {
        // Someone else may have added this person already ("Mom's in Shanghai"); bind them now.
        m = f.members.find((x) => !x.id && x.city === entry.city.name) || null;
        if (m) m.id = evt.senderId;
      }
      if (!m) {
        m = { id: evt.senderId || null, name: evt.senderName || UNNAMED, lang: 'en', nightOwl: false };
        f.members.push(m);
      }
    } else {
      m = entry.name ? byName(f, entry.name) : null;
      if (!m) {
        m = { id: null, name: entry.name || 'Someone', lang: 'en', nightOwl: false };
        f.members.push(m);
      }
    }
    Object.assign(m, placeFields(entry.city));
    if (entry.lang) m.lang = entry.lang;
    return m;
  }

  async function resolveUnknown(clauses) {
    const found = [];
    if (!useNetwork) return found;
    for (const clause of clauses) {
      const m = clause.match(/^(.*?)(?:\s+is|\s+lives|['’]s)?\s+(?:in|at|from)\s+(.+)$/i);
      if (!m) continue;
      const city = await Online.geocode(m[2].trim());
      if (!city) continue;
      const self = /\b(i'?m|i am|i live|me)\b/i.test(m[1]);
      const nameMatch = m[1].match(/([A-Z][\p{L}'-]*)\s*$/u);
      found.push({ self, name: self ? null : (nameMatch ? nameMatch[1] : null), city, lang: null });
    }
    return found;
  }

  async function llmEntries(text) {
    if (!llm) return [];
    const raw = await llm.parsePeople(text).catch(() => []);
    const out = [];
    for (const p of raw) {
      let city = Cities.find(p.place || '');
      if (!city && useNetwork && p.place) city = await Online.geocode(p.place);
      if (city) out.push({ self: !!p.self, name: p.self ? null : p.name, city, lang: p.language || null });
    }
    return out;
  }

  async function computeWindows(f, spaceId, at) {
    const ppl = people(f);
    let cloudAt = null;
    if (useNetwork) {
      const lookups = await Promise.all(ppl.map((p) => Online.cloudCover(p.lat, p.lon)));
      cloudAt = (j, date) => lookups[j](date);
    }
    const start = new Date(Math.floor(at.getTime() / 300000) * 300000); // 5-minute grid: "6:05 AM", not "6:03 AM"
    const windows = W.findSharedWindows(ppl, { start, hours: searchHours, cloudAt });
    liveWindows[spaceId] = windows;
    return windows;
  }

  function roster(f) {
    return f.members.map((m) => {
      const lang = m.lang && m.lang !== 'en' ? ' (' + M.LANGS[m.lang].label + ')' : '';
      return m.name + ' in ' + m.city + lang;
    }).join('; ');
  }

  function momentFor(f, at, endAt, simulated) {
    return M.momentMessage(people(f), at, endAt, { simulated });
  }

  function viewLine(person, date) {
    const v = W.describe(person, date);
    const L = M.LANGS.en;
    return { v, dir: L.dirs[M.directionIndex(v.moonAz)], motion: v.rising ? 'rising' : 'setting' };
  }

  // Everything the AI is allowed to say about the sky, computed by the engine.
  function factsFor(f, spaceId, at) {
    const pos = astro.positionsAt(at);
    const next = astro.nextFullMoon(at);
    return {
      now: at.toISOString(),
      moonPhase: astro.phaseName(pos), illuminatedPercent: Math.round(pos.illumination * 100),
      nextFullMoonUTC: next && next.toISOString(),
      people: people(f).map((p) => {
        const v = W.describe(p, at, pos);
        return { name: p.name, city: p.city, localTime: v.localDayTime, moonUp: v.moonAlt > 0,
          moonAltitudeDeg: Math.round(v.moonAlt), moonDirection: M.LANGS.en.dirs[M.directionIndex(v.moonAz)],
          moonIs: v.rising ? 'rising' : 'setting', sunUp: v.sunAlt > 0 };
      }),
      upcomingSharedMoons: (liveWindows[spaceId] || []).slice(0, 3).map((w) => w.people.map((p) => ({
        name: p.person.name, from: p.startLocal, to: p.endLocal })))
    };
  }

  async function onPhoto(f, evt, at) {
    const spaceId = evt.spaceId;
    let m = bySender(f, evt.senderId);
    if (!m) {
      const unbound = f.members.filter((x) => !x.id);
      if (unbound.length === 1) { m = unbound[0]; m.id = evt.senderId; }
    }
    if (!m) {
      const unbound = f.members.filter((x) => !x.id);
      if (unbound.length > 1) {
        f.pendingPhoto = { senderId: evt.senderId, at: at.toISOString() }; save();
        pendingPhotos[spaceId] = evt.attachment;
        return [send(spaceId, 'Beautiful. Who took this, ' + M.listJoin(unbound.map((x) => x.name)).replace(/ and ([^ ]+)$/, ' or $1') + '? Just reply with your name.')];
      }
      return [send(spaceId, 'Beautiful. Who took this? Reply "I\'m in <your city>" so I can add you.')];
    }
    const when = f.active && f.active.simulated ? new Date(f.active.start) : at;
    const person = toPerson(m);
    const { v, motion } = viewLine(person, when);
    f.shots = (f.shots || []).filter((s) => s.name !== m.name);
    f.shots.push({ name: m.name, date: when.toISOString(), rising: v.rising });
    if (evt.attachment && typeof evt.attachment.read === 'function') (photos[spaceId] = photos[spaceId] || {})[m.name] = evt.attachment;

    const others = f.members.filter((x) => x !== m);
    const waiting = others.find((x) => !f.shots.some((s) => s.name === x.name)) || others[0];
    let text = '📷 ' + m.name + "'s Moon, " + motion + ' over ' + m.city + ' at ' + W.formatTime(when, m.tz) + '.';
    if (waiting) {
      const o = viewLine(toPerson(waiting), when);
      if (o.v.moonAlt > 0) {
        text += ' ' + waiting.name + ", that's the same Moon " + o.motion + ' in your ' + o.dir + ' right now.';
      }
    }
    const actions = [{ type: 'react', spaceId, emoji: '❤️' }, send(spaceId, text)];
    const shooters = new Set(f.shots.map((s) => s.name));
    if (shooters.size >= 2 && !f.postcardSent) {
      const shots = f.shots.filter((s) => byName(f, s.name))
        .map((s) => ({ person: toPerson(byName(f, s.name)), date: new Date(s.date), rising: s.rising, photo: (photos[spaceId] || {})[s.name] }));
      // The image goes first when we have both photos; the caption always follows, so the text survives if the image can't be made.
      const pair = shots.slice(0, 2);
      if (pair.length === 2 && pair.every((s) => s.photo)) actions.push({ type: 'postcard', spaceId, shots: pair });
      actions.push(send(spaceId, M.postcardCaption(shots)));
      f.postcardSent = true;
      delete photos[spaceId];
    }
    save();
    return actions;
  }

  async function handle(evt) {
    const at = evt.at || new Date();
    const spaceId = evt.spaceId;
    const f = family(spaceId);
    if (evt.attachment) return onPhoto(f, evt, at);

    const text = String(evt.text || '').trim();
    const lower = text.toLowerCase();
    if (!text) return [];

    if (/^\/?(hi|hello|hey|start|help|\?)$/i.test(lower) || (/^\/?start$/.test(lower))) {
      if (lower.includes('start') && f.paused) { f.paused = false; save(); return [send(spaceId, "I'm back on. Say \"when\" to find the next shared Moon.")]; }
      return [send(spaceId, f.members.length ? HELP : INTRO)];
    }
    if (/^\/?stop$/.test(lower)) { f.paused = true; save(); return [send(spaceId, 'Okay, I\'ll stay quiet. Say "start" to turn me back on.')]; }
    if (/^\/?reset$/.test(lower)) { delete families[spaceId]; save(); return [send(spaceId, 'Cleared. ' + INTRO)]; }

    if (f.pendingPhoto && f.pendingPhoto.senderId === evt.senderId) {
      const who = byName(f, text.replace(/^(it'?s|i'?m|this is)\s+/i, '').replace(/[.!]$/, ''));
      if (who && !who.id) {
        who.id = evt.senderId;
        const pending = f.pendingPhoto; delete f.pendingPhoto;
        const attachment = pendingPhotos[spaceId] || true; delete pendingPhotos[spaceId];
        return onPhoto(f, Object.assign({}, evt, { attachment }), new Date(pending.at));
      }
    }

    let mm;
    if ((mm = text.match(/^(?:call me|my name is|my name's)\s+(.+)$/i))) {
      const me = bySender(f, evt.senderId);
      if (!me) return [send(spaceId, 'Tell me your city first, like "I\'m in St. Louis".')];
      const oldName = me.name;
      me.name = mm[1].trim().replace(/[.!]$/, ''); save();
      (liveWindows[spaceId] || []).forEach((w) => w.people.forEach((p) => { if (p.person.name === oldName) p.person.name = me.name; }));
      return [send(spaceId, 'Nice to meet you, ' + me.name + '.')];
    }
    if ((mm = text.match(/^remove\s+(.+)$/i))) {
      const target = byName(f, mm[1].trim());
      if (!target) return [send(spaceId, "I don't have anyone called " + mm[1].trim() + '.')];
      f.members = f.members.filter((x) => x !== target); save();
      delete liveWindows[spaceId]; // those times included them
      return [send(spaceId, 'Removed ' + target.name + '. ' + (f.members.length ? 'Now: ' + roster(f) + '. Say "when" for new times.' : ''))];
    }
    if (/night owl/i.test(lower)) {
      const target = f.members.find((x) => lower.includes(x.name.toLowerCase())) || bySender(f, evt.senderId);
      if (!target) return [send(spaceId, 'Tell me your city first, like "I\'m in St. Louis".')];
      target.nightOwl = true; save();
      const windows = await computeWindows(f, spaceId, at);
      return [send(spaceId, 'Got it, ' + target.name + " doesn't mind late nights.\n\n" + M.windowsText(windows))];
    }
    if (/^\/?(status|who)\b/.test(lower)) {
      const now = f.scheduled && f.scheduled.sent && !f.scheduled.closed;
      const sched = now
        ? '\nHappening now, until ' + W.formatTime(new Date(f.scheduled.end), f.members[0].tz) + ' (' + f.members[0].city + ' time).'
        : f.scheduled && !f.scheduled.closed
        ? '\nNext shared Moon: ' + f.members.map((m) => m.name + ' ' + W.formatDayTime(new Date(f.scheduled.start), m.tz)).join('; ') + '.'
        : '\nNothing scheduled yet. Say "when".';
      return [send(spaceId, (f.members.length ? 'Here: ' + roster(f) + '.' : 'Nobody yet.') + sched)];
    }
    if (/^\/?(when|moon|next|find|plan)\b/.test(lower)) {
      if (f.members.length < 2) return [send(spaceId, 'I need at least two people. ' + INTRO.split('\n').slice(3, 5).join('\n'))];
      const windows = await computeWindows(f, spaceId, at);
      return [send(spaceId, M.windowsText(windows))];
    }
    if (/^[1-3]$/.test(lower) && liveWindows[spaceId] && liveWindows[spaceId][+lower - 1]) {
      const w = liveWindows[spaceId][+lower - 1];
      f.scheduled = { start: w.start.toISOString(), end: w.end.toISOString(), peak: w.peak.toISOString(), sent: false, closed: false };
      f.shots = []; f.postcardSent = false; delete photos[spaceId]; save();
      const when = w.people.map((p) => p.person.name + ' at ' + p.startLocal).join('; ');
      return [send(spaceId, 'Locked in 🌕 I\'ll message everyone right when it starts: ' + when + '.\n' + M.physicsLine(w) + '\n\n(Say "sim" to preview that moment now.)')];
    }
    if (/^\/?(sim|simulate|preview)\b/.test(lower)) {
      if (f.members.length < 2) return [send(spaceId, 'Add at least two people first.')];
      let start, end;
      if (f.scheduled && !f.scheduled.closed) { start = new Date(f.scheduled.start); end = new Date(f.scheduled.end); }
      else {
        const windows = liveWindows[spaceId] || await computeWindows(f, spaceId, at);
        if (!windows.length) return [send(spaceId, 'No shared Moon in the next few days to preview.')];
        start = windows[0].start; end = windows[0].end;
      }
      f.active = { start: start.toISOString(), end: end.toISOString(), simulated: true };
      f.shots = []; f.postcardSent = false; delete photos[spaceId]; save();
      return [send(spaceId, momentFor(f, start, end, true))];
    }
    if (/\b(cloudy|clouds|raining|busy|can'?t|cannot|missed|working)\b/.test(lower) && (f.active || f.scheduled)) {
      const windows = await computeWindows(f, spaceId, new Date(at.getTime() + 60 * 60000));
      return [send(spaceId, "No problem, the Moon comes back. " + M.windowsText(windows, 2))];
    }

    // Otherwise, try to learn who is where.
    const parsed = Parse.parseFamily(text);
    let entries = parsed.people;
    if (!entries.length) entries = entries.concat(await resolveUnknown(parsed.unknownPlaces));
    if (!entries.length) entries = await llmEntries(text);
    if (!entries.length) {
      if (llm && f.members.length) {
        try { return [send(spaceId, await llm.answer(text, factsFor(f, spaceId, at)))]; } catch (e) { /* fall through */ }
      }
      return [send(spaceId, f.members.length ? "I didn't catch that. " + HELP : INTRO)];
    }
    const before = roster(f);
    const boundBefore = f.members.filter((x) => x.id).length;
    entries.forEach((e) => upsert(f, e, evt));
    save();
    if (roster(f) === before) {
      const me = bySender(f, evt.senderId);
      const bound = f.members.filter((x) => x.id).length > boundBefore;
      return [send(spaceId, bound && me ? 'Welcome, ' + me.name + ". You're all set." : 'I already have that: ' + roster(f) + '.')];
    }
    const out = ['Got it: ' + roster(f) + '.'];
    const me = bySender(f, evt.senderId);
    if (me && me.name === UNNAMED) out.push('What should I call you? Say "call me" and your name.');
    if (f.members.length >= 2) {
      const windows = await computeWindows(f, spaceId, at);
      out.push('\n' + M.windowsText(windows));
    } else {
      out.push('Who else? Tell me where they are.');
    }
    return [send(spaceId, out.join('\n'))];
  }

  function tick(at = new Date()) {
    const actions = [];
    for (const [spaceId, f] of Object.entries(families)) {
      if (f.paused) continue;
      const s = f.scheduled;
      if (s && !s.sent && at >= new Date(s.start)) {
        s.sent = true;
        f.active = { start: s.start, end: s.end, simulated: false };
        f.shots = []; f.postcardSent = false; delete photos[spaceId];
        actions.push(send(spaceId, momentFor(f, at, new Date(s.end), rehearsal)));
      } else if (s && s.sent && !s.closed && at >= new Date(new Date(s.end).getTime() + 10 * 60000)) {
        s.closed = true; f.active = null;
        const next = astro.nextFullMoon(at);
        const lead = f.members[0];
        if (!f.postcardSent) {
          actions.push(send(spaceId, 'The Moon has moved on for now. Next full Moon: ' +
            (next && lead ? W.formatDate(next, lead.tz) : 'in a few weeks') + '. Say "when" to plan another.'));
        }
      }
    }
    if (actions.length) save();
    return actions;
  }

  return { handle, tick, families };
}
