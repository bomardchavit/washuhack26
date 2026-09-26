/*
 * Same Moon: everything the agent says, in each person's language.
 * Numbers (times, directions, altitudes) always come from the engine, never from a model.
 * The optional LLM layer in agent/llm.mjs can rephrase lines, but only around placeholders.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./astro.js'), require('./windows.js'));
  else { root.SameMoon = root.SameMoon || {}; root.SameMoon.messages = factory(root.SameMoon.astro, root.SameMoon.windows); }
})(typeof self !== 'undefined' ? self : this, function (astro, W) {
  'use strict';

  var EN_NUM = ['', 'one', 'two', 'three', 'four', 'five'];

  function fists(a) { return Math.max(1, Math.min(5, Math.round(a / 10))); }

  var LANGS = {
    en: {
      label: 'English', joiner: ', ', and: ' and ',
      dirs: ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'],
      alt: function (a) {
        if (a < 4) return 'just above the horizon';
        if (a >= 50) return 'high in the sky';
        var f = fists(a);
        return f === 1 ? 'about one fist above the horizon' : 'about ' + EN_NUM[f] + ' fists above the horizon';
      },
      motion: { rising: 'rising', setting: 'setting' },
      line: function (c) {
        return c.name + ', look toward the ' + c.dir + '. The Moon is ' + c.motion + ', ' + c.alt + '. ' +
          c.others + ' can see it right now too. Send a photo when you find it.';
      }
    },
    zh: {
      label: '中文', joiner: '、', and: '和',
      dirs: ['北方', '东北方', '东方', '东南方', '南方', '西南方', '西方', '西北方'],
      alt: function (a) {
        if (a < 4) return '刚刚高出地平线';
        if (a >= 50) return '高高挂在天上';
        return '离地平线大约' + ['', '一', '两', '三', '四', '五'][fists(a)] + '拳高';
      },
      motion: { rising: '正在升起', setting: '正在落下' },
      line: function (c) {
        return c.name + '，现在往' + c.dir + '看！月亮' + c.motion + '，' + c.alt + '。' +
          c.others + '此刻也能看到同一个月亮。找到后拍张照片发过来吧。';
      }
    },
    es: {
      label: 'Español', joiner: ', ', and: ' y ',
      dirs: ['el norte', 'el noreste', 'el este', 'el sureste', 'el sur', 'el suroeste', 'el oeste', 'el noroeste'],
      alt: function (a) {
        if (a < 4) return 'justo sobre el horizonte';
        if (a >= 50) return 'alta en el cielo';
        var f = fists(a);
        return f === 1 ? 'a un puño sobre el horizonte' : 'a unos ' + ['', '', 'dos', 'tres', 'cuatro', 'cinco'][f] + ' puños sobre el horizonte';
      },
      motion: { rising: 'está saliendo', setting: 'se está poniendo' },
      line: function (c) {
        return c.name + ', mira hacia ' + c.dir + '. La luna ' + c.motion + ', ' + c.alt + '. ' +
          c.others + ' también ' + (c.plural ? 'la pueden' : 'la puede') + ' ver ahora mismo. Manda una foto cuando la encuentres.';
      }
    },
    ko: {
      label: '한국어', joiner: ', ', and: ', ',
      dirs: ['북쪽', '북동쪽', '동쪽', '남동쪽', '남쪽', '남서쪽', '서쪽', '북서쪽'],
      alt: function (a) {
        if (a < 4) return '지평선 바로 위에 있고';
        if (a >= 50) return '하늘 높이 떠 있고';
        return '지평선에서 주먹 ' + ['', '하나', '두 개', '세 개', '네 개', '다섯 개'][fists(a)] + ' 정도 위에 있고';
      },
      motion: { rising: '떠오르는 중이에요', setting: '지는 중이에요' },
      line: function (c) {
        return c.name + ', 지금 ' + c.dir + '을 보세요! 달은 ' + c.alt + ', ' + c.motion + '. ' +
          c.others + '도 지금 같은 달을 볼 수 있어요. 찾으면 사진을 보내 주세요.';
      }
    },
    vi: {
      label: 'Tiếng Việt', joiner: ', ', and: ' và ',
      dirs: ['hướng bắc', 'hướng đông bắc', 'hướng đông', 'hướng đông nam', 'hướng nam', 'hướng tây nam', 'hướng tây', 'hướng tây bắc'],
      alt: function (a) {
        if (a < 4) return 'ngay trên đường chân trời';
        if (a >= 50) return 'cao trên bầu trời';
        var f = fists(a);
        return 'cao hơn đường chân trời khoảng ' + ['', 'một', 'hai', 'ba', 'bốn', 'năm'][f] + ' nắm tay';
      },
      motion: { rising: 'đang mọc', setting: 'đang lặn' },
      line: function (c) {
        return c.name + ' ơi, nhìn về ' + c.dir + ' ngay nhé! Mặt trăng ' + c.motion + ', ' + c.alt + '. ' +
          c.others + ' cũng nhìn thấy được mặt trăng này ngay lúc này. Tìm thấy rồi thì gửi ảnh nhé.';
      }
    },
    ja: {
      label: '日本語', joiner: '、', and: 'と',
      dirs: ['北', '北東', '東', '南東', '南', '南西', '西', '北西'],
      alt: function (a) {
        if (a < 4) return '地平線のすぐ上だよ';
        if (a >= 50) return '空の高いところにあるよ';
        return '地平線から握りこぶし' + ['', 'ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ'][fists(a)] + '分くらいの高さだよ';
      },
      motion: { rising: '昇ってきているよ', setting: '沈みかけているよ' },
      line: function (c) {
        return c.name + '、今すぐ' + c.dir + 'の空を見て！月が' + c.motion + '。' + c.alt + '。' +
          c.others + 'も今、同じ月が見られるよ。見つけたら写真を送ってね。';
      }
    },
    fr: {
      label: 'Français', joiner: ', ', and: ' et ',
      dirs: ['le nord', 'le nord-est', "l'est", 'le sud-est', 'le sud', 'le sud-ouest', "l'ouest", 'le nord-ouest'],
      alt: function (a) {
        if (a < 4) return "juste au-dessus de l'horizon";
        if (a >= 50) return 'haut dans le ciel';
        var f = fists(a);
        return f === 1 ? "à environ un poing au-dessus de l'horizon" : 'à environ ' + ['', '', 'deux', 'trois', 'quatre', 'cinq'][f] + " poings au-dessus de l'horizon";
      },
      motion: { rising: 'se lève', setting: 'se couche' },
      line: function (c) {
        return c.name + ', regarde vers ' + c.dir + '. La Lune ' + c.motion + ', ' + c.alt + '. ' +
          c.others + ' ' + (c.plural ? 'peuvent' : 'peut') + ' la voir en ce moment aussi. Envoie une photo quand tu la trouves.';
      }
    }
  };

  var LANG_WORDS = {
    zh: ['chinese', 'mandarin', 'cantonese', '中文', '普通话', '国语', '國語', '粤语', '廣東話'],
    es: ['spanish', 'español', 'espanol'],
    ko: ['korean', '한국어'],
    vi: ['vietnamese', 'tiếng việt', 'tieng viet'],
    ja: ['japanese', '日本語'],
    fr: ['french', 'français', 'francais'],
    en: ['english']
  };

  function detectLanguage(text) {
    var lower = String(text || '').toLowerCase();
    for (var code in LANG_WORDS) {
      if (LANG_WORDS[code].some(function (w) { return lower.indexOf(w) !== -1; })) return code;
    }
    return null;
  }

  function directionIndex(az) { return Math.round(astro.norm360(az) / 45) % 8; }
  function lang(code) { return LANGS[code] || LANGS.en; }

  /** One person's line in their own language, from what they see right now. */
  function personLine(person, view, others) {
    var L = lang(person.lang);
    var names = others.map(function (o) { return o.name + ' (' + o.city + ')'; });
    var joined = names.length > 1 ? names.slice(0, -1).join(L.joiner) + L.and + names[names.length - 1] : names.join('');
    return L.line({
      name: person.name,
      dir: L.dirs[directionIndex(view.moonAz)],
      alt: L.alt(view.moonAlt),
      motion: view.rising ? L.motion.rising : L.motion.setting,
      others: joined,
      plural: names.length > 1
    });
  }

  /** The group message sent at the start of a shared moment. */
  function momentMessage(people, date, endDate, opts) {
    opts = opts || {};
    var pos = astro.positionsAt(date);
    var lead = people[0];
    var header = (opts.simulated ? '[Simulation] ' : '') + '🌕 Look up, everyone. The Moon is up for all of you until ' +
      W.formatTime(endDate, lead.tz) + ' (' + lead.city + ' time).';
    var lines = people.map(function (p) {
      var view = W.describe(p, date, pos);
      return personLine(p, view, people.filter(function (o) { return o !== p; }));
    });
    return header + '\n\n' + lines.join('\n\n');
  }

  function physicsLine(win) {
    var rising = win.people.filter(function (p) { return p.rising; }).map(function (p) { return p.person.name; });
    var setting = win.people.filter(function (p) { return !p.rising; }).map(function (p) { return p.person.name; });
    var parts = [];
    if (rising.length && setting.length) {
      parts.push('It sets for ' + listJoin(setting) + ' while it rises for ' + listJoin(rising) + '.');
    }
    var far = farthestPair(win.people.map(function (p) { return p.person; }));
    if (far && far.km > 1500) parts.push(far.a.name + ' and ' + far.b.name + ' are ' + far.km.toLocaleString('en-US') + ' km apart.');
    var south = win.people.filter(function (p) { return p.person.lat < 0; });
    var north = win.people.filter(function (p) { return p.person.lat >= 0; });
    if (south.length && north.length) {
      parts.push(listJoin(south.map(function (p) { return p.person.name; })) + ' will see it upside down compared with ' + listJoin(north.map(function (p) { return p.person.name; })) + '.');
    }
    return parts.join(' ');
  }

  function listJoin(names) {
    if (names.length <= 1) return names.join('');
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  function farthestPair(people) {
    var best = null;
    for (var i = 0; i < people.length; i++) for (var j = i + 1; j < people.length; j++) {
      var km = Math.round(astro.distanceKm(people[i].lat, people[i].lon, people[j].lat, people[j].lon) / 100) * 100;
      if (!best || km > best.km) best = { a: people[i], b: people[j], km: km };
    }
    return best;
  }

  /** "Here are your next shared Moons" message, numbered for replies. */
  function windowsText(windows, max) {
    max = max || 3;
    if (!windows.length) {
      return 'I checked the next few days and the Moon is never up for all of you at the same time during waking hours. ' +
        'Reply "night owl" if someone is happy to be up late, and I\'ll look again.';
    }
    var shown = windows.slice(0, max);
    var bestRank = Math.min.apply(null, shown.map(function (w) { return w.rank; }));
    var out = ['Here are the next times the Moon is up for all of you:'];
    shown.forEach(function (w, i) {
      var who = w.people.map(function (p) {
        return p.person.name + ' ' + p.startLocal + '–' + p.endLocal;
      }).join('; ');
      out.push('\n' + (i + 1) + ') ' + who + ' (' + W.humanDuration(w.durationMin) + (w.rank === bestRank ? ', best of these' : '') + ')');
    });
    out.push('\n' + physicsLine(shown[0]));
    out.push('\nReply 1' + (shown.length > 1 ? '–' + shown.length : '') + ' and I\'ll message everyone at that moment.');
    return out.join('');
  }

  /** Caption for the shared postcard after a moment. */
  function postcardCaption(shots) {
    // shots: [{person, date, rising}]
    if (!shots.length) return '';
    var lead = shots[0].person;
    var lines = ['Same Moon, ' + W.formatDate(shots[0].date, lead.tz)];
    shots.forEach(function (s) {
      lines.push(s.person.name + ' saw it ' + (s.rising ? 'rising' : 'setting') + ' over ' + s.person.city + ' at ' + W.formatTime(s.date, s.person.tz) + '.');
    });
    var far = farthestPair(shots.map(function (s) { return s.person; }));
    if (far && far.km > 0) lines.push(far.km.toLocaleString('en-US') + ' km apart. One Moon.');
    return lines.join('\n');
  }

  return {
    LANGS: LANGS,
    detectLanguage: detectLanguage,
    directionIndex: directionIndex,
    personLine: personLine,
    momentMessage: momentMessage,
    physicsLine: physicsLine,
    windowsText: windowsText,
    postcardCaption: postcardCaption,
    listJoin: listJoin
  };
});
