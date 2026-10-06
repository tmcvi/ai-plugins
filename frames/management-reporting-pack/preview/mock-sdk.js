// Offline mock of window.PigmentSDK for previewing the Management Reporting Pack outside Pigment.
// It reproduces the label layout of each bound View with synthetic numbers (not real model data).
// Query parameters: ?fail=vCash,vPvm  ?empty=vPvmProd  ?slow=1  ?shape=b (alternative pivot order)
(function () {
  'use strict';
  var q = new URLSearchParams(location.search);
  var FAIL = (q.get('fail') || '').split(',').filter(Boolean);
  var EMPTY = (q.get('empty') || '').split(',').filter(Boolean);
  var SLOW = q.get('slow') === '1';
  var SHAPE_B = q.get('shape') === 'b';
  var SCEN = 'Baseline Forecast';
  var TOTAL = { kind: 'total' };
  var LOADING = { kind: 'loading' };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var LAST_ACTUAL = 202503;

  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function key(y, m) { return y * 100 + m; }
  function label(k) { return MON[(k % 100) - 1] + ' ' + String(Math.floor(k / 100)).slice(2); }
  function parse(l) { var m = /^(\w{3}) (\d{2})$/.exec(l); return m ? (2000 + +m[2]) * 100 + MON.indexOf(m[1]) + 1 : null; }
  var MONTHS = [];
  for (var y = 2020; y <= 2025; y++) for (var m = 1; m <= 12; m++) MONTHS.push(key(y, m));
  var season = [1.0, 0.92, 0.97, 0.95, 1.03, 0.9, 1.05, 1.08, 1.1, 0.96, 1.14, 1.06];

  // P&L by account, version and month.
  var ACCOUNTS = [
    ['Net Income', 'EBITDA', 'Revenue', '400 - Revenue', 'rev', 1],
    ['Net Income', 'EBITDA', 'Direct Costs', '500 - Cost of Sales', 'dc', 0.78],
    ['Net Income', 'EBITDA', 'Direct Costs', '510 - Freight & Logistics', 'dc', 0.22],
    ['Net Income', 'EBITDA', 'Operating Expenses', '605 - Advertising', 'opex', 0.105],
    ['Net Income', 'EBITDA', 'Operating Expenses', '610 - Telephone & Internet', 'opex', 0.07],
    ['Net Income', 'EBITDA', 'Operating Expenses', '612 - Rent', 'opex', 0.145],
    ['Net Income', 'EBITDA', 'Operating Expenses', '620 - Travel & Entertainment', 'opex', 0.01],
    ['Net Income', 'EBITDA', 'Operating Expenses', '624 - Postage & Delivery', 'opex', 0.053],
    ['Net Income', 'EBITDA', 'Operating Expenses', '628 - General Expenses', 'opex', 0.19],
    ['Net Income', 'EBITDA', 'Operating Expenses', '630 - Consulting & Accounting', 'opex', 0.172],
    ['Net Income', 'EBITDA', 'Operating Expenses', '632 - Insurance', 'opex', 0.045],
    ['Net Income', 'EBITDA', 'Operating Expenses', '634 - Repairs and Maintenance', 'opex', 0.048],
    ['Net Income', 'EBITDA', 'Operating Expenses', '635 - Software Subscriptions', 'opex', 0.112],
    ['Net Income', 'EBITDA', 'Operating Expenses', '640 - Legal Expenses', 'opex', 0.043],
    ['Net Income', 'EBITDA', 'Operating Expenses', '644 - Utilities', 'opex', 0.035],
    ['Net Income', 'EBITDA', 'Operating Expenses', '660 - Bank Service Charges', 'opex', 0.035],
    ['Net Income', 'Below EBITDA', 'ITDA', '700 - Depreciation & Amortisation', 'other', 0.55],
    ['Net Income', 'Below EBITDA', 'ITDA', '800 - Interest', 'other', 0.2],
    ['Net Income', 'Below EBITDA', 'ITDA', '900 - Tax', 'other', 0.25]
  ];
  var LINES = {};
  ['Actual', 'Budget', 'Forecast'].forEach(function (v) { LINES[v] = {}; });
  MONTHS.forEach(function (k) {
    var i = (k % 100) - 1, yr = Math.floor(k / 100), g = Math.pow(1.06, yr - 2020);
    var base = 29.5e6 * g * season[i];
    var act = { rev: base * (0.96 + rnd() * 0.08) };
    act.dc = -act.rev * (0.29 + rnd() * 0.06);
    act.opex = -(3.4e6 + 1.6e6 * Math.sin(i / 1.8) + rnd() * 1.2e6) * g * (i === 11 ? 2.4 : 1);
    act.other = -(2.4e6 + rnd() * 0.4e6) * g;
    var bud = { rev: base * 1.05, dc: -base * 1.05 * 0.31, opex: -(3.5e6 + 1.5e6 * Math.sin(i / 1.8)) * g * (i === 11 ? 2.3 : 1), other: -2.6e6 * g };
    var fc = { rev: base * 1.01, dc: -base * 1.01 * 0.3, opex: -(3.3e6 + 1.5e6 * Math.sin(i / 1.8)) * g * (i === 11 ? 2.35 : 1), other: -2.8e6 * g };
    if (k <= LAST_ACTUAL) LINES.Actual[k] = act;
    LINES.Budget[k] = bud;
    // Forecast copies actual revenue for closed months and holds no costs there, like the model.
    LINES.Forecast[k] = k <= LAST_ACTUAL ? { rev: act.rev } : fc;
  });
  function accVal(ver, k, a) {
    var L = LINES[ver][k];
    if (!L || L[a[4]] == null) return null;
    var w = a[5];
    if (a[4] === 'opex') w = w * (1 + ((a[3].length * 13 + k) % 7 - 3) / 40) * (ver === 'Budget' && /Rent|Consult|Software/.test(a[3]) ? 1.18 : 1);
    return L[a[4]] * w;
  }
  function lines(ver, ks) {
    var o = { rev: 0, dc: 0, opex: 0, other: 0 }, any = false;
    ks.forEach(function (k) { var L = LINES[ver][k]; if (!L) return; any = true; ['rev', 'dc', 'opex', 'other'].forEach(function (x) { o[x] += L[x] || 0; }); });
    if (!any) return null;
    o.gp = o.rev + o.dc; o.ebitda = o.gp + o.opex; o.ni = o.ebitda + o.other;
    return o;
  }

  // Cash: Actual version only for closed months; Budget for all months.
  var CASH = { Actual: {}, Budget: {} };
  ['Actual', 'Budget'].forEach(function (v) {
    var cf = 46e6;
    MONTHS.forEach(function (k) {
      var L = LINES[v][k];
      if (!L) { if (v === 'Actual') CASH[v][k] = { bf: cf, inflow: 0, outflow: 0, cf: cf }; return; }
      var inflow = L.rev * (0.9 + rnd() * 0.07), outflow = (L.dc + L.opex + L.other) * (0.92 + rnd() * 0.12) - 1.9e6;
      var bf = cf; cf = bf + inflow + outflow;
      CASH[v][k] = { bf: bf, inflow: inflow, outflow: outflow, cf: cf };
    });
  });

  var COUNTRIES = ['FR01 - France', 'UK01 - United Kingdom', 'DE01 - Germany', 'US01 - United States', 'ES01 - Spain'];
  var CSHARE = [0.28, 0.24, 0.2, 0.18, 0.1];
  var SYMBOL = ['€', '£', '€', '$', '€'];
  var PRODUCTS = ['Analytics Suite', 'Cloud Platform', 'Data Services', 'Consulting', 'Support & Maintenance', 'Training', 'Hardware'];
  var PVM = [];
  COUNTRIES.forEach(function (c, ci) {
    PRODUCTS.forEach(function (p, pi) {
      var base = 365e6 * CSHARE[ci] * [0.24, 0.22, 0.16, 0.14, 0.12, 0.05, 0.07][pi] * (0.9 + rnd() * 0.2);
      var price = base * (rnd() * 0.08 - 0.02), vol = base * (rnd() * 0.12 - 0.05), mix = base * (rnd() * 0.04 - 0.02), fx = ci === 1 ? 0 : base * (rnd() * 0.03 - 0.015);
      PVM.push({ c: c, ci: ci, p: p, base: base, price: price, vol: vol, mix: mix, fx: fx, rev: base + price + vol + mix + fx });
    });
  });

  function sel(defs, alias) { var d = (defs || []).filter(function (x) { return x.alias === alias; })[0]; return d ? d.selection : null; }
  function grid(rows, cols, fn) { return { labels: { rows: rows, columns: cols }, cells: cols.map(function (c, ci) { return rows.map(function (r, ri) { return fn(r, c, ri, ci); }); }), rowOffset: 0, totalRowCount: rows.length }; }
  function yearsOf(defs) { var y = sel(defs, 'year'); return y ? y.map(function (s) { return 2000 + +s.replace(/\D/g, '').slice(-2); }) : [2025]; }
  function monthsOf(defs, years) {
    var ms = sel(defs, 'month');
    var ks = ms ? ms.map(parse).filter(Boolean) : MONTHS.filter(function (k) { return years.indexOf(Math.floor(k / 100)) >= 0; });
    return ks.filter(function (k) { return years.indexOf(Math.floor(k / 100)) >= 0; });
  }
  function accRows(subtotals) {
    var rows = [], last = {};
    ACCOUNTS.forEach(function (a, i) {
      rows.push({ path: [a[0], a[1], a[2], a[3]], acc: [a] });
      var next = ACCOUNTS[i + 1];
      if (subtotals && (!next || next[2] !== a[2])) rows.push({ path: [a[0], a[1], a[2], TOTAL], acc: ACCOUNTS.filter(function (x) { return x[2] === a[2]; }) });
      if (subtotals && (!next || next[1] !== a[1])) rows.push({ path: [a[0], a[1], TOTAL, TOTAL], acc: ACCOUNTS.filter(function (x) { return x[1] === a[1]; }) });
    });
    if (subtotals) rows.push({ path: [ACCOUNTS[0][0], TOTAL, TOTAL, TOTAL], acc: ACCOUNTS });
    return rows;
  }
  function sumAcc(accs, ver, ks) {
    var s = null;
    accs.forEach(function (a) { ks.forEach(function (k) { var v = accVal(ver, k, a); if (v != null) s = (s || 0) + v; }); });
    return s;
  }

  var BUILD = {
    vPeriod: function () {
      var cols = MONTHS.filter(function (k) { return k >= 202401; }).map(function (k) { return [label(k), SCEN]; });
      return grid([['Load Actuals'], ['Month type']], cols, function (r, c) { var k = parse(c[0]); return r[0] === 'Load Actuals' ? k <= LAST_ACTUAL : (k <= LAST_ACTUAL ? 'Actual' : 'Forecast'); });
    },
    vRev: function (defs) {
      var ks = monthsOf(defs, yearsOf(defs));
      var cols = ks.map(function (k) { return SHAPE_B ? ['Revenue', label(k), SCEN] : [label(k), SCEN, 'Revenue']; });
      return grid([['Actual'], ['Budget'], ['Forecast']], cols, function (r, c) {
        var k = parse(SHAPE_B ? c[1] : c[0]), L = LINES[r[0]][k];
        return L && L.rev != null ? L.rev : null;
      });
    },
    vLand: function () {
      var rows = accRows(true), cols = [];
      ['Actual', 'Forecast'].forEach(function (v) {
        MONTHS.filter(function (k) { return k >= 202501; }).forEach(function (k) { if ((v === 'Actual') === (k <= LAST_ACTUAL)) cols.push({ path: [v, label(k), SCEN], v: v, ks: [k] }); });
        cols.push({ path: [v, TOTAL, SCEN], v: v, ks: MONTHS.filter(function (k) { return k >= 202501 && (v === 'Actual') === (k <= LAST_ACTUAL); }) });
      });
      var g = grid(rows.map(function (r) { return r.path; }), cols.map(function (c) { return c.path; }), function (r, c, ri, ci) { return sumAcc(rows[ri].acc, cols[ci].v, cols[ci].ks); });
      return g;
    },
    vCompMonth: function (defs) { return compPL(defs, true); },
    vCompYtd: function (defs) { return compPL(defs, false); },
    vBudFy: function (defs) {
      var v = (sel(defs, 'version') || ['Actual'])[0], rows = accRows(true);
      var ks = MONTHS.filter(function (k) { return k >= 202501; });
      return grid(rows.map(function (r) { return r.path; }), [[SCEN], ['Variance'], ['Variance %']], function (r, c, ri, ci) { return ci === 0 ? sumAcc(rows[ri].acc, v, ks) : (ci === 1 ? 0 : null); });
    },
    vCash: function (defs) {
      var v = (sel(defs, 'version') || ['Budget'])[0], ks = monthsOf(null, yearsOf(defs));
      var src = CASH[v] || {};
      var rows = [['Cashflow B/F'], ['Cash inflows'], ['Cash outflows'], ['Cashflow C/F']], f = ['bf', 'inflow', 'outflow', 'cf'];
      return grid(rows, ks.map(function (k) { return [label(k), SCEN]; }), function (r, c, ri) { var x = src[parse(c[0])]; return x ? x[f[ri]] : null; });
    },
    vPvm: function () {
      var t = { base: 0, vol: 0, price: 0, mix: 0, fx: 0, rev: 0 };
      PVM.forEach(function (p) { Object.keys(t).forEach(function (k) { t[k] += p[k]; }); });
      var rows = [['Revenue base', 'base'], ['Volume effect', 'vol'], ['Price effect', 'price'], ['Mix effect', 'mix'], ['FX effect', 'fx'], ['Revenue', 'rev']];
      return grid(rows.map(function (r) { return [r[0]]; }), [[SCEN]], function (r, c, ri) { return t[rows[ri][1]]; });
    },
    vPvmProd: function () {
      var rows = [], recs = [];
      COUNTRIES.forEach(function (c, ci) {
        PVM.filter(function (p) { return p.ci === ci; }).forEach(function (p) { rows.push([c, p.p, SYMBOL[ci]]); recs.push([p]); });
        rows.push([c, TOTAL, TOTAL]); recs.push(PVM.filter(function (p) { return p.ci === ci; }));
      });
      rows.push([TOTAL, TOTAL, TOTAL]); recs.push(PVM);
      var mets = [['Revenue base', 'base'], ['FX rate base', null], ['Qty base', null], ['Mix base', null], ['Avg Price base', null], ['Revenue', 'rev'], ['FX rate', null], ['Qty', null], ['Mix', null], ['Avg Price', null], ['ΔRevenue=', 'd'], ['ΔQty Days', 'vol'], ['ΔPrice Days', 'price'], ['ΔMix', 'mix'], ['ΔFX', 'fx']];
      return grid(rows, mets.map(function (m) { return [m[0], SCEN]; }), function (r, c, ri, ci) {
        var f = mets[ci][1];
        if (!f) return 1 + rnd();
        return recs[ri].reduce(function (s, p) { return s + (f === 'd' ? p.rev - p.base : p[f]); }, 0);
      });
    },
    vPvmSet: function () {
      return grid([[]], [['Compare Year:', SCEN], ['and Version:', SCEN], ['...with Base Year:', SCEN], ['and Base Version:', SCEN]], function (r, c, ri, ci) { return ['FY 25', 'Forecast', 'FY 24', 'Actual'][ci]; });
    }
  };
  function compPL(defs, byCountry) {
    var v = (sel(defs, 'version') || ['Actual'])[0], ks = monthsOf(defs, yearsOf(defs));
    var L = lines(v, ks) || {};
    var mets = byCountry ? [['Revenue', 'rev'], ['Direct Costs', 'dc'], ['Gross Profit', 'gp'], ['OPEX', 'opex'], ['EBITDA', 'ebitda'], ['% of revenue', 'em'], ['Net Income', 'ni'], ['% of revenue', 'nm']]
      : [['Revenue', 'rev'], ['Direct Costs', 'dc'], ['Gross Profit', 'gp'], ['OPEX', 'opex'], ['EBITDA', 'ebitda'], ['Other', 'other'], ['Net Income', 'ni']];
    function val(f, share) { if (f === 'em') return L.rev ? L.ebitda / L.rev : null; if (f === 'nm') return L.rev ? L.ni / L.rev : null; return L[f] != null ? L[f] * share : null; }
    if (!byCountry) return grid(mets.map(function (m) { return [m[0]]; }), [[SCEN]], function (r, c, ri) { return val(mets[ri][1], 1); });
    var cols = COUNTRIES.map(function (c) { return [c, SCEN]; }).concat([[TOTAL, SCEN]]);
    return grid(mets.map(function (m) { return [m[0]]; }), cols, function (r, c, ri, ci) { return val(mets[ri][1], ci < COUNTRIES.length ? CSHARE[ci] : 1); });
  }
  function loadingPayload() { return { labels: { rows: [[LOADING]], columns: [[LOADING]] }, cells: [[LOADING]], rowOffset: 0, totalRowCount: 1 }; }
  function emptyPayload() { return { labels: { rows: [], columns: [] }, cells: [], rowOffset: 0, totalRowCount: 0 }; }

  var LISTS = {
    month: MONTHS.map(label),
    year: ['FY 20', 'FY 21', 'FY 22', 'FY 23', 'FY 24', 'FY 25'],
    version: ['Actual', 'Budget', 'Forecast'],
    currency: ['EUR', 'GBP', 'USD'],
    product: PRODUCTS
  };
  window.__mockLog = [];
  window.PigmentSDK = Object.freeze({
    subscribeToVizualization: function (alias, o) {
      var live = true, defs = o.pageDefinitions || [], timers = [];
      window.__mockLog.push({ alias: alias, op: 'subscribe', defs: defs });
      function later(fn, ms) { timers.push(setTimeout(function () { if (live) fn(); }, ms)); }
      function deliver(first) {
        if (!first) o.onData(loadingPayload());
        later(function () {
          if (FAIL.indexOf(alias) >= 0) { o.onError({ message: 'Access denied to this View for the current user.' }); return; }
          if (EMPTY.indexOf(alias) >= 0) { o.onData(emptyPayload()); return; }
          if (!BUILD[alias]) { o.onError({ message: 'Unknown binding ' + alias }); return; }
          o.onData(BUILD[alias](defs));
        }, SLOW ? 60000 : (first ? 250 + Math.floor(Math.random() * 900) : 350));
      }
      later(function () { o.onData(emptyPayload()); }, 10);
      later(function () { o.onData(loadingPayload()); }, 60);
      deliver(true);
      return {
        unsubscribe: function () { live = false; timers.forEach(clearTimeout); },
        updatePageDefinitions: function (d) { defs = d || []; window.__mockLog.push({ alias: alias, op: 'update', defs: defs }); deliver(false); },
        updateScroll: function () { }
      };
    },
    subscribeToItems: function (alias, o) {
      var t = setTimeout(function () { o.onData({ items: (LISTS[alias] || []).slice(), partialResult: false }); }, 40);
      return { unsubscribe: function () { clearTimeout(t); } };
    },
    addItem: function () { return Promise.reject(new Error('read-only mock')); },
    editItem: function () { return Promise.reject(new Error('read-only mock')); },
    editValue: function () { return Promise.reject(new Error('read-only mock')); }
  });
})();
