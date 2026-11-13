/*
 * Mock PigmentSDK: London Gatwick (LGW) edition.
 *
 * Stands in for window.PigmentSDK outside Pigment, like mock-sdk.js does for
 * Manchester, and runs the same Pigment model engine so the mock and the real
 * application show the same numbers.
 *
 * LAYOUT: real. Geometry comes from window.__LGW_GEO, built by
 * tools/build_lgw_geo.py from the OpenStreetMap-derived EGKK layout
 * (data/egkk-layout.json, (c) OpenStreetMap contributors, ODbL 1.0):
 * terminal and pier outlines, every stand with its number and heading, the
 * aprons and taxiways, both runways at their surveyed thresholds, and named
 * buildings (hotels, hangars, cargo terminal, control tower). The map is
 * rotated so runway 08R/26L runs left to right; 1 world unit = 1.34 m.
 * Zones inside the terminals (airside/landside split, security line), the
 * unit layout, the station footprint, the shuttle line and the long-stay car
 * park positions are schematic.
 *
 * DATA: all passenger, sales and profit figures by unit are ILLUSTRATIVE.
 * Total passengers are set near Gatwick's public 2025 figure (about 43M);
 * everything below that level is invented. Tenant units use generic names.
 *
 * Every Map Object carries ap:'LGW' and every unit code starts 'LGW-', so the
 * Gatwick data can share one Pigment application with Manchester.
 */
(function () {
  'use strict';
  var G = window.__LGW_GEO;
  if (!G) throw new Error('window.__LGW_GEO is missing (build.js inlines src/geo-lgw.json)');

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = mulberry32(20261031);
  function rr(a, b) { return a + (b - a) * rand(); }
  function r1(v) { return Math.round(v * 10) / 10; }

  var MONTHS = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026',
    'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026'];
  // Departing passengers per month, millions (illustrative; ~43.5M total pax for 2026, summer peak)
  var MSHARE = [0.062, 0.058, 0.07, 0.08, 0.088, 0.094, 0.102, 0.106, 0.095, 0.088, 0.066, 0.068];
  var msum = MSHARE.reduce(function (a, b) { return a + b; }, 0);
  var DEP = MSHARE.map(function (s) { return Math.round(s / msum * 21.75 * 100) / 100; });
  // Terminal shares of departing pax. Airline moves from April put more into the
  // North Terminal than the budget assumed.
  var SHARE = {
    Actual: MONTHS.map(function (m, i) { return i < 3 ? { NT: 0.52, ST: 0.48 } : { NT: 0.548, ST: 0.452 }; }),
    Budget: MONTHS.map(function () { return { NT: 0.52, ST: 0.48 }; })
  };

  // Same categories as the Manchester model (one shared Category list in Pigment).
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
  Object.keys(CATS).forEach(function (k) { if (CATS[k].model === 'Concession' && k !== 'Duty Free') CATS[k].conv *= 0.62; });
  var GENERIC = {
    'Café & Bakery': ['Coffee house', 'Bakery café', 'Espresso bar', 'Coffee kiosk', 'Café & deli'],
    'Bar & Restaurant': ['Pub & kitchen', 'Cocktail bar', 'Gin bar', 'Restaurant', 'Alehouse', 'Brasserie'],
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
  var SERVICE_CHARGE = 26;
  var DIRECT_COST = 8;

  var features = [], units = [], gates = [], meta = {}, rates = {};
  var nameIdx = {};
  function F(name, type, x, y, w, h, extra) {
    var o = { 'Feature': 'LGW ' + name, 'Type': type, 'Shape': [r1(x), r1(y), r1(w), r1(h)].join(',') };
    if (extra) for (var k in extra) o[k] = extra[k];
    features.push(o);
    return o;
  }
  function polyOf(name) { var p = G.polys[name]; if (!p) throw new Error('No polygon ' + name); return p; }
  function PF(name, type, poly, extra) {
    var p = polyOf(poly), b = p.box, o = F(name, type, b[0], b[1], b[2], b[3], extra);
    o['Poly'] = p.pg.map(function (q) { return q[0] + ',' + q[1]; }).join(' ');
    return o;
  }
  var leaseDates = ['2027-03-31', '2027-09-30', '2027-12-31', '2028-03-31', '2028-09-30', '2029-03-31',
    '2029-12-31', '2030-03-31', '2030-09-30', '2031-03-31', '2032-03-31'];

  function U(code, cat, terminal, zone, zoneType, x, y, w, h, pos, opt) {
    opt = opt || {};
    code = 'LGW-' + code;
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
      'Unit Code': code, 'Unit Name': base,
      'Tenant': opt.tenant || (c.model === 'Airport-operated' ? 'Airport-operated' : cat === 'Advertising' ? 'Media concession' : 'Concessionaire'),
      'Category': cat, 'Terminal': terminal, 'Zone': zone,
      'Area (m²)': opt.area || Math.max(8, Math.round(w * h * 1.8 * 0.6 / 5) * 5),
      'Operating Model': c.model,
      'Shape': [r1(x), r1(y), r1(w), r1(h)].join(','),
      'Lease Expiry': opt.lease || (c.model === 'Airport-operated' ? '' : leaseDates[Math.floor(rand() * leaseDates.length)]),
      'MAG (£/yr)': 0, 'Nearest Gate': opt.gate || ''
    };
    units.push(item);
    meta[code] = {
      zoneType: zoneType, pier: opt.pier || null, pos: pos, term: opt.term || terminal,
      locF: opt.locF || rr(0.82, 1.18), tkF: rr(0.9, 1.1), ticket: opt.ticket || null,
      noise: MONTHS.map(function () { return rr(0.93, 1.07); }),
      origCat: cat, magMult: opt.magMult || 0.72, poly: opt.poly || zone
    };
    rates[code] = opt.rate || (c.rate ? Math.round(c.rate * rr(0.92, 1.08) * 100) / 100 : null);
    return item;
  }

  // ============================================================ GEOGRAPHY
  G.runways.forEach(function (r) { F(r.name, 'runwayline', 0, 0, 0, 0, { 'Line': r.line.join(','), 'Ends': r.ends, 'Label': r.label }); });
  F('North', 'compass', 3380, 1770, 60, 60, { 'Heading': String(G.northDeg) });
  G.places.forEach(function (p) { F(p.name, 'place', 0, 0, 0, 0, { 'Label': p.name, 'LabelX': String(p.x), 'LabelY': String(p.y) }); });
  var POI_H = { Hotel: 0, Cargo: 11, Tower: 44, Hangar: 18, Fire: 8 };
  G.pois.forEach(function (p) {
    var ht = { 'Sofitel Gatwick': 30, 'Hampton by Hilton London Gatwick Airport': 22, 'Premier Inn Gatwick North Terminal': 20, 'Hangar 11': 20 }[p.name] || POI_H[p.kind] || 10;
    F(p.name, 'poi', p.box[0], p.box[1], p.box[2], p.box[3], { 'Label': p.label, 'LabelX': String(p.x), 'LabelY': String(p.y), 'Height': String(ht), 'Kind': p.kind });
  });

  // ----------------------------------------------------------- terminals
  // Real outlines; the airside/landside split and the security line are schematic.
  PF('North Terminal', 'terminal', 'NT main', { 'Terminal': 'NT', 'Label': 'NORTH TERMINAL', 'LabelX': '2330', 'LabelY': '360', 'Far': '1' });
  PF('NT Airside', 'zone', 'NT Airside', { 'Terminal': 'NT', 'Zone': 'NT Airside' });
  PF('NT Landside', 'zone', 'NT Landside', { 'Terminal': 'NT', 'Zone': 'NT Landside' });
  F('NT Security', 'security', G.security.NT[0], G.security.NT[1], G.security.NT[2], G.security.NT[3], { 'Terminal': 'NT', 'Label': '' });
  [402, 426, 450, 474].forEach(function (y, i) { F('NT Check-in ' + (i + 1), 'checkin', 2365, y, 28, 20, { 'Terminal': 'NT' }); });
  PF('South Terminal', 'terminal', 'ST main', { 'Terminal': 'ST', 'Label': 'SOUTH TERMINAL', 'LabelX': '3000', 'LabelY': '835', 'Far': '1' });
  PF('ST Airside', 'zone', 'ST Airside', { 'Terminal': 'ST', 'Zone': 'ST Airside' });
  PF('ST Landside', 'zone', 'ST Landside', { 'Terminal': 'ST', 'Zone': 'ST Landside' });
  F('ST Security', 'security', G.security.ST[0], G.security.ST[1], G.security.ST[2], G.security.ST[3], { 'Terminal': 'ST', 'Label': '' });
  [918, 940, 962].forEach(function (y, i) { F('ST Check-in ' + (i + 1), 'checkin', 3034, y, 40, 18, { 'Terminal': 'ST' }); });

  // ---------------------------------------------------------------- piers
  var PIERS = [['ST Pier 1', 'ST', 'PIER 1'], ['ST Pier 2', 'ST', 'PIER 2'], ['ST Pier 3', 'ST', 'PIER 3'], ['NT Pier 4', 'NT', 'PIER 4'], ['NT Pier 5', 'NT', 'PIER 5'], ['NT Pier 6', 'NT', 'PIER 6']];
  var PIER_LABEL = { 'ST Pier 1': [2965, 1190], 'ST Pier 2': [2600, 960], 'ST Pier 3': [2786, 718], 'NT Pier 4': [2560, 645], 'NT Pier 5': [2238, 200], 'NT Pier 6': [2100, 790] };
  PIERS.forEach(function (p) { PF(p[0], 'pier', p[0], { 'Terminal': p[1], 'Zone': p[0], 'Label': p[2], 'LabelX': String(PIER_LABEL[p[0]][0]), 'LabelY': String(PIER_LABEL[p[0]][1]), 'Small': '1' }); });
  PF('Pier 6 air bridge', 'walkway', 'Pier 6 air bridge', { 'Terminal': 'NT', 'Label': 'PIER 6 AIR BRIDGE', 'LabelX': '2300', 'LabelY': '720', 'Small': '1' });
  PF('Pier 3 bridge', 'walkway', 'Pier 3 bridge', { 'Terminal': 'ST' });

  // ------------------------------------------------- stands and gates (real numbers)
  var gateW = {};
  G.stands.forEach(function (s) {
    var sz = s.size, box = [s.x - sz / 2, s.y - sz / 2, sz, sz];
    if (s.pier) {
      var term = s.pier.slice(0, 2);
      F('Gate ' + s.id, 'gate', s.gx, s.gy, 0, 0, { 'Terminal': term, 'Pier': s.pier, 'Label': s.id });
      F('Stand ' + s.id, 'stand', box[0], box[1], box[2], box[3], { 'Heading': String(s.h), 'Terminal': term, 'Pier': s.pier });
      gates.push({ name: s.id, pier: s.pier, terminal: term });
      gateW[s.id] = Math.max(0.7, sz / 30) * rr(0.85, 1.15);
    } else {
      F('Stand ' + s.id, 'stand', box[0], box[1], box[2], box[3], { 'Heading': String(s.h) });
    }
  });

  // -------------------------------------------------------- North Terminal airside
  var NTA = 'NT Airside';
  U('NT-DF', 'Duty Free', 'NT', NTA, 'airside', 2316, 401, 27, 70, 1, { name: 'Walk-through duty free · North', area: 2400, rate: 0.37, lease: '2032-03-31', locF: 1.05 });
  ['Fashion & Luxury', 'Health & Beauty', 'Tech & Electronics', 'Jewellery & Watches'].forEach(function (cat, i) {
    U('NT-S-0' + (i + 1), cat, 'NT', NTA, 'airside', 2316, 475 + i * 16, 27, 14, rr(0.7, 0.9), { area: 160 });
  });
  var ntFh = ['Quick Service', 'Café & Bakery', 'Quick Service', 'Bar & Restaurant', 'Quick Service', 'Café & Bakery', 'Quick Service', 'Bar & Restaurant'];
  var ntFhN = ['Burgers', 'Bakery', 'Asian street food', 'Taproom', 'Pizza', 'Deli', 'Salad bar', 'Food hall bar'];
  ntFh.forEach(function (cat, i) {
    U('NT-FH-0' + (i + 1), cat, 'NT', NTA, 'airside', 2285 + (i % 2) * 14, 420 + Math.floor(i / 2) * 24, 13, 22, 0.9, { name: 'Food hall · ' + ntFhN[i] + ' · North', lease: '2030-09-30', area: 150 });
  });
  ['Bar & Restaurant', 'Café & Bakery', 'News & Convenience', 'Bar & Restaurant', 'Health & Beauty', 'Toys & Gifts', 'Currency Exchange'].forEach(function (cat, i) {
    U('NT-A-0' + (i + 1), cat, 'NT', NTA, 'airside', 2262, 401 + i * 22, 19, 20, rr(0.55, 0.85), { area: cat === 'Bar & Restaurant' ? 420 : 140 });
  });
  U('NT-LG-01', 'Lounge', 'NT', NTA, 'airside', 2262, 563, 40, 24, 1, { name: 'Premium lounge · North', tenant: 'Airport-operated', area: 1400 });
  U('NT-LG-02', 'Lounge', 'NT', NTA, 'airside', 2262, 589, 40, 22, 1, { name: 'Pay-in lounge · North', tenant: 'Airport-operated', area: 1100, ticket: 48, locF: 0.85 });
  U('NT-A-08', 'Bar & Restaurant', 'NT', NTA, 'airside', 2306, 592, 34, 12, 0.8, { area: 380 });

  // -------------------------------------------------------- North Terminal landside
  var NTL = 'NT Landside';
  ['Café & Bakery', 'News & Convenience', 'Quick Service', 'Health & Beauty', 'Currency Exchange'].forEach(function (cat, i) {
    U('NT-L-0' + (i + 1), cat, 'NT', NTL, 'landside', 2401 + i * 15, 436, 14, 34, rr(0.3, 0.5), { area: 110 });
  });
  U('NT-L-06', 'Café & Bakery', 'NT', NTL, 'landside', 2362, 502, 16, 22, 0.3, { name: 'Arrivals café · North', area: 240, locF: 0.6 });
  U('NT-L-07', 'Car Rental', 'NT', NTL, 'landside', 2362, 526, 16, 20, 1, { name: 'Car hire desks · North' });

  // -------------------------------------------------------- South Terminal airside
  var STA = 'ST Airside';
  U('ST-DF', 'Duty Free', 'ST', STA, 'airside', 2987, 880, 26, 70, 1, { name: 'Walk-through duty free · South', area: 2200, rate: 0.37, lease: '2031-03-31', locF: 1.0 });
  ['Fashion & Luxury', 'Health & Beauty', 'Tech & Electronics', 'Toys & Gifts', 'Jewellery & Watches'].forEach(function (cat, i) {
    U('ST-S-0' + (i + 1), cat, 'ST', STA, 'airside', 2987, 954 + i * 16, 26, 14, rr(0.65, 0.85), { area: 150 });
  });
  var stFh = ['Quick Service', 'Café & Bakery', 'Bar & Restaurant', 'Quick Service', 'Café & Bakery', 'Quick Service'];
  var stFhN = ['Burgers', 'Coffee', 'Pub', 'Noodles', 'Bakery', 'Sandwiches'];
  stFh.forEach(function (cat, i) {
    U('ST-FH-0' + (i + 1), cat, 'ST', STA, 'airside', 2958 + (i % 2) * 14, 900 + Math.floor(i / 2) * 26, 13, 24, 0.9, { name: 'Food court · ' + stFhN[i] + ' · South', lease: '2029-12-31', area: 140 });
  });
  ['Bar & Restaurant', 'News & Convenience', 'Café & Bakery'].forEach(function (cat, i) {
    U('ST-A-0' + (i + 1), cat, 'ST', STA, 'airside', 2937, 876 + i * 23, 18, 21, rr(0.55, 0.85), { area: cat === 'Bar & Restaurant' ? 380 : 130 });
  });
  ['Health & Beauty', 'Currency Exchange'].forEach(function (cat, i) {
    U('ST-A-0' + (i + 4), cat, 'ST', STA, 'airside', 2937, 990 + i * 23, 18, 21, rr(0.55, 0.8), { area: 120 });
  });
  U('ST-LG-01', 'Lounge', 'ST', STA, 'airside', 2958, 1008, 26, 30, 1, { name: 'Premium lounge · South', tenant: 'Airport-operated', area: 1200, locF: 0.85 });

  // -------------------------------------------------------- South Terminal landside
  var STL = 'ST Landside';
  ['Café & Bakery', 'News & Convenience', 'Quick Service', 'Health & Beauty', 'Currency Exchange'].forEach(function (cat, i) {
    U('ST-L-0' + (i + 1), cat, 'ST', STL, 'landside', 3034 + (i % 2) * 22, 990 + Math.floor(i / 2) * 20, 20, 18, rr(0.3, 0.5), { area: 110 });
  });
  U('ST-L-06', 'Café & Bakery', 'ST', STL, 'landside', 3056, 1030, 20, 38, 0.3, { name: 'Arrivals café · South', area: 300, locF: 0.15, lease: '2027-03-31' });
  U('ST-L-07', 'Duty Free', 'ST', STL, 'landside', 3034, 1050, 20, 18, 0.12, { name: 'Arrivals duty free · South', area: 170, rate: 0.3, locF: 0.12 });
  U('ST-L-08', 'Car Rental', 'ST', STL, 'landside', 3034, 1070, 42, 12, 1, { name: 'Car hire desks · South' });

  // ---------------------------------------------------------------- pier units
  U('ST-P2-01', 'Café & Bakery', 'ST', 'ST Pier 2', 'pier', 2860, 986, 16, 10, 0.95, { pier: 'ST Pier 2', gate: '11', area: 90 });
  U('ST-P2-02', 'News & Convenience', 'ST', 'ST Pier 2', 'pier', 2740, 986, 16, 10, 0.8, { pier: 'ST Pier 2', gate: '16', area: 70 });
  U('ST-P2-03', 'Quick Service', 'ST', 'ST Pier 2', 'pier', 2620, 986, 16, 10, 0.6, { pier: 'ST Pier 2', gate: '22', area: 80 });
  U('ST-P3-01', 'Café & Bakery', 'ST', 'ST Pier 3', 'pier', 2772, 760, 14, 12, 1, { pier: 'ST Pier 3', gate: '33', area: 110 });
  U('ST-P3-02', 'News & Convenience', 'ST', 'ST Pier 3', 'pier', 2790, 778, 14, 12, 0.9, { pier: 'ST Pier 3', gate: '36', area: 80 });
  U('ST-P1-01', 'Café & Bakery', 'ST', 'ST Pier 1', 'pier', 2940, 1080, 18, 14, 1, { pier: 'ST Pier 1', gate: '2M', area: 100 });
  U('NT-P4-01', 'Café & Bakery', 'NT', 'NT Pier 4', 'pier', 2420, 620, 16, 8, 0.95, { pier: 'NT Pier 4', gate: '53', area: 80 });
  U('NT-P4-02', 'News & Convenience', 'NT', 'NT Pier 4', 'pier', 2560, 620, 16, 8, 0.7, { pier: 'NT Pier 4', gate: '50', area: 60 });
  U('NT-P5-01', 'Café & Bakery', 'NT', 'NT Pier 5', 'pier', 2249, 520, 9, 18, 1, { pier: 'NT Pier 5', gate: '559', area: 70 });
  U('NT-P5-02', 'News & Convenience', 'NT', 'NT Pier 5', 'pier', 2249, 420, 9, 18, 0.75, { pier: 'NT Pier 5', gate: '563', area: 60 });
  U('NT-P5-03', 'Quick Service', 'NT', 'NT Pier 5', 'pier', 2249, 320, 9, 18, 0.55, { pier: 'NT Pier 5', gate: '567', area: 60, locF: 0.45, magMult: 2.0, lease: '2029-03-31' });
  U('NT-P6-01', 'Bar & Restaurant', 'NT', 'NT Pier 6', 'pier', 2262, 828, 22, 12, 1, { pier: 'NT Pier 6', gate: '687', area: 260 });
  U('NT-P6-02', 'Café & Bakery', 'NT', 'NT Pier 6', 'pier', 2180, 828, 16, 12, 0.85, { pier: 'NT Pier 6', gate: '691', area: 90 });
  U('NT-P6-03', 'News & Convenience', 'NT', 'NT Pier 6', 'pier', 2110, 828, 16, 12, 0.7, { pier: 'NT Pier 6', gate: '695', area: 70 });

  // ----------------------------------------------- station and inter-terminal shuttle
  var stn = G.station;
  F('Gatwick Airport station', 'station', stn[0] - 14, stn[1] - 42, 52, 84, { 'Terminal': 'Landside', 'Zone': 'Gatwick Station', 'Label': 'GATWICK AIRPORT STATION', 'Sub': 'RAIL · COACH · BUS', 'LabelX': String(r1(stn[0] + 12)), 'LabelY': String(r1(stn[1] - 48)), 'Small': '1' });
  // Shuttle track between the terminals (schematic line), drawn as a thin outline
  var SH = [[3062, 908], [2482, 452]], sdx = SH[1][0] - SH[0][0], sdy = SH[1][1] - SH[0][1], sl = Math.hypot(sdx, sdy), snx = -sdy / sl * 3.5, sny = sdx / sl * 3.5;
  var shPoly = [[SH[0][0] + snx, SH[0][1] + sny], [SH[1][0] + snx, SH[1][1] + sny], [SH[1][0] - snx, SH[1][1] - sny], [SH[0][0] - snx, SH[0][1] - sny]];
  var shBox = [Math.min(SH[0][0], SH[1][0]) - 4, Math.min(SH[0][1], SH[1][1]) - 4, Math.abs(sdx) + 8, Math.abs(sdy) + 8];
  var shF = F('Inter-terminal shuttle', 'walkway', shBox[0], shBox[1], shBox[2], shBox[3], { 'Terminal': 'Landside', 'Zone': 'Shuttle', 'Label': 'INTER-TERMINAL SHUTTLE', 'LabelX': '2780', 'LabelY': '660', 'Small': '1' });
  shF['Poly'] = shPoly.map(function (q) { return r1(q[0]) + ',' + r1(q[1]); }).join(' ');
  U('LS-01', 'Café & Bakery', 'Landside', 'Gatwick Station', 'station', stn[0] - 10, stn[1] - 30, 20, 18, 1, { name: 'Coffee kiosk · Station', locF: 1.3, area: 70 });
  U('LS-02', 'News & Convenience', 'Landside', 'Gatwick Station', 'station', stn[0] + 14, stn[1] - 30, 20, 18, 1, { name: 'News · Station', area: 70 });
  U('LS-03', 'Advertising', 'Landside', 'Gatwick Station', 'station', stn[0] - 10, stn[1] + 2, 44, 8, 1, { name: 'Digital screen · Station', area: 12 });
  [0.15, 0.4, 0.65, 0.88].forEach(function (t, i) {
    var cx = SH[0][0] + sdx * t, cy = SH[0][1] + sdy * t;
    U('SH-0' + (i + 1), 'Advertising', 'Landside', 'Shuttle', 'link', cx - 7, cy - 5, 14, 10, 1, { name: 'Digital screen · Shuttle ' + (i + 1), area: 12, poly: null });
  });

  // ------------------------------------------------------------ car parks
  function park(code, name, b, share, ticket, area) {
    return U(code, 'Parking', 'Ground', 'Car Parks', 'ground', b[0], b[1], b[2], b[3], 1, { name: name, tenant: 'Airport-operated', area: area, ticket: ticket, locF: share, poly: null });
  }
  // Real footprints from OSM
  park('CP-01', 'Short Stay North 5', G.carparks['Gatwick Short Stay North 5'], 0.12, 92, 2600 * 25);
  park('CP-02', 'Car Park 6 (North)', G.carparks['Car Park 6'], 0.08, 80, 2300 * 25);
  // Approximate positions (no landside OSM data yet): see README
  park('CP-03', 'Long Stay North', [2600, 150, 150, 100], 0.17, 52, 300000);
  park('CP-04', 'Long Stay South', [3165, 1100, 130, 110], 0.22, 50, 380000);
  park('CP-05', 'Short Stay South', [3096, 1040, 56, 50], 0.14, 95, 70000);
  park('CP-06', 'Meet & Greet', [3160, 860, 110, 70], 0.07, 140, 30000);
  U('CP-07', 'Car Rental', 'Ground', 'Car Parks', 'ground', 3160, 940, 80, 40, 1, { name: 'Car rental return', tenant: 'Rental concessions', area: 9000, lease: '2028-03-31', poly: null });

  // ===================================================== PIGMENT MODEL ENGINE
  // Mirrors the Pigment formulas one for one (see mock-sdk.js).
  var TERMS = ['NT', 'ST'];
  var MLABEL = MONTHS.map(function (m) { return m.slice(0, 3) + ' ' + m.slice(-2); });
  var termPax = { Actual: {}, Budget: {} };
  TERMS.forEach(function (t) {
    termPax.Actual[t] = MONTHS.map(function (m, i) { return Math.round(DEP[i] * 1e6 * SHARE.Actual[i][t]); });
    termPax.Budget[t] = MONTHS.map(function (m, i) { return Math.round(DEP[i] * 1e6 * 0.985 * SHARE.Budget[i][t]); });
  });
  var termW = {};
  gates.forEach(function (g) { termW[g.terminal] = (termW[g.terminal] || 0) + gateW[g.name]; });
  gates.forEach(function (g) { g.share = Math.round(gateW[g.name] / termW[g.terminal] * 1e6) / 1e6; });
  var gatePax = { Actual: {}, Budget: {} };
  ['Actual', 'Budget'].forEach(function (ver) { gates.forEach(function (g) { gatePax[ver][g.name] = MONTHS.map(function (m, i) { return termPax[ver][g.terminal][i] * g.share; }); }); });
  function termDep(t, m, ver) { return termPax[ver][t] ? termPax[ver][t][m] : 0; }
  function allDep(m, ver) { var s = 0; TERMS.forEach(function (t) { s += termPax[ver][t][m]; }); return s; }   // Gatwick terminals only
  function pierPax(p, m, ver) { var s = 0; gates.forEach(function (g) { if (g.pier === p) s += gatePax[ver][g.name][m]; }); return s; }

  var BASES = {}, BASE_ORDER = [];
  function B(name, terminal, scope, share, spaceCost) { BASES[name] = { name: name, terminal: terminal, scope: scope, share: share, spaceCost: spaceCost, airport: 'LGW' }; BASE_ORDER.push(name); }
  PIERS.forEach(function (p) {
    var s = 0; gates.forEach(function (g) { if (g.pier === p[0]) s += g.share; });
    B(p[0], p[1], 'Terminal', Math.round(s * 1e6) / 1e6, 52);
  });
  B('NT Departures', 'NT', 'Terminal', 1, 60); B('ST Departures', 'ST', 'Terminal', 1, 60);
  B('NT Landside', 'NT', 'Terminal', 2.1, 46); B('ST Landside', 'ST', 'Terminal', 2.1, 46);
  B('LGW Station', '', 'All', 0.6, 40); B('LGW Shuttle', '', 'All', 0.5, 40); B('LGW All Departures', '', 'All', 1, 2.6);
  var RAMP = { Actual: {}, Budget: {} };
  function basisPax(b, m, ver) {
    var x = BASES[b], base = x.scope === 'All' ? allDep(m, ver) : termDep(x.terminal, m, ver);
    return base * x.share * (RAMP[ver][b] ? RAMP[ver][b][m] : 1);
  }

  var unitCat = {};
  units.forEach(function (u) {
    var code = u['Unit Code'], md = meta[code], c = CATS[md.origCat];
    var basis = md.zoneType === 'pier' ? md.pier : md.zoneType === 'airside' ? md.term + ' Departures' : md.zoneType === 'landside' ? md.term + ' Landside' :
      md.zoneType === 'station' ? 'LGW Station' : md.zoneType === 'link' ? 'LGW Shuttle' : 'LGW All Departures';
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
  var assets = [], assetBy = {};
  function A(id, type, terminal, props) {
    if (assetBy[id]) return assetBy[id];
    var a = { 'Asset': id, 'Type': type, 'Terminal': terminal };
    for (var k in props || {}) a[k] = props[k];
    assets.push(a); assetBy[id] = a;
    return a;
  }
  features.forEach(function (f) {
    var t = f['Type'], n = f['Feature'].replace(/^LGW /, ''), term = f['Terminal'] || '';
    var id = null;
    if (t === 'terminal') id = A(n, 'Terminal', term)['Asset'];
    else if (t === 'pier') id = A(n, 'Pier', term)['Asset'];
    else if (t === 'walkway') id = n === 'Pier 6 air bridge' ? 'NT Pier 6' : n === 'Pier 3 bridge' ? 'ST Pier 3' : A('Inter-terminal shuttle', 'Walkway', 'Landside')['Asset'];
    else if ((t === 'stand' || t === 'gate') && f['Pier']) { var g = n.replace(/^(Stand|Gate) /, ''); id = A('Stand ' + g, 'Aircraft stand', term, { 'Pier': f['Pier'], 'Gate': g })['Asset']; }
    else if (t === 'runwayline') id = A(n, 'Runway', 'Airfield')['Asset'];
    else if (t === 'security') id = A(n, 'Security', term)['Asset'];
    else if (t === 'checkin') id = A(term + ' Check-in hall', 'Check-in', term)['Asset'];
    else if (t === 'station') id = A('Gatwick Airport station', 'Transport interchange', 'Landside')['Asset'];
    else if (t === 'poi' && /Hotel|Cargo|Hangar/.test(f['Kind'])) id = A(n, f['Kind'], 'Landside')['Asset'];
    if (id) f['Asset'] = id;
  });
  var ASSET_FACTS = {
    'North Terminal': { 'Opened': '1988', 'Gross area': '~98,000 m² (outline from OSM)', 'Condition': '4.1 / 5' },
    'South Terminal': { 'Opened': '1958 · much rebuilt since', 'Gross area': '~94,000 m² (outline from OSM)', 'Condition': '3.6 / 5' },
    'ST Pier 1': { 'Contact stands': '5', 'Condition': '4.4 / 5' }, 'ST Pier 2': { 'Contact stands': '18', 'Condition': '3.5 / 5' },
    'ST Pier 3': { 'Layout': 'Satellite, reached by a bridge', 'Contact stands': '8', 'Condition': '3.2 / 5' },
    'NT Pier 4': { 'Contact stands': '9', 'Condition': '3.8 / 5' }, 'NT Pier 5': { 'Contact stands': '18', 'Condition': '3.0 / 5 (air bridges being replaced)' },
    'NT Pier 6': { 'Access': 'Air bridge over the taxiway', 'Contact stands': '17', 'Condition': '4.5 / 5' },
    'Runway 08R/26L': { 'Length': '3,316 m × 45 m', 'Role': 'Main runway', 'Pavement condition': '86 / 100' },
    'Runway 08L/26R': { 'Length': '2,565 m × 45 m', 'Role': 'Standby runway and taxiway today', 'Plan': 'Northern Runway: moved 12 m north for dual operations' },
    'Gatwick Airport station': { 'Services': 'Rail to London and Brighton, coach, bus', 'Position': 'Footprint schematic' },
    'Inter-terminal shuttle': { 'Link': 'North Terminal to South Terminal', 'Route': 'Drawn schematically' },
    'Sofitel Gatwick': { 'Arrangement': 'Ground lease to hotel operator' }, 'Premier Inn Gatwick North Terminal': { 'Arrangement': 'Ground lease to hotel operator' },
    'Hampton by Hilton London Gatwick Airport': { 'Arrangement': 'Ground lease to hotel operator' },
    'Cargo Terminal': { 'Arrangement': 'Leased cargo sheds and handling' }, 'Hangar 6': { 'Arrangement': 'Leased to an airline or MRO tenant' },
    'Hangar 7': { 'Arrangement': 'Leased to an airline or MRO tenant' }, 'Hangar 9': { 'Arrangement': 'Leased to an airline or MRO tenant' }, 'Hangar 11': { 'Arrangement': 'Leased to an airline or MRO tenant' }
  };
  assets.forEach(function (a) { var f = ASSET_FACTS[a['Asset']]; if (f) a['Facts'] = Object.keys(f).map(function (k) { return k + ': ' + f[k]; }).join(' | '); });

  var standAvail = {}; gates.forEach(function (g) { standAvail[g.name] = rr(0.955, 0.995); });
  ['560', '561', '562', '563', '564', '565', '566', '567', '568', '569'].forEach(function (g) { if (standAvail[g] !== undefined) standAvail[g] = rr(0.62, 0.74); }); // air-bridge replacement on Pier 5
  var PIER_P = { 'ST Pier 1': [0.42e6, 4.4, 0.97], 'ST Pier 2': [0.55e6, 3.5, 0.95], 'ST Pier 3': [0.3e6, 3.2, 0.94], 'NT Pier 4': [0.4e6, 3.8, 0.96], 'NT Pier 5': [0.5e6, 3.0, 0.8], 'NT Pier 6': [0.9e6, 4.5, 0.985] };
  function commercial(test, m, ver) { var s = 0; units.forEach(function (u) { if (test(u)) { var x = calc(u, m, ver); s += x.conc + x.other; } }); return s; }
  function assetMonth(a, m, ver) {
    var id = a['Asset'], T = a['Type'], b = ver === 'Budget', season = DEP[m] / 1.8;
    var o = { aero: 0, comm: 0, prop: 0, staff: 0, maint: 0, util: 0, other: 0, dep: 0, pax: null, mov: null, util_: null, avail: null, sla: null, cond: null };
    if (T === 'Terminal') {
      var t = a['Terminal'], dep = termDep(t, m, ver), N = t === 'NT';
      o.pax = dep; o.mov = dep / 150;
      o.aero = dep * 11.8; o.comm = commercial(function (u) { return u.Terminal === t && !/Pier/.test(u.Zone); }, m, ver);
      o.prop = N ? 140000 : 120000;
      o.staff = dep * 2.2 + 1.1e6; o.maint = N ? 0.78e6 : 0.92e6; o.util = 0.7e6 * (1.25 - 0.25 * season); o.other = dep * 0.8;
      o.dep = N ? 3.9e6 : 3.4e6; o.util_ = dep / 1.35e6; o.cond = N ? 4.1 : 3.6; o.sla = N ? 0.95 : (m >= 3 ? 0.86 : 0.93);
    } else if (T === 'Pier') {
      var pd = pierPax(id, m, ver), ng = gates.filter(function (g) { return g.pier === id; }).length, P = PIER_P[id] || [0.3e6, 3.5, 0.95];
      o.pax = pd; o.mov = pd / 150;
      o.aero = o.mov * 230; o.comm = commercial(function (u) { return u.Zone === id; }, m, ver);
      o.staff = ng * 30000; o.maint = ng * 21000; o.util = ng * 8500 * (1.2 - 0.2 * season); o.other = ng * 6000;
      o.dep = P[0]; o.util_ = Math.min(0.95, o.mov / (ng * 30 * 12)); o.avail = P[2]; o.cond = P[1];
    } else if (T === 'Aircraft stand') {
      var g = a['Gate'], gp = (gatePax[ver][g] || [])[m] || 0;
      o.pax = gp; o.mov = gp / 150; o.aero = o.mov * 230 + o.mov * 40; o.maint = 16000; o.util = 4000; o.other = 2400; o.dep = 55000;
      o.util_ = Math.min(0.95, o.mov / (30 * 12)); o.avail = standAvail[g] || 0.97; o.cond = (PIER_P[a['Pier']] || [0, 3.8])[1];
    } else if (T === 'Runway') {
      var main = /08R/.test(id), mv = allDep(m, ver) / 150 * 2 * (main ? 0.985 : 0.015);
      o.mov = mv; o.aero = mv * 560; o.staff = main ? 1.05e6 : 0.06e6; o.maint = main ? 0.38e6 : 0.09e6; o.util = main ? 0.1e6 : 0.02e6; o.other = main ? 0.06e6 : 0.01e6; o.dep = main ? 0.62e6 : 0.18e6;
      o.util_ = main ? Math.min(0.97, mv / (55 * 18 * 30)) : 0.02; o.avail = main ? 0.988 : 0.999; o.cond = main ? 4.3 : 3.4;
    } else if (T === 'Security') {
      var sd = termDep(a['Terminal'], m, ver), N2 = a['Terminal'] === 'NT';
      o.pax = sd; o.staff = sd * 2.0 + 0.15e6; o.maint = 0.1e6; o.util = 0.04e6; o.other = sd * 0.18; o.dep = N2 ? 0.28e6 : 0.22e6;
      o.sla = N2 ? 0.955 : (m >= 3 ? 0.84 : 0.92); o.avail = N2 ? 0.97 : 0.93; o.cond = N2 ? 4.4 : 3.2;
    } else if (T === 'Check-in') {
      var cd = termDep(a['Terminal'], m, ver);
      o.pax = cd; o.aero = cd * 0.5; o.staff = 0.05e6; o.maint = 0.06e6; o.util = 0.03e6; o.other = 0.02e6; o.dep = 0.08e6; o.avail = 0.985; o.cond = a['Terminal'] === 'NT' ? 4.2 : 3.6;
    } else if (T === 'Transport interchange') {
      var ad = allDep(m, ver);
      o.pax = ad * 2 * 0.4; o.prop = 0.15e6; o.comm = commercial(function (u) { return u.Zone === 'Gatwick Station'; }, m, ver);
      o.staff = 0.1e6; o.maint = 0.08e6; o.util = 0.05e6; o.other = 0.03e6; o.dep = 0.3e6; o.avail = 0.99; o.cond = 4.2;
    } else if (T === 'Walkway') {
      o.pax = allDep(m, ver) * 0.6; o.comm = commercial(function (u) { return u.Zone === 'Shuttle'; }, m, ver);
      o.maint = 0.14e6; o.util = 0.05e6; o.staff = 0.04e6; o.dep = 0.21e6; o.avail = m >= 6 && m <= 7 ? 0.95 : 0.985; o.cond = 3.7;
    } else if (T === 'Hotel') {
      var sof = /sofitel/i.test(id);
      o.prop = sof ? 0.2e6 : 0.11e6; o.other = 0.01e6; o.util_ = (sof ? 0.86 : 0.82) * (0.9 + 0.1 * season); o.cond = 4.0;
    } else if (T === 'Cargo') {
      o.prop = 0.7e6; o.aero = 0.15e6; o.staff = 0.09e6; o.maint = 0.1e6; o.util = 0.04e6; o.other = 0.03e6; o.dep = 0.18e6; o.mov = 8200 * (0.95 + 0.1 * season); o.util_ = 0.84; o.cond = 3.4;
    } else if (T === 'Hangar') {
      o.prop = /11/.test(id) ? 0.16e6 : 0.09e6; o.maint = 0.02e6; o.util = 0.005e6; o.dep = 0.03e6; o.util_ = 0.9; o.cond = /11/.test(id) ? 3.9 : 3.1;
    }
    if (b) { o.aero *= 0.99; o.staff *= 0.97; o.maint *= 0.95; }
    return o;
  }

  // ================================================= PROJECTS (example data)
  var projects = [];
  function PJ(id, name, type, status, sponsor, box, line, asset, budget, forecast, spent, pct, phases, affected, revImpact, benefits, risks, desc) {
    projects.push({ 'Project': id, 'Project Name': name, 'Type': type, 'Status': status, 'Sponsor': sponsor, 'Shape': box ? box.map(r1).join(',') : '', 'Line': line ? line.join(',') : '',
      'Asset': asset, 'Budget (£)': budget, 'Forecast (£)': forecast, 'Spent to Date (£)': spent, '% Complete': pct, 'Phases': phases, 'Affected Units': affected || '',
      'Revenue Impact (£)': revImpact || 0, 'Benefits': benefits, 'Risks': risks, 'Description': desc,
      'Start': phases.split('|')[0].split(':')[1], 'End': phases.split('|').slice(-1)[0].split(':')[2] });
  }
  var rwN = G.runways[1].line;
  PJ('PRJ-201', 'Northern Runway', 'Capacity', 'In delivery', 'Chief Development Officer', null, rwN, 'Runway 08L/26R', 2.2e9, 2.25e9, 0.31e9, 0.14,
    'Design:2024-01:2025-09|Procurement:2025-06:2026-06|Construction:2026-03:2029-06|Commissioning:2029-06:2029-12', '', 0,
    'Moves the standby runway 12 m north so both runways can run together; public plans point to around 80M passengers a year by the late 2030s.',
    'Highway works interface; airspace change approval; construction next to a live runway.', 'Realigns and upgrades runway 08L/26R and its taxiways for routine use alongside the main runway (development consent granted in 2025).');
  PJ('PRJ-202', 'Pier 6 western extension', 'Capacity', 'In delivery', 'Head of Airfield Development', [2040, 790, 96, 80], null, 'NT Pier 6', 96e6, 99e6, 61e6, 0.66,
    'Design:2024-06:2025-02|Procurement:2025-01:2025-05|Construction:2025-05:2027-02|Commissioning:2027-02:2027-04', '', 0,
    'New contact stands at the west end of Pier 6; fewer passengers bussed to remote stands.', 'Works next to an active taxiway; steel delivery slots.', 'Extends Pier 6 west over stands 691 to 698 (shown as works in progress in OpenStreetMap).');
  PJ('PRJ-203', 'South Terminal security and departure lounge', 'Capacity', 'In delivery', 'Terminal Development Director', [2924, 860, 108, 96], null, 'ST Security', 58e6, 56.2e6, 37.5e6, 0.7,
    'Design:2024-11:2025-05|Procurement:2025-03:2025-07|Construction:2025-06:2027-02|Commissioning:2027-02:2027-04', 'LGW-ST-DF,LGW-ST-S-01,LGW-ST-S-02', 0,
    'Six extra security lanes; queue target back above 95%; 900 m² more lounge seating and shops.', 'Works phased around the live security hall; summer peak.', 'Enlarges the South Terminal central search area and the departure lounge behind it.');
  PJ('PRJ-204', 'North Terminal departure lounge extension', 'Commercial', 'Design', 'Retail & Commercial Director', [2260, 398, 86, 74], null, 'North Terminal', 34e6, 34e6, 1.1e6, 0.03,
    'Design:2026-04:2027-02|Procurement:2027-01:2027-05|Construction:2027-06:2028-09', 'LGW-NT-A-01,LGW-NT-A-02,LGW-NT-FH-01,LGW-NT-FH-02', 0,
    '+2,400 m² of shops and seating; +£4.2M a year commercial income at maturity.', 'Tenant decants; fire strategy.', 'Extends the North Terminal departure lounge to the west and replans the food hall.');
  PJ('PRJ-205', 'Pier 5 air-bridge replacement', 'Asset renewal', 'In delivery', 'Head of Airfield Infrastructure', [2212, 212, 56, 200], null, 'NT Pier 5', 21.4e6, 23.1e6, 12.9e6, 0.55,
    'Design:2025-02:2025-08|Procurement:2025-07:2025-12|Construction:2026-01:2027-05|Commissioning:2027-05:2027-07', 'LGW-NT-P5-03', 520000,
    'Replaces ten air bridges on stands 560 to 569; stand availability back above 98%.', 'Bridge cab lead times; two stands out of use at a time through the summer.', 'Phased replacement of the Pier 5 air bridges at the north end of the pier.');
  PJ('PRJ-206', 'South Terminal arrivals hall refit', 'Commercial', 'Design', 'Retail & Commercial Director', [3030, 988, 50, 104], null, 'South Terminal', 8.6e6, 8.6e6, 0.25e6, 0.02,
    'Design:2026-09:2027-05|Procurement:2027-04:2027-08|Construction:2027-09:2028-04', 'LGW-ST-L-01,LGW-ST-L-02,LGW-ST-L-06,LGW-ST-L-07', 540000,
    'Replaces the loss-making arrivals café with a food court and meeter-greeter seating; +£1.4M a year landside income.', 'Phasing around the arrivals hall; tenant break clauses.', 'Reconfigures the South Terminal arrivals hall.');
  PJ('PRJ-207', 'North Terminal roundabout and forecourt', 'Enabling', 'In delivery', 'Surface Access Director', [2482, 380, 120, 150], null, '', 61e6, 63.5e6, 18e6, 0.27,
    'Design:2025-01:2025-10|Procurement:2025-08:2026-02|Construction:2026-03:2028-03', '', 0,
    'Grade-separated access to the North Terminal; capacity for Northern Runway traffic.', 'Traffic management on the M23 spur; utilities diversions.', 'Highway works at the North Terminal roundabout, part of the Northern Runway surface access package.');
  PJ('PRJ-208', 'Cargo Terminal expansion', 'Capacity', 'Proposed', 'Cargo Director', [1684, 590, 342, 70], null, 'Cargo Terminal', 38e6, 38e6, 0, 0,
    'Design:2027-06:2028-03|Procurement:2028-02:2028-06|Construction:2028-07:2029-09', '', 0,
    '+35,000 tonnes a year of cargo capacity; £2.6M a year rent.', 'Tenant pre-let not yet secured.', 'New cross-dock shed and enlarged truck yard beside the Cargo Terminal.');

  // ------------------------------------------- asset annual values + profiles
  var ASSET_LINES = [['Aero Revenue', 'aero', 'Flow'], ['Commercial Revenue', 'comm', 'Flow'], ['Property & Other Revenue', 'prop', 'Flow'], ['Staff Costs', 'staff', 'Flow'],
    ['Maintenance', 'maint', 'Flow'], ['Utilities', 'util', 'Flow'], ['Other Opex', 'other', 'Flow'], ['Depreciation', 'dep', 'Flow'], ['Budget EBITDA', 'bE', 'Flow'],
    ['Passengers', 'pax', 'Flow'], ['Movements', 'mov', 'Flow'], ['Utilisation', 'util_', 'Level'], ['Availability', 'avail', 'Level'], ['Service Level', 'sla', 'Level'], ['Condition Score', 'cond', 'Level']];
  // The Asset Profile list is shared with Manchester: Gatwick adds its own seasonal curve and reuses Flat.
  var depSum = DEP.reduce(function (a, b) { return a + b; }, 0);
  var PROFILES = { 'LGW Seasonal': DEP.map(function (d) { return Math.round(d / depSum * 1e6) / 1e6; }), 'Flat': MONTHS.map(function () { return Math.round(1e6 / 12) / 1e6; }) };
  var assetAnnual = {};
  assets.forEach(function (a) {
    a['Profile'] = /Hotel|Cargo|Hangar/.test(a['Type']) ? 'Flat' : 'LGW Seasonal';
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
  var objects = [];
  features.forEach(function (f) {
    var o = { ap: 'LGW', t: f['Type'], s: f['Shape'] };
    [['Label', 'l'], ['Sub', 'sub'], ['LabelX', 'lx'], ['LabelY', 'ly'], ['Terminal', 'term'], ['Zone', 'z'], ['Pier', 'p'], ['Heading', 'h'], ['Ends', 'e'], ['Closed', 'c'], ['Small', 'sm'], ['Far', 'f'], ['Line', 'ln'], ['Asset', 'a'], ['Height', 'ht'], ['Poly', 'pg']].forEach(function (k) {
      if (f[k[0]] !== undefined && f[k[0]] !== '') o[k[1]] = f[k[0]];
    });
    objects.push({ name: 'F:' + f['Feature'], meta: JSON.stringify(o) });
  });
  assets.forEach(function (a) { objects.push({ name: 'A:' + a['Asset'], meta: JSON.stringify({ ap: 'LGW', type: a['Type'], term: a['Terminal'], pier: a['Pier'] || '', gate: a['Gate'] || '', facts: a['Facts'] || '', prof: a['Profile'] }) }); });
  projects.forEach(function (p) {
    objects.push({ name: 'P:' + p['Project'], meta: JSON.stringify({ ap: 'LGW', name: p['Project Name'], type: p['Type'], status: p['Status'], sponsor: p['Sponsor'], shape: p['Shape'], line: p['Line'], asset: p['Asset'],
      budget: p['Budget (£)'], forecast: p['Forecast (£)'], spent: p['Spent to Date (£)'], pct: p['% Complete'], phases: p['Phases'], affected: p['Affected Units'], risk: p['Revenue Impact (£)'],
      benefits: p['Benefits'], risks: p['Risks'], desc: p['Description'] }) });
  });

  // ------------------------------------------------- layout check (dev only)
  function inside(P, x, y) { var c = false; for (var i = 0, j = P.length - 1; i < P.length; j = i++) { if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; } return c; }
  var layoutIssues = [];
  units.forEach(function (u) {
    var md = meta[u['Unit Code']], p = md.poly && G.polys[md.poly];
    if (!p) return;
    var s = u['Shape'].split(',').map(Number);
    [[s[0], s[1]], [s[0] + s[2], s[1]], [s[0], s[1] + s[3]], [s[0] + s[2], s[1] + s[3]]].forEach(function (q) { if (!inside(p.pg, q[0], q[1])) layoutIssues.push(u['Unit Code'] + ' corner ' + q.map(r1).join(',') + ' outside ' + md.poly); });
  });
  window.__LGW_LAYOUT_ISSUES = layoutIssues;

  // ----------------------------------------------------------- data sources
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
      airport: 'LGW', months: MLABEL,
      categories: Object.keys(CATS).map(function (k) { var c = CATS[k]; return { name: k, conv: Math.round(c.conv * 1e6) / 1e6, ticket: c.ticket, model: c.model, costRatio: c.costRatio || 0, rate: c.rate || 0, group: CAT_GROUP[k] }; }),
      bases: BASE_ORDER.map(function (b) { return BASES[b]; }),
      gates: gates.map(function (g) { return { name: g.name, terminal: g.terminal, pier: g.pier, share: g.share }; }),
      units: units.map(function (u) { return u; }),
      termPax: termPax, ramp: RAMP, profiles: PROFILES, assetLines: ASSET_LINES, assets: assets.map(function (a) { return { id: a['Asset'], profile: a['Profile'] }; }), assetAnnual: assetAnnual,
      objects: objects, sources: { unitMonthly: SOURCES.unitMonthly(), unitInputs: SOURCES.unitInputs() }, layoutIssues: layoutIssues
    };
  };
})();
