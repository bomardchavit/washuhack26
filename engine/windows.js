/*
 * Same Moon: find the moments when the Moon is above the horizon for every person
 * in a family at the same time, during hours they are likely awake.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./astro.js'));
  else { root.SameMoon = root.SameMoon || {}; root.SameMoon.windows = factory(root.SameMoon.astro); }
})(typeof self !== 'undefined' ? self : this, function (astro) {
  'use strict';

  var formatters = {};
  function formatter(tz, kind) {
    var key = tz + '|' + kind;
    if (!formatters[key]) {
      var opts = { timeZone: tz };
      if (kind === 'parts') { opts.hourCycle = 'h23'; opts.hour = '2-digit'; opts.minute = '2-digit'; }
      if (kind === 'time') { opts.hour = 'numeric'; opts.minute = '2-digit'; }
      if (kind === 'daytime') { opts.weekday = 'short'; opts.hour = 'numeric'; opts.minute = '2-digit'; }
      if (kind === 'date') { opts.weekday = 'short'; opts.month = 'short'; opts.day = 'numeric'; }
      if (kind === 'ymd') { opts.year = 'numeric'; opts.month = '2-digit'; opts.day = '2-digit'; }
      formatters[key] = new Intl.DateTimeFormat('en-US', opts);
    }
    return formatters[key];
  }

  function localMinutes(date, tz) {
    var parts = formatter(tz, 'parts').formatToParts(date), h = 0, m = 0;
    parts.forEach(function (p) {
      if (p.type === 'hour') h = parseInt(p.value, 10) % 24;
      if (p.type === 'minute') m = parseInt(p.value, 10);
    });
    return h * 60 + m;
  }

  function formatTime(date, tz) { return formatter(tz, 'time').format(date); }
  function formatDayTime(date, tz) { return formatter(tz, 'daytime').format(date); }
  function formatDate(date, tz) { return formatter(tz, 'date').format(date); }
  function localDayKey(date, tz) { return formatter(tz, 'ymd').format(date); }

  function isAwake(person, minutes, opts) {
    if (person.nightOwl) return true;
    var from = opts.awakeFrom, to = opts.awakeTo;
    return from <= to ? (minutes >= from && minutes <= to) : (minutes >= from || minutes <= to);
  }

  /** What one person sees at one moment. */
  function describe(person, date, pos) {
    pos = pos || astro.positionsAt(date);
    var o = astro.observe(pos, person.lat, person.lon);
    return {
      date: date,
      moonAlt: o.moon.alt,
      moonAz: o.moon.az,
      rising: o.moon.rising,
      sunAlt: o.sun.alt,
      localTime: formatTime(date, person.tz),
      localDayTime: formatDayTime(date, person.tz),
      localMinutes: localMinutes(date, person.tz)
    };
  }

  /**
   * Sample Moon/Sun altitude for everyone every `stepMin` minutes.
   * Observer-independent positions are computed once per time step.
   */
  function track(people, start, hours, stepMin) {
    stepMin = stepMin || 5;
    var n = Math.floor(hours * 60 / stepMin) + 1, times = [], rows = people.map(function (p) {
      return { person: p, samples: [] };
    });
    for (var i = 0; i < n; i++) {
      var t = new Date(start.getTime() + i * stepMin * 60000), pos = astro.positionsAt(t);
      times.push(t);
      for (var j = 0; j < people.length; j++) {
        var p = people[j], o = astro.observe(pos, p.lat, p.lon);
        rows[j].samples.push({
          moonAlt: o.moon.alt, moonAz: o.moon.az, rising: o.moon.rising,
          sunAlt: o.sun.alt, localMinutes: localMinutes(t, p.tz)
        });
      }
    }
    return { times: times, rows: rows, stepMin: stepMin };
  }

  function skyFactor(sunAlt) {
    if (sunAlt < -6) return 1;      // dark enough for a clear, bright Moon
    if (sunAlt < 0) return 0.9;     // twilight: often the prettiest photos
    return 0.7;                     // daytime Moon: visible but washed out
  }

  /**
   * Find windows when the Moon is at least `minAlt` degrees up for everyone
   * (and, unless someone is a night owl, during waking hours).
   */
  function findSharedWindows(people, options) {
    var opts = Object.assign({
      start: new Date(), hours: 72, stepMin: 5, minAlt: 5,
      awakeFrom: 6 * 60, awakeTo: 23 * 60 + 30, requireAwake: true,
      cloudAt: null  // optional function(personIndex, date) -> cloud cover 0-100 or null
    }, options || {});
    if (!people || people.length < 1) return [];
    var tr = track(people, opts.start, opts.hours, opts.stepMin);
    var windows = [], run = null;

    function okAt(i) {
      for (var j = 0; j < tr.rows.length; j++) {
        var s = tr.rows[j].samples[i], p = tr.rows[j].person;
        if (s.moonAlt < opts.minAlt) return false;
        if (opts.requireAwake && !isAwake(p, s.localMinutes, opts)) return false;
      }
      return true;
    }

    for (var i = 0; i < tr.times.length; i++) {
      if (okAt(i)) { if (!run) run = { i0: i, i1: i }; else run.i1 = i; }
      else if (run) { windows.push(run); run = null; }
    }
    if (run) windows.push(run);

    var result = windows.map(function (w) {
      var start = tr.times[w.i0];
      var end = new Date(tr.times[w.i1].getTime() + opts.stepMin * 60000);
      // Peak: the sample where the lowest person's Moon is highest.
      var best = w.i0, bestMin = -90;
      for (var i = w.i0; i <= w.i1; i++) {
        var lowest = 90;
        tr.rows.forEach(function (r) { lowest = Math.min(lowest, r.samples[i].moonAlt); });
        if (lowest > bestMin) { bestMin = lowest; best = i; }
      }
      var peak = tr.times[best];
      var perPerson = tr.rows.map(function (r, j) {
        var s0 = r.samples[w.i0], sp = r.samples[best], s1 = r.samples[w.i1];
        var cloud = opts.cloudAt ? opts.cloudAt(j, peak) : null;
        return {
          person: r.person,
          startLocal: formatDayTime(start, r.person.tz),
          endLocal: formatTime(end, r.person.tz),
          peakLocal: formatTime(peak, r.person.tz),
          altStart: s0.moonAlt, altPeak: sp.moonAlt, altEnd: s1.moonAlt,
          azPeak: sp.moonAz,
          rising: sp.rising,
          sunAltPeak: sp.sunAlt,
          cloud: cloud
        };
      });
      var durationMin = (end - start) / 60000;
      var sky = perPerson.reduce(function (a, p) { return a + skyFactor(p.sunAltPeak); }, 0) / perPerson.length;
      var clouds = perPerson.filter(function (p) { return p.cloud != null; });
      var cloudFactor = clouds.length
        ? 1 - 0.7 * clouds.reduce(function (a, p) { return a + p.cloud; }, 0) / clouds.length / 100
        : 1;
      var score = (Math.min(durationMin, 240) / 60) * (0.6 + Math.min(bestMin, 40) / 25) * sky * cloudFactor;
      return {
        start: start, end: end, peak: peak, durationMin: durationMin,
        minAltAtPeak: bestMin, people: perPerson, score: score
      };
    });

    var ranked = result.slice().sort(function (a, b) { return b.score - a.score; });
    ranked.forEach(function (w, k) { w.rank = k + 1; });
    return result;
  }

  /** Continuous stretches where the Moon is up for one row of a track (for timelines). */
  function intervals(tr, rowIndex, predicate) {
    var out = [], cur = null, row = tr.rows[rowIndex];
    for (var i = 0; i < tr.times.length; i++) {
      var yes = predicate(row.samples[i]);
      if (yes && !cur) cur = { start: tr.times[i] };
      if (!yes && cur) { cur.end = tr.times[i]; out.push(cur); cur = null; }
    }
    if (cur) { cur.end = tr.times[tr.times.length - 1]; out.push(cur); }
    return out;
  }

  function humanDuration(min) {
    var h = Math.floor(min / 60), m = Math.round(min % 60);
    if (h === 0) return m + ' min';
    if (m === 0) return h + (h === 1 ? ' hour' : ' hours');
    return h + ' hr ' + m + ' min';
  }

  return {
    track: track,
    findSharedWindows: findSharedWindows,
    describe: describe,
    intervals: intervals,
    localMinutes: localMinutes,
    formatTime: formatTime,
    formatDayTime: formatDayTime,
    formatDate: formatDate,
    localDayKey: localDayKey,
    humanDuration: humanDuration
  };
});
