/*
 * Same Moon: offline city list so the app works without any geocoding API.
 * [name, lat, lon, IANA time zone, country, aliases...]
 * Aliases include common nicknames and native-script names so family members can
 * type "上海", "서울" or "Saigon" and still be understood.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SameMoon = root.SameMoon || {}; root.SameMoon.cities = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RAW = [
    ['St. Louis', 38.627, -90.199, 'America/Chicago', 'USA', 'st louis', 'saint louis', 'stl', 'washu', 'wash u', 'wustl', 'washington university', 'university city', 'clayton'],
    ['Chicago', 41.878, -87.630, 'America/Chicago', 'USA'],
    ['Kansas City', 39.100, -94.579, 'America/Chicago', 'USA', 'kc'],
    ['Houston', 29.760, -95.370, 'America/Chicago', 'USA'],
    ['Dallas', 32.777, -96.797, 'America/Chicago', 'USA'],
    ['New York', 40.713, -74.006, 'America/New_York', 'USA', 'nyc', 'new york city', 'manhattan', 'brooklyn'],
    ['Boston', 42.360, -71.059, 'America/New_York', 'USA'],
    ['Washington, D.C.', 38.907, -77.037, 'America/New_York', 'USA', 'washington dc', 'dc', 'd.c.'],
    ['Atlanta', 33.749, -84.388, 'America/New_York', 'USA'],
    ['Miami', 25.762, -80.192, 'America/New_York', 'USA'],
    ['Denver', 39.739, -104.990, 'America/Denver', 'USA'],
    ['Phoenix', 33.448, -112.074, 'America/Phoenix', 'USA'],
    ['Los Angeles', 34.052, -118.244, 'America/Los_Angeles', 'USA', 'la', 'l.a.'],
    ['San Francisco', 37.775, -122.419, 'America/Los_Angeles', 'USA', 'sf', 'bay area'],
    ['Seattle', 47.606, -122.332, 'America/Los_Angeles', 'USA'],
    ['Anchorage', 61.218, -149.900, 'America/Anchorage', 'USA'],
    ['Honolulu', 21.307, -157.858, 'Pacific/Honolulu', 'USA', 'hawaii'],
    ['Toronto', 43.653, -79.383, 'America/Toronto', 'Canada'],
    ['Montreal', 45.502, -73.567, 'America/Toronto', 'Canada', 'montréal'],
    ['Vancouver', 49.283, -123.121, 'America/Vancouver', 'Canada'],
    ['Mexico City', 19.433, -99.133, 'America/Mexico_City', 'Mexico', 'cdmx', 'ciudad de méxico', 'ciudad de mexico'],
    ['Guadalajara', 20.659, -103.349, 'America/Mexico_City', 'Mexico'],
    ['Bogotá', 4.711, -74.072, 'America/Bogota', 'Colombia', 'bogota'],
    ['Lima', -12.046, -77.043, 'America/Lima', 'Peru'],
    ['Santiago', -33.449, -70.669, 'America/Santiago', 'Chile'],
    ['Buenos Aires', -34.604, -58.382, 'America/Argentina/Buenos_Aires', 'Argentina'],
    ['São Paulo', -23.551, -46.633, 'America/Sao_Paulo', 'Brazil', 'sao paulo'],
    ['Rio de Janeiro', -22.907, -43.173, 'America/Sao_Paulo', 'Brazil', 'rio'],
    ['London', 51.507, -0.128, 'Europe/London', 'UK'],
    ['Paris', 48.857, 2.352, 'Europe/Paris', 'France'],
    ['Berlin', 52.520, 13.405, 'Europe/Berlin', 'Germany'],
    ['Madrid', 40.417, -3.704, 'Europe/Madrid', 'Spain'],
    ['Barcelona', 41.385, 2.173, 'Europe/Madrid', 'Spain'],
    ['Rome', 41.903, 12.496, 'Europe/Rome', 'Italy', 'roma'],
    ['Milan', 45.464, 9.190, 'Europe/Rome', 'Italy', 'milano'],
    ['Amsterdam', 52.368, 4.904, 'Europe/Amsterdam', 'Netherlands'],
    ['Zurich', 47.377, 8.542, 'Europe/Zurich', 'Switzerland', 'zürich'],
    ['Vienna', 48.208, 16.374, 'Europe/Vienna', 'Austria', 'wien'],
    ['Stockholm', 59.329, 18.069, 'Europe/Stockholm', 'Sweden'],
    ['Warsaw', 52.230, 21.012, 'Europe/Warsaw', 'Poland', 'warszawa'],
    ['Athens', 37.984, 23.728, 'Europe/Athens', 'Greece'],
    ['Istanbul', 41.008, 28.978, 'Europe/Istanbul', 'Turkey', 'i̇stanbul'],
    ['Moscow', 55.756, 37.617, 'Europe/Moscow', 'Russia', 'москва'],
    ['Kyiv', 50.450, 30.523, 'Europe/Kyiv', 'Ukraine', 'kiev', 'київ'],
    ['Sarajevo', 43.856, 18.413, 'Europe/Sarajevo', 'Bosnia and Herzegovina'],
    ['Cairo', 30.044, 31.236, 'Africa/Cairo', 'Egypt', 'القاهرة'],
    ['Lagos', 6.524, 3.379, 'Africa/Lagos', 'Nigeria'],
    ['Accra', 5.603, -0.187, 'Africa/Accra', 'Ghana'],
    ['Nairobi', -1.292, 36.822, 'Africa/Nairobi', 'Kenya'],
    ['Addis Ababa', 9.030, 38.740, 'Africa/Addis_Ababa', 'Ethiopia'],
    ['Johannesburg', -26.204, 28.047, 'Africa/Johannesburg', 'South Africa', 'joburg'],
    ['Casablanca', 33.573, -7.589, 'Africa/Casablanca', 'Morocco'],
    ['Dubai', 25.205, 55.271, 'Asia/Dubai', 'UAE'],
    ['Riyadh', 24.713, 46.675, 'Asia/Riyadh', 'Saudi Arabia'],
    ['Tel Aviv', 32.085, 34.782, 'Asia/Jerusalem', 'Israel'],
    ['Tehran', 35.689, 51.389, 'Asia/Tehran', 'Iran', 'تهران'],
    ['Karachi', 24.861, 67.010, 'Asia/Karachi', 'Pakistan'],
    ['Lahore', 31.520, 74.359, 'Asia/Karachi', 'Pakistan'],
    ['Delhi', 28.614, 77.209, 'Asia/Kolkata', 'India', 'new delhi', 'दिल्ली'],
    ['Mumbai', 19.076, 72.878, 'Asia/Kolkata', 'India', 'bombay', 'मुंबई'],
    ['Bangalore', 12.972, 77.595, 'Asia/Kolkata', 'India', 'bengaluru'],
    ['Chennai', 13.083, 80.270, 'Asia/Kolkata', 'India', 'madras'],
    ['Hyderabad', 17.385, 78.487, 'Asia/Kolkata', 'India'],
    ['Kolkata', 22.573, 88.364, 'Asia/Kolkata', 'India', 'calcutta'],
    ['Dhaka', 23.811, 90.413, 'Asia/Dhaka', 'Bangladesh'],
    ['Kathmandu', 27.717, 85.324, 'Asia/Kathmandu', 'Nepal'],
    ['Colombo', 6.927, 79.861, 'Asia/Colombo', 'Sri Lanka'],
    ['Almaty', 43.238, 76.946, 'Asia/Almaty', 'Kazakhstan'],
    ['Tashkent', 41.299, 69.240, 'Asia/Tashkent', 'Uzbekistan'],
    ['Bangkok', 13.756, 100.502, 'Asia/Bangkok', 'Thailand', 'กรุงเทพ'],
    ['Hanoi', 21.028, 105.854, 'Asia/Ho_Chi_Minh', 'Vietnam', 'hà nội', 'ha noi'],
    ['Ho Chi Minh City', 10.823, 106.630, 'Asia/Ho_Chi_Minh', 'Vietnam', 'saigon', 'sài gòn', 'hcmc', 'tp hcm', 'hồ chí minh'],
    ['Da Nang', 16.054, 108.202, 'Asia/Ho_Chi_Minh', 'Vietnam', 'đà nẵng', 'danang'],
    ['Kuala Lumpur', 3.139, 101.687, 'Asia/Kuala_Lumpur', 'Malaysia', 'kl'],
    ['Singapore', 1.352, 103.820, 'Asia/Singapore', 'Singapore', '新加坡'],
    ['Jakarta', -6.208, 106.846, 'Asia/Jakarta', 'Indonesia'],
    ['Manila', 14.600, 120.984, 'Asia/Manila', 'Philippines'],
    ['Beijing', 39.904, 116.407, 'Asia/Shanghai', 'China', 'peking', '北京'],
    ['Shanghai', 31.230, 121.474, 'Asia/Shanghai', 'China', '上海'],
    ['Guangzhou', 23.129, 113.264, 'Asia/Shanghai', 'China', 'canton', '广州', '廣州'],
    ['Shenzhen', 22.543, 114.058, 'Asia/Shanghai', 'China', '深圳'],
    ['Chengdu', 30.573, 104.066, 'Asia/Shanghai', 'China', '成都'],
    ['Hangzhou', 30.274, 120.155, 'Asia/Shanghai', 'China', '杭州'],
    ['Wuhan', 30.593, 114.305, 'Asia/Shanghai', 'China', '武汉'],
    ['Nanjing', 32.060, 118.797, 'Asia/Shanghai', 'China', '南京'],
    ["Xi'an", 34.341, 108.940, 'Asia/Shanghai', 'China', 'xian', '西安'],
    ['Chongqing', 29.563, 106.551, 'Asia/Shanghai', 'China', '重庆'],
    ['Hong Kong', 22.320, 114.169, 'Asia/Hong_Kong', 'Hong Kong', 'hk', '香港'],
    ['Taipei', 25.033, 121.565, 'Asia/Taipei', 'Taiwan', '台北', '臺北'],
    ['Seoul', 37.567, 126.978, 'Asia/Seoul', 'South Korea', '서울'],
    ['Busan', 35.180, 129.075, 'Asia/Seoul', 'South Korea', '부산'],
    ['Tokyo', 35.676, 139.650, 'Asia/Tokyo', 'Japan', '東京', '东京'],
    ['Osaka', 34.694, 135.502, 'Asia/Tokyo', 'Japan', '大阪'],
    ['Ulaanbaatar', 47.886, 106.906, 'Asia/Ulaanbaatar', 'Mongolia'],
    ['Sydney', -33.869, 151.209, 'Australia/Sydney', 'Australia'],
    ['Melbourne', -37.814, 144.963, 'Australia/Melbourne', 'Australia'],
    ['Perth', -31.950, 115.860, 'Australia/Perth', 'Australia'],
    ['Auckland', -36.849, 174.763, 'Pacific/Auckland', 'New Zealand']
  ];

  var CITIES = RAW.map(function (r) {
    return {
      key: r[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name: r[0], lat: r[1], lon: r[2], tz: r[3], country: r[4],
      aliases: [r[0].toLowerCase()].concat(r.slice(5))
    };
  });

  var HAS_CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0600-\u06ff\u0900-\u097f\u0400-\u04ff\u0e00-\u0e7f]/;

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /**
   * Find every city mentioned in free text, longest alias first, without overlaps.
   * Returns [{city, index, length}] in order of appearance.
   */
  function findAll(text) {
    var lower = String(text || '').toLowerCase(), hits = [];
    CITIES.forEach(function (c) {
      c.aliases.forEach(function (alias) {
        var re = HAS_CJK.test(alias)
          ? new RegExp(escapeRe(alias), 'g')
          : new RegExp('(^|[^a-z0-9\\u00c0-\\u024f])(' + escapeRe(alias) + ')(?=$|[^a-z0-9\\u00c0-\\u024f])', 'g');
        var m;
        while ((m = re.exec(lower)) !== null) {
          var idx = HAS_CJK.test(alias) ? m.index : m.index + m[1].length;
          hits.push({ city: c, index: idx, length: alias.length });
          if (re.lastIndex === m.index) re.lastIndex++;
        }
      });
    });
    hits.sort(function (a, b) { return b.length - a.length || a.index - b.index; });
    var taken = [], out = [];
    hits.forEach(function (h) {
      var overlaps = taken.some(function (t) { return h.index < t[1] && t[0] < h.index + h.length; });
      if (!overlaps) { taken.push([h.index, h.index + h.length]); out.push(h); }
    });
    return out.sort(function (a, b) { return a.index - b.index; });
  }

  function find(text) { var all = findAll(text); return all.length ? all[0].city : null; }
  function byKey(key) { return CITIES.find(function (c) { return c.key === key; }) || null; }

  /** Build a person record. `place` is a city key, a city object, or {name, lat, lon, tz}. */
  function person(name, place, extra) {
    var c = typeof place === 'string' ? byKey(place) : place;
    if (!c) throw new Error('Unknown place: ' + place);
    var p = { name: name, city: c.name, cityKey: c.key || null, lat: c.lat, lon: c.lon, tz: c.tz, lang: 'en', nightOwl: false };
    return Object.assign(p, extra || {});
  }

  return { list: CITIES, find: find, findAll: findAll, byKey: byKey, person: person };
});
