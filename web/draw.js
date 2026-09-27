/*
 * Same Moon: drawing shared by the web demo and the iMessage agent (which renders the postcard
 * with @napi-rs/canvas). Works on any 2D canvas context.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../engine/astro.js'), require('../engine/windows.js'), require('../engine/messages.js'));
  else { root.SameMoon = root.SameMoon || {}; root.SameMoon.draw = factory(root.SameMoon.astro, root.SameMoon.windows, root.SameMoon.messages); }
})(typeof self !== 'undefined' ? self : this, function (A, W, M) {
  'use strict';

  // Web fonts first, then system fonts that cover names in Chinese, Korean, Japanese and Vietnamese
  // (the agent's canvas only falls back through this list, it never guesses).
  var SERIF = '"Cormorant Garamond", Georgia, "Songti SC", "AppleMyungjo", "Hiragino Mincho ProN", serif';
  var SANS = 'Karla, "Avenir Next", "Helvetica Neue", "Hiragino Sans", "Apple SD Gothic Neo", sans-serif';

  var MARIA = [[-0.34, -0.36, 0.27, 0.2], [-0.02, -0.3, 0.15, 0.13], [0.14, -0.04, 0.2, 0.15], [0.52, -0.2, 0.12, 0.1],
    [-0.55, 0.08, 0.24, 0.34], [-0.18, 0.36, 0.18, 0.12], [0.3, 0.32, 0.12, 0.09], [0.02, 0.12, 0.1, 0.08]];

  function litPath(ctx, cx, cy, r, k, right) {
    var rx = r * Math.abs(2 * k - 1), H = Math.PI / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -H, H, !right);
    if (right) ctx.ellipse(cx, cy, rx, r, 0, H, k >= 0.5 ? 3 * H : -H, k < 0.5);
    else ctx.ellipse(cx, cy, rx, r, 0, H, k >= 0.5 ? -H : 3 * H, k >= 0.5);
    ctx.closePath();
  }

  /** Draw the Moon with its real phase. flip=true for southern-hemisphere observers. */
  function drawMoon(ctx, cx, cy, r, k, waxing, flip) {
    var glow = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.7);
    glow.addColorStop(0, 'rgba(239,230,207,' + (0.05 + 0.2 * k) + ')');
    glow.addColorStop(1, 'rgba(239,230,207,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, r * 1.7, 0, 2 * Math.PI); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.clip();
    var lg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.05);
    lg.addColorStop(0, '#fcf6e6'); lg.addColorStop(1, '#d3c8ab');
    ctx.fillStyle = lg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.fillStyle = 'rgba(118,122,138,0.3)';
    MARIA.forEach(function (m) {
      ctx.beginPath(); ctx.ellipse(cx + (flip ? -1 : 1) * m[0] * r, cy + (flip ? -1 : 1) * m[1] * r, m[2] * r, m[3] * r, 0, 0, 2 * Math.PI); ctx.fill();
    });
    var litRight = flip ? !waxing : waxing;
    ctx.fillStyle = 'rgba(17,24,48,0.9)';
    litPath(ctx, cx, cy, r, 1 - k, !litRight); ctx.fill();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /** The sky as this person sees it at that moment: sky colour, stars, the Moon at its height and phase. */
  function paintSky(ctx, x, y, w, h, p, v, pos, seed) {
    var sky = ctx.createLinearGradient(0, y, 0, y + h);
    if (v.sunAlt > 0) { sky.addColorStop(0, '#4d6aa6'); sky.addColorStop(1, '#a9bddf'); }
    else if (v.sunAlt > -8) { sky.addColorStop(0, '#1f2a56'); sky.addColorStop(0.7, '#5d4f7c'); sky.addColorStop(1, '#c98f7a'); }
    else { sky.addColorStop(0, '#0e1530'); sky.addColorStop(1, '#23305c'); }
    ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
    if (v.sunAlt < -4) {
      var rnd = seed;
      for (var i = 0; i < 70; i++) {
        rnd = (rnd * 9301 + 49297) % 233280;
        var sx = x + (rnd / 233280) * w; rnd = (rnd * 9301 + 49297) % 233280;
        var sy = y + (rnd / 233280) * h * 0.7;
        ctx.fillStyle = 'rgba(255,248,230,' + (0.3 + (i % 5) / 8) + ')'; ctx.fillRect(sx, sy, 1.6, 1.6);
      }
    }
    var horizon = y + h * 0.8, toward = v.rising ? -1 : 1;
    var alt = Math.max(0, Math.min(45, v.moonAlt));
    var mx = x + w * (0.5 + 0.12 * toward), my = horizon - alt / 45 * h * 0.62 - 40;
    drawMoon(ctx, mx, my, 42, pos.illumination, pos.waxing, p.lat < 0);
    ctx.fillStyle = '#0d1226';
    ctx.beginPath(); ctx.moveTo(x, horizon + 10);
    for (var k = 0; k <= 12; k++) ctx.lineTo(x + w * k / 12, horizon + 6 * Math.sin(k * 1.7 + seed) + (k % 3) * 4);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(239,230,207,0.75)'; ctx.font = '600 16px ' + SANS; ctx.textBaseline = 'alphabetic';
    var dir = M.LANGS.en.dirs[M.directionIndex(v.moonAz)];
    ctx.fillText(dir.charAt(0).toUpperCase() + dir.slice(1), mx - 20, y + h - 18);
  }

  /**
   * The postcard: two photos side by side (1200x760), names, cities, local times, "N km apart. One Moon."
   * panels: [{ person, date, photo }]. photo is anything drawImage accepts, or null to paint that
   * person's sky instead. The title uses the first panel's date in the first person's time zone.
   */
  function postcard(ctx, width, height, panels) {
    var bg = ctx.createLinearGradient(0, 0, 0, height); bg.addColorStop(0, '#141b34'); bg.addColorStop(1, '#1f2a4d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    var pw = 540, ph = 470, py = 48;
    panels.slice(0, 2).forEach(function (panel, i) {
      var p = panel.person, pos = A.positionsAt(panel.date), v = W.describe(p, panel.date, pos);
      var px = 48 + i * (pw + 24);
      ctx.save(); roundRect(ctx, px, py, pw, ph, 18); ctx.clip();
      var img = panel.photo;
      if (img) {
        var s = Math.max(pw / img.width, ph / img.height), iw = img.width * s, ih = img.height * s;
        ctx.drawImage(img, px + (pw - iw) / 2, py + (ph - ih) / 2, iw, ih);
      } else paintSky(ctx, px, py, pw, ph, p, v, pos, 7 + i * 13);
      ctx.restore();
      ctx.fillStyle = '#efe6cf'; ctx.font = '600 40px ' + SERIF; ctx.textBaseline = 'alphabetic';
      ctx.fillText(p.name, px + 4, py + ph + 50);
      ctx.fillStyle = '#b9c0db'; ctx.font = '22px ' + SANS;
      ctx.fillText((v.rising ? 'Rising' : 'Setting') + ' over ' + p.city + ' at ' + v.localTime, px + 4, py + ph + 84);
    });
    if (panels.length >= 2) {
      var a = panels[0].person, b = panels[1].person;
      var km = Math.round(A.distanceKm(a.lat, a.lon, b.lat, b.lon) / 100) * 100;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e9a23b'; ctx.font = '600 34px ' + SERIF;
      ctx.fillText('Same Moon, ' + W.formatDate(panels[0].date, a.tz), width / 2, height - 70);
      ctx.fillStyle = '#efe6cf'; ctx.font = '22px ' + SANS;
      ctx.fillText(km.toLocaleString('en-US') + ' km apart. One Moon.', width / 2, height - 36);
      ctx.textAlign = 'left';
    }
  }

  return { drawMoon: drawMoon, roundRect: roundRect, paintSky: paintSky, postcard: postcard };
});
