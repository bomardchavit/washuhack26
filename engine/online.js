/*
 * Same Moon: optional online helpers (free Open-Meteo APIs, no key needed).
 * Everything degrades gracefully: if the network is down, the app keeps working offline.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SameMoon = root.SameMoon || {}; root.SameMoon.online = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function withTimeout(promise, ms) {
    return Promise.race([promise, new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('timeout')); }, ms);
    })]);
  }

  /** Look up any town on Earth. Returns {name, lat, lon, tz, country} or null. */
  function geocode(query) {
    var url = 'https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=' + encodeURIComponent(query);
    return withTimeout(fetch(url), 4000)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var g = j && j.results && j.results[0];
        return g ? { name: g.name, lat: g.latitude, lon: g.longitude, tz: g.timezone, country: g.country, key: null } : null;
      })
      .catch(function () { return null; });
  }

  /**
   * Hourly cloud cover for the next few days.
   * Resolves to a function(date) -> percent (0-100) or null when unknown.
   */
  function cloudCover(lat, lon) {
    var url = 'https://api.open-meteo.com/v1/forecast?hourly=cloud_cover&forecast_days=4&timezone=GMT' +
      '&latitude=' + lat.toFixed(3) + '&longitude=' + lon.toFixed(3);
    return withTimeout(fetch(url), 4000)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var byHour = {};
        (j.hourly.time || []).forEach(function (t, i) { byHour[t.slice(0, 13)] = j.hourly.cloud_cover[i]; });
        return function (date) {
          var v = byHour[date.toISOString().slice(0, 13)];
          return v == null ? null : v;
        };
      })
      .catch(function () { return function () { return null; }; });
  }

  return { geocode: geocode, cloudCover: cloudCover };
});
