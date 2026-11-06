/*
 * Mock PigmentSDK: Manchester Airport (MAN) edition.
 *
 * Stands in for window.PigmentSDK outside Pigment. It serves the same binding
 * aliases the Frame uses, with the same data shapes (column-major cells,
 * label paths, loading states), and recalculates after writes the way a
 * Pigment model would. In Pigment this file is NOT used.
 *
 * LAYOUT: a schematic of the real arrangement, rotated so the runways run
 * left to right (true north points up and to the right). It shows Terminal 2
 * with Pier 1 and Pier 2, Terminal 3 and its extension into the former
 * Terminal 1, Terminal 1 (closed 15 March 2026), The Station and Skylink,
 * runways 05L/23R and 05R/23L, and the official car parks. The schematic is
 * not survey-accurate. Gate labels are illustrative.
 *
 * DATA: all passenger, sales and profit figures by unit are ILLUSTRATIVE.
 * Total passengers are set near Manchester's public 2025 figure (32.1M);
 * everything below that level is invented. Tenant units use generic names on
 * purpose, so no invented figures are attached to real brands.
 * Airport-run assets (lounges, car parks) use their public names.
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

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = mulberry32(20260315);
  function rr(a, b) { return a + (b - a) * rand(); }
  function r1(v) { return Math.round(v * 10) / 10; }

  var MONTHS = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026',
    'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026'];
  // Departing passengers per month, millions (illustrative; ~32.8M total pax for 2026)
  var DEP = [1.02, 0.98, 1.18, 1.36, 1.46, 1.58, 1.74, 1.80, 1.58, 1.42, 1.10, 1.18];
  // Terminal shares of departing pax. T1 closed 15 Mar 2026.
  // Budget assumed more of T1's traffic would land in the T3 extension than it did.
  var SHARE = {
    Actual: MONTHS.map(function (m, i) { return i < 2 ? { T1: 0.10, T2: 0.66, T3: 0.24 } : i === 2 ? { T1: 0.05, T2: 0.70, T3: 0.25 } : { T1: 0, T2: 0.765, T3: 0.235 }; }),
    Budget: MONTHS.map(function (m, i) { return i < 2 ? { T1: 0.10, T2: 0.66, T3: 0.24 } : i === 2 ? { T1: 0.05, T2: 0.68, T3: 0.27 } : { T1: 0, T2: 0.71, T3: 0.29 }; })
  };
  // Pier 2 opened in 2025; its units were still building trade early in 2026.
  var P2_RAMP = { Actual: [0.62, 0.66, 0.72, 0.8, 0.88, 0.95, 1, 1, 1, 1, 1, 1], Budget: [0.9, 0.9, 0.92, 0.94, 0.96, 0.98, 1, 1, 1, 1, 1, 1] };

  // conv = transactions per exposed passenger, ticket = average spend (GBP),
  // rate = default revenue share to the airport.
  var CATS = {
    'Duty Free':           { model: 'Concession', conv: 0.17, ticket: 46, rate: 0.36 },
    'Fashion & Luxury':    { model: 'Concession', conv: 0.006, ticket: 150, rate: 0.16 },
    'Jewellery & Watches': { model: 'Concession', conv: 0.006, ticket: 140, rate: 0.16 },
    'Toys & Gifts':        { model: 'Concession', conv: 0.014, ticket: 34, rate: 0.17 },
    'Health & Beauty':     { model: 'Concession', conv: 0.03, ticket: 30, rate: 0.17 },
    'Tech & Electronics':  { model: 'Concession', conv: 0.012, ticket: 62, rate: 0.12 },
    'News & Convenience':  { model: 'Concession', conv: 0.075, ticket: 9.5, rate: 0.20 },
    'Café & Bakery':       { model: 'Concession', conv: 0.07, ticket: 7.2, rate: 0.15 },
    'Bar & Restaurant':    { model: 'Concession', conv: 0.04, ticket: 26, rate: 0.15 },
    'Quick Service':       { model: 'Concession', conv: 0.06, ticket: 11, rate: 0.13 },
    'Currency Exchange':   { model: 'Concession', conv: 0.015, ticket: 22, rate: 0.30 },
    'Car Rental':          { model: 'Concession', conv: 0.007, ticket: 230, rate: 0.12 },
    'Lounge':              { model: 'Airport-operated', conv: 0.02, ticket: 38, costRatio: 0.48, fixed: 36000 },
    'Parking':             { model: 'Airport-operated', conv: 0.17, ticket: 60, costRatio: 0.30, fixed: 70000 },
    'Advertising':         { model: 'Media', conv: 1, ticket: 0.03, rate: 0.55 }
  };
  // Scale non-duty-free concessions so retail + F&B spend lands near GBP 18-20 per departing passenger
  Object.keys(CATS).forEach(function (k) { if (CATS[k].model === 'Concession' && k !== 'Duty Free') CATS[k].conv *= 0.62; });
  var GENERIC = {
    'Café & Bakery': ['Coffee house', 'Bakery café', 'Espresso bar', 'Coffee kiosk', 'Café & deli'],
    'Bar & Restaurant': ['Pub & kitchen', 'Cocktail bar', 'Gin bar', 'Restaurant', 'Alehouse'],
    'Quick Service': ['Burger counter', 'Noodle bar', 'Sandwich shop', 'Pizza counter', 'Grab & go'],
    'News & Convenience': ['Books & news', 'Travel essentials', 'News kiosk'],
    'Health & Beauty': ['Pharmacy', 'Bath & body', 'Fragrance & beauty'],
    'Fashion & Luxury': ['Accessories', 'Luxury fashion', 'Sunglasses', 'Travel fashion'],
    'Jewellery & Watches': ['Jewellery', 'Watches'],
    'Toys & Gifts': ['Toy store', 'Gifts & souvenirs'],
    'Tech & Electronics': ['Tech accessories', 'Headphones & audio'],
    'Currency Exchange': ['Currency exchange'],
    'Duty Free': ['Duty free'],
    'Advertising': ['Digital screen']
  };
  var SPACE_COST = { pier: 52, airside: 60, landside: 46, link: 40, station: 40, ground: 2.6 };
  var SERVICE_CHARGE = 26;
  var DIRECT_COST = 8;

  var features = [], units = [], gates = [], meta = {}, rates = {};
  var nameIdx = {};

  function F(name, type, x, y, w, h, extra) {
    var o = { 'Feature': name, 'Type': type, 'Shape': [r1(x), r1(y), r1(w), r1(h)].join(',') };
    if (extra) for (var k in extra) o[k] = extra[k];
    features.push(o);
    return o;
  }
  var leaseDates = ['2027-03-31', '2027-09-30', '2027-12-31', '2028-03-31', '2028-09-30', '2029-03-31',
    '2029-12-31', '2030-03-31', '2030-09-30', '2031-03-31', '2032-03-31'];

  function U(code, cat, terminal, zone, zoneType, x, y, w, h, pos, opt) {
    opt = opt || {};
    var c = CATS[cat];
    var shortCode = code.split('-').slice(1).join('-');
    var base;
    if (opt.name) base = opt.name;
    else {
      var pool = GENERIC[cat] || [cat];
      var i = nameIdx[cat] || 0; nameIdx[cat] = i + 1;
      base = pool[i % pool.length] + ' · ' + shortCode;
    }
    var item = {
      'Unit Code': code,
      'Unit Name': base,
      'Tenant': opt.tenant || (c.model === 'Airport-operated' ? 'Airport-operated' : cat === 'Advertising' ? 'Media concession' : 'Concessionaire'),
      'Category': cat,
      'Terminal': terminal,
      'Zone': zone,
      'Area (m²)': opt.area || Math.max(8, Math.round(w * h * 0.06 / 5) * 5),
      'Operating Model': c.model,
      'Shape': [r1(x), r1(y), r1(w), r1(h)].join(','),
      'Lease Expiry': opt.lease || (c.model === 'Airport-operated' ? '' : leaseDates[Math.floor(rand() * leaseDates.length)]),
      'MAG (£/yr)': 0,
      'Nearest Gate': opt.gate || ''
    };
    units.push(item);
    meta[code] = {
      zoneType: zoneType, pier: opt.pier || null, pos: pos, term: opt.term || terminal,
      locF: opt.locF || rr(0.82, 1.18), tkF: rr(0.9, 1.1), ticket: opt.ticket || null,
      noise: MONTHS.map(function () { return rr(0.93, 1.07); }),
      origCat: cat, magMult: opt.magMult || 0.72
    };
    rates[code] = opt.rate || (c.rate ? Math.round(c.rate * rr(0.92, 1.08) * 100) / 100 : null);
    return item;
  }

  // ------------------------------------------------------------ airfield
  F('Apron', 'apron', 20, 524, 1560, 350);
  F('Taxiway', 'taxiway', 20, 880, 1560, 6);
  F('Runway 05L/23R', 'runway', 30, 896, 1540, 26, { 'Label': 'RUNWAY 05L/23R · 3,048 m', 'Ends': '05L|23R' });
  F('Runway 05R/23L', 'runway', 20, 958, 1290, 26, { 'Label': 'RUNWAY 05R/23L · 3,050 m', 'Ends': '05R|23L' });
  F('North', 'compass', 1480, 940, 40, 40, { 'Heading': '40' });

  // ------------------------------------------------------- landside spine
  F('Terminal road', 'road', 20, 166, 1560, 16, { 'Label': 'TERMINAL ROAD' });
  F('The Station', 'station', 860, 26, 200, 134, { 'Terminal': 'Landside', 'Label': 'THE STATION', 'Sub': 'RAIL · METROLINK · COACH', 'LabelX': '960', 'LabelY': '50' });
  F('Station link', 'walkway', 948, 160, 24, 34, { 'Terminal': 'Landside' });
  F('Skylink', 'walkway', 280, 190, 1200, 16, { 'Terminal': 'Landside', 'Zone': 'Skylink', 'Label': 'SKYLINK', 'LabelX': '700', 'LabelY': '201' });
  F('Skylink T2', 'walkway', 1150, 206, 20, 16, { 'Terminal': 'Landside' });
  F('Skylink T3', 'walkway', 420, 206, 20, 16, { 'Terminal': 'Landside' });

  // ----------------------------------------------------------- terminals
  F('Terminal 3', 'terminal', 40, 222, 480, 298, { 'Terminal': 'T3', 'Label': 'TERMINAL 3', 'LabelX': '280', 'LabelY': '219' });
  F('Terminal 1', 'closed', 528, 222, 264, 298, { 'Terminal': 'T1', 'Label': 'TERMINAL 1', 'Sub': 'CLOSED 15 MARCH 2026', 'LabelX': '660', 'LabelY': '366' });
  F('Terminal 2', 'terminal', 810, 222, 760, 298, { 'Terminal': 'T2', 'Label': 'TERMINAL 2', 'LabelX': '1190', 'LabelY': '219' });
  F('T3 Landside', 'zone', 40, 222, 480, 78, { 'Terminal': 'T3', 'Zone': 'T3 Landside' });
  F('T3 Airside', 'zone', 40, 330, 340, 190, { 'Terminal': 'T3', 'Zone': 'T3 Airside' });
  F('T3 Extension', 'zone', 384, 330, 136, 190, { 'Terminal': 'T3', 'Zone': 'T3 Extension', 'Label': 'T3 EXTENSION', 'LabelX': '452', 'LabelY': '338', 'Small': '1' });
  F('T2 Landside', 'zone', 810, 222, 760, 78, { 'Terminal': 'T2', 'Zone': 'T2 Landside' });
  F('T2 Airside', 'zone', 810, 330, 760, 190, { 'Terminal': 'T2', 'Zone': 'T2 Airside' });
  F('T3 Security', 'security', 120, 302, 240, 26, { 'Terminal': 'T3', 'Label': 'SECURITY' });
  F('T2 Security', 'security', 1000, 302, 380, 26, { 'Terminal': 'T2', 'Label': 'SECURITY' });
  [60, 145, 230].forEach(function (x, i) { F('T3 Check-in ' + (i + 1), 'checkin', x, 228, 74, 28, { 'Terminal': 'T3', 'Label': 'CHECK-IN' }); });
  [900, 987, 1074, 1161, 1248].forEach(function (x, i) { F('T2 Check-in ' + (i + 1), 'checkin', x, 228, 72, 28, { 'Terminal': 'T2', 'Label': 'CHECK-IN' }); });

  // ---------------------------------------------------------------- piers
  var gateW = {};
  function pier(zone, key, terminal, x, yRoot, yTip, segs, weight, wide, mix, opts) {
    opts = opts || {};
    var w = 130;
    F(zone, opts.ghost ? 'ghostpier' : 'pier', x, yRoot, w, yTip - yRoot, { 'Terminal': terminal, 'Zone': opts.ghost ? '' : zone, 'Label': opts.label || zone.toUpperCase(), 'LabelX': String(x + w / 2), 'LabelY': String(yTip + 16) });
    var segH = (yTip - yRoot - 10) / segs;
    var u = 0, g = 0;
    for (var s = 0; s < segs; s++) {
      var y = yRoot + 5 + s * segH, h = segH - 5;
      var pos = 1 - 0.6 * (s / Math.max(1, segs - 1));
      [[x + 4, s % 2 === 0, 'L'], [x + w - 48, s % 2 === 1, 'R']].forEach(function (col) {
        if (col[1] && !opts.ghost) {
          u++;
          var code = terminal + '-' + key + '-' + (u < 10 ? '0' : '') + u;
          var cat = mix[(u - 1) % mix.length];
          var o = { pier: zone, gate: key + '·' + (g + 1) };
          if (opts.leases && opts.leases[u - 1]) o.lease = opts.leases[u - 1];
          if (opts.special && opts.special[u]) { var sp = opts.special[u]; cat = sp.cat || cat; for (var k in sp) if (k !== 'cat') o[k] = sp[k]; }
          U(code, cat, terminal, zone, 'pier', col[0], y, 44, h, pos, o);
        } else if (!col[1]) {
          g++;
          var gname = key + '·' + g;
          var left = col[2] === 'L';
          var gx = left ? x : x + w;
          if (!opts.ghost) F('Holdroom ' + gname, 'holdroom', col[0], y, 44, h, { 'Terminal': terminal, 'Pier': zone });
          F('Gate ' + gname, 'gate', gx, y + h / 2, 0, 0, { 'Terminal': terminal, 'Pier': zone, 'Label': gname, 'Closed': opts.ghost ? '1' : '' });
          var sw = Math.min(wide ? 70 : 58, segH * 2 - 4);
          if (!opts.ghost) F('Stand ' + gname, 'stand', left ? gx - 10 - sw : gx + 10, y + h / 2 - sw / 2, sw, sw, { 'Heading': left ? '90' : '-90', 'Terminal': terminal, 'Pier': zone });
          gates.push({ name: gname, pier: zone, terminal: terminal });
          gateW[gname] = weight * rr(0.85, 1.15);
        }
      });
    }
  }
  pier('Pier 1', 'P1', 'T2', 880, 524, 842, 11, 1.0, false,
    ['Duty Free', 'Café & Bakery', 'News & Convenience', 'Quick Service', 'Bar & Restaurant', 'Health & Beauty', 'Café & Bakery', 'Tech & Electronics', 'News & Convenience', 'Quick Service', 'Café & Bakery'],
    { leases: ['2031-03-31', '2027-03-31', '2027-06-30', '2027-03-31', '2027-09-30'], special: { 1: { name: 'Duty free express · Pier 1', area: 240, locF: 0.3 }, 8: { name: 'Tech accessories · P1-08', locF: 0.45, magMult: 2.1, lease: '2029-03-31' } } });
  pier('Pier 2', 'P2', 'T2', 1380, 524, 862, 12, 1.3, true,
    ['Duty Free', 'Bar & Restaurant', 'Café & Bakery', 'Fashion & Luxury', 'News & Convenience', 'Quick Service', 'Health & Beauty', 'Café & Bakery', 'Jewellery & Watches', 'News & Convenience', 'Bar & Restaurant', 'Café & Bakery'],
    { special: { 1: { name: 'Duty free express · Pier 2', area: 260, locF: 0.32 } } });
  pier('T3 Pier', 'T3', 'T3', 150, 524, 780, 8, 1.15, false,
    ['Café & Bakery', 'News & Convenience', 'Quick Service', 'Bar & Restaurant', 'Café & Bakery', 'Quick Service', 'News & Convenience', 'Café & Bakery']);
  pier('T1 pier (closed)', 'T1', 'T1', 600, 524, 720, 6, 1.0, false, [], { ghost: true, label: 'T1 PIER · CLOSED' });

  // -------------------------------------------------------- T2 airside
  var T2A = 'T2 Airside';
  function t2(code, cat, x, y, w, h, pos, opt) { return U('T2-' + code, cat, 'T2', T2A, 'airside', x, y, w, h, pos, opt); }
  U('T2-DF', 'Duty Free', 'T2', T2A, 'airside', 1080, 338, 220, 74, 1, { name: 'Walk-through duty free · T2', area: 2165, rate: 0.37, lease: '2032-03-31', locF: 1.05 });
  var fh = ['Quick Service', 'Quick Service', 'Café & Bakery', 'Bar & Restaurant', 'Quick Service', 'Quick Service', 'Café & Bakery', 'Bar & Restaurant'];
  var fhNames = ['Pizza', 'Burgers', 'Bakery', 'Taproom', 'Asian street food', 'Deli', 'Desserts', 'Food hall bar'];
  fh.forEach(function (cat, i) {
    var col = i % 4, row = Math.floor(i / 4);
    U('T2-FH-0' + (i + 1), cat, 'T2', T2A, 'airside', 1080 + col * 55, 418 + row * 50, 52, 44, 0.9, { name: 'Food hall · ' + fhNames[i], lease: '2030-09-30' });
  });
  var wingCats = ['Books & news', 'Health & Beauty', 'Fashion & Luxury', 'Café & Bakery', 'Toys & Gifts', 'Jewellery & Watches', 'Health & Beauty', 'Currency Exchange', 'Fashion & Luxury', 'News & Convenience'];
  wingCats[0] = 'News & Convenience';
  [820, 1310].forEach(function (x0, side) {
    for (var i = 0; i < 10; i++) {
      var col = i % 5, row = Math.floor(i / 5);
      var cat = wingCats[(i + side * 3) % wingCats.length];
      t2((side ? 'E' : 'W') + '-' + (i < 9 ? '0' : '') + (i + 1), cat, x0 + col * 51, 340 + row * 44, 46, 38, rr(0.55, 0.85));
    }
  });
  U('T2-LG-01', 'Lounge', 'T2', T2A, 'airside', 820, 430, 110, 82, 1, { name: 'Escape Lounge · T2', tenant: 'Airport-operated', area: 950, locF: 1.0 });
  t2('W-11', 'Bar & Restaurant', 936, 430, 64, 82, 0.8, { area: 320 });
  t2('W-12', 'Café & Bakery', 1006, 430, 64, 82, 0.85, { area: 260 });
  t2('E-11', 'Bar & Restaurant', 1310, 430, 64, 82, 0.8, { area: 300 });
  t2('E-12', 'Fashion & Luxury', 1380, 430, 64, 82, 0.7, { name: 'Luxury fashion · E-12', area: 280, lease: '2027-06-30' });
  U('T2-LG-02', 'Lounge', 'T2', T2A, 'airside', 1450, 430, 112, 82, 1, { name: '1903 Lounge', tenant: 'Airport-operated', area: 1100, ticket: 72, locF: 0.55 });

  // -------------------------------------------------------- T2 landside
  var T2L = 'T2 Landside';
  ['News & Convenience', 'Café & Bakery', 'Health & Beauty', 'Quick Service', 'Currency Exchange', 'Café & Bakery'].forEach(function (cat, i) {
    U('T2-L-0' + (i + 1), cat, 'T2', T2L, 'landside', 900 + i * 68, 264, 62, 32, rr(0.25, 0.45));
  });
  U('T2-L-07', 'Duty Free', 'T2', T2L, 'landside', 1330, 228, 60, 68, 0.12, { name: 'Arrivals duty free', area: 180, rate: 0.3, locF: 0.12 });
  U('T2-L-08', 'Café & Bakery', 'T2', T2L, 'landside', 1398, 228, 104, 68, 0.3, { name: 'Arrivals café · T2', area: 290, locF: 0.16, lease: '2027-03-31' });
  U('T2-L-09', 'News & Convenience', 'T2', T2L, 'landside', 1508, 228, 54, 32, 0.25, { name: 'Arrivals news · T2' });
  U('T2-L-10', 'Currency Exchange', 'T2', T2L, 'landside', 1508, 264, 54, 32, 0.25, { name: 'Currency exchange · arrivals' });

  // ---------------------------------------------------------------- T3
  var T3A = 'T3 Airside';
  ['Café & Bakery', 'News & Convenience', 'Quick Service', 'Health & Beauty', 'Café & Bakery', 'Bar & Restaurant', 'Currency Exchange'].forEach(function (cat, i) {
    U('T3-A-0' + (i + 1), cat, 'T3', T3A, 'airside', 50 + i * 47, 340, 42, 38, rr(0.6, 0.9));
  });
  U('T3-DF', 'Duty Free', 'T3', T3A, 'airside', 50, 386, 150, 54, 1, { name: 'Duty free · T3', area: 820, rate: 0.35, lease: '2030-03-31', locF: 0.55 });
  U('T3-LG-01', 'Lounge', 'T3', T3A, 'airside', 208, 386, 100, 54, 1, { name: 'Escape Lounge · T3', tenant: 'Airport-operated', area: 620, locF: 0.7 });
  ['Quick Service', 'Café & Bakery', 'Bar & Restaurant', 'News & Convenience', 'Quick Service'].forEach(function (cat, i) {
    U('T3-A-' + (i < 2 ? '0' : '') + (i + 8), cat, 'T3', T3A, 'airside', 50 + i * 64, 448, 58, 64, rr(0.6, 0.9));
  });
  // T3 extension into former T1 space, opened 2026: new leases, budget expected more passengers
  [['Bar & Restaurant', 388, 344, 62, 80], ['Health & Beauty', 456, 344, 60, 80], ['Café & Bakery', 388, 430, 62, 82], ['Fashion & Luxury', 456, 430, 60, 82]].forEach(function (s, i) {
    U('T3-X-0' + (i + 1), s[0], 'T3', 'T3 Extension', 'airside', s[1], s[2], s[3], s[4], 0.65, { lease: '2031-03-31', magMult: 0.95 });
  });
  ['Café & Bakery', 'News & Convenience', 'Quick Service', 'Car Rental'].forEach(function (cat, i) {
    U('T3-L-0' + (i + 1), cat, 'T3', 'T3 Landside', 'landside', 60 + i * 66, 264, 60, 32, rr(0.25, 0.45), cat === 'Car Rental' ? { name: 'Car hire desks · T3' } : null);
  });

  // ----------------------------------------------------- station + skylink
  U('LS-01', 'Café & Bakery', 'Landside', 'The Station', 'station', 874, 108, 62, 40, 1, { name: 'Coffee kiosk · The Station', locF: 1.3 });
  U('LS-02', 'News & Convenience', 'Landside', 'The Station', 'station', 942, 108, 62, 40, 1, { name: 'News · The Station' });
  U('LS-03', 'Advertising', 'Landside', 'The Station', 'station', 1012, 112, 36, 10, 1, { name: 'Digital screen · Station', area: 12 });
  [330, 520, 640, 800, 1060, 1250, 1380].forEach(function (x, i) {
    U('SK-0' + (i + 1), 'Advertising', 'Landside', 'Skylink', 'link', x, 193, 34, 10, 1, { name: 'Digital screen · Skylink ' + (i + 1), area: 12 });
  });

  // ------------------------------------------------------------ car parks
  function park(code, name, x, y, w, h, share, ticket, area, extra) {
    var o = { name: name, tenant: 'Airport-operated', area: area, ticket: ticket, locF: share };
    if (extra) for (var k in extra) o[k] = extra[k];
    return U(code, 'Parking', 'Ground', 'Car Parks', 'ground', x, y, w, h, 1, o);
  }
  park('CP-01', 'JetParks 3', 20, 20, 150, 64, 0.10, 42, 70000);
  park('CP-02', 'Long Stay T1 & T3', 180, 20, 270, 64, 0.08, 58, 92000);
  park('CP-03', 'JetParks Plus', 460, 20, 140, 64, 0.04, 52, 30000);
  park('CP-04', 'Meet & Greet T3', 610, 20, 110, 64, 0.02, 140, 9000);
  park('CP-05', 'Multi-Storey T3', 180, 92, 150, 66, 0.07, 92, 34000);
  park('CP-06', 'Mid Stay T1 & T3', 340, 92, 220, 66, 0.06, 74, 26000);
  park('CP-07', 'Long Stay T2', 1070, 20, 230, 64, 0.12, 58, 110000);
  park('CP-08', 'JetParks 1', 1310, 20, 130, 64, 0.15, 44, 95000);
  park('CP-09', 'JetParks 2', 1450, 20, 130, 64, 0.12, 40, 80000);
  park('CP-10', 'Multi-Storey T2', 1070, 92, 180, 66, 0.16, 96, 4086 * 25);
  park('CP-11', 'Meet & Greet T2', 1260, 92, 110, 66, 0.06, 145, 14000);
  U('CP-12', 'Car Rental', 'Ground', 'Car Parks', 'ground', 20, 92, 150, 66, 1, { name: 'Car rental centre', tenant: 'Rental concessions', area: 8000, lease: '2028-03-31' });

  // ------------------------------------------------------------ passengers
  var gatePax = { Actual: {}, Budget: {} };
  ['Actual', 'Budget'].forEach(function (ver) {
    var termW = {};
    gates.forEach(function (g) { termW[g.terminal] = (termW[g.terminal] || 0) + gateW[g.name]; });
    gates.forEach(function (g) {
      gatePax[ver][g.name] = MONTHS.map(function (m, i) {
        var dep = DEP[i] * 1e6 * (ver === 'Budget' ? 0.985 : 1);
        var share = SHARE[ver][i][g.terminal] || 0;
        return dep * share * gateW[g.name] / termW[g.terminal] * (ver === 'Actual' ? rr(0.96, 1.05) : 1);
      });
    });
  });
  function sumGates(test, m, ver) { var s = 0; gates.forEach(function (g) { if (test(g)) s += gatePax[ver][g.name][m]; }); return s; }
  function pierPax(p, m, ver) { return sumGates(function (g) { return g.pier === p; }, m, ver); }
  function termDep(t, m, ver) { return sumGates(function (g) { return g.terminal === t; }, m, ver); }
  function allDep(m, ver) { return sumGates(function () { return true; }, m, ver); }

  function exposure(u, md, m, ver) {
    var ramp = md.pier === 'Pier 2' ? P2_RAMP[ver][m] : 1;
    switch (md.zoneType) {
      case 'pier': return pierPax(md.pier, m, ver) * md.pos * ramp;
      case 'airside': return termDep(md.term, m, ver) * md.pos;
      case 'landside': return termDep(md.term, m, ver) * 2.1 * md.pos;
      case 'station': return allDep(m, ver) * 2 * 0.3 * md.pos;
      case 'link': return allDep(m, ver) * 0.55;
      case 'ground': return allDep(m, ver);
    }
    return 0;
  }

  units.forEach(function (u) { rates[u['Unit Code'] + ':orig'] = rates[u['Unit Code']]; });
  units.forEach(function (u) {
    var md = meta[u['Unit Code']], c = CATS[md.origCat];
    if (c.model !== 'Concession') return;
    var fee = 0;
    for (var m = 0; m < 12; m++) fee += exposure(u, md, m, 'Budget') * c.conv * md.locF * c.ticket * rates[u['Unit Code']];
    u['MAG (£/yr)'] = Math.round(fee * md.magMult / 1000) * 1000;
  });

  function calc(u, m, ver) {
    var code = u['Unit Code'], md = meta[code];
    var cat = ver === 'Budget' ? md.origCat : u['Category'];
    var c = CATS[cat];
    var area = u['Area (m²)'];
    var pax = exposure(u, md, m, ver);
    var noise = ver === 'Budget' ? 1 : md.noise[m];
    var tx = pax * c.conv * md.locF * noise;
    var ticket = (cat === md.origCat && md.ticket) || c.ticket;
    var sales = tx * ticket * (ver === 'Budget' ? 1 : md.tkF);
    var rate = ver === 'Budget' ? rates[code + ':orig'] : rates[code];
    var conc = 0, other = 0, direct = 0, alloc = area * SPACE_COST[md.zoneType];
    if (c.model === 'Concession') {
      conc = Math.max((u['MAG (£/yr)'] || 0) / 12, sales * (rate || 0));
      other = area * SERVICE_CHARGE;
      direct = area * DIRECT_COST;
    } else if (c.model === 'Media') {
      conc = sales * rate; direct = 300;
    } else {
      conc = sales; direct = sales * c.costRatio + c.fixed * (cat === 'Parking' ? md.locF * 6 : 1);
    }
    return { sales: sales, conc: conc, other: other, direct: direct, alloc: alloc, profit: conc + other - direct - alloc, tx: tx, pax: pax };
  }

  var KPI_COLS = ['Tenant Sales', 'Concession Income', 'Other Income', 'Direct Cost', 'Allocated Cost',
    'Airport Profit', 'Budget Profit', 'Transactions', 'Passengers Exposed', 'Budget Passengers Exposed', 'Revenue Share'];

  function aggUnit(u, idx) {
    var a = { sales: 0, conc: 0, other: 0, direct: 0, alloc: 0, profit: 0, budget: 0, tx: 0, pax: 0, bpax: 0 };
    idx.forEach(function (m) {
      var x = calc(u, m, 'Actual'), b = calc(u, m, 'Budget');
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
  function pageSel(pd, alias) {
    for (var i = 0; i < (pd || []).length; i++) if (pd[i].alias === alias) return pd[i].selection;
    return null;
  }

  var VIEWS = {
    unitKpis: function (pd) {
      var idx = monthIdx(pageSel(pd, 'months'));
      var cells = KPI_COLS.map(function () { return []; });
      units.forEach(function (u) {
        var a = aggUnit(u, idx);
        [a.sales, a.conc, a.other, a.direct, a.alloc, a.profit, a.budget, a.tx, a.pax, a.bpax, rates[u['Unit Code']]].forEach(function (v, c) {
          cells[c].push(v === null || v === undefined ? null : Math.round(v * 100) / 100);
        });
      });
      return { labels: { rows: units.map(function (u) { return [u['Unit Code']]; }), columns: KPI_COLS.map(function (c) { return [c]; }) }, cells: cells };
    },
    unitTrend: function (pd) {
      var sel = pageSel(pd, 'units'), code = sel && sel[0];
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
    gatePax: function (pd) {
      var idx = monthIdx(pageSel(pd, 'months'));
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
  var vizSubs = [], listSubs = [];
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
          if (!meta[code]) return reject(new Error('Unit "' + code + '" not found.'));
          rates[code] = value === null ? null : Number(value);
          resolve();
          recalcAll();
        }, 220);
      });
    }
  };

  window.PigmentSDK = Object.freeze(SDK);
})();
