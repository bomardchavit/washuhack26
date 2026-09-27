/* Same Moon web demo. Plain JS, no build step: open web/index.html or serve the repo root. */
(function () {
  'use strict';
  var S = window.SameMoon, A = S.astro, C = S.cities, W = S.windows, M = S.messages, P = S.parse, O = S.online, D = S.draw;
  var drawMoon = D.drawMoon;
  var HOURS = 72, STEP = 10, STEPS = HOURS * 60 / STEP;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  var state = {
    people: [], start: roundDown(new Date(), STEP), track: null,
    windows: [], sleepyWindows: [], selected: 0, scrub: 0, photos: [null, null], land: null, playing: false
  };

  function roundDown(d, min) { var ms = min * 60000; return new Date(Math.floor(d.getTime() / ms) * ms); }
  function scrubTime() { return new Date(state.start.getTime() + state.scrub * STEP * 60000); }
  function smooth(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  /* ---------------- Family ---------------- */
  var DEMO = [['Ethan', 'st-louis', 'en'], ['Mom', 'shanghai', 'zh'], ['Jia', 'toronto', 'en']];
  var CITY_OPTIONS = C.list.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });

  function loadDemo() {
    state.people = DEMO.map(function (d) { return C.person(d[0], d[1], { lang: d[2] }); });
    state.photos = [null, null];
    refresh();
  }

  function renderPeople() {
    var ul = $('peopleList');
    ul.innerHTML = '';
    state.people.forEach(function (p, i) {
      var cityOpts = CITY_OPTIONS.map(function (c) {
        var o = el('option', { value: c.key, text: c.name + ', ' + c.country });
        if (c.key === p.cityKey) o.selected = true;
        return o;
      });
      if (!p.cityKey) cityOpts.unshift(el('option', { value: '', selected: 'selected', text: p.city }));
      var langOpts = Object.keys(M.LANGS).map(function (code) {
        var o = el('option', { value: code, text: M.LANGS[code].label });
        if (code === (p.lang || 'en')) o.selected = true;
        return o;
      });
      var owl = el('input', { type: 'checkbox' });
      owl.checked = !!p.nightOwl;
      ul.appendChild(el('li', {}, [
        el('input', { type: 'text', value: p.name, 'aria-label': 'Name', onchange: function (e) { p.name = e.target.value.trim() || 'Someone'; refresh(); } }),
        el('select', { 'aria-label': 'City for ' + p.name, onchange: function (e) {
          var c = C.byKey(e.target.value); if (c) { Object.assign(p, C.person(p.name, c, { lang: p.lang, nightOwl: p.nightOwl })); refresh(); }
        } }, cityOpts),
        el('select', { 'aria-label': 'Language for ' + p.name, onchange: function (e) { p.lang = e.target.value; refresh(); } }, langOpts),
        el('label', { class: 'owl' }, [owl, ' Night owl']),
        el('button', { type: 'button', class: 'remove', 'aria-label': 'Remove ' + p.name, text: 'Remove', onclick: function () { state.people.splice(i, 1); refresh(); } })
      ]));
      owl.addEventListener('change', function () { p.nightOwl = owl.checked; refresh(); });
    });
  }

  async function sayFamily(text) {
    var r = P.parseFamily(text), status = $('sayStatus');
    var entries = r.people.slice();
    for (var i = 0; i < r.unknownPlaces.length; i++) {
      var m = r.unknownPlaces[i].match(/^(.*?)(?:\s+is|\s+lives|['’]s)?\s+(?:in|at|from)\s+(.+)$/i);
      if (!m) continue;
      status.textContent = 'Looking up ' + m[2] + '…';
      var g = await O.geocode(m[2]);
      if (g) {
        var nm = m[1].match(/([A-Z][\p{L}'-]*)\s*$/u);
        entries.push({ self: /\b(i'?m|i am|i live|me)\b/i.test(m[1]), name: nm ? nm[1] : null, city: g, lang: null });
      }
    }
    if (!entries.length) {
      status.textContent = 'I couldn’t find a city in that. Try something like “Grandma is in Hanoi”.';
      return;
    }
    if (entries.some(function (e) { return e.self; })) state.people = [];
    entries.forEach(function (e) {
      var name = e.self ? 'You' : (e.name || 'Someone');
      var existing = state.people.find(function (p) { return p.name.toLowerCase() === name.toLowerCase(); });
      var fields = C.person(name, e.city, { lang: e.lang || (existing && existing.lang) || 'en' });
      if (existing) Object.assign(existing, fields); else state.people.push(fields);
    });
    status.textContent = 'Added ' + entries.map(function (e) { return (e.self ? 'you' : (e.name || 'someone')) + ' (' + e.city.name + ')'; }).join(', ') + '. Rename “You” in the list if you like.';
    state.photos = [null, null];
    refresh();
  }

  /* ---------------- Compute ---------------- */
  function compute() {
    var ppl = state.people;
    state.track = ppl.length ? W.track(ppl, state.start, HOURS, STEP) : null;
    state.windows = ppl.length >= 2 ? W.findSharedWindows(ppl, { start: state.start, hours: HOURS, stepMin: 5 }) : [];
    state.sleepyWindows = ppl.length >= 2 ? W.findSharedWindows(ppl, { start: state.start, hours: HOURS, stepMin: STEP, requireAwake: false }) : [];
    if (state.selected >= state.windows.length) state.selected = 0;
    focusSelected();
  }

  function focusSelected() {
    var w = state.windows[state.selected];
    var t = w ? w.start : new Date();
    state.scrub = Math.max(0, Math.min(STEPS, Math.round((t - state.start) / (STEP * 60000))));
    $('scrubber').value = state.scrub;
  }

  /* ---------------- Hero ---------------- */
  function renderHero() {
    var cv = $('moonCanvas'), ctx = cv.getContext('2d'), now = new Date(), pos = A.positionsAt(now);
    var lead = state.people[0], south = lead && lead.lat < 0;
    ctx.clearRect(0, 0, cv.width, cv.height);
    drawMoon(ctx, cv.width / 2, cv.height / 2, cv.width * 0.3, pos.illumination, pos.waxing, south);
    var tz = lead ? lead.tz : Intl.DateTimeFormat().resolvedOptions().timeZone;
    var full = A.nextFullMoon(new Date(now.getTime() - 3 * 86400000));
    var caption = 'Right now: ' + A.phaseName(pos) + ', ' + Math.round(pos.illumination * 100) + '% lit.';
    if (full) {
      var m = full.getUTCMonth(), d = full.getUTCDate();
      var harvest = (m === 8 && d >= 8) || (m === 9 && d <= 7);
      var when = W.formatDate(full, tz) + ', ' + W.formatTime(full, tz);
      caption += ' ' + (full < now ? (harvest ? 'The Harvest Moon was full ' : 'Full ') : (harvest ? 'Harvest Moon: full ' : 'Next full Moon: ')) + when + (lead ? ' (' + lead.city + ' time).' : '.');
    }
    $('moonCaption').textContent = caption;

    var w = state.windows[0], line = $('nextLine');
    if (state.people.length < 2) line.textContent = 'Add at least two people to find the next time you can all see the Moon.';
    else if (!w) line.textContent = 'In the next three days the Moon is never up for all of you while you’re all awake. Mark someone as a night owl to widen the search.';
    else {
      var names = M.listJoin(w.people.map(function (p) { return p.person.name; }));
      line.textContent = 'Next time ' + names + ' can all see the Moon: ' +
        w.people.map(function (p) { return p.startLocal + ' in ' + p.person.city; }).join(', ') +
        ', for ' + W.humanDuration(w.durationMin) + '.';
    }
  }

  /* ---------------- Windows list ---------------- */
  function renderWindows() {
    var ol = $('windowList');
    ol.innerHTML = '';
    if (state.people.length < 2) { ol.appendChild(el('li', { class: 'empty', text: 'Add two or more people above.' })); $('physicsLine').textContent = ''; return; }
    if (!state.windows.length) { ol.appendChild(el('li', { class: 'empty', text: 'No shared Moon during waking hours in the next 72 hours.' })); $('physicsLine').textContent = ''; return; }
    state.windows.slice(0, 3).forEach(function (w, i) {
      var who = w.people.map(function (p) {
        var dir = M.LANGS.en.dirs[M.directionIndex(p.azPeak)];
        return el('span', {}, [el('b', { text: p.person.name + ' ' }), p.startLocal + '–' + p.endLocal + ' ', el('em', { text: (p.rising ? 'rising' : 'setting') + ' in the ' + dir })]);
      });
      var lead = w.people[0];
      ol.appendChild(el('li', {}, [el('button', {
        type: 'button', 'aria-pressed': String(i === state.selected),
        onclick: function () { state.selected = i; focusSelected(); renderWindows(); renderTimeline(); renderMap(); renderMoment(); renderPostcard(); }
      }, [
        el('span', { class: 'when' }, [W.formatDate(w.start, lead.person.tz), el('small', { text: W.humanDuration(w.durationMin) })]),
        el('span', { class: 'who' }, who)
      ])]));
    });
    $('physicsLine').textContent = M.physicsLine(state.windows[state.selected]);
  }

  /* ---------------- Timeline ---------------- */
  function renderTimeline() {
    var cv = $('timelineCanvas'), ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1;
    var width = cv.parentNode.clientWidth || 900, gutter = width < 600 ? 92 : 156, rowH = 34, top = 30;
    var rows = state.people.length + 1, height = top + rows * rowH + 10;
    cv.width = width * dpr; cv.height = height * dpr; cv.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    var tr = state.track;
    if (!tr) { ctx.fillStyle = '#8a94b8'; ctx.font = '15px Karla, sans-serif'; ctx.fillText('Add people to see the timeline.', 16, 40); return; }
    var n = tr.times.length, plotW = width - gutter - 12;
    var X = function (i) { return gutter + plotW * i / (n - 1); };
    var XT = function (t) { return gutter + plotW * (t - state.start) / (HOURS * 3600000); };
    var lead = state.people[0];

    // hour ticks in the first person's time zone; labels thin out on narrow screens so they never collide
    ctx.font = '12px Karla, sans-serif'; ctx.textBaseline = 'middle';
    var labelEvery = plotW / 12 >= 46 ? 360 : plotW / 6 >= 38 ? 720 : 1440;
    for (var i = 0; i < n; i++) {
      var lm = tr.rows[0].samples[i].localMinutes;
      if (lm % 360 === 0) {
        ctx.fillStyle = 'rgba(239,230,207,0.12)'; ctx.fillRect(X(i), top - 6, 1, rows * rowH + 6);
        if (lm % labelEvery !== 0) continue;
        ctx.fillStyle = '#8a94b8';
        var label = lm === 0 ? W.formatDate(tr.times[i], lead.tz).replace(/,.*$/, '') : W.formatTime(tr.times[i], lead.tz).replace(':00', '');
        ctx.fillText(label, X(i) + 3, 14);
      }
    }

    function rowY(r) { return top + r * rowH; }
    // label column
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#efe6cf'; ctx.font = '700 14px Karla, sans-serif';
    ctx.fillText('Everyone', 12, rowY(0) + rowH / 2);
    state.people.forEach(function (p, r) {
      ctx.fillStyle = '#efe6cf'; ctx.font = '700 14px Karla, sans-serif';
      ctx.fillText(p.name, 12, rowY(r + 1) + rowH / 2 - 7);
      ctx.fillStyle = '#8a94b8'; ctx.font = '12px Karla, sans-serif';
      ctx.fillText(p.city, 12, rowY(r + 1) + rowH / 2 + 8);
    });

    // per-person day/night and Moon bands
    function runs(samples, keyFn, draw) {
      var start = 0, key = keyFn(samples[0]);
      for (var i = 1; i <= n; i++) {
        var k = i < n ? keyFn(samples[i]) : null;
        if (k !== key) { if (key) draw(key, X(start), X(Math.min(i, n - 1))); start = i; key = k; }
      }
    }
    tr.rows.forEach(function (row, r) {
      var y = rowY(r + 1) + 3, h = rowH - 6;
      runs(row.samples, function (s) { return s.sunAlt > 0 ? '#34426f' : s.sunAlt > -6 ? '#28335b' : '#172040'; },
        function (color, x0, x1) { ctx.fillStyle = color; ctx.fillRect(x0, y, x1 - x0 + 0.5, h); });
      runs(row.samples, function (s) { return s.moonAlt >= 5 ? 'rgba(239,230,207,0.85)' : s.moonAlt > 0 ? 'rgba(239,230,207,0.4)' : null; },
        function (color, x0, x1) { ctx.fillStyle = color; ctx.fillRect(x0, y + h * 0.32, x1 - x0 + 0.5, h * 0.36); });
    });

    // Everyone row: dotted where the Moon is up for all but someone is asleep, gold where it counts
    var y0 = rowY(0) + 6, h0 = rowH - 12;
    ctx.fillStyle = '#172040'; ctx.fillRect(gutter, y0, plotW, h0);
    state.sleepyWindows.forEach(function (w) {
      ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(233,162,59,0.7)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(XT(w.start), y0 + 1, Math.max(2, XT(w.end) - XT(w.start)), h0 - 2); ctx.restore();
    });
    state.windows.forEach(function (w, i) {
      ctx.fillStyle = i === state.selected ? '#e9a23b' : 'rgba(233,162,59,0.65)';
      ctx.fillRect(XT(w.start), y0, Math.max(2, XT(w.end) - XT(w.start)), h0);
    });
    var sel = state.windows[state.selected];
    if (sel) {
      ctx.fillStyle = 'rgba(233,162,59,0.14)';
      ctx.fillRect(XT(sel.start), top, Math.max(2, XT(sel.end) - XT(sel.start)), rows * rowH);
    }
    // now + scrub lines
    var nowX = XT(new Date());
    if (nowX >= gutter && nowX <= width) { ctx.fillStyle = 'rgba(239,230,207,0.55)'; ctx.fillRect(nowX, top - 4, 1, rows * rowH + 4); }
    ctx.fillStyle = '#e9a23b'; ctx.fillRect(X(state.scrub) - 1, top - 8, 2, rows * rowH + 8);
    cv._geom = { gutter: gutter, plotW: plotW, n: n };
  }

  function timelineClick(e) {
    var g = $('timelineCanvas')._geom; if (!g) return;
    var rect = e.currentTarget.getBoundingClientRect(), x = e.clientX - rect.left;
    if (x < g.gutter) return;
    state.scrub = Math.max(0, Math.min(STEPS, Math.round((x - g.gutter) / g.plotW * STEPS)));
    $('scrubber').value = state.scrub;
    renderTimeline(); renderMap();
  }

  /* ---------------- Map ---------------- */
  function decodeTopo(topo, obj) {
    var sc = topo.transform.scale, tl = topo.transform.translate;
    var arcs = topo.arcs.map(function (arc) {
      var x = 0, y = 0;
      return arc.map(function (d) { x += d[0]; y += d[1]; return [x * sc[0] + tl[0], y * sc[1] + tl[1]]; });
    });
    function ring(ids) {
      var pts = [];
      ids.forEach(function (i) { var a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse(); pts = pts.concat(pts.length ? a.slice(1) : a); });
      return pts;
    }
    var rings = [];
    function geom(g) {
      if (g.type === 'Polygon') g.arcs.forEach(function (r) { rings.push(ring(r)); });
      if (g.type === 'MultiPolygon') g.arcs.forEach(function (p) { p.forEach(function (r) { rings.push(ring(r)); }); });
      if (g.type === 'GeometryCollection') g.geometries.forEach(geom);
    }
    geom(obj);
    return rings;
  }

  function loadLand() {
    fetch('land-110m.json')
      .then(function (r) { if (!r.ok) throw new Error('no local map'); return r.json(); })
      .catch(function () { return fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json').then(function (r) { return r.json(); }); })
      .then(function (topo) { state.land = decodeTopo(topo, topo.objects.land); state.landCache = null; renderMap(); })
      .catch(function () { /* offline: graticule only */ });
  }

  var shade = document.createElement('canvas'); shade.width = 360; shade.height = 180;
  var glowCanvas = document.createElement('canvas'); glowCanvas.width = 360; glowCanvas.height = 180;

  function renderMap() {
    var cv = $('mapCanvas'), ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1;
    var width = cv.parentNode.clientWidth || 900, height = Math.round(width / 2);
    if (cv.width !== width * dpr) { cv.width = width * dpr; cv.height = height * dpr; state.landCache = null; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var X = function (lon) { return (lon + 180) / 360 * width; }, Y = function (lat) { return (90 - lat) / 180 * height; };
    var t = scrubTime(), pos = A.positionsAt(t);

    ctx.fillStyle = '#18224a'; ctx.fillRect(0, 0, width, height);
    if (state.land) {
      if (!state.landCache) {
        var lc = document.createElement('canvas'); lc.width = width * dpr; lc.height = height * dpr;
        var lx = lc.getContext('2d'); lx.setTransform(dpr, 0, 0, dpr, 0, 0); lx.fillStyle = '#34457a';
        state.land.forEach(function (r) {
          lx.beginPath(); r.forEach(function (p, i) { if (i) lx.lineTo(X(p[0]), Y(p[1])); else lx.moveTo(X(p[0]), Y(p[1])); }); lx.closePath(); lx.fill();
        });
        state.landCache = lc;
      }
      ctx.drawImage(state.landCache, 0, 0, width, height);
    }
    // graticule
    ctx.strokeStyle = 'rgba(239,230,207,0.07)'; ctx.lineWidth = 1;
    for (var lon = -150; lon <= 150; lon += 30) { ctx.beginPath(); ctx.moveTo(X(lon), 0); ctx.lineTo(X(lon), height); ctx.stroke(); }
    for (var lat = -60; lat <= 60; lat += 30) { ctx.beginPath(); ctx.moveTo(0, Y(lat)); ctx.lineTo(width, Y(lat)); ctx.stroke(); }

    // night shadow, then moonlight added on top with a 'screen' blend so it brightens instead of muddying
    var sx = shade.getContext('2d'), night = sx.createImageData(shade.width, shade.height);
    var gxCtx = glowCanvas.getContext('2d'), glow = gxCtx.createImageData(shade.width, shade.height);
    var R = Math.PI / 180, sLat = pos.subSolar.lat * R, sLon = pos.subSolar.lon * R, mLat = pos.subLunar.lat * R, mLon = pos.subLunar.lon * R;
    for (var gy = 0; gy < shade.height; gy++) {
      var la = (90 - (gy + 0.5) * 180 / shade.height) * R, sinLa = Math.sin(la), cosLa = Math.cos(la);
      for (var gx = 0; gx < shade.width; gx++) {
        var lo = (-180 + (gx + 0.5) * 360 / shade.width) * R;
        var czs = sinLa * Math.sin(sLat) + cosLa * Math.cos(sLat) * Math.cos(lo - sLon);
        var czm = sinLa * Math.sin(mLat) + cosLa * Math.cos(mLat) * Math.cos(lo - mLon);
        var k = (gy * shade.width + gx) * 4;
        night.data[k] = 5; night.data[k + 1] = 8; night.data[k + 2] = 24;
        night.data[k + 3] = Math.round(smooth(0.06, -0.14, czs) * 0.66 * 255);
        glow.data[k] = 233; glow.data[k + 1] = 170; glow.data[k + 2] = 92;
        glow.data[k + 3] = Math.round(smooth(-0.02, 0.25, czm) * 0.5 * 255);
      }
    }
    sx.putImageData(night, 0, 0); gxCtx.putImageData(glow, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(shade, 0, 0, width, height);
    ctx.globalCompositeOperation = 'screen'; ctx.drawImage(glowCanvas, 0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';

    // the point where the Moon is straight overhead
    var mx = X(pos.subLunar.lon), my = Y(pos.subLunar.lat);
    drawMoon(ctx, mx, my, Math.max(7, width / 110), pos.illumination, pos.waxing, pos.subLunar.lat < 0);

    // family pins
    var upNames = [], downNames = [], placed = [];
    ctx.font = '600 ' + (width < 600 ? 11 : 13) + 'px Karla, sans-serif'; ctx.textBaseline = 'middle';
    state.people.forEach(function (p, i) {
      var v = W.describe(p, t, pos), px = X(p.lon), py = Y(p.lat), up = v.moonAlt > 0;
      (up ? upNames : downNames).push(p.name);
      ctx.beginPath(); ctx.arc(px, py, 6, 0, 2 * Math.PI);
      ctx.fillStyle = up ? '#e9a23b' : '#18224a'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = up ? '#fff3dc' : '#8a94b8'; ctx.stroke();
      var label = p.name + ' ' + v.localTime, tw = ctx.measureText(label).width;
      var lxp = px + 10 + tw > width ? px - 10 - tw : px + 10, lyp = py - 14;
      var hit = function (y) { return placed.some(function (b) { return lxp < b[0] + b[2] + 6 && b[0] < lxp + tw + 6 && Math.abs(b[1] - y) < 22; }); };
      for (var tries = 0; tries < 6 && hit(lyp); tries++) lyp += tries % 2 ? -44 - tries * 22 : 28 + tries * 22;
      placed.push([lxp, lyp, tw]);
      ctx.fillStyle = 'rgba(20,27,52,0.75)'; ctx.fillRect(lxp - 4, lyp - 10, tw + 8, 20);
      ctx.fillStyle = up ? '#fff3dc' : '#b9c0db'; ctx.fillText(label, lxp, lyp);
    });

    var lead = state.people[0];
    $('scrubLabel').textContent = lead ? W.formatDayTime(t, lead.tz) + ' in ' + lead.city : t.toUTCString();
    var status = '';
    if (state.people.length) {
      status = upNames.length === state.people.length ? 'The Moon is up for everyone.' :
        upNames.length ? 'The Moon is up for ' + M.listJoin(upNames) + '. Below the horizon for ' + M.listJoin(downNames) + '.' :
        'The Moon is below the horizon for everyone.';
    }
    $('mapStatus').textContent = status;
  }

  function togglePlay() {
    var btn = $('playBtn');
    if (state.playing) { state.playing = false; btn.setAttribute('aria-pressed', 'false'); btn.textContent = 'Play the next 72 hours'; return; }
    if (reduceMotion) { focusSelected(); renderTimeline(); renderMap(); return; }
    state.playing = true; btn.setAttribute('aria-pressed', 'true'); btn.textContent = 'Pause';
    if (state.scrub >= STEPS) state.scrub = 0;
    var last = performance.now();
    (function frame(now) {
      if (!state.playing) return;
      state.scrub = Math.min(STEPS, state.scrub + (now - last) / 1000 * (STEPS / 14));
      last = now;
      var s = state.scrub; state.scrub = Math.round(s);
      $('scrubber').value = state.scrub; renderMap(); renderTimeline(); state.scrub = s;
      if (s >= STEPS) { state.scrub = STEPS; togglePlay(); return; }
      requestAnimationFrame(frame);
    })(last);
  }

  /* ---------------- Moment ---------------- */
  function renderMoment() {
    var w = state.windows[state.selected];
    $('momentBubble').textContent = w
      ? M.momentMessage(state.people, w.start, w.end)
      : 'When there is a shared Moon, this is where you’ll see the message each person gets.';
  }

  /* ---------------- Postcard ---------------- */
  function renderPostcardInputs() {
    var box = $('photoInputs');
    box.innerHTML = '';
    state.people.slice(0, 2).forEach(function (p, i) {
      box.appendChild(el('label', {}, [p.name + '’s photo', el('input', {
        type: 'file', accept: 'image/*', onchange: function (e) {
          var f = e.target.files && e.target.files[0]; if (!f) return;
          var img = new Image(); img.onload = function () { state.photos[i] = img; renderPostcard(); };
          img.src = URL.createObjectURL(f);
        }
      })]));
    });
  }

  function renderPostcard() {
    var cv = $('postcardCanvas'), w = state.windows[state.selected], t = w ? w.peak : new Date();
    D.postcard(cv.getContext('2d'), cv.width, cv.height, state.people.slice(0, 2).map(function (p, i) {
      return { person: p, date: t, photo: state.photos[i] };
    }));
  }

  function downloadPostcard() {
    $('postcardCanvas').toBlob(function (blob) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'same-moon-postcard.png'; a.click();
    });
  }

  /* ---------------- Share state in the URL ---------------- */
  function saveHash() {
    var data = state.people.map(function (p) { return [p.name, p.cityKey || [p.city, p.lat, p.lon, p.tz], p.lang, p.nightOwl ? 1 : 0]; });
    history.replaceState(null, '', '#f=' + encodeURIComponent(JSON.stringify(data)));
  }
  function loadHash() {
    var m = location.hash.match(/f=([^&]+)/);
    if (!m) return false;
    try {
      state.people = JSON.parse(decodeURIComponent(m[1])).map(function (d) {
        var place = typeof d[1] === 'string' ? d[1] : { name: d[1][0], lat: d[1][1], lon: d[1][2], tz: d[1][3] };
        return C.person(d[0], place, { lang: d[2] || 'en', nightOwl: !!d[3] });
      });
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- Wire up ---------------- */
  function refresh() {
    renderPeople(); compute(); renderHero(); renderWindows(); renderTimeline(); renderMap(); renderMoment();
    renderPostcardInputs(); renderPostcard(); saveHash();
  }

  $('sayForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('sayInput');
    sayFamily(input.value.trim() || input.placeholder);
  });
  $('addPerson').addEventListener('click', function () {
    state.people.push(C.person('New person', 'london')); refresh();
  });
  $('loadDemo').addEventListener('click', loadDemo);
  $('timelineCanvas').addEventListener('click', timelineClick);
  $('scrubber').addEventListener('input', function (e) { state.scrub = +e.target.value; renderMap(); renderTimeline(); });
  $('playBtn').addEventListener('click', togglePlay);
  $('downloadPostcard').addEventListener('click', downloadPostcard);
  var resizeTimer;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { renderTimeline(); renderMap(); }, 120); });

  if (!loadHash()) state.people = DEMO.map(function (d) { return C.person(d[0], d[1], { lang: d[2] }); });
  refresh();
  loadLand();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { renderTimeline(); renderMap(); renderPostcard(); });
})();
