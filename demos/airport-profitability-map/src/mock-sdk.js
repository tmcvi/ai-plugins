/*
 * Mock PigmentSDK: Manchester Airport (MAN) edition.
 *
 * Stands in for window.PigmentSDK outside Pigment. It serves the same binding
 * aliases the Frame uses, with the same data shapes (column-major cells,
 * label paths, loading states), and recalculates after writes the way a
 * Pigment model would. In Pigment this file is NOT used.
 *
 * LAYOUT: north-up and geographic. The basemap (airfield boundary, runways and
 * taxiways, roads incl. the M56, rivers, woodland and built-up areas) is traced
 * from a map tile by tools/trace_basemap.py. Runways 05L/23R and 05R/23L sit on
 * their measured 39-degree line. Terminal 2 (Pier 1 and Pier 2, pointing west),
 * Terminal 1 (closed 15 March 2026), Terminal 3 and its extension, The Station,
 * Skylink, the hotels and the car parks are placed where they sit on the map.
 * Terminal interiors are schematic, not survey-accurate. Gate labels are
 * illustrative.
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

  // ============================================================ GEOGRAPHY
  // World units = pixels of a north-up 1237x1193 map tile x 3 (about 1.3 m per unit).
  // The basemap (airfield, runways and taxiways, roads, water, land use) is traced
  // from that tile by tools/trace_basemap.py and inlined as window.__MAN_BASEMAP.
  var BASE = (typeof window !== 'undefined' && window.__MAN_BASEMAP) || { paths: [], width: 3711, height: 3579 };
  BASE.paths.forEach(function (p, i) { features.push({ 'Feature': 'Base ' + p.type + ' ' + i, 'Type': 'base', 'Class': p.type, 'Path': p.d, 'Shape': '0,0,0,0' }); });
  F('Runway 05L/23R', 'runwayline', 0, 0, 0, 0, { 'Line': '1593,2241,3360,810', 'Ends': '05L|23R', 'Label': 'RUNWAY 05L/23R · 3,048 m' });
  F('Runway 05R/23L', 'runwayline', 0, 0, 0, 0, { 'Line': '708,3333,2580,1818', 'Ends': '05R|23L', 'Label': 'RUNWAY 05R/23L · 3,050 m' });
  F('North', 'compass', 3590, 3420, 60, 60, { 'Heading': '0' });
  [['Hale Barns', 255, 290], ['Warburton Green', 640, 712], ['Ringway', 1095, 1294], ['Thorns Green', 462, 1640], ['Morley Green', 2802, 3118], ['Moss Nook', 3470, 455], ['Styal', 3600, 1900]].forEach(function (p) {
    F(p[0], 'place', 0, 0, 0, 0, { 'Label': p[0], 'LabelX': String(p[1]), 'LabelY': String(p[2]) });
  });
  [['M56', 1335, 935], ['M56', 2236, 212], ['A538 Wilmslow Rd', 1590, 1700], ['Altrincham Rd', 2900, 2470], ['Ringway Rd W', 3150, 545]].forEach(function (p) {
    F(p[0] + ' label', 'roadlabel', 0, 0, 0, 0, { 'Label': p[0], 'LabelX': String(p[1]), 'LabelY': String(p[2]) });
  });
  F('Radisson Blu Hotel', 'poi', 2440, 520, 0, 0, { 'Label': 'Radisson Blu' });
  F('Clayton Hotel', 'poi', 2730, 560, 0, 0, { 'Label': 'Clayton Hotel' });
  F('World Freight Terminal', 'poi', 1620, 1040, 0, 0, { 'Label': 'World Freight Terminal' });

  // ------------------------------------------------------- landside spine
  F('The Station', 'station', 2510, 516, 110, 96, { 'Terminal': 'Landside', 'Zone': 'The Station', 'Label': 'THE STATION', 'Sub': 'RAIL · METROLINK · COACH', 'LabelX': '2565', 'LabelY': '509', 'Small': '1' });
  F('Skylink T2', 'walkway', 2300, 574, 210, 16, { 'Terminal': 'Landside', 'Zone': 'Skylink', 'Label': 'SKYLINK', 'LabelX': '2405', 'LabelY': '585', 'Small': '1' });
  F('Skylink south', 'walkway', 2558, 612, 16, 150, { 'Terminal': 'Landside', 'Zone': 'Skylink' });
  F('Skylink T3', 'walkway', 2574, 744, 108, 16, { 'Terminal': 'Landside', 'Zone': 'Skylink' });
  F('Skylink T3 link', 'walkway', 2666, 760, 16, 120, { 'Terminal': 'Landside', 'Zone': 'Skylink' });

  // ----------------------------------------------------------- terminals
  F('Terminal 2', 'terminal', 1930, 280, 370, 400, { 'Terminal': 'T2', 'Label': 'TERMINAL 2', 'LabelX': '2115', 'LabelY': '262', 'Far': '1' });
  F('T2 Landside', 'zone', 2214, 284, 84, 392, { 'Terminal': 'T2', 'Zone': 'T2 Landside' });
  F('T2 Airside', 'zone', 1932, 284, 252, 392, { 'Terminal': 'T2', 'Zone': 'T2 Airside' });
  F('T2 Security', 'security', 2188, 300, 22, 360, { 'Terminal': 'T2', 'Label': '' });
  [300, 362, 424, 486].forEach(function (y, i) { F('T2 Check-in ' + (i + 1), 'checkin', 2220, y, 26, 54, { 'Terminal': 'T2' }); });
  F('Terminal 1', 'closed', 2420, 760, 220, 140, { 'Terminal': 'T1', 'Label': 'TERMINAL 1', 'Sub': 'CLOSED MARCH 2026', 'LabelX': '2478', 'LabelY': '822', 'Small': '1' });
  F('T3 Extension', 'zone', 2536, 786, 102, 112, { 'Terminal': 'T3', 'Zone': 'T3 Extension', 'Label': 'T3 EXTENSION', 'LabelX': '2587', 'LabelY': '782', 'Small': '1' });
  F('Terminal 3', 'terminal', 2660, 880, 240, 180, { 'Terminal': 'T3', 'Label': 'TERMINAL 3', 'LabelX': '2780', 'LabelY': '872', 'Far': '1' });
  F('T3 Landside', 'zone', 2662, 882, 236, 50, { 'Terminal': 'T3', 'Zone': 'T3 Landside' });
  F('T3 Airside', 'zone', 2662, 952, 236, 106, { 'Terminal': 'T3', 'Zone': 'T3 Airside' });
  F('T3 Security', 'security', 2690, 934, 180, 16, { 'Terminal': 'T3', 'Label': '' });
  [2668, 2706].forEach(function (x, i) { F('T3 Check-in ' + (i + 1), 'checkin', x, 888, 32, 38, { 'Terminal': 'T3' }); });

  // ---------------------------------------------------------------- piers
  var gateW = {};
  function addGate(gname, zone, terminal, gx, gy, standBox, heading, weight, closed) {
    F('Gate ' + gname, 'gate', gx, gy, 0, 0, { 'Terminal': terminal, 'Pier': zone, 'Label': gname, 'Closed': closed ? '1' : '' });
    if (standBox) F('Stand ' + gname, 'stand', standBox[0], standBox[1], standBox[2], standBox[3], { 'Heading': String(heading), 'Terminal': terminal, 'Pier': zone });
    gates.push({ name: gname, pier: zone, terminal: terminal });
    gateW[gname] = weight * rr(0.85, 1.15);
  }
  function pierUnit(zone, key, terminal, u, gate, mix, opts, x, y, w, h, pos) {
    var code = terminal + '-' + key + '-' + (u < 10 ? '0' : '') + u;
    var cat = mix[(u - 1) % mix.length];
    var o = { pier: zone, gate: gate };
    if (opts.leases && opts.leases[u - 1]) o.lease = opts.leases[u - 1];
    if (opts.special && opts.special[u]) { var sp = opts.special[u]; cat = sp.cat || cat; for (var k in sp) if (k !== 'cat') o[k] = sp[k]; }
    U(code, cat, terminal, zone, 'pier', x, y, w, h, pos, o);
  }
  // Horizontal pier: root on the east (terminal side), tip to the west. Gates on top and bottom.
  function pierH(zone, key, terminal, xRoot, xTip, y, segs, weight, mix, opts) {
    opts = opts || {};
    var T = 130, len = xRoot - xTip;
    F(zone, opts.ghost ? 'ghostpier' : 'pier', xTip, y, len, T, { 'Terminal': terminal, 'Zone': opts.ghost ? '' : zone, 'Label': opts.label || zone.toUpperCase(), 'LabelX': String(xTip + len / 2), 'LabelY': String(y + T / 2 + 3), 'Small': '1' });
    var segW = (len - 10) / segs, u = 0, g = 0, sw = Math.min(opts.wide ? 52 : 46, segW * 2 - 4);
    for (var s = 0; s < segs; s++) {
      var x = xRoot - 5 - (s + 1) * segW, w = segW - 4;
      var pos = 1 - 0.6 * (s / Math.max(1, segs - 1));
      [[y + 4, s % 2 === 0, 'T'], [y + T - 48, s % 2 === 1, 'B']].forEach(function (row) {
        if (row[1] && !opts.ghost) { u++; pierUnit(zone, key, terminal, u, key + '·' + (g + 1), mix, opts, x, row[0], w, 44, pos); return; }
        if (row[1]) return;
        g++;
        var gname = key + '·' + g, top = row[2] === 'T', cx = x + w / 2;
        if (!opts.ghost) F('Holdroom ' + gname, 'holdroom', x, row[0], w, 44, { 'Terminal': terminal, 'Pier': zone });
        addGate(gname, zone, terminal, cx, top ? y : y + T, opts.ghost ? null : [cx - sw / 2, top ? y - 8 - sw : y + T + 8, sw, sw], top ? 180 : 0, weight, opts.ghost);
      });
    }
  }
  // Vertical pier: root at the top (terminal side), tip at the bottom. Gates left and right.
  function pierV(zone, key, terminal, x, yRoot, yTip, segs, weight, mix, opts) {
    opts = opts || {};
    var Wd = opts.width || 130, len = yTip - yRoot;
    F(zone, opts.ghost ? 'ghostpier' : 'pier', x, yRoot, Wd, len, { 'Terminal': terminal, 'Zone': opts.ghost ? '' : zone, 'Label': opts.label || zone.toUpperCase(), 'LabelX': String(x + Wd / 2), 'LabelY': String(yTip + 16), 'Small': '1' });
    var segH = (len - 10) / segs, u = 0, g = 0, sw = Math.min(46, segH * 2 - 4), cw = (Wd - 42) / 2;
    for (var s = 0; s < segs; s++) {
      var y = yRoot + 5 + s * segH, h = segH - 4;
      var pos = 1 - 0.6 * (s / Math.max(1, segs - 1));
      [[x + 4, s % 2 === 0, 'L'], [x + Wd - 4 - cw, s % 2 === 1, 'R']].forEach(function (col) {
        if (col[1] && !opts.ghost) { u++; pierUnit(zone, key, terminal, u, key + '·' + (g + 1), mix, opts, col[0], y, cw, h, pos); return; }
        if (col[1]) return;
        g++;
        var gname = key + '·' + g, left = col[2] === 'L', gx = left ? x : x + Wd;
        if (!opts.ghost) F('Holdroom ' + gname, 'holdroom', col[0], y, cw, h, { 'Terminal': terminal, 'Pier': zone });
        addGate(gname, zone, terminal, gx, y + h / 2, opts.ghost ? null : [left ? gx - 8 - sw : gx + 8, y + h / 2 - sw / 2, sw, sw], left ? 90 : -90, weight, opts.ghost);
      });
    }
  }
  pierH('Pier 1', 'P1', 'T2', 1930, 1680, 280, 10, 1.0,
    ['Duty Free', 'Café & Bakery', 'News & Convenience', 'Quick Service', 'Bar & Restaurant', 'Health & Beauty', 'Café & Bakery', 'Tech & Electronics', 'News & Convenience', 'Quick Service'],
    { leases: ['2031-03-31', '2027-03-31', '2027-06-30', '2027-03-31', '2027-09-30'], special: { 1: { name: 'Duty free express · Pier 1', area: 240, locF: 0.3 }, 8: { name: 'Tech accessories · P1-08', locF: 0.45, magMult: 2.1, lease: '2029-03-31' } } });
  pierH('Pier 2', 'P2', 'T2', 1930, 1660, 546, 12, 1.3,
    ['Duty Free', 'Bar & Restaurant', 'Café & Bakery', 'Fashion & Luxury', 'News & Convenience', 'Quick Service', 'Health & Beauty', 'Café & Bakery', 'Jewellery & Watches', 'News & Convenience', 'Bar & Restaurant', 'Café & Bakery'],
    { wide: true, special: { 1: { name: 'Duty free express · Pier 2', area: 260, locF: 0.32 } } });
  pierV('T3 Pier', 'T3', 'T3', 2680, 1060, 1180, 4, 1.15, ['Café & Bakery', 'News & Convenience', 'Quick Service', 'Bar & Restaurant'], { width: 120 });
  pierV('T1 pier (closed)', 'T1', 'T1', 2440, 900, 1100, 6, 1.0, [], { ghost: true, width: 80, label: 'T1 PIER · CLOSED' });

  // -------------------------------------------------------- T2 airside
  var T2A = 'T2 Airside';
  U('T2-DF', 'Duty Free', 'T2', T2A, 'airside', 2098, 300, 84, 296, 1, { name: 'Walk-through duty free · T2', area: 2165, rate: 0.37, lease: '2032-03-31', locF: 1.05 });
  var fhCats = ['Quick Service', 'Quick Service', 'Café & Bakery', 'Bar & Restaurant', 'Quick Service', 'Quick Service', 'Café & Bakery', 'Bar & Restaurant'];
  var fhNames = ['Pizza', 'Burgers', 'Bakery', 'Taproom', 'Asian street food', 'Deli', 'Desserts', 'Food hall bar'];
  fhCats.forEach(function (cat, i) {
    U('T2-FH-0' + (i + 1), cat, 'T2', T2A, 'airside', 2014 + (i % 2) * 42, 332 + Math.floor(i / 2) * 64, 40, 60, 0.9, { name: 'Food hall · ' + fhNames[i], lease: '2030-09-30', area: 140 });
  });
  U('T2-LG-01', 'Lounge', 'T2', T2A, 'airside', 1936, 286, 74, 60, 1, { name: 'Escape Lounge · T2', tenant: 'Airport-operated', area: 950 });
  U('T2-LG-02', 'Lounge', 'T2', T2A, 'airside', 1936, 560, 74, 60, 1, { name: '1903 Lounge', tenant: 'Airport-operated', area: 1100, ticket: 72, locF: 0.55 });
  var wCats = ['News & Convenience', 'Health & Beauty', 'Fashion & Luxury', 'Café & Bakery', 'Toys & Gifts', 'Jewellery & Watches', 'Health & Beauty', 'Currency Exchange', 'Bar & Restaurant'];
  for (var wi = 0; wi < 8; wi++) {
    U('T2-W-0' + (wi + 1), wCats[wi], 'T2', T2A, 'airside', 1936 + (wi % 2) * 38, 352 + Math.floor(wi / 2) * 52, 36, 48, rr(0.55, 0.85), { area: 110 });
  }
  U('T2-W-09', 'Bar & Restaurant', 'T2', T2A, 'airside', 1936, 626, 74, 48, 0.8, { area: 300 });
  U('T2-E-01', 'Fashion & Luxury', 'T2', T2A, 'airside', 2014, 288, 40, 40, 0.7, { area: 120 });
  U('T2-E-02', 'Health & Beauty', 'T2', T2A, 'airside', 2056, 288, 40, 40, 0.75, { area: 120 });
  U('T2-E-03', 'Café & Bakery', 'T2', T2A, 'airside', 2014, 590, 40, 84, 0.85, { area: 240 });
  U('T2-E-04', 'Bar & Restaurant', 'T2', T2A, 'airside', 2056, 590, 40, 84, 0.8, { area: 260 });
  U('T2-E-05', 'Fashion & Luxury', 'T2', T2A, 'airside', 2098, 602, 84, 72, 0.7, { name: 'Luxury fashion · E-05', area: 280, lease: '2027-06-30' });

  // -------------------------------------------------------- T2 landside
  var T2L = 'T2 Landside';
  ['News & Convenience', 'Café & Bakery', 'Health & Beauty', 'Quick Service', 'Currency Exchange', 'News & Convenience'].forEach(function (cat, i) {
    U('T2-L-0' + (i + 1), cat, 'T2', T2L, 'landside', 2250, 290 + i * 44, 46, 40, rr(0.25, 0.45));
  });
  U('T2-L-07', 'Duty Free', 'T2', T2L, 'landside', 2220, 556, 76, 42, 0.12, { name: 'Arrivals duty free', area: 180, rate: 0.3, locF: 0.12 });
  U('T2-L-08', 'Café & Bakery', 'T2', T2L, 'landside', 2220, 604, 76, 70, 0.3, { name: 'Arrivals café · T2', area: 290, locF: 0.16, lease: '2027-03-31' });

  // ---------------------------------------------------------------- T3
  var T3A = 'T3 Airside';
  ['Café & Bakery', 'News & Convenience', 'Quick Service', 'Health & Beauty', 'Bar & Restaurant', 'Currency Exchange'].forEach(function (cat, i) {
    U('T3-A-0' + (i + 1), cat, 'T3', T3A, 'airside', 2666 + i * 39, 956, 36, 36, rr(0.6, 0.9), { area: 90 });
  });
  U('T3-DF', 'Duty Free', 'T3', T3A, 'airside', 2666, 998, 90, 56, 1, { name: 'Duty free · T3', area: 820, rate: 0.35, lease: '2030-03-31', locF: 0.55 });
  U('T3-LG-01', 'Lounge', 'T3', T3A, 'airside', 2762, 998, 74, 56, 1, { name: 'Escape Lounge · T3', tenant: 'Airport-operated', area: 620, locF: 0.7 });
  U('T3-A-07', 'Quick Service', 'T3', T3A, 'airside', 2842, 998, 54, 56, 0.8, { area: 160 });
  [['Bar & Restaurant', 2540, 792], ['Health & Beauty', 2590, 792], ['Café & Bakery', 2540, 846], ['Fashion & Luxury', 2590, 846]].forEach(function (s, i) {
    U('T3-X-0' + (i + 1), s[0], 'T3', 'T3 Extension', 'airside', s[1], s[2], 46, 48, 0.65, { lease: '2031-03-31', magMult: 0.95, area: 140 });
  });
  ['Café & Bakery', 'News & Convenience', 'Car Rental'].forEach(function (cat, i) {
    U('T3-L-0' + (i + 1), cat, 'T3', 'T3 Landside', 'landside', 2746 + i * 50, 888, 46, 40, rr(0.25, 0.45), cat === 'Car Rental' ? { name: 'Car hire desks · T3' } : { area: 90 });
  });

  // ----------------------------------------------------- station + skylink
  U('LS-01', 'Café & Bakery', 'Landside', 'The Station', 'station', 2518, 560, 44, 44, 1, { name: 'Coffee kiosk · The Station', locF: 1.3, area: 70 });
  U('LS-02', 'News & Convenience', 'Landside', 'The Station', 'station', 2568, 560, 44, 44, 1, { name: 'News · The Station', area: 70 });
  U('LS-03', 'Advertising', 'Landside', 'The Station', 'station', 2522, 528, 40, 12, 1, { name: 'Digital screen · Station', area: 12 });
  [[2318, 577], [2380, 577], [2442, 577], [2561, 650], [2561, 700], [2600, 747]].forEach(function (p, i) {
    var vertical = p[0] === 2561;
    U('SK-0' + (i + 1), 'Advertising', 'Landside', 'Skylink', 'link', p[0], p[1], vertical ? 10 : 34, vertical ? 34 : 10, 1, { name: 'Digital screen · Skylink ' + (i + 1), area: 12 });
  });

  // ------------------------------------------------------------ car parks
  function park(code, name, x, y, w, h, share, ticket, area) {
    return U(code, 'Parking', 'Ground', 'Car Parks', 'ground', x, y, w, h, 1, { name: name, tenant: 'Airport-operated', area: area, ticket: ticket, locF: share });
  }
  park('CP-01', 'Long Stay T2', 1720, 40, 310, 150, 0.12, 58, 110000);
  park('CP-02', 'Multi-Storey T2', 2320, 410, 100, 120, 0.16, 96, 4086 * 25);
  park('CP-03', 'Meet & Greet T2', 2320, 610, 100, 70, 0.06, 145, 14000);
  park('CP-04', 'Mid Stay T1 & T3', 2692, 770, 80, 96, 0.06, 74, 26000);
  park('CP-05', 'Multi-Storey T3', 2780, 770, 116, 96, 0.07, 92, 34000);
  park('CP-06', 'Meet & Greet T3', 2916, 900, 84, 80, 0.02, 140, 9000);
  park('CP-07', 'JetParks 1', 2950, 370, 190, 100, 0.15, 44, 95000);
  park('CP-08', 'JetParks 2', 3160, 410, 190, 100, 0.12, 40, 80000);
  park('CP-09', 'Long Stay T1 & T3', 2950, 600, 190, 96, 0.08, 58, 92000);
  park('CP-10', 'JetParks Plus', 3160, 640, 120, 80, 0.04, 52, 30000);
  park('CP-11', 'JetParks 3', 2950, 716, 150, 80, 0.10, 42, 70000);
  U('CP-12', 'Car Rental', 'Ground', 'Car Parks', 'ground', 2320, 696, 92, 56, 1, { name: 'Car rental centre', tenant: 'Rental concessions', area: 8000, lease: '2028-03-31' });
  park('CP-13', 'Runway Visitor Park', 1930, 1500, 120, 80, 0.004, 9, 12000);

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
