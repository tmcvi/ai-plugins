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
  [['M56', 1335, 935], ['M56', 2236, 212], ['A538 Wilmslow Rd', 1590, 1700], ['Altrincham Rd', 2900, 2470], ['Ringway Rd W', 3150, 545]].forEach(function (p, i) {
    F(p[0] + ' label ' + (i + 1), 'roadlabel', 0, 0, 0, 0, { 'Label': p[0], 'LabelX': String(p[1]), 'LabelY': String(p[2]) });
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

  // ===================================================== PIGMENT MODEL ENGINE
  // Mirrors the Pigment formulas one for one, so the local mock and the real
  // application show the same numbers. Inputs: Terminal Departing Pax
  // (Terminal x Month, Actual and Budget) and the Pier 2 ramp-up.
  var TERMS = ['T1', 'T2', 'T3'];
  var MLABEL = MONTHS.map(function (m) { return m.slice(0, 3) + ' ' + m.slice(-2); }); // Pigment month display, e.g. "Jan 26"
  var termPax = { Actual: {}, Budget: {} };
  TERMS.forEach(function (t) {
    termPax.Actual[t] = MONTHS.map(function (m, i) { return Math.round(DEP[i] * 1e6 * (SHARE.Actual[i][t] || 0)); });
    termPax.Budget[t] = MONTHS.map(function (m, i) { return Math.round(DEP[i] * 1e6 * 0.985 * (SHARE.Budget[i][t] || 0)); });
  });
  var termW = {};
  gates.forEach(function (g) { termW[g.terminal] = (termW[g.terminal] || 0) + gateW[g.name]; });
  gates.forEach(function (g) { g.share = Math.round(gateW[g.name] / termW[g.terminal] * 1e6) / 1e6; });
  var gatePax = { Actual: {}, Budget: {} };
  ['Actual', 'Budget'].forEach(function (ver) { gates.forEach(function (g) { gatePax[ver][g.name] = MONTHS.map(function (m, i) { return termPax[ver][g.terminal][i] * g.share; }); }); });
  function termDep(t, m, ver) { return termPax[ver][t] ? termPax[ver][t][m] : 0; }
  function allDep(m, ver) { var s = 0; TERMS.forEach(function (t) { s += termPax[ver][t][m]; }); return s; }
  function pierPax(p, m, ver) { var s = 0; gates.forEach(function (g) { if (g.pier === p) s += gatePax[ver][g.name][m]; }); return s; }

  // Footfall Basis list: which passengers a unit sees, and its space cost rate
  var BASES = {}, BASE_ORDER = [];
  function B(name, terminal, scope, share, spaceCost) { BASES[name] = { name: name, terminal: terminal, scope: scope, share: share, spaceCost: spaceCost }; BASE_ORDER.push(name); }
  ['Pier 1', 'Pier 2', 'T3 Pier'].forEach(function (p) {
    var s = 0, t = null; gates.forEach(function (g) { if (g.pier === p) { s += g.share; t = g.terminal; } });
    B(p, t, 'Terminal', Math.round(s * 1e6) / 1e6, 52);
  });
  B('T2 Departures', 'T2', 'Terminal', 1, 60); B('T3 Departures', 'T3', 'Terminal', 1, 60);
  B('T2 Landside', 'T2', 'Terminal', 2.1, 46); B('T3 Landside', 'T3', 'Terminal', 2.1, 46);
  B('The Station', '', 'All', 0.6, 40); B('Skylink', '', 'All', 0.55, 40); B('All Departures', '', 'All', 1, 2.6);
  var RAMP = { Actual: { 'Pier 2': P2_RAMP.Actual }, Budget: { 'Pier 2': P2_RAMP.Budget } };
  function basisPax(b, m, ver) {
    var x = BASES[b], base = x.scope === 'All' ? allDep(m, ver) : termDep(x.terminal, m, ver);
    return base * x.share * (RAMP[ver][b] ? RAMP[ver][b][m] : 1);
  }

  // Unit list properties used by the formulas
  var unitCat = {};
  units.forEach(function (u) {
    var code = u['Unit Code'], md = meta[code], c = CATS[md.origCat];
    var basis = md.zoneType === 'pier' ? md.pier : md.zoneType === 'airside' ? md.term + ' Departures' : md.zoneType === 'landside' ? md.term + ' Landside' :
      md.zoneType === 'station' ? 'The Station' : md.zoneType === 'link' ? 'Skylink' : 'All Departures';
    u['Footfall Basis'] = basis;
    u['Exposure Weight'] = md.zoneType === 'link' || md.zoneType === 'ground' ? 1 : Math.round(md.pos * 1e4) / 1e4;
    u['Trading Factor'] = Math.round(md.locF * 1e4) / 1e4;
    u['Ticket Factor'] = Math.round(md.tkF * 1e4) / 1e4;
    u['Ticket Override Ratio'] = md.ticket ? Math.round(md.ticket / c.ticket * 1e4) / 1e4 : 1;
    u['Default Revenue Share'] = rates[code] || 0;
    u['Fixed Cost'] = c.model === 'Airport-operated' ? Math.round(c.fixed * (md.origCat === 'Parking' ? md.locF * 6 : 1)) : 0;
    unitCat[code] = md.origCat;
  });
  function rawSales(u, cat, m, ver, withTicketFactor) {
    var c = CATS[cat];
    var pax = basisPax(u['Footfall Basis'], m, ver) * u['Exposure Weight'];
    var tx = pax * c.conv * u['Trading Factor'];
    return { pax: pax, tx: tx, sales: tx * c.ticket * (withTicketFactor ? u['Ticket Factor'] : 1) * (cat === u['Category'] ? u['Ticket Override Ratio'] : 1) };
  }
  // Minimum annual guarantee: a share of the budgeted annual fee
  units.forEach(function (u) {
    var c = CATS[u['Category']];
    if (c.model !== 'Concession') { u['MAG (£/yr)'] = 0; return; }
    var fee = 0;
    for (var m = 0; m < 12; m++) fee += rawSales(u, u['Category'], m, 'Budget', false).sales * u['Default Revenue Share'];
    u['MAG (£/yr)'] = Math.round(fee * meta[u['Unit Code']].magMult / 1000) * 1000;
  });
  function calc(u, m, ver) {
    var code = u['Unit Code'], b = ver === 'Budget';
    var cat = b ? u['Category'] : unitCat[code], c = CATS[cat];
    var r = rawSales(u, cat, m, ver, !b), sales = r.sales;
    var rate = b ? u['Default Revenue Share'] : rates[code];
    var area = u['Area (m²)'], conc, other = 0, direct;
    var alloc = area * BASES[u['Footfall Basis']].spaceCost;
    if (c.model === 'Concession') { conc = Math.max((u['MAG (£/yr)'] || 0) / 12, sales * (rate || 0)); other = area * SERVICE_CHARGE; direct = area * DIRECT_COST; }
    else if (c.model === 'Media') { conc = sales * (rate || 0); direct = 300; }
    else { conc = sales; direct = sales * c.costRatio + u['Fixed Cost']; }
    return { sales: sales, conc: conc, other: other, direct: direct, alloc: alloc, profit: conc + other - direct - alloc, tx: r.tx, pax: r.pax };
  }
  var CAT_GROUP = { 'Duty Free': 'Duty Free', 'Café & Bakery': 'Food & Beverage', 'Bar & Restaurant': 'Food & Beverage', 'Quick Service': 'Food & Beverage', 'Fashion & Luxury': 'Specialist Retail',
    'Health & Beauty': 'Specialist Retail', 'Tech & Electronics': 'Specialist Retail', 'Jewellery & Watches': 'Specialist Retail', 'Toys & Gifts': 'Specialist Retail', 'News & Convenience': 'Convenience',
    'Lounge': 'Lounges', 'Parking': 'Parking & Mobility', 'Car Rental': 'Parking & Mobility', 'Currency Exchange': 'Services', 'Advertising': 'Advertising' };
  function unitMeta(u) {
    return [u['Unit Name'], u['Tenant'], u['Terminal'], u['Zone'], u['Shape'], u['Lease Expiry'] || '', u['Nearest Gate'] || '', u['Operating Model'], u['Category']].join('|');
  }

  // =================================================== ASSETS (example data)
  // Every physical component on the map is an Asset with its own P&L and
  // operational KPIs. Map Features point at their asset via the 'Asset' property.
  var assets = [], assetBy = {};
  function A(id, type, terminal, props) {
    if (assetBy[id]) return assetBy[id];
    var a = { 'Asset': id, 'Type': type, 'Terminal': terminal };
    for (var k in props || {}) a[k] = props[k];
    assets.push(a); assetBy[id] = a;
    return a;
  }
  features.forEach(function (f) {
    var t = f['Type'], n = f['Feature'], term = f['Terminal'] || '';
    var id = null;
    if (t === 'terminal') id = A(n, 'Terminal', term)['Asset'];
    else if (t === 'closed') id = A('Terminal 1', 'Closed terminal', 'T1')['Asset'];
    else if (t === 'ghostpier') id = 'Terminal 1';
    else if (t === 'pier') id = A(n, 'Pier', term)['Asset'];
    else if (t === 'holdroom') id = f['Pier'];
    else if (t === 'stand' || t === 'gate') { if (f['Closed']) return; id = A('Stand ' + n.replace(/^(Stand|Gate) /, ''), 'Aircraft stand', term, { 'Pier': f['Pier'], 'Gate': n.replace(/^(Stand|Gate) /, '') })['Asset']; }
    else if (t === 'runwayline') id = A(n, 'Runway', 'Airfield')['Asset'];
    else if (t === 'security') id = A(n, 'Security', term)['Asset'];
    else if (t === 'checkin') id = A(term + ' Check-in hall', 'Check-in', term)['Asset'];
    else if (t === 'station') id = A('The Station', 'Transport interchange', 'Landside')['Asset'];
    else if (t === 'walkway') id = A('Skylink', 'Walkway', 'Landside')['Asset'];
    else if (t === 'poi') id = A(n, /freight/i.test(n) ? 'Cargo' : 'Hotel', 'Landside')['Asset'];
    if (id) f['Asset'] = id;
  });
  var ASSET_FACTS = {
    'Terminal 2': { 'Opened': '1993 · rebuilt 2019–2025', 'Capacity': '~24M passengers a year', 'Condition': '4.6 / 5', 'Gross area': '96,000 m²' },
    'Terminal 3': { 'Opened': '1989 · extended 2026', 'Capacity': '~8M passengers a year', 'Condition': '3.3 / 5', 'Gross area': '38,000 m²' },
    'Terminal 1': { 'Opened': '1962', 'Status': 'Closed 15 March 2026', 'Condition': '1.8 / 5', 'Future use': 'Part merged into T3; remainder for redevelopment' },
    'Pier 1': { 'Opened': '2019', 'Contact stands': '10', 'Condition': '4.2 / 5' }, 'Pier 2': { 'Opened': '2025', 'Contact stands': '12 incl. A380-capable', 'Condition': '4.9 / 5' },
    'T3 Pier': { 'Opened': '1998', 'Contact stands': '4', 'Condition': '3.1 / 5' },
    'Runway 05L/23R': { 'Length': '3,048 m × 45 m', 'Surface': 'Asphalt, last resurfaced 2011', 'Pavement condition': '58 / 100 (due for resurfacing)' },
    'Runway 05R/23L': { 'Length': '3,050 m × 45 m', 'Surface': 'Asphalt, opened 2001', 'Pavement condition': '79 / 100' },
    'The Station': { 'Services': 'Rail, Metrolink, coach', 'Opened': '1993 · Metrolink 2014' },
    'Skylink': { 'Length': '~1 km of covered walkways', 'Travelators': '14' },
    'Radisson Blu Hotel': { 'Rooms': '360', 'Arrangement': 'Ground lease to hotel operator' }, 'Clayton Hotel': { 'Rooms': '365', 'Arrangement': 'Ground lease to hotel operator' },
    'World Freight Terminal': { 'Arrangement': 'Leased warehouses and cargo handling', 'Area': '~110,000 m²' }
  };
  assets.forEach(function (a) { var f = ASSET_FACTS[a['Asset']]; if (f) a['Facts'] = Object.keys(f).map(function (k) { return k + ': ' + f[k]; }).join(' | '); });

  var ASSET_COLS = ['Aero Revenue', 'Commercial Revenue', 'Property & Other Revenue', 'Staff Costs', 'Maintenance', 'Utilities', 'Other Opex', 'Depreciation',
    'EBITDA', 'Operating Profit', 'Budget EBITDA', 'Passengers', 'Movements', 'Utilisation', 'Availability', 'Service Level', 'Condition Score'];
  var standAvail = {}; gates.forEach(function (g) { standAvail[g.name] = rr(0.955, 0.995); });
  ['P1·7', 'P1·8', 'P1·9', 'P1·10'].forEach(function (g) { standAvail[g] = rr(0.62, 0.74); }); // air-bridge replacement works
  function commercial(test, m, ver) { var s = 0; units.forEach(function (u) { if (test(u)) { var x = calc(u, m, ver); s += x.conc + x.other; } }); return s; }
  function assetMonth(a, m, ver) {
    var id = a['Asset'], T = a['Type'], b = ver === 'Budget', season = DEP[m] / 1.42;
    var o = { aero: 0, comm: 0, prop: 0, staff: 0, maint: 0, util: 0, other: 0, dep: 0, pax: null, mov: null, util_: null, avail: null, sla: null, cond: null };
    if (T === 'Terminal') {
      var t = a['Terminal'], dep = termDep(t, m, ver), isT2 = t === 'T2';
      o.pax = dep; o.mov = dep / 128;
      o.aero = dep * (isT2 ? 12.6 : 8.4); o.comm = commercial(function (u) { return u.Terminal === t && !/Pier/.test(u.Zone); }, m, ver);
      o.prop = isT2 ? 160000 : 60000;
      o.staff = dep * (isT2 ? 2.4 : 2.1) + (isT2 ? 1.25e6 : 0.55e6); o.maint = isT2 ? 0.82e6 : 0.58e6; o.util = (isT2 ? 0.78e6 : 0.36e6) * (1.25 - 0.25 * season); o.other = dep * 0.85;
      o.dep = isT2 ? 4.6e6 : 1.15e6; o.util_ = dep / (isT2 ? 1.95e6 : 0.62e6); o.cond = isT2 ? 4.6 : 3.3; o.sla = isT2 ? 0.95 : (m >= 3 ? 0.86 : 0.93);
    } else if (T === 'Closed terminal') {
      var d1 = termDep('T1', m, ver);
      o.pax = d1; o.aero = d1 * 11; o.comm = 0; o.staff = d1 * 2.5 + (m < 3 ? 0.4e6 : 0.08e6); o.maint = m < 3 ? 0.3e6 : 0.12e6; o.util = m < 3 ? 0.3e6 : 0.11e6; o.other = 0.06e6; o.dep = m < 3 ? 0.4e6 : 0; o.cond = 1.8;
    } else if (T === 'Pier') {
      var pd = pierPax(id, m, ver), ng = gates.filter(function (g) { return g.pier === id; }).length;
      o.pax = pd; o.mov = pd / (id === 'Pier 2' ? 175 : 128);
      o.aero = o.mov * (id === 'Pier 2' ? 310 : 185); o.comm = commercial(function (u) { return u.Zone === id; }, m, ver);
      o.staff = ng * 32000; o.maint = ng * (id === 'Pier 1' ? 30000 : 19000); o.util = ng * 9000 * (1.2 - 0.2 * season); o.other = ng * 6000;
      o.dep = id === 'Pier 2' ? 0.95e6 : id === 'Pier 1' ? 0.62e6 : 0.12e6;
      o.util_ = Math.min(0.95, o.mov / (ng * 30 * 12)); o.avail = id === 'Pier 1' ? 0.86 : id === 'Pier 2' ? 0.985 : 0.95; o.cond = id === 'Pier 2' ? 4.9 : id === 'Pier 1' ? 4.2 : 3.1;
    } else if (T === 'Aircraft stand') {
      var g = a['Gate'], gp = (gatePax[ver][g] || [])[m] || 0, wide = /Pier 2/.test(a['Pier'] || '');
      o.pax = gp; o.mov = gp / (wide ? 175 : 128); o.aero = o.mov * (wide ? 310 : 185) + o.mov * 42; o.maint = 18000; o.util = 4200; o.other = 2500; o.dep = wide ? 75000 : 52000;
      o.util_ = Math.min(0.95, o.mov / (30 * 12)); o.avail = standAvail[g] || 0.97; o.cond = /T3/.test(g) ? 3.1 : /P2/.test(g) ? 4.9 : 4.2;
    } else if (T === 'Runway') {
      var share = /05L/.test(id) ? 0.63 : 0.37, mv = allDep(m, ver) / 135 * 2 * share;
      o.mov = mv; o.aero = mv * 520; o.staff = 0.62e6 * share * 1.6; o.maint = /05L/.test(id) ? 0.42e6 : 0.21e6; o.util = 0.09e6; o.other = 0.05e6; o.dep = /05L/.test(id) ? 0.38e6 : 0.71e6;
      o.util_ = mv / (61 * 17 * 30 * share * 1.15); o.avail = /05L/.test(id) ? 0.982 : 0.995; o.cond = /05L/.test(id) ? 2.9 : 4.0;
    } else if (T === 'Security') {
      var sd = termDep(a['Terminal'], m, ver), T2s = a['Terminal'] === 'T2';
      o.pax = sd; o.staff = sd * (T2s ? 1.95 : 2.15) + 0.15e6; o.maint = T2s ? 0.12e6 : 0.07e6; o.util = 0.04e6; o.other = sd * 0.18; o.dep = T2s ? 0.31e6 : 0.09e6;
      o.sla = T2s ? 0.955 : (m >= 3 ? 0.84 : 0.92); o.avail = T2s ? 0.97 : 0.93; o.cond = T2s ? 4.7 : 3.2;
    } else if (T === 'Check-in') {
      var cd = termDep(a['Terminal'], m, ver);
      o.pax = cd; o.aero = cd * 0.55; o.staff = 0.05e6; o.maint = 0.06e6; o.util = 0.03e6; o.other = 0.02e6; o.dep = 0.08e6; o.avail = 0.985; o.cond = a['Terminal'] === 'T2' ? 4.6 : 3.4;
    } else if (T === 'Transport interchange') {
      var ad = allDep(m, ver);
      o.pax = ad * 2 * 0.3; o.prop = 0.12e6; o.comm = commercial(function (u) { return u.Zone === 'The Station'; }, m, ver);
      o.staff = 0.09e6; o.maint = 0.07e6; o.util = 0.05e6; o.other = 0.03e6; o.dep = 0.22e6; o.avail = 0.99; o.cond = 3.8;
    } else if (T === 'Walkway') {
      o.pax = allDep(m, ver) * 1.1; o.comm = commercial(function (u) { return u.Zone === 'Skylink'; }, m, ver);
      o.maint = 0.11e6; o.util = 0.04e6; o.staff = 0.03e6; o.dep = 0.14e6; o.avail = m >= 5 ? 0.91 : 0.97; o.cond = 3.0;
    } else if (T === 'Hotel') {
      var rad = /radisson/i.test(id);
      o.prop = rad ? 0.21e6 : 0.13e6; o.other = 0.01e6; o.util_ = (rad ? 0.84 : 0.79) * (0.9 + 0.1 * season); o.cond = 4.0;
    } else if (T === 'Cargo') {
      o.prop = 0.92e6; o.aero = 0.18e6; o.staff = 0.11e6; o.maint = 0.12e6; o.util = 0.04e6; o.other = 0.03e6; o.dep = 0.21e6; o.mov = 9300 * (0.95 + 0.1 * season); o.util_ = 0.88; o.cond = 3.6;
    }
    if (b) { var f = id === 'Terminal 3' || T === 'Security' && a['Terminal'] === 'T3' ? 1.0 : 1; o.aero *= 0.99 * f; o.comm *= 1; o.staff *= 0.97; o.maint *= 0.95; }
    return o;
  }
  function aggAsset(a, idx) {
    var s = { aero: 0, comm: 0, prop: 0, staff: 0, maint: 0, util: 0, other: 0, dep: 0, bE: 0, pax: null, mov: null, u: [], av: [], sla: [], cond: null };
    idx.forEach(function (m) {
      var x = assetMonth(a, m, 'Actual'), y = assetMonth(a, m, 'Budget');
      ['aero', 'comm', 'prop', 'staff', 'maint', 'util', 'other', 'dep'].forEach(function (k) { s[k] += x[k]; });
      s.bE += y.aero + y.comm + y.prop - y.staff - y.maint - y.util - y.other;
      if (x.pax !== null) s.pax = (s.pax || 0) + x.pax; if (x.mov !== null) s.mov = (s.mov || 0) + x.mov;
      if (x.util_ !== null) s.u.push(x.util_); if (x.avail !== null) s.av.push(x.avail); if (x.sla !== null) s.sla.push(x.sla); s.cond = x.cond;
    });
    var avg = function (l) { return l.length ? l.reduce(function (p, c) { return p + c; }, 0) / l.length : null; };
    var e = s.aero + s.comm + s.prop - s.staff - s.maint - s.util - s.other;
    return [s.aero, s.comm, s.prop, s.staff, s.maint, s.util, s.other, s.dep, e, e - s.dep, s.bE, s.pax, s.mov, avg(s.u), avg(s.av), avg(s.sla), s.cond];
  }

  // ================================================= PROJECTS (example data)
  var projects = [];
  function PJ(id, name, type, status, sponsor, box, line, asset, budget, forecast, spent, pct, phases, affected, revImpact, benefits, risks, desc) {
    projects.push({ 'Project': id, 'Project Name': name, 'Type': type, 'Status': status, 'Sponsor': sponsor, 'Shape': box ? box.join(',') : '', 'Line': line ? line.join(',') : '',
      'Asset': asset, 'Budget (£)': budget, 'Forecast (£)': forecast, 'Spent to Date (£)': spent, '% Complete': pct, 'Phases': phases, 'Affected Units': affected || '',
      'Revenue Impact (£)': revImpact || 0, 'Benefits': benefits, 'Risks': risks, 'Description': desc,
      'Start': phases.split('|')[0].split(':')[1], 'End': phases.split('|').slice(-1)[0].split(':')[2] });
  }
  PJ('PRJ-101', 'Pier 1 air-bridge replacement', 'Asset renewal', 'In delivery', 'Head of Airfield Infrastructure', [1676, 262, 140, 166], null, 'Pier 1', 18.6e6, 19.9e6, 11.4e6, 0.58,
    'Design:2025-03:2025-09|Procurement:2025-08:2025-12|Construction:2026-01:2027-03|Commissioning:2027-03:2027-06', 'T2-P1-09,T2-P1-10', 410000,
    'Replaces four 1990s air bridges; stand availability back above 98%; frees 2 widebody-capable gates.', 'Supplier lead times on bridge cabs; works sequencing around summer peak.', 'Phased replacement of air bridges on gates P1·7 to P1·10 with two stands out of use at a time.');
  PJ('PRJ-102', 'Runway 05L/23R resurfacing', 'Asset renewal', 'Approved', 'Airfield Director', null, [1593, 2241, 3360, 810], 'Runway 05L/23R', 42e6, 42e6, 1.9e6, 0.06,
    'Design:2026-01:2026-09|Procurement:2026-07:2027-02|Construction:2027-04:2027-10|Commissioning:2027-10:2027-11', '', 0,
    'Restores pavement condition from 58 to 95+; extends life by ~15 years; new AGL lighting cuts energy 40%.', 'Night-only works; any overrun moves traffic onto 05R/23L.', 'Full-length mill-and-overlay with new airfield ground lighting, delivered in night closures.');
  PJ('PRJ-103', 'T3 extension phase 2', 'Capacity', 'In delivery', 'Terminal Development Director', [2416, 756, 228, 148], null, 'Terminal 3', 64e6, 61.5e6, 41.8e6, 0.72,
    'Design:2024-10:2025-04|Procurement:2025-02:2025-06|Construction:2025-05:2027-01|Commissioning:2027-01:2027-03', 'T3-X-01,T3-X-02,T3-X-03,T3-X-04', 0,
    '+2.5M passengers a year of T3 capacity; 6 new commercial units; 4 extra security lanes.', 'Interface with live T3 operation; asbestos in former T1 structure.', 'Converts the western part of the former Terminal 1 into a Terminal 3 departure lounge and security hall.');
  PJ('PRJ-104', 'Terminal 1 demolition and enabling works', 'Enabling', 'Design', 'Property Director', [2436, 896, 108, 214], null, 'Terminal 1', 27e6, 28.4e6, 0.6e6, 0.03,
    'Design:2026-06:2027-03|Procurement:2027-02:2027-06|Construction:2027-07:2028-09', '', 0,
    'Clears 3.2 ha for future stands or a hotel and office plot; removes £1.4M a year of holding costs.', 'Planning conditions; utilities diversions.', 'Soft-strip and demolition of the redundant T1 pier and eastern T1 structure.');
  PJ('PRJ-105', 'Multi-Storey T2 solar canopy and EV charging', 'Sustainability', 'Approved', 'Head of Car Parking', [2316, 406, 108, 128], null, 'Multi-Storey T2', 6.8e6, 6.8e6, 0.4e6, 0.05,
    'Design:2026-05:2026-12|Procurement:2026-11:2027-02|Construction:2027-02:2027-11', 'CP-02', 180000,
    '1.9 MWp solar; 400 EV bays; £0.9M a year EV charging revenue.', 'Roof deck loading; temporary loss of 300 spaces in peak.', 'Solar canopy over the top deck and 400 EV charging bays.');
  PJ('PRJ-106', 'T2 landside food court refit', 'Commercial', 'Design', 'Retail & Commercial Director', [2212, 282, 88, 396], null, 'Terminal 2', 9.4e6, 9.4e6, 0.3e6, 0.02,
    'Design:2026-09:2027-05|Procurement:2027-04:2027-08|Construction:2027-09:2028-04', 'T2-L-01,T2-L-02,T2-L-03,T2-L-04,T2-L-08', 620000,
    'Replaces the loss-making arrivals café; +£1.6M a year landside income.', 'Phasing around the arrivals hall; tenant break clauses.', 'Reconfigures T2 landside into a food court with meeter-greeter seating.');
  PJ('PRJ-107', 'Skylink travelator renewal', 'Asset renewal', 'In delivery', 'Head of Terminal Engineering', [2296, 568, 384, 196], null, 'Skylink', 12.1e6, 13.4e6, 9.2e6, 0.81,
    'Design:2025-01:2025-05|Procurement:2025-04:2025-08|Construction:2025-06:2027-01|Commissioning:2027-01:2027-02', 'SK-01,SK-02,SK-03', 95000,
    '14 travelators replaced; availability back to 99%; journey time T2 to Station down 2 minutes.', 'Forecast £1.3M over budget after structural repairs found in phase 2.', 'Replaces all Skylink travelators and refurbishes the glazing and lighting.');
  PJ('PRJ-108', 'JetParks 4 new surface car park', 'Capacity', 'Proposed', 'Head of Car Parking', [2950, 812, 150, 80], null, '', 22e6, 22e6, 0, 0,
    'Design:2027-03:2027-12|Procurement:2027-11:2028-03|Construction:2028-03:2028-12', '', 0,
    '+3,800 spaces; £5.2M a year parking revenue at maturity.', 'Planning consent; ecology surveys.', 'New park-and-ride car park east of Terminal 3 with a shuttle link.');
  PJ('PRJ-109', 'World Freight Terminal expansion', 'Capacity', 'Proposed', 'Cargo Director', [1500, 1110, 220, 90], null, 'World Freight Terminal', 35e6, 35e6, 0, 0,
    'Design:2027-06:2028-03|Procurement:2028-02:2028-06|Construction:2028-07:2029-09', '', 0,
    '+40,000 tonnes a year of cargo capacity; £3.1M a year rent.', 'Tenant pre-let not yet secured.', 'New 18,000 m² cross-dock warehouse and expanded HGV yard.');
  PJ('PRJ-110', 'The Station capacity upgrade', 'Capacity', 'Design', 'Surface Access Director', [2506, 512, 118, 104], null, 'The Station', 15e6, 15.8e6, 0.5e6, 0.04,
    'Design:2026-04:2027-02|Procurement:2027-01:2027-05|Construction:2027-06:2028-06', 'LS-01,LS-02', 140000,
    'Fourth rail platform and wider concourse for 30% more rail passengers.', 'Network Rail possessions; Metrolink interface.', 'Adds a platform and widens The Station concourse.');

  var PMONTHS = []; for (var yy = 2024; yy <= 2029; yy++) for (var mm = 1; mm <= 12; mm++) PMONTHS.push(yy + '-' + (mm < 10 ? '0' : '') + mm);
  var NOW_IDX = PMONTHS.indexOf('2026-10');
  function projectCurve(p) {
    var s = PMONTHS.indexOf(p['Start']), e = Math.max(s + 1, PMONTHS.indexOf(p['End']));
    var plan = [], act = [], fc = [];
    var sigmoid = function (t) { return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); };
    PMONTHS.forEach(function (m, i) {
      var t = (i - s) / (e - s);
      plan.push(Math.round(p['Budget (£)'] * sigmoid(t)));
      if (i <= NOW_IDX) act.push(i < s ? 0 : Math.round(p['Spent to Date (£)'] * sigmoid((i - s) / Math.max(1, NOW_IDX - s)) ));
      else act.push(null);
      if (i < NOW_IDX) fc.push(null);
      else { var t2 = (i - NOW_IDX) / Math.max(1, e - NOW_IDX); fc.push(Math.round(p['Spent to Date (£)'] + (p['Forecast (£)'] - p['Spent to Date (£)']) * sigmoid(t2))); }
    });
    return { plan: plan, act: act, fc: fc };
  }

  // ------------------------------------------- asset annual values + profiles
  // Pigment holds each asset's annual value per Asset Line, phased by a profile.
  var ASSET_LINES = [['Aero Revenue', 'aero', 'Flow'], ['Commercial Revenue', 'comm', 'Flow'], ['Property & Other Revenue', 'prop', 'Flow'], ['Staff Costs', 'staff', 'Flow'],
    ['Maintenance', 'maint', 'Flow'], ['Utilities', 'util', 'Flow'], ['Other Opex', 'other', 'Flow'], ['Depreciation', 'dep', 'Flow'], ['Budget EBITDA', 'bE', 'Flow'],
    ['Passengers', 'pax', 'Flow'], ['Movements', 'mov', 'Flow'], ['Utilisation', 'util_', 'Level'], ['Availability', 'avail', 'Level'], ['Service Level', 'sla', 'Level'], ['Condition Score', 'cond', 'Level']];
  var depSum = DEP.reduce(function (a, b) { return a + b; }, 0);
  var PROFILES = { 'Seasonal': DEP.map(function (d) { return Math.round(d / depSum * 1e6) / 1e6; }), 'Flat': MONTHS.map(function () { return Math.round(1e6 / 12) / 1e6; }) };
  var assetAnnual = {};
  assets.forEach(function (a) {
    a['Profile'] = /Hotel|Cargo|Closed/.test(a['Type']) ? 'Flat' : 'Seasonal';
    var acc = {}, lv = {};
    for (var m = 0; m < 12; m++) {
      var x = assetMonth(a, m, 'Actual'), y = assetMonth(a, m, 'Budget');
      x.bE = y.aero + y.comm + y.prop - y.staff - y.maint - y.util - y.other;
      ASSET_LINES.forEach(function (L) {
        var v = x[L[1]]; if (v === null || v === undefined) return;
        if (L[2] === 'Flow') acc[L[0]] = (acc[L[0]] || 0) + v; else { lv[L[0]] = lv[L[0]] || []; lv[L[0]].push(v); }
      });
    }
    var out = {};
    for (var k in acc) if (Math.abs(acc[k]) > 0.5) out[k] = Math.round(acc[k]);
    for (var k2 in lv) out[k2] = Math.round(lv[k2].reduce(function (p, c) { return p + c; }, 0) / lv[k2].length * 1000) / 1000;
    assetAnnual[a['Asset']] = out;
  });

  // -------------------------------------------------- Map Object list (JSON)
  // Frames cannot read list properties, so each drawable object carries its
  // definition as JSON in the Object Meta metric. Basemap paths ship in the Frame.
  var objects = [];
  features.forEach(function (f) {
    if (f['Type'] === 'base') return;
    var o = { t: f['Type'], s: f['Shape'] };
    [['Label', 'l'], ['Sub', 'sub'], ['LabelX', 'lx'], ['LabelY', 'ly'], ['Terminal', 'term'], ['Zone', 'z'], ['Pier', 'p'], ['Heading', 'h'], ['Ends', 'e'], ['Closed', 'c'], ['Small', 'sm'], ['Far', 'f'], ['Line', 'ln'], ['Asset', 'a']].forEach(function (k) {
      if (f[k[0]] !== undefined && f[k[0]] !== '') o[k[1]] = f[k[0]];
    });
    objects.push({ name: 'F:' + f['Feature'], meta: JSON.stringify(o) });
  });
  assets.forEach(function (a) { objects.push({ name: 'A:' + a['Asset'], meta: JSON.stringify({ type: a['Type'], term: a['Terminal'], pier: a['Pier'] || '', gate: a['Gate'] || '', facts: a['Facts'] || '', prof: a['Profile'] }) }); });
  projects.forEach(function (p) {
    objects.push({ name: 'P:' + p['Project'], meta: JSON.stringify({ name: p['Project Name'], type: p['Type'], status: p['Status'], sponsor: p['Sponsor'], shape: p['Shape'], line: p['Line'], asset: p['Asset'],
      budget: p['Budget (£)'], forecast: p['Forecast (£)'], spent: p['Spent to Date (£)'], pct: p['% Complete'], phases: p['Phases'], affected: p['Affected Units'], risk: p['Revenue Impact (£)'],
      benefits: p['Benefits'], risks: p['Risks'], desc: p['Description'] }) });
  });

  // ----------------------------------------------------------- data sources
  // Same names, labels and value order as the Frame's Pigment data sources.
  var SOURCES = {
    objects: function () { return objects.map(function (o) { return { labels: [o.name], values: [o.meta] }; }); },
    unitInputs: function () { return units.map(function (u) { var c = u['Unit Code']; return { labels: [c], values: [unitMeta(u), rates[c] || 0, { label: unitCat[c] }, u['Area (m²)'], u['MAG (£/yr)'] || 0] }; }); },
    unitMonthly: function () {
      var rows = [];
      units.forEach(function (u) {
        MONTHS.forEach(function (m, i) {
          var x = calc(u, i, 'Actual'), b = calc(u, i, 'Budget');
          rows.push({ labels: [u['Unit Code'], MLABEL[i]], values: [x.sales, x.conc, x.other, x.direct, x.alloc, x.profit, b.profit, x.tx, x.pax, b.pax] });
        });
      });
      return rows;
    },
    gateMonthly: function () { var rows = []; gates.forEach(function (g) { MONTHS.forEach(function (m, i) { rows.push({ labels: [g.name, MLABEL[i]], values: [gatePax.Actual[g.name][i], gatePax.Budget[g.name][i]] }); }); }); return rows; },
    assetAnnual: function () { var rows = []; assets.forEach(function (a) { var v = assetAnnual[a['Asset']]; ASSET_LINES.forEach(function (L) { if (v[L[0]] !== undefined) rows.push({ labels: [a['Asset'], L[0]], values: [v[L[0]]] }); }); }); return rows; },
    profiles: function () { var rows = []; Object.keys(PROFILES).forEach(function (p) { PROFILES[p].forEach(function (w, i) { rows.push({ labels: [p, MLABEL[i]], values: [w] }); }); }); return rows; }
  };
  var dsSubs = [];
  function emit(sub, delay) {
    if (sub.dead) return;
    clearTimeout(sub.t);
    try { sub.h.onData({ rows: [{ labels: [{ kind: 'loading' }], values: [{ kind: 'loading' }] }], rowOffset: 0, totalRowCount: 0 }); } catch (e) { console.error(e); }
    sub.t = setTimeout(function () {
      if (sub.dead) return;
      var all = SOURCES[sub.name](), off = sub.scroll.offset || 0, n = Math.min(sub.scroll.numberOfRows || 1000, 1000);
      try { sub.h.onData({ rows: all.slice(off, off + n), rowOffset: off, totalRowCount: all.length }); } catch (e) { console.error(e); }
    }, delay === undefined ? 160 : delay);
  }
  function recalc() { dsSubs.forEach(function (s) { if (s.name === 'unitInputs' || s.name === 'unitMonthly') { s.scroll = { offset: 0, numberOfRows: 1000 }; emit(s, 650); } }); }

  var SDK = {
    subscribeToDataSource: function (name, h) {
      var sub = { name: name, h: h, scroll: h.scroll || { offset: 0, numberOfRows: 1000 } };
      if (!SOURCES[name]) { setTimeout(function () { h.onError && h.onError({ message: 'No data source named "' + name + '".' }); }, 0); return { unsubscribe: function () {}, updateScroll: function () {} }; }
      dsSubs.push(sub); emit(sub);
      return {
        unsubscribe: function () { sub.dead = true; clearTimeout(sub.t); dsSubs = dsSubs.filter(function (s) { return s !== sub; }); },
        updateScroll: function (s) { sub.scroll = s; emit(sub, 40); }
      };
    },
    editValue: function (sink, coords, value) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          var code = coords && coords.unitList;
          if (!meta[code]) return reject(new Error('Unit "' + code + '" not found.'));
          if (sink === 'sRate') rates[code] = value === null ? null : Number(value);
          else if (sink === 'sCategory') { if (!CATS[value]) return reject(new Error('Unknown category "' + value + '".')); unitCat[code] = value; }
          else return reject(new Error('No data sink named "' + sink + '".'));
          resolve(); recalc();
        }, 200);
      });
    }
  };
  window.PigmentSDK = Object.freeze(SDK);

  // --------------------------------------------- export for the Pigment build
  window.__APM_EXPORT = function () {
    return {
      months: MLABEL,
      categories: Object.keys(CATS).map(function (k) { var c = CATS[k]; return { name: k, conv: Math.round(c.conv * 1e6) / 1e6, ticket: c.ticket, model: c.model, costRatio: c.costRatio || 0, rate: c.rate || 0, group: CAT_GROUP[k] }; }),
      bases: BASE_ORDER.map(function (b) { return BASES[b]; }),
      gates: gates.map(function (g) { return { name: g.name, terminal: g.terminal, pier: g.pier, share: g.share }; }),
      units: units.map(function (u) { return u; }),
      termPax: termPax, ramp: RAMP, profiles: PROFILES, assetLines: ASSET_LINES, assets: assets.map(function (a) { return { id: a['Asset'], profile: a['Profile'] }; }), assetAnnual: assetAnnual,
      objects: objects, sources: { unitMonthly: SOURCES.unitMonthly(), unitInputs: SOURCES.unitInputs() }
    };
  };
})();
