/*
 * Mock PigmentSDK for the Airport Profitability Map prototype.
 *
 * Stands in for window.PigmentSDK outside Pigment. It serves the same binding
 * aliases the Frame uses, with the same data shapes (column-major cells,
 * label paths, loading states), and recalculates after writes the way a
 * Pigment model would. In Pigment this file is NOT used: the real Lists,
 * Metrics and Views behind the Frame bindings serve the data instead.
 *
 * Aliases served:
 *   units        List   Unit (one item per commercial unit, incl. map geometry)
 *   features     List   Map Feature (terminals, piers, gates, stands, roads...)
 *   unitKpis     View   rows Unit x columns KPI, page: months
 *   unitTrend    View   rows Month x columns KPI, page: units (one unit)
 *   gatePax      View   rows Gate x columns pax, page: months
 *   revenueShare Metric Revenue Share % by Unit (writable)
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- utilities
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = mulberry32(20261106);
  function rr(a, b) { return a + (b - a) * rand(); }
  function r1(v) { return Math.round(v * 10) / 10; }

  var MONTHS = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026',
    'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026'];
  var SEASON = [0.80, 0.77, 0.88, 0.96, 1.02, 1.09, 1.22, 1.25, 1.06, 0.99, 0.84, 0.93];
  var SHIFT_FROM = 4; // May 2026: gates B1-B5 reallocated to Pier C (not in budget)

  // ------------------------------------------------------- category economics
  // conv = transactions per exposed passenger, ticket = avg spend (EUR),
  // rate = default revenue share to the airport.
  var CATS = {
    'Duty Free':          { model: 'Concession', conv: 0.24, ticket: 52, rate: 0.36 },
    'Fashion & Luxury':   { model: 'Concession', conv: 0.014, ticket: 175, rate: 0.16 },
    'Health & Beauty':    { model: 'Concession', conv: 0.035, ticket: 41, rate: 0.17 },
    'Tech & Electronics': { model: 'Concession', conv: 0.015, ticket: 118, rate: 0.12 },
    'News & Convenience': { model: 'Concession', conv: 0.09, ticket: 11, rate: 0.20 },
    'Café & Bakery':      { model: 'Concession', conv: 0.08, ticket: 8.5, rate: 0.15 },
    'Bar & Restaurant':   { model: 'Concession', conv: 0.045, ticket: 31, rate: 0.15 },
    'Quick Service':      { model: 'Concession', conv: 0.07, ticket: 12.5, rate: 0.13 },
    'Currency Exchange':  { model: 'Concession', conv: 0.018, ticket: 26, rate: 0.30 },
    'Car Rental':         { model: 'Concession', conv: 0.008, ticket: 165, rate: 0.12 },
    'Lounge':             { model: 'Airport-operated', conv: 0.024, ticket: 44, costRatio: 0.48, fixed: 42000 },
    'Parking':            { model: 'Airport-operated', conv: 0.065, ticket: 33, costRatio: 0.30, fixed: 65000 },
    'Advertising':        { model: 'Media', conv: 1, ticket: 0.2, rate: 0.55 }
  };
  // Monthly cost of space per m2, by zone type (security, cleaning, utilities, depreciation)
  var SPACE_COST = { pier: 60, airside: 70, link: 60, landside: 55, ground: 3.2 };
  var SERVICE_CHARGE = 31; // recovered from concessions, EUR per m2 per month
  var DIRECT_COST = 9;     // unrecovered utilities, EUR per m2 per month

  // ---------------------------------------------------------------- geometry
  var features = [];
  var units = [];
  var gates = [];
  var meta = {}; // per unit code: hidden model drivers

  function F(name, type, x, y, w, h, extra) {
    var o = { 'Feature': name, 'Type': type, 'Shape': [r1(x), r1(y), r1(w), r1(h)].join(',') };
    if (extra) for (var k in extra) o[k] = extra[k];
    features.push(o);
    return o;
  }

  var NAMES = {
    'Café & Bakery': ['Runway Roasters', 'Gate Grind', 'Crumb & Co', 'Jetstream Coffee', 'Contrail Café', 'Altitude Espresso', 'The Departure Bakery', 'Boarding Brew', 'Flat White Flight', 'Cloud Nine Café'],
    'Bar & Restaurant': ['The Holding Pattern', 'Final Call Bar', 'Tailwind Taproom', 'Hangar Grill', 'Wingspan Wine Bar', 'Terminal Tavern', 'Nightflight Oyster Bar', 'The Gantry Kitchen'],
    'Quick Service': ['Noodle Box', 'Burger Bay', 'Fresh Fold', 'Poke Port', 'Slice Station', 'Wrap & Roll', 'Sushi Gate', 'Taco Terminal'],
    'News & Convenience': ['Wayfarer News', 'Compass Convenience', 'Pocket Mart', 'Pages & Postcards', 'Travel Essentials', 'Headline Express', 'Carry-On Corner'],
    'Health & Beauty': ['Glow Lab', 'Apothecary Nine', 'Bloom Beauty', 'Scent Society', 'Clearsky Pharmacy', 'Skin Atlas'],
    'Fashion & Luxury': ['Northline Outfitters', 'Atelier Vale', 'Coastline Swim', 'Linen & Loom', 'Kite Kids', 'Meridian Watches'],
    'Tech & Electronics': ['Plug & Play', 'SoundPort Audio', 'Charge Hub', 'Pixel Point'],
    'Currency Exchange': ['Globex Currency', 'FX Express'],
    'Car Rental': ['Rental Desks', 'Car Hire Desks'],
    'Advertising': ['Digital Screen']
  };
  var nameIdx = {};
  function nextName(cat) {
    var pool = NAMES[cat];
    var i = nameIdx[cat] || 0; nameIdx[cat] = i + 1;
    if (i < pool.length) return pool[i];
    return pool[i % pool.length] + ' ' + (Math.floor(i / pool.length) + 1);
  }

  var leaseDates = ['2026-12-31', '2027-02-28', '2027-03-31', '2027-06-30', '2027-09-30', '2027-12-31',
    '2028-03-31', '2028-06-30', '2028-12-31', '2029-06-30', '2029-12-31', '2030-06-30', '2031-03-31'];

  function U(code, cat, terminal, zone, zoneType, x, y, w, h, pos, opt) {
    opt = opt || {};
    var area = opt.area || Math.round(w * h * 0.06 / 5) * 5;
    var c = CATS[cat];
    var name = opt.name || (cat === 'Advertising' ? 'Digital Screen ' + code : nextName(cat));
    var item = {
      'Unit Code': code,
      'Unit Name': name,
      'Tenant': opt.tenant || (cat === 'Advertising' ? 'Skyview Media' : name),
      'Category': cat,
      'Terminal': terminal,
      'Zone': zone,
      'Area (m²)': area,
      'Operating Model': c.model,
      'Shape': [r1(x), r1(y), r1(w), r1(h)].join(','),
      'Lease Expiry': opt.lease || (c.model === 'Airport-operated' ? '' : leaseDates[Math.floor(rand() * leaseDates.length)]),
      'MAG (€/yr)': 0,
      'Nearest Gate': opt.gate || ''
    };
    units.push(item);
    meta[code] = {
      zoneType: zoneType, pier: opt.pier || null, pos: pos,
      locF: opt.locF || rr(0.82, 1.18), tkF: rr(0.9, 1.1),
      noise: MONTHS.map(function () { return rr(0.93, 1.07); }),
      origCat: cat, magMult: opt.magMult || 0.72
    };
    rates[code] = opt.rate || (c.rate ? Math.round(c.rate * rr(0.92, 1.08) * 100) / 100 : null);
    return item;
  }
  var rates = {};

  // Runway, taxiway and apron
  F('Runway 09/27', 'runway', 40, 16, 1520, 30, { 'Label': '09   RUNWAY 09/27   27' });
  F('Taxiway A', 'taxiway', 40, 62, 1520, 6);
  F('Apron', 'apron', 40, 76, 1520, 488);

  // Terminal shells
  F('Terminal 1', 'terminal', 80, 560, 660, 312, { 'Terminal': 'T1', 'Label': 'TERMINAL 1' });
  F('Terminal 2', 'terminal', 880, 560, 660, 312, { 'Terminal': 'T2', 'Label': 'TERMINAL 2' });
  F('T1 Airside', 'zone', 80, 560, 660, 160, { 'Terminal': 'T1', 'Zone': 'T1 Airside' });
  F('T2 Airside', 'zone', 880, 560, 660, 160, { 'Terminal': 'T2', 'Zone': 'T2 Airside' });
  F('T1 Landside', 'zone', 80, 760, 660, 112, { 'Terminal': 'T1', 'Zone': 'T1 Landside' });
  F('T2 Landside', 'zone', 880, 760, 660, 112, { 'Terminal': 'T2', 'Zone': 'T2 Landside' });
  F('T1 Security', 'security', 250, 722, 320, 36, { 'Terminal': 'T1', 'Label': 'SECURITY' });
  F('T2 Security', 'security', 1050, 722, 320, 36, { 'Terminal': 'T2', 'Label': 'SECURITY' });
  F('Airside Link', 'zone', 740, 610, 140, 60, { 'Terminal': 'Link', 'Zone': 'Airside Link', 'Label': 'AIRSIDE LINK' });
  F('Forecourt', 'road', 50, 882, 1500, 22, { 'Label': 'DEPARTURES FORECOURT' });

  // Check-in islands
  [120, 240, 360, 480].forEach(function (x, i) { F('T1 Check-in ' + 'ABCD'[i], 'checkin', x, 772, 92, 38, { 'Terminal': 'T1', 'Label': 'CHECK-IN ' + 'ABCD'[i] }); });
  [920, 1040, 1160, 1280].forEach(function (x, i) { F('T2 Check-in ' + 'EFGH'[i], 'checkin', x, 772, 92, 38, { 'Terminal': 'T2', 'Label': 'CHECK-IN ' + 'EFGH'[i] }); });

  // ------------------------------------------------------------------- piers
  // Each pier: corridor with unit column | walkway | unit column; gates on both sides.
  var PIER_MIX = {
    A: ['Café & Bakery', 'News & Convenience', 'Quick Service', 'Bar & Restaurant', 'Health & Beauty', 'Café & Bakery', 'Tech & Electronics', 'News & Convenience'],
    B: ['Café & Bakery', 'Quick Service', 'News & Convenience', 'Bar & Restaurant', 'Café & Bakery', 'Health & Beauty', 'News & Convenience', 'Quick Service'],
    C: ['Bar & Restaurant', 'Café & Bakery', 'News & Convenience', 'Health & Beauty', 'Quick Service', 'Café & Bakery', 'Fashion & Luxury', 'News & Convenience', 'Bar & Restaurant', 'Tech & Electronics'],
    D: ['Café & Bakery', 'News & Convenience', 'Quick Service', 'Café & Bakery', 'Bar & Restaurant', 'News & Convenience']
  };
  var gateBase = {};
  function pier(letter, terminal, x, yTop, yBottom, segs, gatePax, wide) {
    var w = 130;
    F('Pier ' + letter, 'pier', x, yTop, w, yBottom - yTop, { 'Terminal': terminal, 'Zone': 'Pier ' + letter, 'Label': 'PIER ' + letter });
    var segH = (yBottom - yTop - 12) / segs;
    var mix = PIER_MIX[letter];
    var u = 0, g = 0;
    for (var s = 0; s < segs; s++) {
      var y = yTop + 8 + s * segH;
      var h = segH - 6;
      var pos = 0.38 + 0.62 * (s / (segs - 1));
      // left column: units on even segments, gate holdrooms on odd; right column the opposite
      [[x + 4, s % 2 === 0, 'L'], [x + w - 48, s % 2 === 1, 'R']].forEach(function (col) {
        if (col[1]) {
          u++;
          var code = terminal + '-' + letter + '-' + (u < 10 ? '0' : '') + u;
          var cat = mix[(u - 1) % mix.length];
          var opt = { pier: letter, gate: letter + (g + 1) };
          if (letter === 'C' && u <= 6) opt.lease = ['2027-01-31', '2027-03-31', '2027-04-30', '2027-06-30', '2027-08-31', '2027-02-28'][u - 1];
          U(code, cat, terminal, 'Pier ' + letter, 'pier', col[0], y, 44, h, pos, opt);
        } else {
          g++;
          var gname = letter + g;
          F('Holdroom ' + gname, 'holdroom', col[0], y, 44, h, { 'Terminal': terminal, 'Pier': letter });
          var left = col[2] === 'L';
          var gx = left ? x : x + w;
          F('Gate ' + gname, 'gate', gx, y + h / 2, 0, 0, { 'Terminal': terminal, 'Pier': letter, 'Label': gname });
          var sw = wide ? 74 : 60;
          F('Stand ' + gname, 'stand', left ? gx - 10 - sw : gx + 10, y + h / 2 - sw / 2, sw, sw, { 'Heading': left ? '90' : '-90', 'Label': gname });
          gates.push({ name: gname, pier: letter, terminal: terminal });
          gateBase[gname] = gatePax * rr(0.85, 1.15);
        }
      });
    }
  }
  pier('A', 'T1', 170, 130, 560, 8, 17500);
  pier('B', 'T1', 500, 130, 560, 8, 18500);
  pier('C', 'T2', 1000, 96, 560, 10, 31000, true);
  pier('D', 'T2', 1330, 230, 560, 6, 15500);

  // --------------------------------------------------------- airside plazas
  function plaza(t, dx, spec) {
    var Z = t + ' Airside';
    // top row along the pier roots
    spec.top.forEach(function (x, i) {
      U(t + '-P-' + (i < 9 ? '0' : '') + (i + 1), spec.topCats[i], t, Z, 'airside', x + dx, 570, 44, 36, rr(0.55, 0.8));
    });
    var n = spec.top.length;
    spec.blocks.forEach(function (b, j) {
      var k = n + j + 1;
      U(t + '-P-' + (k < 10 ? '0' : '') + k, b.cat, t, Z, 'airside', b.x + dx, b.y, b.w, b.h, b.pos, b.opt);
    });
  }
  plaza('T1', 0, {
    top: [92, 140, 308, 356, 404, 452, 642, 690],
    topCats: ['News & Convenience', 'Café & Bakery', 'Health & Beauty', 'Fashion & Luxury', 'Quick Service', 'Café & Bakery', 'Bar & Restaurant', 'Currency Exchange'],
    blocks: [
      { cat: 'Duty Free', x: 300, y: 624, w: 200, h: 82, pos: 1, opt: { name: 'Aurora Duty Free T1', tenant: 'Aurora Duty Free', area: 2650, rate: 0.37, lease: '2031-03-31', locF: 1.05 } },
      { cat: 'Fashion & Luxury', x: 92, y: 624, w: 108, h: 82, pos: 0.7, opt: { name: 'Maison Lune', area: 640, lease: '2027-03-31', locF: 1.1 } },
      { cat: 'Health & Beauty', x: 208, y: 624, w: 78, h: 38, pos: 0.75, opt: { lease: '2027-03-31' } },
      { cat: 'Fashion & Luxury', x: 208, y: 668, w: 78, h: 38, pos: 0.7, opt: { lease: '2027-06-30' } },
      { cat: 'Bar & Restaurant', x: 512, y: 624, w: 60, h: 38, pos: 0.7 },
      { cat: 'Café & Bakery', x: 512, y: 668, w: 60, h: 38, pos: 0.8 },
      { cat: 'Bar & Restaurant', x: 578, y: 624, w: 56, h: 82, pos: 0.75, opt: { name: 'Nightflight Oyster Bar' } },
      { cat: 'Lounge', x: 642, y: 624, w: 92, h: 82, pos: 1, opt: { name: 'Aurora Lounge T1', tenant: 'Airport-operated', area: 1150 } }
    ]
  });
  plaza('T2', 0, {
    top: [890, 940, 1138, 1186, 1234, 1282, 1478],
    topCats: ['Café & Bakery', 'News & Convenience', 'Health & Beauty', 'Fashion & Luxury', 'Quick Service', 'Café & Bakery', 'News & Convenience'],
    blocks: [
      { cat: 'Duty Free', x: 1100, y: 624, w: 200, h: 82, pos: 1, opt: { name: 'Aurora Duty Free T2', tenant: 'Aurora Duty Free', area: 2400, rate: 0.36, lease: '2031-03-31' } },
      { cat: 'Tech & Electronics', x: 892, y: 624, w: 68, h: 38, pos: 0.6, opt: { name: 'Volt Electronics', locF: 0.42, magMult: 1.9, lease: '2028-12-31' } },
      { cat: 'Quick Service', x: 892, y: 668, w: 68, h: 38, pos: 0.7 },
      { cat: 'Bar & Restaurant', x: 966, y: 624, w: 124, h: 82, pos: 0.85, opt: { name: 'Skyline Kitchen & Bar', area: 560 } },
      { cat: 'Fashion & Luxury', x: 1312, y: 624, w: 60, h: 38, pos: 0.7 },
      { cat: 'Health & Beauty', x: 1312, y: 668, w: 60, h: 38, pos: 0.75 },
      { cat: 'Café & Bakery', x: 1378, y: 624, w: 56, h: 82, pos: 0.8 },
      { cat: 'Lounge', x: 1440, y: 624, w: 94, h: 82, pos: 1, opt: { name: 'Polaris Lounge T2', tenant: 'Airport-operated', area: 1300 } }
    ]
  });

  // ----------------------------------------------------------- airside link
  [750, 784, 818, 852].forEach(function (x, i) { U('LK-0' + (i + 1), 'Advertising', 'Link', 'Airside Link', 'link', x, 616, 26, 14, 1, { area: 12 }); });
  [767, 801, 835].forEach(function (x, i) { U('LK-0' + (i + 5), 'Advertising', 'Link', 'Airside Link', 'link', x, 650, 26, 14, 1, { area: 12 }); });

  // --------------------------------------------------------------- landside
  function landside(t, x0, cats, cornerName) {
    var Z = t + ' Landside';
    cats.forEach(function (cat, i) {
      U(t + '-L-0' + (i + 1), cat, t, Z, 'landside', x0 + i * 70, 826, 64, 36, rr(0.22, 0.42));
    });
    U(t + '-L-0' + (cats.length + 1), 'Advertising', t, Z, 'landside', x0 + 4, 816, 30, 8, 1, { area: 10 });
    if (cornerName) {
      U(t + '-L-0' + (cats.length + 2), 'Café & Bakery', t, Z, 'landside', x0 + 512, 772, 128, 90, 0.3,
        { name: cornerName, area: 265, locF: 0.32, lease: '2027-01-31' });
    }
  }
  landside('T1', 92, ['Café & Bakery', 'News & Convenience', 'Health & Beauty', 'Currency Exchange', 'Quick Service', 'Car Rental', 'News & Convenience'], 'Arrivals Coffee House');
  landside('T2', 892, ['News & Convenience', 'Café & Bakery', 'Quick Service', 'Currency Exchange', 'Health & Beauty', 'Café & Bakery', 'Bar & Restaurant'], null);

  // -------------------------------------------------------------- car parks
  U('GR-01', 'Parking', 'Ground', 'Car Parks & Ground', 'ground', 110, 916, 300, 72, 1.0, { name: 'Multi-Storey Car Park 1', tenant: 'Airport-operated', area: 28000, pier: 'T1' });
  U('GR-02', 'Car Rental', 'Ground', 'Car Parks & Ground', 'ground', 430, 916, 170, 72, 0.9, { name: 'Car Rental Centre', tenant: '4 rental brands', area: 6400, lease: '2027-12-31', pier: 'ALL' });
  U('GR-03', 'Parking', 'Ground', 'Car Parks & Ground', 'ground', 620, 916, 330, 72, 0.55, { name: 'Long Stay Car Park', tenant: 'Airport-operated', area: 61000, pier: 'ALL', locF: 0.9 });
  U('GR-04', 'Parking', 'Ground', 'Car Parks & Ground', 'ground', 970, 916, 300, 72, 1.0, { name: 'Multi-Storey Car Park 2', tenant: 'Airport-operated', area: 31000, pier: 'T2' });
  U('GR-05', 'Parking', 'Ground', 'Car Parks & Ground', 'ground', 1290, 916, 200, 72, 0.25, { name: 'Premium Valet', tenant: 'Airport-operated', area: 7200, pier: 'ALL', locF: 1.6 });

  // Unit codes inside plazas got assigned sequentially; fix name uniqueness for display
  var seen = {};
  units.forEach(function (u) {
    var n = u['Unit Name'];
    if (seen[n]) { u['Unit Name'] = n + ' (' + u['Zone'] + ')'; if (u['Tenant'] === n) u['Tenant'] = u['Unit Name']; }
    seen[n] = true;
  });

  // ------------------------------------------------------------ passengers
  var PIER_TERMINAL = { A: 'T1', B: 'T1', C: 'T2', D: 'T2' };
  var gatePax = { Actual: {}, Budget: {} };
  (function buildGatePax() {
    gates.forEach(function (g) {
      gatePax.Actual[g.name] = MONTHS.map(function (m, i) { return gateBase[g.name] * SEASON[i] * rr(0.95, 1.06); });
      gatePax.Budget[g.name] = MONTHS.map(function (m, i) { return gateBase[g.name] * SEASON[i] * 1.02; });
    });
    // Planted story: from May, B1-B5 lose 62% of their flights to Pier C
    for (var i = SHIFT_FROM; i < 12; i++) {
      var moved = 0;
      ['B1', 'B2', 'B3', 'B4', 'B5'].forEach(function (g) { var cut = gatePax.Actual[g][i] * 0.62; gatePax.Actual[g][i] -= cut; moved += cut; });
      var cGates = gates.filter(function (g) { return g.pier === 'C'; });
      cGates.forEach(function (g) { gatePax.Actual[g.name][i] += moved * 0.92 / cGates.length; });
    }
  })();

  function pierPax(letter, m, ver) {
    var s = 0;
    gates.forEach(function (g) { if (g.pier === letter) s += gatePax[ver][g.name][m]; });
    return s;
  }
  function termDep(t, m, ver) {
    var s = 0;
    gates.forEach(function (g) { if (g.terminal === t) s += gatePax[ver][g.name][m]; });
    return s;
  }

  function exposure(u, md, m, ver) {
    switch (md.zoneType) {
      case 'pier': return pierPax(md.pier, m, ver) * md.pos;
      case 'airside': return termDep(u['Terminal'], m, ver) * md.pos;
      case 'landside': return termDep(u['Terminal'], m, ver) * 2.15 * md.pos;
      case 'link': return (termDep('T1', m, ver) + termDep('T2', m, ver)) * 0.16;
      case 'ground':
        if (md.pier === 'T1' || md.pier === 'T2') return termDep(md.pier, m, ver) * 2 * md.pos;
        return (termDep('T1', m, ver) + termDep('T2', m, ver)) * 2 * md.pos;
    }
    return 0;
  }

  // Annual MAG = a share of the budgeted annual fee at the original category
  units.forEach(function (u) {
    var md = meta[u['Unit Code']];
    var c = CATS[md.origCat];
    if (c.model !== 'Concession') return;
    var budgetFee = 0;
    for (var m = 0; m < 12; m++) budgetFee += exposure(u, md, m, 'Budget') * c.conv * md.locF * c.ticket * rates[u['Unit Code']];
    u['MAG (€/yr)'] = Math.round(budgetFee * md.magMult / 1000) * 1000;
  });

  // -------------------------------------------------------- the "model"
  function calc(u, m, ver) {
    var code = u['Unit Code'];
    var md = meta[code];
    var cat = ver === 'Budget' ? md.origCat : u['Category'];
    var c = CATS[cat];
    var area = u['Area (m²)'];
    var pax = exposure(u, md, m, ver);
    var noise = ver === 'Budget' ? 1 : md.noise[m];
    var tk = ver === 'Budget' ? 1 : md.tkF;
    var tx = pax * c.conv * md.locF * noise;
    var sales = tx * c.ticket * tk;
    var rate = ver === 'Budget' ? (CATS[md.origCat].rate ? rates[code + ':orig'] || rates[code] : 0) : rates[code];
    var conc = 0, other = 0, direct = 0;
    var alloc = area * SPACE_COST[md.zoneType];
    if (c.model === 'Concession') {
      conc = Math.max((u['MAG (€/yr)'] || 0) / 12, sales * rate);
      other = area * SERVICE_CHARGE;
      direct = area * DIRECT_COST;
    } else if (c.model === 'Media') {
      conc = sales * rate;
      direct = 350;
    } else {
      conc = sales;
      direct = sales * c.costRatio + c.fixed;
    }
    return { sales: sales, conc: conc, other: other, direct: direct, alloc: alloc,
      profit: conc + other - direct - alloc, tx: tx, pax: pax };
  }
  units.forEach(function (u) { rates[u['Unit Code'] + ':orig'] = rates[u['Unit Code']]; });

  var KPI_COLS = ['Tenant Sales', 'Concession Income', 'Other Income', 'Direct Cost', 'Allocated Cost',
    'Airport Profit', 'Budget Profit', 'Transactions', 'Passengers Exposed', 'Budget Passengers Exposed', 'Revenue Share'];

  function aggUnit(u, idx) {
    var a = { sales: 0, conc: 0, other: 0, direct: 0, alloc: 0, profit: 0, budget: 0, tx: 0, pax: 0, bpax: 0 };
    idx.forEach(function (m) {
      var x = calc(u, m, 'Actual');
      var b = calc(u, m, 'Budget');
      a.sales += x.sales; a.conc += x.conc; a.other += x.other; a.direct += x.direct; a.alloc += x.alloc;
      a.profit += x.profit; a.tx += x.tx; a.pax += x.pax; a.budget += b.profit; a.bpax += b.pax;
    });
    return a;
  }

  function monthIdx(sel) {
    var out = [];
    (sel || []).forEach(function (s) { var i = MONTHS.indexOf(s); if (i >= 0) out.push(i); });
    return out.length ? out : [9];
  }
  function pageSel(pageDefs, alias) {
    for (var i = 0; i < (pageDefs || []).length; i++) if (pageDefs[i].alias === alias) return pageDefs[i].selection;
    return null;
  }

  var VIEWS = {
    unitKpis: function (pageDefs) {
      var idx = monthIdx(pageSel(pageDefs, 'months'));
      var cells = KPI_COLS.map(function () { return []; });
      units.forEach(function (u) {
        var a = aggUnit(u, idx);
        var vals = [a.sales, a.conc, a.other, a.direct, a.alloc, a.profit, a.budget, a.tx, a.pax, a.bpax, rates[u['Unit Code']]];
        vals.forEach(function (v, c) { cells[c].push(v === null || v === undefined ? null : Math.round(v * 100) / 100); });
      });
      return { labels: { rows: units.map(function (u) { return [u['Unit Code']]; }), columns: KPI_COLS.map(function (c) { return [c]; }) }, cells: cells };
    },
    unitTrend: function (pageDefs) {
      var sel = pageSel(pageDefs, 'units');
      var code = sel && sel[0];
      var u = units.filter(function (x) { return x['Unit Code'] === code; })[0];
      var cols = ['Airport Profit', 'Budget Profit', 'Tenant Sales', 'Transactions'];
      var cells = cols.map(function () { return []; });
      MONTHS.forEach(function (m, i) {
        if (!u) { cells.forEach(function (c) { c.push(null); }); return; }
        var x = calc(u, i, 'Actual'), b = calc(u, i, 'Budget');
        cells[0].push(Math.round(x.profit)); cells[1].push(Math.round(b.profit));
        cells[2].push(Math.round(x.sales)); cells[3].push(Math.round(x.tx));
      });
      return { labels: { rows: MONTHS.map(function (m) { return [m]; }), columns: cols.map(function (c) { return [c]; }) }, cells: cells };
    },
    gatePax: function (pageDefs) {
      var idx = monthIdx(pageSel(pageDefs, 'months'));
      var a = [], b = [];
      gates.forEach(function (g) {
        var s = 0, t = 0;
        idx.forEach(function (m) { s += gatePax.Actual[g.name][m]; t += gatePax.Budget[g.name][m]; });
        a.push(Math.round(s)); b.push(Math.round(t));
      });
      return { labels: { rows: gates.map(function (g) { return [g.name]; }), columns: [['Departing Pax'], ['Budget Departing Pax']] }, cells: [a, b] };
    }
  };
  var LISTS = { units: units, features: features };

  // ------------------------------------------------------- subscriptions
  var vizSubs = [];
  var listSubs = [];

  function loadingShape() {
    return { labels: { rows: [{ kind: 'loading' }], columns: [['Loading']] }, cells: [[{ kind: 'loading' }]], rowOffset: 0, totalRowCount: 0 };
  }
  function emitViz(sub, delay) {
    if (sub.dead) return;
    clearTimeout(sub.t);
    try { sub.h.onData(loadingShape()); } catch (e) { console.error(e); }
    sub.t = setTimeout(function () {
      if (sub.dead) return;
      var d = VIEWS[sub.alias](sub.page);
      var off = (sub.scroll && sub.scroll.offset) || 0;
      var n = Math.min((sub.scroll && sub.scroll.numberOfRows) || 1000, 1000);
      var total = d.labels.rows.length;
      d.labels.rows = d.labels.rows.slice(off, off + n);
      d.cells = d.cells.map(function (col) { return col.slice(off, off + n); });
      d.rowOffset = off; d.totalRowCount = total;
      try { sub.h.onData(d); } catch (e) { console.error(e); }
    }, delay === undefined ? 180 : delay);
  }
  function emitList(sub) {
    if (sub.dead) return;
    setTimeout(function () {
      if (sub.dead) return;
      var items = LISTS[sub.alias].map(function (it) { var o = {}; for (var k in it) o[k] = it[k]; return o; });
      try { sub.h.onData({ items: items, partialResult: false }); } catch (e) { console.error(e); }
    }, 60);
  }
  function recalcAll() {
    listSubs.forEach(function (s) { if (s.alias === 'units') emitList(s); });
    vizSubs.forEach(function (s) { emitViz(s, 650); });
  }

  var SDK = {
    subscribeToVizualization: function (alias, h) {
      var sub = { alias: alias, h: h, page: h.pageDefinitions || [], scroll: h.scroll };
      if (!VIEWS[alias]) {
        setTimeout(function () { h.onError && h.onError({ message: 'No View is bound to the alias "' + alias + '".' }); }, 0);
        return { unsubscribe: function () {}, updatePageDefinitions: function () {}, updateScroll: function () {} };
      }
      vizSubs.push(sub);
      emitViz(sub);
      return {
        unsubscribe: function () { sub.dead = true; clearTimeout(sub.t); vizSubs = vizSubs.filter(function (s) { return s !== sub; }); },
        updatePageDefinitions: function (p) { sub.page = p || []; emitViz(sub, 120); },
        updateScroll: function (s) { sub.scroll = s; emitViz(sub, 60); }
      };
    },
    subscribeToItems: function (alias, h) {
      var sub = { alias: alias, h: h };
      if (!LISTS[alias]) {
        setTimeout(function () { h.onError && h.onError({ message: 'No List is bound to the alias "' + alias + '".' }); }, 0);
        return { unsubscribe: function () {} };
      }
      listSubs.push(sub);
      emitList(sub);
      return { unsubscribe: function () { sub.dead = true; listSubs = listSubs.filter(function (s) { return s !== sub; }); } };
    },
    addItem: function () { return Promise.reject(new Error('addItem is not used by this Frame.')); },
    editItem: function (alias, itemName, values) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          if (alias !== 'units') return reject(new Error('List "' + alias + '" is read-only in this prototype.'));
          var u = units.filter(function (x) { return x['Unit Code'] === itemName; })[0];
          if (!u) return reject(new Error('Item "' + itemName + '" not found.'));
          for (var k in values) {
            if (k === 'Category' && !CATS[values[k]]) return reject(new Error('Unknown category "' + values[k] + '".'));
            u[k] = values[k];
          }
          resolve();
          recalcAll();
        }, 220);
      });
    },
    editValue: function (alias, coords, value) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          if (alias !== 'revenueShare') return reject(new Error('Metric "' + alias + '" is not writable.'));
          var code = coords && coords.units;
          if (!(code in rates)) return reject(new Error('Unit "' + code + '" not found.'));
          rates[code] = value === null ? null : Number(value);
          resolve();
          recalcAll();
        }, 220);
      });
    }
  };

  window.PigmentSDK = Object.freeze(SDK);
})();
