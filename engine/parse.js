/*
 * Same Moon: understand "I'm at WashU, Mom's in Shanghai and prefers Chinese, my brother's in Toronto"
 * without any AI call. The optional LLM parser in agent/llm.mjs handles anything this misses.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./cities.js'), require('./messages.js'));
  else { root.SameMoon = root.SameMoon || {}; root.SameMoon.parse = factory(root.SameMoon.cities, root.SameMoon.messages); }
})(typeof self !== 'undefined' ? self : this, function (Cities, Messages) {
  'use strict';

  var RELATIONS = [
    ['grandmother', 'Grandma'], ['grandma', 'Grandma'], ['granny', 'Grandma'], ['nana', 'Nana'],
    ['grandfather', 'Grandpa'], ['grandpa', 'Grandpa'],
    ['mother', 'Mom'], ['mom', 'Mom'], ['mum', 'Mum'], ['mama', 'Mama'],
    ['father', 'Dad'], ['dad', 'Dad'], ['papa', 'Papa'],
    ['brother', 'Brother'], ['sister', 'Sister'], ['aunt', 'Aunt'], ['uncle', 'Uncle'], ['cousin', 'Cousin'],
    ['wife', 'Wife'], ['husband', 'Husband'], ['partner', 'Partner'], ['girlfriend', 'Girlfriend'], ['boyfriend', 'Boyfriend'],
    ['son', 'Son'], ['daughter', 'Daughter'], ['best friend', 'Best friend'], ['roommate', 'Roommate'], ['friend', 'Friend'],
    ['妈妈', '妈妈'], ['爸爸', '爸爸'], ['奶奶', '奶奶'], ['爷爷', '爷爷'], ['外婆', '外婆'], ['外公', '外公'],
    ['姥姥', '姥姥'], ['姥爷', '姥爷'], ['哥哥', '哥哥'], ['姐姐', '姐姐'], ['弟弟', '弟弟'], ['妹妹', '妹妹'],
    ['엄마', '엄마'], ['아빠', '아빠'], ['할머니', '할머니'], ['할아버지', '할아버지']
  ];

  var SELF_RE = /(^|\b)(i'?m|i am|im|me|i live|i study|i'm studying|myself)\b|^i\s|我(?!的)|저는|나는/i;
  var NOT_NAMES = /^(I|Im|I'm|My|Mom|Dad|And|The|In|At|She|He|They|We|Our|Also|Is|Lives|Prefers|Speaks|Hi|Hello|Hey)$/;

  function splitClauses(text) {
    return String(text || '')
      .split(/\s*[,;\n，；。、]\s*|\s+and\s+|\s+also\s+|\s+plus\s+/i)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function capitalizedName(before) {
    var m = before.match(/([A-Z\u00C0-\u024F][\p{L}'-]*)(?:'s)?\s*(?:is|lives|'s|’s|in|at|from|currently)?\s*$/u);
    if (!m) {
      var words = before.match(/[A-Z\u00C0-\u024F][\p{L}'-]*/gu);
      if (!words) return null;
      m = [null, words[words.length - 1]];
    }
    var name = m[1].replace(/['’]s$/, '');
    return NOT_NAMES.test(name) ? null : name;
  }

  function relationName(before) {
    var lower = before.toLowerCase();
    for (var i = 0; i < RELATIONS.length; i++) {
      var word = RELATIONS[i][0];
      var re = /[\u3400-\u9fff\uac00-\ud7af]/.test(word)
        ? new RegExp(word)
        : new RegExp('(^|[^a-z])' + word + "(?:'s|’s)?([^a-z]|$)");
      if (re.test(lower)) return RELATIONS[i][1];
    }
    return null;
  }

  /**
   * Returns [{self, name, city, lang}] where city is a gazetteer city object,
   * plus `unknownPlaces` for clauses that mention a person but no known city.
   */
  function parseFamily(text) {
    var people = [], unknown = [];
    splitClauses(text).forEach(function (clause) {
      var hits = Cities.findAll(clause);
      var lang = Messages.detectLanguage(clause);
      if (!hits.length) {
        if (lang && people.length) people[people.length - 1].lang = lang;
        else if (/\b(in|at|from)\b/i.test(clause)) unknown.push(clause);
        return;
      }
      var before = clause.slice(0, hits[0].index);
      var self = SELF_RE.test(before);
      var name = self ? null : (relationName(before) || capitalizedName(before));
      if (!lang && name && /[\u3400-\u9fff]/.test(name)) lang = 'zh';
      if (!lang && name && /[\uac00-\ud7af]/.test(name)) lang = 'ko';
      people.push({ self: self, name: name, city: hits[0].city, lang: lang });
    });
    return { people: people, unknownPlaces: unknown };
  }

  return { parseFamily: parseFamily, splitClauses: splitClauses };
});
