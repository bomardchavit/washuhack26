/*
 * Same Moon: astronomy engine (no dependencies).
 * Works as a classic <script> in the browser (window.SameMoon.astro) and via require() in Node.
 *
 * Sun and Moon positions follow Paul Schlyter's "How to compute planetary positions"
 * (mean orbital elements + the main lunar perturbation terms), which is accurate to a
 * few arcminutes: good to a few minutes on rise/set times. Validated in test/engine.test.js
 * against published St. Louis moonrise/moonset tables for September 2026.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SameMoon = root.SameMoon || {}; root.SameMoon.astro = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RAD = Math.PI / 180, DEG = 180 / Math.PI;
  var EARTH_RADIUS_KM = 6378.14, AU_KM = 149597870.7;

  function sind(x) { return Math.sin(x * RAD); }
  function cosd(x) { return Math.cos(x * RAD); }
  function norm360(x) { return ((x % 360) + 360) % 360; }
  function norm180(x) { x = norm360(x); return x > 180 ? x - 360 : x; }

  function julianDay(date) { return date.getTime() / 86400000 + 2440587.5; }
  // Schlyter's day number: days since 2000 Jan 0.0 UT
  function dayNumber(date) { return julianDay(date) - 2451543.5; }
  function obliquity(d) { return 23.4393 - 3.563e-7 * d; }

  // Greenwich mean sidereal time in degrees (IAU 1982)
  function gmst(date) {
    var jd = julianDay(date), T = (jd - 2451545.0) / 36525;
    return norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000);
  }

  function eclipticToEquatorial(lon, lat, ecl) {
    var x = cosd(lon) * cosd(lat), y = sind(lon) * cosd(lat), z = sind(lat);
    var ye = y * cosd(ecl) - z * sind(ecl);
    var ze = y * sind(ecl) + z * cosd(ecl);
    return { ra: norm360(Math.atan2(ye, x) * DEG), dec: Math.atan2(ze, Math.sqrt(x * x + ye * ye)) * DEG };
  }

  function solveKepler(M, e) {
    var E = M + e * DEG * sind(M) * (1 + e * cosd(M));
    for (var i = 0; i < 8; i++) {
      var dE = (E - e * DEG * sind(E) - M) / (1 - e * cosd(E));
      E -= dE;
      if (Math.abs(dE) < 1e-7) break;
    }
    return E;
  }

  function sunEcliptic(d) {
    var w = 282.9404 + 4.70935e-5 * d;
    var e = 0.016709 - 1.151e-9 * d;
    var M = norm360(356.0470 + 0.9856002585 * d);
    var E = solveKepler(M, e);
    var xv = cosd(E) - e, yv = Math.sqrt(1 - e * e) * sind(E);
    return {
      lon: norm360(Math.atan2(yv, xv) * DEG + w),
      distAU: Math.sqrt(xv * xv + yv * yv),
      M: M,
      L: norm360(w + M)
    };
  }

  function moonEcliptic(d, sun) {
    var N = norm360(125.1228 - 0.0529538083 * d);
    var i = 5.1454;
    var w = norm360(318.0634 + 0.1643573223 * d);
    var a = 60.2666, e = 0.0549;
    var M = norm360(115.3654 + 13.0649929509 * d);
    var E = solveKepler(M, e);
    var xv = a * (cosd(E) - e), yv = a * Math.sqrt(1 - e * e) * sind(E);
    var v = Math.atan2(yv, xv) * DEG, r = Math.sqrt(xv * xv + yv * yv);
    var xh = r * (cosd(N) * cosd(v + w) - sind(N) * sind(v + w) * cosd(i));
    var yh = r * (sind(N) * cosd(v + w) + cosd(N) * sind(v + w) * cosd(i));
    var zh = r * sind(v + w) * sind(i);
    var lon = Math.atan2(yh, xh) * DEG;
    var lat = Math.atan2(zh, Math.sqrt(xh * xh + yh * yh)) * DEG;

    // Main perturbations (evection, variation, yearly equation, ...)
    var Ms = sun.M, Ls = sun.L;
    var Lm = norm360(N + w + M), D = norm360(Lm - Ls), F = norm360(Lm - N);
    lon += -1.274 * sind(M - 2 * D) + 0.658 * sind(2 * D) - 0.186 * sind(Ms)
      - 0.059 * sind(2 * M - 2 * D) - 0.057 * sind(M - 2 * D + Ms) + 0.053 * sind(M + 2 * D)
      + 0.046 * sind(2 * D - Ms) + 0.041 * sind(M - Ms) - 0.035 * sind(D)
      - 0.031 * sind(M + Ms) - 0.015 * sind(2 * F - 2 * D) + 0.011 * sind(M - 4 * D);
    lat += -0.173 * sind(F - 2 * D) - 0.055 * sind(M - F - 2 * D) - 0.046 * sind(M + F - 2 * D)
      + 0.033 * sind(F + 2 * D) + 0.017 * sind(2 * M + F);
    r += -0.58 * cosd(M - 2 * D) - 0.46 * cosd(2 * D);
    return { lon: norm360(lon), lat: lat, distER: r };
  }

  /**
   * Geocentric Sun and Moon positions at a moment. Everything observer-independent,
   * so it can be computed once per timestamp and reused for many people.
   */
  function positionsAt(date) {
    var d = dayNumber(date), ecl = obliquity(d);
    var sun = sunEcliptic(d), moon = moonEcliptic(d, sun);
    var sunEq = eclipticToEquatorial(sun.lon, 0, ecl);
    var moonEq = eclipticToEquatorial(moon.lon, moon.lat, ecl);

    // Illumination
    var cosPsi = cosd(moon.lat) * cosd(moon.lon - sun.lon);
    var psi = Math.acos(Math.max(-1, Math.min(1, cosPsi)));
    var R = sun.distAU * AU_KM, Delta = moon.distER * EARTH_RADIUS_KM;
    var phaseAngle = Math.atan2(R * Math.sin(psi), Delta - R * Math.cos(psi));
    var fraction = (1 + Math.cos(phaseAngle)) / 2;
    var elongation = norm360(moon.lon - sun.lon); // 0 new, 180 full
    var g = gmst(date);

    return {
      date: date,
      gmst: g,
      sun: { ra: sunEq.ra, dec: sunEq.dec, lon: sun.lon },
      moon: {
        ra: moonEq.ra, dec: moonEq.dec, lon: moon.lon, lat: moon.lat,
        distKm: Delta,
        parallax: Math.asin(1 / moon.distER) * DEG
      },
      illumination: fraction,
      elongation: elongation,
      waxing: elongation < 180,
      subLunar: { lat: moonEq.dec, lon: norm180(moonEq.ra - g) },
      subSolar: { lat: sunEq.dec, lon: norm180(sunEq.ra - g) }
    };
  }

  function equatorialToHorizontal(ra, dec, gmstDeg, lat, lon) {
    var H = norm180(gmstDeg + lon - ra);
    var alt = Math.asin(sind(lat) * sind(dec) + cosd(lat) * cosd(dec) * cosd(H)) * DEG;
    var az = norm360(Math.atan2(-cosd(dec) * sind(H), cosd(lat) * sind(dec) - sind(lat) * cosd(dec) * cosd(H)) * DEG);
    return { alt: alt, az: az, hourAngle: H };
  }

  // Atmospheric refraction (Saemundsson), degrees, for a true altitude in degrees
  function refraction(trueAlt) {
    if (trueAlt < -1.5) return 0;
    var h = Math.max(trueAlt, -1.5);
    return (1.02 / Math.tan((h + 10.3 / (h + 5.11)) * RAD)) / 60;
  }

  /**
   * Where an observer sees the Moon and Sun.
   * moon.alt is apparent (topocentric, refracted) altitude of the Moon's centre.
   * moon.rising is true when the Moon is climbing (east of the meridian).
   */
  function observe(pos, lat, lon) {
    var m = equatorialToHorizontal(pos.moon.ra, pos.moon.dec, pos.gmst, lat, lon);
    var topo = m.alt - Math.asin(Math.sin(pos.moon.parallax * RAD) * cosd(m.alt)) * DEG;
    var s = equatorialToHorizontal(pos.sun.ra, pos.sun.dec, pos.gmst, lat, lon);
    return {
      moon: { alt: topo + refraction(topo), trueAlt: topo, az: m.az, rising: m.hourAngle < 0 },
      sun: { alt: s.alt + refraction(s.alt), trueAlt: s.alt, az: s.az }
    };
  }

  function moonAltitudeFor(lat, lon) {
    return function (date) { return observe(positionsAt(date), lat, lon).moon.alt; };
  }

  /**
   * Scan [start, end) and return the times a function crosses `threshold`,
   * refined by bisection to ~20 seconds.
   */
  function findCrossings(fn, start, end, threshold, stepMinutes) {
    var step = (stepMinutes || 10) * 60000, out = [];
    var t0 = start.getTime(), v0 = fn(new Date(t0)) - threshold;
    for (var t = t0 + step; t <= end.getTime(); t += step) {
      var v1 = fn(new Date(t)) - threshold;
      if ((v0 < 0) !== (v1 < 0)) {
        var lo = t - step, hi = t, vlo = v0;
        while (hi - lo > 20000) {
          var mid = (lo + hi) / 2, vm = fn(new Date(mid)) - threshold;
          if ((vm < 0) === (vlo < 0)) { lo = mid; vlo = vm; } else hi = mid;
        }
        out.push({ date: new Date((lo + hi) / 2), type: v1 > v0 ? 'rise' : 'set' });
      }
      v0 = v1;
    }
    return out;
  }

  /**
   * Moonrise/moonset between start and end for an observer.
   * Standard definition: upper limb on the horizon with 34' refraction, which is
   * apparent centre altitude of about -semidiameter. We use -0.27 deg (Moon's mean semidiameter).
   */
  function moonRiseSet(lat, lon, start, end) {
    return findCrossings(moonAltitudeFor(lat, lon), start, end, -0.27, 10);
  }

  function sunRiseSet(lat, lon, start, end) {
    return findCrossings(function (date) {
      return observe(positionsAt(date), lat, lon).sun.alt;
    }, start, end, -0.27, 10);
  }

  /** Exact time of the next full (or new) moon after `from`. */
  function nextPhase(from, targetElongation) {
    var fn = function (date) {
      return norm180(positionsAt(date).elongation - targetElongation);
    };
    var step = 6 * 3600000, t = from.getTime(), v0 = fn(new Date(t));
    for (var i = 0; i < 140; i++) {
      var t1 = t + step, v1 = fn(new Date(t1));
      if (v0 < 0 && v1 >= 0 && v1 - v0 < 90) {
        var lo = t, hi = t1;
        while (hi - lo > 10000) {
          var mid = (lo + hi) / 2;
          if (fn(new Date(mid)) < 0) lo = mid; else hi = mid;
        }
        return new Date((lo + hi) / 2);
      }
      t = t1; v0 = v1;
    }
    return null;
  }

  function phaseName(pos) {
    var k = pos.illumination;
    if (k < 0.03) return 'new moon';
    if (k > 0.985) return 'full moon';
    if (Math.abs(k - 0.5) < 0.04) return pos.waxing ? 'first quarter' : 'last quarter';
    if (k < 0.5) return pos.waxing ? 'waxing crescent' : 'waning crescent';
    return pos.waxing ? 'waxing gibbous' : 'waning gibbous';
  }

  /** Great-circle distance in km. */
  function distanceKm(lat1, lon1, lat2, lon2) {
    var dLat = (lat2 - lat1) * RAD, dLon = (lon2 - lon1) * RAD;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * 6371.0 * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  return {
    positionsAt: positionsAt,
    observe: observe,
    moonRiseSet: moonRiseSet,
    sunRiseSet: sunRiseSet,
    findCrossings: findCrossings,
    nextFullMoon: function (from) { return nextPhase(from, 180); },
    nextNewMoon: function (from) { return nextPhase(from, 0); },
    phaseName: phaseName,
    distanceKm: distanceKm,
    gmst: gmst,
    norm180: norm180,
    norm360: norm360
  };
});
