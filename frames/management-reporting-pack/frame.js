(function () {
  'use strict';
  // Management Reporting Pack: slide-style management deck for the monthly business review.
  // Every figure is read from the Views behind boards 3.1, 3.4 and 3.5; nothing is hard-coded.

  var root = document.getElementById('app');
  if (!root) return;
  if (typeof root.__cleanup === 'function') { try { root.__cleanup(); } catch (e) { /* previous instance already gone */ } }

  // SECTION: config
  var CONFIG = {
    company: 'Sample Company Ltd',
    reportTitle: 'Management Report',
    deckName: 'Management Reporting Pack',
    application: '[DEMO] [FP&A] 01. DEMO Pigment Official Tour 2025',
    currency: 'GBP',          // selected on every View that exposes a Currency page
    runwayLookback: 3,        // months averaged for net cash movement
    trendWindow: 12,          // months shown on the cash trend
    stageW: 1600,
    stageH: 900
  };

  var B31 = '3.1 P&L Analysis & Rolling Forecast';
  var B34 = '3.4 Cashflows';
  var B35 = '3.5 Price Volume Mix Analysis';

  // One entry per View binding. `pages` lists the page aliases the View accepts.
  var VIEWS = {
    vPeriod:    { name: 'Manage Actual Period', board: B31, role: 'Actual and forecast months', pages: [] },
    vRev:       { name: 'Actuals vs. Budget vs. Forecast', board: B31, role: 'Revenue by version and month', pages: ['year', 'month', 'currency'] },
    vLand:      { name: 'P&L Reforecast', board: B31, role: 'P&L by account: actuals plus forecast', pages: ['version'] },
    vCompMonth: { name: 'Actuals - Country P&L Breakdown', board: B31, role: 'Comparison P&L for the period', pages: ['version', 'year', 'month', 'currency'] },
    vCompYtd:   { name: 'Revenue to Net income', board: B31, role: 'Comparison P&L year to date', pages: ['version', 'year', 'month', 'currency'] },
    vBudFy:     { name: 'P&L Reforecast (version comparison)', board: B31, role: 'Full-year budget by account', pages: ['version'] },
    vCash:      { name: 'Cash Position', board: B34, role: 'Opening, inflows, outflows, closing cash', pages: ['version', 'year'] },
    vPvm:       { name: 'PVM (waterfall)', board: B35, role: 'Revenue bridge effects', pages: ['currency'] },
    vPvmProd:   { name: 'Price Volume Mix Variance Analysis', board: B35, role: 'Price, volume, mix and FX by product', pages: ['currency'] },
    vPvmSet:    { name: 'PVM Settings', board: B35, role: 'Years and versions compared', pages: [] }
  };
  var VIEW_KEYS = Object.keys(VIEWS);
  var LIST_KEYS = ['month', 'year', 'version', 'currency', 'product'];

  // Scenario names are only used to keep a single scenario column; Frames do not select scenarios.
  var SCENARIOS = ['Baseline Forecast', 'More Aggressive Demand', 'Huel Scenario', 'Faster Growth', 'Downside Scenario', 'Scenario Example 1',
    'New BOM & Flour Cost Increase', 'September Forecast', 'Accelarated Growth', 'Frames Demo', 'Hire Freeze', 'New Release', 'Constrained',
    'FX Sensitivity', 'Current Live', 'Cost Escalation', 'Fast Growth Scenario', 'March Reforecast', 'CFO Scenario', 'Capability Led',
    'Shared Long-Range', 'February Reforecast', 'Rate Change', 'Approved Budget', 'September Reforecast'];

  var COLORS = {
    bg: '#FAFAF8', card: '#FFFFFF', ink: '#2E3440', ink2: '#7B8392', muted: '#A7ADB8', hair: '#ECECE7', hair2: '#F2F2EE',
    sage: '#CFE8DC', blue: '#CFE0F5', blush: '#F7D9DC', butter: '#FBEFC3', lavender: '#E3DAF5', peach: '#FDE2CF',
    pos: '#A8D5BA', neg: '#E8A9B0', posInk: '#2F6B4E', negInk: '#8E4552', posTint: '#E3F2E9', negTint: '#F9E6E8',
    // Mark steps of the same pastel hues, validated for colour-blind separation on the near-white surface.
    series: ['#73A8E8', '#DC9560', '#B094DF', '#4EA683', '#CBB35D'],
    other: '#C9CDD4', compare: '#C3CCD8', actual: '#73A8E8', actualSoft: '#B9D4F3', line: '#B094DF'
  };

  var MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  var MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MON_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var CAT_NAMES = { rev: 'Revenue', dc: 'Direct costs', gp: 'Gross profit', opex: 'Operating expenses', ebitda: 'EBITDA', other: 'ITDA & other', ni: 'Net income' };

  // SECTION: utils
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function num(v) { return isNum(v) ? v : 0; }
  function sumArr(a) { var s = null; for (var i = 0; i < a.length; i++) if (isNum(a[i])) s = (s || 0) + a[i]; return s; }
  function add(a, b) { return isNum(a) || isNum(b) ? num(a) + num(b) : null; }
  function sub(a, b) { return isNum(a) && isNum(b) ? a - b : null; }
  function ratio(a, b) { return isNum(a) && isNum(b) && b !== 0 ? a / b : null; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function round1(v) { return Math.round(v * 10) / 10; }

  function curSymbol() {
    var c = String(currencyLabel() || CONFIG.currency).toUpperCase();
    return c === 'GBP' ? '£' : c === 'EUR' ? '€' : c === 'USD' ? '$' : c + ' ';
  }
  // Currency: £ with k/m/bn abbreviations and one decimal.
  function fmtMoney(v, signed) {
    if (!isNum(v)) return '—';
    var a = Math.abs(v), s;
    if (a >= 1e9) s = (a / 1e9).toFixed(1) + 'bn';
    else if (a >= 1e6) s = (a / 1e6).toFixed(1) + 'm';
    else if (a >= 1e3) s = (a / 1e3).toFixed(1) + 'k';
    else s = a.toFixed(0);
    var neg = v < 0 && s.replace(/[^1-9]/g, '') !== '';
    return (neg ? '−' : (signed && v > 0 ? '+' : '')) + curSymbol() + s;
  }
  function fmtAxis(v) {
    if (!isNum(v)) return '';
    var a = Math.abs(v), s;
    if (a >= 1e9) s = trimZero((a / 1e9).toFixed(1)) + 'bn';
    else if (a >= 1e6) s = trimZero((a / 1e6).toFixed(1)) + 'm';
    else if (a >= 1e3) s = trimZero((a / 1e3).toFixed(1)) + 'k';
    else s = a.toFixed(0);
    return (v < 0 ? '−' : '') + curSymbol() + s;
  }
  function trimZero(s) { return s.replace(/\.0$/, ''); }
  function fmtPct(v, signed) {
    if (!isNum(v)) return '—';
    var p = round1(v * 100);
    return (p < 0 ? '−' : (signed && p > 0 ? '+' : '')) + Math.abs(p).toFixed(1) + '%';
  }
  function fmtPp(v) {
    if (!isNum(v)) return '—';
    var p = round1(v * 100);
    return (p < 0 ? '−' : p > 0 ? '+' : '') + Math.abs(p).toFixed(1) + ' pp';
  }
  function fmtMonths(v) { return isNum(v) ? (v >= 100 ? '99+' : v.toFixed(1)) : '—'; }

  // Month labels follow the calendar format "MMM yy" (e.g. "Mar 25").
  function parseMonth(s) {
    if (typeof s !== 'string') return null;
    var m = /^\s*([A-Za-z]{3})[A-Za-z]*\.?[\s\-']*(\d{2}|\d{4})\s*$/.exec(s);
    if (!m) return null;
    var i = MON.indexOf(m[1].toLowerCase());
    if (i < 0) return null;
    var y = +m[2];
    if (y < 100) y += 2000;
    return y * 100 + i + 1;
  }
  function mkYear(k) { return Math.floor(k / 100); }
  function mkMon(k) { return (k % 100) - 1; }
  function mkAdd(k, n) { var t = mkYear(k) * 12 + mkMon(k) + n; return Math.floor(t / 12) * 100 + (t % 12) + 1; }
  function monthLong(k) { return k ? MON_FULL[mkMon(k)] + ' ' + mkYear(k) : ''; }
  function monthShort(k) { return k ? MON_SHORT[mkMon(k)] + ' ' + String(mkYear(k)).slice(2) : ''; }
  function monthAbbr(k) { return k ? MON_SHORT[mkMon(k)] : ''; }

  // SECTION: state
  var state = {
    monthKey: null, periodAuto: true, comp: 'budget', slide: 0, presenter: false, menuOpen: false,
    bannerDismissed: false, cashVersion: 'actual', cashFallbackTried: false
  };
  var store = {};
  VIEW_KEYS.forEach(function (k) { store[k] = { status: 'idle', parsed: null, error: null, updatedAt: null, refreshing: false, sig: null, emptyTimer: null, rows: 0, cols: 0 }; });
  var lists = {};
  LIST_KEYS.forEach(function (k) { lists[k] = { items: null, partial: false, error: null }; });
  var subs = {};
  var listSubs = {};
  var monthLabels = {};   // month key -> label exactly as Pigment returns it
  var timers = { render: null, resize: null, period: null };
  var SDK = window.PigmentSDK;

  // SECTION: labels and selections
  function listNames(key) {
    var it = lists[key].items;
    if (!it) return null;
    return it.map(function (x) { return typeof x === 'string' ? x : (x && (x.name || x.label || x.displayName || x.value)) || ''; }).filter(Boolean);
  }
  function findItem(key, re, fallback) {
    var n = listNames(key);
    if (n) for (var i = 0; i < n.length; i++) if (re.test(n[i])) return n[i];
    return fallback;
  }
  function versionLabel(kind) {
    if (kind === 'budget') return findItem('version', /budget/i, 'Budget');
    if (kind === 'forecast') return findItem('version', /forecast|pr[ée]vision/i, 'Forecast');
    return findItem('version', /actual|r[ée]el/i, 'Actual');
  }
  function currencyLabel() {
    var want = new RegExp('^' + CONFIG.currency + '$', 'i');
    var n = listNames('currency');
    if (n && n.length) { for (var i = 0; i < n.length; i++) if (want.test(n[i].trim())) return n[i]; }
    return CONFIG.currency;
  }
  function yearLabel(y) {
    var yy = String(y).slice(2);
    var n = listNames('year');
    if (n) for (var i = 0; i < n.length; i++) { var m = /(\d{2,4})\s*$/.exec(n[i]); if (m && (m[1] === yy || m[1] === String(y))) return n[i]; }
    return 'FY ' + yy;
  }
  function monthLabel(k) {
    if (monthLabels[k]) return monthLabels[k];
    return monthShort(k);
  }
  function noteMonth(k, label) { if (!monthLabels[k]) monthLabels[k] = label; }
  function yearMonths(y) { var out = []; for (var i = 1; i <= 12; i++) out.push(y * 100 + i); return out; }

  function versionKind(t) {
    if (/^(actuals?|r[ée]el)$/i.test(t)) return 'actual';
    if (/^budget$/i.test(t)) return 'budget';
    if (/^(forecast|pr[ée]vision)$/i.test(t)) return 'forecast';
    var n = listNames('version');
    if (n && n.indexOf(t) >= 0) return t.toLowerCase();
    return null;
  }
  var SCEN_SET = {};
  SCENARIOS.forEach(function (s) { SCEN_SET[s.toLowerCase()] = true; });
  function isScenario(t) { return !!SCEN_SET[t.toLowerCase()]; }
  var CALC_RE = /^(variance( ?%)?|ytd (revenue|income) gap|[ée]cart( ?%)?)$/i;

  // SECTION: parsing
  function hasLoading(arr) {
    for (var i = 0; i < arr.length; i++) {
      var x = arr[i];
      if (Array.isArray(x)) { if (hasLoading(x)) return true; }
      else if (x && typeof x === 'object' && x.kind === 'loading') return true;
    }
    return false;
  }
  function isLoadingPayload(d) {
    if (!d || !d.labels) return true;
    return hasLoading(d.labels.rows || []) || hasLoading(d.labels.columns || []) || hasLoading(d.cells || []);
  }
  function normVal(v) {
    if (isNum(v)) return v;
    if (typeof v === 'boolean' || typeof v === 'string') return v;
    return null;
  }
  // Flattens a View payload into records whose tokens are every label on the cell's row and column path,
  // so the parser does not depend on pivot order or on which axis holds the metrics.
  function flatten(d) {
    var rows = (d.labels && d.labels.rows) || [];
    var cols = (d.labels && d.labels.columns) || [];
    var cells = d.cells || [];
    var recs = [];
    for (var c = 0; c < cells.length; c++) {
      var col = cells[c] || [];
      for (var r = 0; r < col.length; r++) recs.push(mkRec(rows[r] || [], cols[c] || [], col[r], r, c));
    }
    var scen = null;
    for (var i = 0; i < recs.length; i++) if (recs[i].scen) { scen = recs[i].scen; break; }
    return scen ? recs.filter(function (x) { return !x.scen || x.scen === scen; }) : recs;
  }
  function mkRec(rp, cp, v, r, c) {
    var rt = [], ct = [], total = false;
    function take(arr, out) {
      for (var i = 0; i < arr.length; i++) {
        var l = arr[i];
        if (typeof l === 'string') out.push(l.trim());
        else if (l && typeof l === 'object' && l.kind === 'total') total = true;
      }
    }
    take(rp, rt); take(cp, ct);
    var o = { rt: rt, ct: ct, toks: rt.concat(ct), v: normVal(v), total: total, r: r, c: c, month: null, version: null, scen: null, calc: false, rest: [] };
    o.toks.forEach(function (t) {
      if (!t) return;
      if (o.month == null) { var k = parseMonth(t); if (k) { o.month = k; noteMonth(k, t); return; } }
      if (o.version == null) { var vk = versionKind(t); if (vk) { o.version = vk; return; } }
      if (o.scen == null && isScenario(t)) { o.scen = t; return; }
      if (CALC_RE.test(t)) { o.calc = true; return; }
      o.rest.push(t);
    });
    return o;
  }
  function matchDict(rec, dict) {
    for (var i = 0; i < rec.toks.length; i++) {
      for (var j = 0; j < dict.length; j++) if (dict[j][1].test(rec.toks[i])) return dict[j][0];
    }
    return null;
  }
  function sumBy(recs, keyFn) {
    var leaf = {}, tot = {};
    recs.forEach(function (x) {
      if (x.calc || !isNum(x.v)) return;
      var k = keyFn(x);
      if (k == null) return;
      var bucket = x.total ? tot : leaf;
      if (x.total) { if (!(k in bucket)) bucket[k] = x.v; } else bucket[k] = (bucket[k] || 0) + x.v;
    });
    Object.keys(tot).forEach(function (k) { if (!(k in leaf)) leaf[k] = tot[k]; });
    return leaf;
  }

  var DICT_PL = [
    ['pct', /%/],
    ['rev', /^(rep )?revenue$|^ca$|^chiffre d.affaires?$|^ca par produit$/i],
    ['dc', /direct costs?|co[uû]ts? directs?/i],
    ['gp', /gross profit|marge brute/i],
    ['opex', /^(rep )?opex$|frais d.exploitation|co[uû]ts indirects/i],
    ['ebitda', /ebitda/i],
    ['other', /^(rep )?other$|itda|autres frais/i],
    ['ni', /net income|marge nette|r[ée]sultat net/i]
  ];
  function completeLines(o) {
    if (!isNum(o.gp) && isNum(o.rev) && isNum(o.dc)) o.gp = o.rev + o.dc;
    if (!isNum(o.dc) && isNum(o.rev) && isNum(o.gp)) o.dc = o.gp - o.rev;
    if (!isNum(o.ebitda) && isNum(o.gp) && isNum(o.opex)) o.ebitda = o.gp + o.opex;
    if (!isNum(o.opex) && isNum(o.ebitda) && isNum(o.gp)) o.opex = o.ebitda - o.gp;
    if (!isNum(o.ni) && isNum(o.ebitda) && isNum(o.other)) o.ni = o.ebitda + o.other;
    if (!isNum(o.other) && isNum(o.ni) && isNum(o.ebitda)) o.other = o.ni - o.ebitda;
    return o;
  }
  function parsePL(recs) {
    var s = sumBy(recs, function (x) { var k = matchDict(x, DICT_PL); return k === 'pct' ? null : k; });
    var o = { rev: s.rev, dc: s.dc, gp: s.gp, opex: s.opex, ebitda: s.ebitda, other: s.other, ni: s.ni };
    o.found = Object.keys(s).length;
    return completeLines(o);
  }

  function classifyAccount(name, hier) {
    var grp = String(hier.length ? hier[hier.length - 1] : '').toLowerCase();
    if (/^(total )?(revenues?|sales|turnover|chiffre d.affaires)$/.test(grp)) return 'rev';
    if (/cogs|cost of (goods|sales)|direct costs?|co[uû]ts? directs?/.test(grp)) return 'dc';
    if (/opex|operating expenses?|overheads?|frais d.exploitation/.test(grp)) return 'opex';
    if (/itda|deprec|amorti|interest|tax|below ebitda|other/.test(grp)) return 'other';
    var code = /^\s*(\d{3,})/.exec(name);
    if (code) {
      var d = code[1].charAt(0);
      if (d === '4') return 'rev';
      if (d === '5') return 'dc';
      if (d === '6') return 'opex';
      if ('789'.indexOf(d) >= 0) return 'other';
    }
    var s = (hier.join(' ') + ' ' + name).toLowerCase();
    if (/revenue|sales|turnover|chiffre/.test(name.toLowerCase())) return 'rev';
    if (/cogs|cost of (goods|sales)|direct cost|purchases|co[uû]ts? directs?/.test(s)) return 'dc';
    if (/deprec|amorti|interest|tax|itda|financ|exceptional/.test(s)) return 'other';
    return 'opex';
  }
  function cleanAccount(name) { return String(name).replace(/^\s*\d{3,}\s*[-–:.]\s*/, ''); }

  function parseLand(recs) {
    var acc = {}, order = [], months = {}, versions = {};
    recs.forEach(function (x) {
      if (x.total || x.calc || x.month == null || !x.rt.length) return;
      var rowRest = x.rt.filter(function (t) { return parseMonth(t) == null && !versionKind(t) && !isScenario(t); });
      if (!rowRest.length) return;
      var name = rowRest[rowRest.length - 1];
      if (!acc[name]) { acc[name] = { name: name, label: cleanAccount(name), hier: rowRest.slice(0, -1), cat: classifyAccount(name, rowRest.slice(0, -1)), v: {} }; order.push(name); }
      var ver = x.version || 'any';
      versions[ver] = true;
      months[x.month] = true;
      if (isNum(x.v)) { var b = acc[name].v[ver] || (acc[name].v[ver] = {}); b[x.month] = (b[x.month] || 0) + x.v; }
    });
    return { accounts: order.map(function (n) { return acc[n]; }), months: months, versions: versions };
  }
  function parseByVersionMonth(recs) {
    var out = {};
    var hasMetric = recs.some(function (x) { return matchDict(x, DICT_PL) != null; });
    recs.forEach(function (x) {
      if (x.total || x.calc || x.month == null || !isNum(x.v)) return;
      if (hasMetric && matchDict(x, DICT_PL) !== 'rev') return;
      var ver = x.version || 'any';
      var b = out[ver] || (out[ver] = {});
      b[x.month] = (b[x.month] || 0) + x.v;
    });
    return out;
  }
  var DICT_PERIOD = [['load', /load actuals|charger le r[ée]alis/i], ['type', /month type|r[ée]el ou pr[ée]v|period type/i]];
  function parsePeriod(recs) {
    var closed = {}, seen = {};
    recs.forEach(function (x) {
      if (x.month == null || x.total) return;
      seen[x.month] = true;
      var k = matchDict(x, DICT_PERIOD);
      if ((k === 'load' || k == null) && x.v === true) closed[x.month] = true;
      if ((k === 'type' || k == null) && typeof x.v === 'string' && /^(actual|r[ée]el)/i.test(x.v)) closed[x.month] = true;
    });
    return { closed: closed, seen: seen };
  }
  var DICT_CASH = [['bf', /b\/f|ouverture|opening/i], ['cf', /c\/f|cl[oô]ture|closing|report des flux/i], ['inflow', /inflow|encaissement|receipt/i],
    ['outflow', /outflow|d[ée]caissement|payment/i], ['net', /^cash ?flows?$|^flux de tr[ée]sorerie$|net cash/i]];
  function parseCash(recs) {
    var out = {};
    recs.forEach(function (x) {
      if (x.total || x.calc || x.month == null || !isNum(x.v)) return;
      var k = matchDict(x, DICT_CASH);
      if (!k) return;
      var b = out[x.month] || (out[x.month] = {});
      b[k] = (b[k] || 0) + x.v;
    });
    return out;
  }
  var DICT_PVM = [['base', /revenue base|^ca base$|ca initial/i], ['vol', /volume|^[Δ∆]\s*q|qty days|quantit/i], ['price', /price effect|effet prix|^[Δ∆]\s*pri/i],
    ['mix', /mix effect|effet mix|^[Δ∆]\s*mix/i], ['fx', /fx effect|effet t(au)?x|^[Δ∆]\s*fx/i], ['rev', /^(pvm )?revenue$|^ca( final)?$/i]];
  function parsePvm(recs) {
    var seen = {};
    var s = sumBy(recs.filter(function (x) {
      var k = matchDict(x, DICT_PVM);
      if (!k) return false;
      var id = x.r + '|' + x.c + '|' + k;
      if (seen[id]) return false;
      seen[id] = true;
      return true;
    }), function (x) { return matchDict(x, DICT_PVM); });
    return s;
  }
  function parsePvmProd(recs) {
    var prodNames = listNames('product');
    var pset = {};
    if (prodNames) prodNames.forEach(function (p) { pset[p] = true; });
    var seen = {}, out = {}, order = [];
    recs.forEach(function (x) {
      if (x.total || x.calc || !isNum(x.v)) return;
      var k = matchDict(x, DICT_PVM);
      if (!k) return;
      var id = x.r + '|' + k;
      if (seen[id]) return;
      seen[id] = true;
      var prod = null;
      for (var i = 0; i < x.rt.length; i++) if (pset[x.rt[i]]) { prod = x.rt[i]; break; }
      if (!prod) prod = x.rt.length >= 2 ? x.rt[1] : x.rt[x.rt.length - 1];
      if (!prod) return;
      if (!out[prod]) { out[prod] = { name: prod }; order.push(prod); }
      out[prod][k] = (out[prod][k] || 0) + x.v;
    });
    return order.map(function (p) { return out[p]; });
  }
  var DICT_SET = [['baseYear', /base year|ann[ée]e de base|avec (l.)?ann[ée]e/i], ['baseVersion', /base version|version de base/i],
    ['year', /compare year|comp\.? ann[ée]e|comparer l.ann[ée]e|pvm year/i], ['version', /version/i]];
  function parseSettings(recs) {
    var o = {};
    recs.forEach(function (x) {
      var k = matchDict(x, DICT_SET);
      if (k && !o[k] && typeof x.v === 'string' && x.v) o[k] = x.v;
    });
    return o;
  }
  var PARSERS = {
    vPeriod: function (r) { return parsePeriod(r); },
    vRev: function (r) { return parseByVersionMonth(r); },
    vLand: function (r) { return parseLand(r); },
    vCompMonth: function (r) { return parsePL(r); },
    vCompYtd: function (r) { return parsePL(r); },
    vBudFy: function (r) { return parseLand(r.map(function (x) { if (x.month == null) x.month = 0; return x; })); },
    vCash: function (r) { return parseCash(r); },
    vPvm: function (r) { return parsePvm(r); },
    vPvmProd: function (r) { return parsePvmProd(r); },
    vPvmSet: function (r) { return parseSettings(r); }
  };
  function isEmptyParsed(key, p) {
    if (!p) return true;
    if (key === 'vLand' || key === 'vBudFy') return !p.accounts.length;
    if (key === 'vPeriod') return !Object.keys(p.seen).length;
    if (key === 'vCompMonth' || key === 'vCompYtd') return !p.found;
    if (key === 'vPvmProd') return !p.length;
    return !Object.keys(p).length;
  }

  // SECTION: subscriptions
  function periodCtx() {
    var k = state.monthKey;
    var y = mkYear(k), py = y - 1;
    var comp = state.comp === 'py'
      ? { version: versionLabel('actual'), year: yearLabel(py), month: mkAdd(k, -12), ytdFrom: py * 100 + 1, label: 'Prior year', short: 'PY' }
      : { version: versionLabel('budget'), year: yearLabel(y), month: k, ytdFrom: y * 100 + 1, label: 'Budget', short: 'Budget' };
    var ytd = [];
    for (var m = comp.ytdFrom; m <= comp.month; m = mkAdd(m, 1)) ytd.push(m);
    comp.ytd = ytd;
    return { y: y, py: py, comp: comp };
  }
  function pd(alias, sel) { return { alias: alias, selection: sel }; }
  function defsFor(key) {
    if (!state.monthKey) return null;
    var P = periodCtx(), cur = currencyLabel(), out;
    var months = yearMonths(P.py).concat(yearMonths(P.y)).map(monthLabel);
    switch (key) {
      case 'vRev': out = [pd('year', [yearLabel(P.py), yearLabel(P.y)]), pd('month', months), pd('currency', [cur])]; break;
      case 'vCompMonth': out = [pd('version', [P.comp.version]), pd('year', [P.comp.year]), pd('month', [monthLabel(P.comp.month)]), pd('currency', [cur])]; break;
      case 'vCompYtd': out = [pd('version', [P.comp.version]), pd('year', [P.comp.year]), pd('month', P.comp.ytd.map(monthLabel)), pd('currency', [cur])]; break;
      case 'vCash': out = [pd('version', [versionLabel(state.cashVersion)]), pd('year', [yearLabel(P.py), yearLabel(P.y)])]; break;
      default: out = staticDefs(key);
    }
    return allowedDefs(key, out);
  }
  function allowedDefs(key, defs) { return defs.filter(function (d) { return VIEWS[key].pages.indexOf(d.alias) >= 0 && d.selection.length; }); }
  function staticDefs(key) {
    if (key === 'vLand') return [pd('version', [versionLabel('actual'), versionLabel('forecast')])];
    if (key === 'vBudFy') return [pd('version', [versionLabel('budget')])];
    if (key === 'vPvm' || key === 'vPvmProd') return [pd('currency', [currencyLabel()])];
    return [];
  }
  var PERIOD_VIEWS = ['vRev', 'vCompMonth', 'vCompYtd', 'vCash'];
  var STATIC_VIEWS = ['vPeriod', 'vLand', 'vBudFy', 'vPvm', 'vPvmProd', 'vPvmSet'];
  function applyStatic(key) {
    var defs = allowedDefs(key, staticDefs(key));
    if (!subs[key]) { subscribeView(key, defs); return; }
    var sig = JSON.stringify(defs), st = store[key];
    if (sig === st.sig) return;
    st.sig = sig; st.refreshing = true; st.error = null;
    try { subs[key].updatePageDefinitions(defs); } catch (e) { onViewError(key, e); }
  }

  function subscribeView(key, defs) {
    if (subs[key] || !SDK || typeof SDK.subscribeToVizualization !== 'function') return;
    var st = store[key];
    st.status = 'loading';
    st.sig = JSON.stringify(defs);
    try {
      subs[key] = SDK.subscribeToVizualization(key, {
        onData: function (d) { onViewData(key, d); },
        onError: function (e) { onViewError(key, e); },
        pageDefinitions: defs,
        scroll: { offset: 0, numberOfRows: 1000 }
      });
    } catch (e) { onViewError(key, e); }
  }
  function applyDefs(key) {
    var defs = defsFor(key);
    if (!defs) return;
    if (!subs[key]) { subscribeView(key, defs); return; }
    var sig = JSON.stringify(defs), st = store[key];
    if (sig === st.sig) return;
    st.sig = sig;
    st.refreshing = true;
    st.error = null;
    try { subs[key].updatePageDefinitions(defs); } catch (e) { onViewError(key, e); }
  }
  function onViewData(key, d) {
    var st = store[key];
    if (st.emptyTimer) { clearTimeout(st.emptyTimer); st.emptyTimer = null; }
    if (isLoadingPayload(d)) { if (!st.parsed) st.status = 'loading'; scheduleRender(); return; }
    var nCols = (d.labels.columns || []).length, nRows = (d.labels.rows || []).length;
    var recs = flatten(d);
    if (!nCols || !recs.length) {
      // An empty payload can precede loading; only treat it as empty once it settles.
      st.emptyTimer = setTimeout(function () {
        st.emptyTimer = null;
        commit(key, PARSERS[key]([]), nRows, nCols);
      }, 1200);
      return;
    }
    if (isNum(d.totalRowCount) && d.totalRowCount > nRows && nRows >= 1000) st.truncated = true;
    commit(key, PARSERS[key](recs), nRows, nCols);
  }
  function commit(key, parsed, nRows, nCols) {
    var st = store[key];
    st.parsed = parsed;
    st.rows = nRows; st.cols = nCols;
    st.status = isEmptyParsed(key, parsed) ? 'empty' : 'ready';
    st.refreshing = false;
    st.error = null;
    st.updatedAt = new Date();
    if (key === 'vCash') maybeCashFallback();
    resolvePeriod();
    scheduleRender();
  }
  function onViewError(key, e) {
    var st = store[key];
    st.status = 'error';
    st.refreshing = false;
    st.error = (e && (e.message || e.error || e.reason)) || String(e || 'Unknown error');
    state.bannerDismissed = false;
    scheduleRender();
  }
  function subscribeList(key) {
    if (listSubs[key] || !SDK || typeof SDK.subscribeToItems !== 'function') return;
    try {
      listSubs[key] = SDK.subscribeToItems(key, {
        onData: function (d) {
          if (!d || !Array.isArray(d.items)) return;
          lists[key].items = d.items;
          lists[key].partial = !!d.partialResult;
          (listNames(key) || []).forEach(function (n) { var k = parseMonth(n); if (k && key === 'month') noteMonth(k, n); });
          if (state.monthKey) PERIOD_VIEWS.forEach(applyDefs);
          STATIC_VIEWS.forEach(applyStatic);
          resolvePeriod();
          scheduleRender();
        },
        onError: function (e) { lists[key].error = (e && e.message) || String(e); scheduleRender(); }
      });
    } catch (e) { lists[key].error = (e && e.message) || String(e); }
  }

  // Closed months come from "Manage Actual Period"; the P&L and revenue Views are the fallbacks.
  function closedMonths() {
    var p = store.vPeriod.parsed, out = {};
    if (p && Object.keys(p.closed).length) return p.closed;
    var L = store.vLand.parsed;
    if (L) L.accounts.forEach(function (a) { var A = a.v.actual; if (A) Object.keys(A).forEach(function (k) { if (isNum(A[k]) && A[k] !== 0) out[k] = true; }); });
    if (Object.keys(out).length) return out;
    var R = store.vRev.parsed;
    if (R && R.actual) Object.keys(R.actual).forEach(function (k) { if (isNum(R.actual[k]) && R.actual[k] !== 0) out[k] = true; });
    return out;
  }
  function isClosed(k) { return !!closedMonths()[k]; }
  function latestClosed() {
    var keys = Object.keys(closedMonths()).map(Number).filter(Boolean);
    if (!keys.length) return null;
    var L = store.vLand.parsed;
    if (L && Object.keys(L.months).length) {
      // Keep the default period inside the financial year the P&L View reports.
      var lm = Object.keys(L.months).map(Number), lo = Math.min.apply(null, lm), hi = Math.max.apply(null, lm);
      var inside = keys.filter(function (k) { return k >= lo && k <= hi; });
      if (inside.length) keys = inside;
    }
    return Math.max.apply(null, keys);
  }
  function resolvePeriod() {
    if (!state.periodAuto) return;
    var k = latestClosed();
    if (!k && state.monthKey == null && store.vPeriod.status !== 'loading' && store.vLand.status !== 'loading' && store.vLand.status !== 'idle') {
      var n = (listNames('month') || []).map(parseMonth).filter(Boolean);
      if (n.length) k = Math.max.apply(null, n);
    }
    if (k && k !== state.monthKey) setPeriod(k, true);
  }
  function setPeriod(k, auto) {
    state.monthKey = k;
    if (!auto) state.periodAuto = false;
    PERIOD_VIEWS.forEach(applyDefs);
    scheduleRender();
  }
  function setComparison(c) {
    if (c === state.comp || c === 'pf') return;
    state.comp = c;
    PERIOD_VIEWS.forEach(applyDefs);
    scheduleRender();
  }
  // Board 3.4 plans cash on a single version; if the Actual version holds no cash, show the board's Budget version.
  function maybeCashFallback() {
    var C = store.vCash.parsed;
    if (state.cashVersion !== 'actual' || state.cashFallbackTried || !C) return;
    var any = Object.keys(C).some(function (k) { return isNum(C[k].cf) && C[k].cf !== 0; });
    if (any) return;
    state.cashFallbackTried = true;
    state.cashVersion = 'budget';
    applyDefs('vCash');
  }

  // SECTION: model
  function emptyLines() { return { rev: null, dc: null, gp: null, opex: null, ebitda: null, other: null, ni: null }; }
  function addLines(a, b) { var o = {}; ['rev', 'dc', 'opex', 'other'].forEach(function (k) { o[k] = add(a[k], b[k]); }); return deriveLines(o); }
  function deriveLines(o) {
    o.gp = isNum(o.rev) || isNum(o.dc) ? num(o.rev) + num(o.dc) : null;
    o.ebitda = isNum(o.gp) || isNum(o.opex) ? num(o.gp) + num(o.opex) : null;
    o.ni = isNum(o.ebitda) || isNum(o.other) ? num(o.ebitda) + num(o.other) : null;
    return o;
  }
  function accValue(a, k) {
    var closed = isClosed(k), v = a.v;
    if (v.any && isNum(v.any[k])) return v.any[k];
    if (closed) return v.actual && isNum(v.actual[k]) ? v.actual[k] : null;
    return v.forecast && isNum(v.forecast[k]) ? v.forecast[k] : null;
  }
  function accFyBudget(a) {
    var s = null;
    Object.keys(a.v).forEach(function (ver) { var b = a.v[ver]; Object.keys(b).forEach(function (m) { s = add(s, b[m]); }); });
    return s;
  }

  function buildModel() {
    var M = { ready: !!state.monthKey };
    pvmModel(M);
    if (!M.ready) return M;
    var P = periodCtx();
    M.P = P;
    M.sel = state.monthKey;
    M.fyYear = P.y;
    M.months = yearMonths(P.y);
    M.selIdx = M.months.indexOf(M.sel);
    M.closed = M.months.map(isClosed);
    M.lastClosed = null;
    M.months.forEach(function (k, i) { if (M.closed[i]) M.lastClosed = k; });
    M.selClosed = isClosed(M.sel);
    M.curLabel = M.selClosed ? 'Actual' : 'Forecast';
    M.compLabel = P.comp.label;
    M.compShort = P.comp.short;
    M.compPeriodLabel = state.comp === 'py' ? monthShort(P.comp.month) : 'Budget';

    // Landing P&L (actual for closed months, forecast for open months) from the P&L Reforecast View.
    var L = store.vLand.parsed;
    M.accounts = [];
    M.monthly = M.months.map(function () { return emptyLines(); });
    if (L && L.accounts.length) {
      M.accounts = L.accounts.map(function (a) {
        var series = M.months.map(function (k) { return accValue(a, k); });
        return { name: a.name, label: a.label, cat: a.cat, series: series, fy: sumArr(series) };
      });
      M.monthly = M.months.map(function (k, i) {
        var o = { rev: null, dc: null, opex: null, other: null };
        M.accounts.forEach(function (a) { if (isNum(a.series[i])) o[a.cat] = add(o[a.cat], a.series[i]); });
        return deriveLines(o);
      });
    }
    // Revenue by version from the Actuals vs. Budget vs. Forecast View.
    var R = store.vRev.parsed || {};
    M.revVer = R;
    var landRevMissing = M.monthly.every(function (o) { return !isNum(o.rev); });
    if (landRevMissing && (R.actual || R.forecast)) {
      M.revSource = 'vRev';
      M.monthly.forEach(function (o, i) {
        var k = M.months[i];
        o.rev = M.closed[i] ? (R.actual && R.actual[k]) : (R.forecast && R.forecast[k]);
        if (!isNum(o.rev)) o.rev = null;
      });
    } else M.revSource = 'vLand';
    M.monthly.forEach(function (o) { o.gm = ratio(o.gp, o.rev); o.em = ratio(o.ebitda, o.rev); });

    M.period = M.selIdx >= 0 ? M.monthly[M.selIdx] : emptyLines();
    M.ytd = emptyLines(); M.fy = emptyLines();
    M.monthly.forEach(function (o, i) {
      if (i <= M.selIdx) M.ytd = addLines(M.ytd, o);
      M.fy = addLines(M.fy, o);
    });
    if (M.revSource === 'vRev') {
      M.ytd.rev = sumArr(M.monthly.slice(0, M.selIdx + 1).map(function (o) { return o.rev; }));
      M.fy.rev = sumArr(M.monthly.map(function (o) { return o.rev; }));
    }
    [M.period, M.ytd, M.fy].forEach(function (o) { o.gm = ratio(o.gp, o.rev); o.em = ratio(o.ebitda, o.rev); });

    // Comparison P&L (Budget, or Actual for the prior year) for the period and year to date.
    M.compPeriod = store.vCompMonth.parsed || null;
    M.compYtd = store.vCompYtd.parsed || null;
    [M.compPeriod, M.compYtd].forEach(function (o) { if (o) { o.gm = ratio(o.gp, o.rev); o.em = ratio(o.ebitda, o.rev); } });
    M.compRevMonthly = M.months.map(function (k) {
      if (state.comp === 'py') return R.actual && isNum(R.actual[mkAdd(k, -12)]) ? R.actual[mkAdd(k, -12)] : null;
      return R.budget && isNum(R.budget[k]) ? R.budget[k] : null;
    });
    M.budRevMonthly = M.months.map(function (k) { return R.budget && isNum(R.budget[k]) ? R.budget[k] : null; });
    M.pyRevMonthly = M.months.map(function (k) { var p = mkAdd(k, -12); return R.actual && isNum(R.actual[p]) ? R.actual[p] : null; });
    M.budRevYtd = sumArr(M.budRevMonthly.slice(0, M.selIdx + 1));
    M.budRevFy = sumArr(M.budRevMonthly);

    // Full-year budget by account (P&L Reforecast, version comparison View, Budget version).
    var BF = store.vBudFy.parsed;
    M.budAccounts = {};
    M.budFy = null;
    if (BF && BF.accounts.length) {
      var o = { rev: null, dc: null, opex: null, other: null };
      BF.accounts.forEach(function (a) { var v = accFyBudget(a); M.budAccounts[a.name] = { name: a.name, label: a.label, cat: a.cat, fy: v }; if (isNum(v)) o[a.cat] = add(o[a.cat], v); });
      M.budFy = deriveLines(o);
      M.budFy.gm = ratio(M.budFy.gp, M.budFy.rev);
      M.budFy.em = ratio(M.budFy.ebitda, M.budFy.rev);
    }
    M.budFyFull = !!M.budFy;
    if (!M.budFy && isNum(M.budRevFy)) M.budFy = { rev: M.budRevFy, dc: null, gp: null, opex: null, ebitda: null, other: null, ni: null, gm: null, em: null };

    // Opex categories: the five largest full-year accounts, the rest folded into "Other opex".
    var opexAcc = M.accounts.filter(function (a) { return a.cat === 'opex'; }).sort(function (a, b) { return Math.abs(num(b.fy)) - Math.abs(num(a.fy)); });
    M.opexTop = opexAcc.slice(0, 5);
    M.opexRest = opexAcc.slice(5);
    M.opexVar = opexAcc.map(function (a) {
      var b = M.budAccounts[a.name];
      return { name: a.name, label: a.label, fy: a.fy, bud: b ? b.fy : null, v: b ? sub(a.fy, b.fy) : null };
    }).filter(function (x) { return isNum(x.v); }).sort(function (a, b) { return Math.abs(b.v) - Math.abs(a.v); });

    // Cash position (Actual version, falling back to the version board 3.4 uses).
    var C = store.vCash.parsed || {};
    M.cash = C;
    M.cashVersion = state.cashVersion;
    M.cashSel = C[M.sel] || null;
    var anchor = M.sel;
    if (!M.selClosed && state.cashVersion === 'actual' && M.lastClosed && M.lastClosed < M.sel) anchor = M.lastClosed;
    if (!C[anchor] || !isNum(C[anchor].cf)) {
      var ks = Object.keys(C).map(Number).filter(function (k) { return k <= anchor && isNum(C[k].cf); });
      if (ks.length) anchor = Math.max.apply(null, ks);
    }
    M.cashAnchor = anchor;
    M.cashAt = C[anchor] || null;
    M.cashWindow = [];
    for (var i = CONFIG.trendWindow - 1; i >= 0; i--) {
      var k = mkAdd(anchor, -i), c = C[k] || {};
      var net = isNum(c.net) ? c.net : (isNum(c.inflow) || isNum(c.outflow) ? num(c.inflow) + num(c.outflow) : (isNum(c.cf) && isNum(c.bf) ? c.cf - c.bf : null));
      M.cashWindow.push({ k: k, cf: isNum(c.cf) ? c.cf : null, bf: isNum(c.bf) ? c.bf : null, inflow: isNum(c.inflow) ? c.inflow : null, outflow: isNum(c.outflow) ? c.outflow : null, net: net });
    }
    var recent = M.cashWindow.slice(-CONFIG.runwayLookback).map(function (x) { return x.net; }).filter(isNum);
    M.avgNet = recent.length ? sumArr(recent) / recent.length : null;
    var cfNow = M.cashAt && isNum(M.cashAt.cf) ? M.cashAt.cf : null;
    M.cfNow = cfNow;
    M.runway = isNum(cfNow) && isNum(M.avgNet) && M.avgNet < 0 && cfNow > 0 ? cfNow / -M.avgNet : null;
    M.cashGenerative = isNum(M.avgNet) && M.avgNet >= 0;
    var low = null;
    M.cashWindow.forEach(function (x) { if (isNum(x.cf) && (!low || x.cf < low.cf)) low = x; });
    M.cashLow = low;
    var prev = C[mkAdd(anchor, -1)], pyc = C[mkAdd(anchor, -12)];
    M.cashPrev = prev && isNum(prev.cf) ? prev.cf : null;
    M.cashPy = pyc && isNum(pyc.cf) ? pyc.cf : null;

    M.headlines = headlines(M);
    return M;
  }
  function pvmModel(M) {
    M.pvm = store.vPvm.parsed || {};
    M.pvmSet = store.vPvmSet.parsed || {};
    M.pvmProd = (store.vPvmProd.parsed || []).map(function (p) {
      var o = { name: p.name, base: p.base, rev: p.rev, price: p.price, vol: p.vol, mix: p.mix, fx: p.fx };
      o.total = isNum(p.rev) && isNum(p.base) ? p.rev - p.base : sumArr([p.price, p.vol, p.mix, p.fx]);
      return o;
    }).filter(function (p) { return [p.price, p.vol, p.mix, p.fx, p.total].some(isNum); })
      .sort(function (a, b) { return Math.abs(num(b.total)) - Math.abs(num(a.total)); });
    M.pvmBaseLabel = pvmLabel(M.pvmSet.baseYear, M.pvmSet.baseVersion) || 'Base revenue';
    M.pvmCurLabel = pvmLabel(M.pvmSet.year, M.pvmSet.version) || 'Current revenue';

  }
  function pvmLabel(y, v) { return y || v ? [y, v].filter(Boolean).join(' ') : null; }

  function varOf(cur, cmp) { return isNum(cur) && isNum(cmp) ? cur - cmp : null; }
  function varPct(cur, cmp) { return isNum(cur) && isNum(cmp) && cmp !== 0 ? (cur - cmp) / Math.abs(cmp) : null; }

  // SECTION: narrative
  function costWord(v) { return v >= 0 ? 'lower' : 'higher'; }
  function headlines(M) {
    var out = [], when = monthLong(M.sel), cmpName = state.comp === 'py' ? 'the prior year' : 'budget';
    var cp = M.compPeriod, cy = M.compYtd;
    function push(topic, size, text, tone) { if (isNum(size) && text) out.push({ topic: topic, size: Math.abs(size), text: text, tone: tone }); }
    if (cp && isNum(M.period.rev) && isNum(cp.rev)) {
      var dv = M.period.rev - cp.rev;
      push('rev', dv, when + ' revenue of ' + fmtMoney(M.period.rev) + ' was ' + fmtMoney(Math.abs(dv)) + ' (' + fmtPct(Math.abs(varPct(M.period.rev, cp.rev))) + ') ' +
        (dv >= 0 ? 'ahead of ' : 'behind ') + cmpName + (cy && isNum(cy.rev) && isNum(M.ytd.rev) ? ', leaving year-to-date revenue ' + fmtPct(varPct(M.ytd.rev, cy.rev), true) + ' against ' + cmpName + '.' : '.'), dv >= 0 ? 1 : -1);
    }
    if (cy) {
      var best = null;
      ['dc', 'opex', 'other'].forEach(function (k) { var v = varOf(M.ytd[k], cy[k]); if (isNum(v) && (!best || Math.abs(v) > Math.abs(best.v))) best = { k: k, v: v }; });
      if (best) {
        var drv = '';
        if (best.k === 'opex' && M.opexVar.length) drv = '; on a full-year basis the biggest mover is ' + M.opexVar[0].label + ' (' + fmtMoney(M.opexVar[0].v, true) + ' vs budget)';
        push('cost', best.v, CAT_NAMES[best.k] + ' year to date are ' + fmtMoney(Math.abs(best.v)) + ' ' + costWord(best.v) + ' than ' + cmpName + ' (' + (best.v >= 0 ? 'favourable' : 'adverse') + ')' + drv + '.', best.v >= 0 ? 1 : -1);
      }
      var ev = varOf(M.ytd.ebitda, cy.ebitda);
      if (isNum(ev)) push('ebitda', ev * 0.9, 'Year-to-date EBITDA of ' + fmtMoney(M.ytd.ebitda) + ' is ' + fmtMoney(Math.abs(ev)) + (ev >= 0 ? ' above ' : ' below ') + cmpName +
        (isNum(M.ytd.em) ? ', a ' + fmtPct(M.ytd.em) + ' margin.' : '.'), ev >= 0 ? 1 : -1);
    }
    if (M.budFyFull && isNum(M.fy.ebitda) && isNum(M.budFy.ebitda)) {
      var fv = M.fy.ebitda - M.budFy.ebitda;
      push('fy', fv, 'The full-year outlook (actuals plus forecast) puts EBITDA at ' + fmtMoney(M.fy.ebitda) + ', ' + fmtMoney(Math.abs(fv)) + (fv >= 0 ? ' ahead of' : ' short of') + ' the ' + fmtMoney(M.budFy.ebitda) + ' budget.', fv >= 0 ? 1 : -1);
    }
    if (isNum(M.cfNow)) {
      var mv = isNum(M.cashPrev) ? M.cfNow - M.cashPrev : null;
      var rw = M.cashGenerative ? 'the business generated cash on average over the last ' + CONFIG.runwayLookback + ' months' : isNum(M.runway) ? 'that is ' + fmtMonths(M.runway) + ' months of runway at the recent burn rate' : '';
      push('cash', isNum(mv) ? mv : M.cfNow * 0.05, 'Closing cash stands at ' + fmtMoney(M.cfNow) + (isNum(mv) ? ', ' + (mv >= 0 ? 'up ' : 'down ') + fmtMoney(Math.abs(mv)) + ' on the prior month' : '') + (rw ? '; ' + rw + '.' : '.'), isNum(mv) ? (mv >= 0 ? 1 : -1) : 0);
    }
    var pv = M.pvm;
    if (isNum(pv.price) || isNum(pv.vol)) {
      var effs = [['price', pv.price], ['volume', pv.vol], ['mix', pv.mix], ['FX', pv.fx]].filter(function (e) { return isNum(e[1]); }).sort(function (a, b) { return Math.abs(b[1]) - Math.abs(a[1]); });
      var top = effs[0];
      push('pvm', top[1] * 0.8, 'Against ' + M.pvmBaseLabel + ', the revenue bridge is led by ' + top[0] + ' (' + fmtMoney(top[1], true) + ')' + (effs[1] ? ', with ' + effs[1][0] + ' at ' + fmtMoney(effs[1][1], true) : '') + '.', top[1] >= 0 ? 1 : -1);
    }
    out.sort(function (a, b) { return b.size - a.size; });
    // Lead with revenue when available, then the two largest remaining variances.
    var rev = out.filter(function (x) { return x.topic === 'rev'; });
    var rest = out.filter(function (x) { return x.topic !== 'rev'; });
    return rev.concat(rest).slice(0, 3);
  }

  // SECTION: chart helpers
  var TIPS = [];
  function tip(o) { TIPS.push(o); return " data-tip='" + (TIPS.length - 1) + "'"; }
  function niceTicks(lo, hi, n) {
    if (!isNum(lo) || !isNum(hi)) { lo = 0; hi = 1; }
    if (lo === hi) { if (lo === 0) hi = 1; else if (lo > 0) lo = 0; else hi = 0; }
    var span = hi - lo, step = Math.pow(10, Math.floor(Math.log(span / n) / Math.LN10)), err = span / n / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var a = Math.floor(lo / step + 1e-9) * step, b = Math.ceil(hi / step - 1e-9) * step, t = [];
    for (var v = a; v <= b + step * 1e-6; v += step) t.push(Math.abs(v) < step * 1e-6 ? 0 : v);
    return { lo: a, hi: b, step: step, ticks: t };
  }
  function lin(d0, d1, r0, r1) { return function (v) { return d1 === d0 ? (r0 + r1) / 2 : r0 + (v - d0) * (r1 - r0) / (d1 - d0); }; }
  function f1(v) { return Math.round(v * 10) / 10; }
  // Bar with a 4px rounded data end and a square baseline end.
  function barPath(x, yBase, yEnd, w, r) {
    var h = Math.abs(yEnd - yBase);
    r = Math.min(r == null ? 4 : r, h, w / 2);
    if (h < 0.5) return '';
    if (yEnd < yBase) return 'M' + f1(x) + ' ' + f1(yBase) + 'V' + f1(yEnd + r) + 'Q' + f1(x) + ' ' + f1(yEnd) + ' ' + f1(x + r) + ' ' + f1(yEnd) + 'H' + f1(x + w - r) + 'Q' + f1(x + w) + ' ' + f1(yEnd) + ' ' + f1(x + w) + ' ' + f1(yEnd + r) + 'V' + f1(yBase) + 'Z';
    return 'M' + f1(x) + ' ' + f1(yBase) + 'V' + f1(yEnd - r) + 'Q' + f1(x) + ' ' + f1(yEnd) + ' ' + f1(x + r) + ' ' + f1(yEnd) + 'H' + f1(x + w - r) + 'Q' + f1(x + w) + ' ' + f1(yEnd) + ' ' + f1(x + w) + ' ' + f1(yEnd - r) + 'V' + f1(yBase) + 'Z';
  }
  function svgOpen(w, h, cls) { return "<svg class='" + (cls || 'chart') + "' viewBox='0 0 " + w + ' ' + h + "' width='" + w + "' height='" + h + "' xmlns='http://www.w3.org/2000/svg'>"; }
  function hatchDef(id, color, bg) {
    return "<pattern id='" + id + "' patternUnits='userSpaceOnUse' width='7' height='7' patternTransform='rotate(45)'><rect width='7' height='7' fill='" + bg + "'/><line x1='0' y1='0' x2='0' y2='7' stroke='" + color + "' stroke-width='2.4'/></pattern>";
  }
  function txt(x, y, s, o) {
    o = o || {};
    return "<text x='" + f1(x) + "' y='" + f1(y) + "'" + (o.anchor ? " text-anchor='" + o.anchor + "'" : '') + " class='" + (o.cls || 'ax') + "'" + (o.fill ? " fill='" + o.fill + "'" : '') + '>' + esc(s) + '</text>';
  }
  function gridY(sc, ticks, x0, x1, fmt) {
    var s = '';
    ticks.forEach(function (t) {
      var y = sc(t);
      s += "<line x1='" + x0 + "' x2='" + x1 + "' y1='" + f1(y) + "' y2='" + f1(y) + "' class='" + (t === 0 ? 'base' : 'grid') + "'/>";
      s += txt(x0 - 12, y + 4, fmt(t), { anchor: 'end' });
    });
    return s;
  }
  function wrapLabel(s, max) {
    var words = String(s).split(/\s+/), lines = [''];
    words.forEach(function (w) {
      var cur = lines[lines.length - 1];
      if ((cur + ' ' + w).trim().length > max && cur) lines.push(w); else lines[lines.length - 1] = (cur + ' ' + w).trim();
    });
    if (lines.length > 2) lines = [lines[0], lines.slice(1).join(' ')];
    if (lines[1] && lines[1].length > max + 2) lines[1] = lines[1].slice(0, max) + '…';
    return lines;
  }

  // Waterfall: totals sit on the baseline, deltas float from the running total.
  function waterfallSvg(id, W, H, steps, o) {
    o = o || {};
    var run = 0, bars = [], ys = [0];
    steps.forEach(function (s) {
      if (!isNum(s.v)) return;
      var b = s.kind === 'total' ? { s: s, a: 0, b: s.v } : { s: s, a: run, b: run + s.v };
      run = b.b;
      bars.push(b);
      ys.push(b.a, b.b);
    });
    var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
    if (o.zoom && lo >= 0) {
      // Waterfalls of large totals with small deltas start the axis near the smallest bar end so effects stay readable.
      var mins = bars.map(function (b) { return Math.min(b.a, b.b); }).filter(function (v, i) { return bars[i].s.kind !== 'total'; });
      var floor = mins.length ? Math.min.apply(null, mins) : 0;
      var pad = (hi - floor) * 0.6;
      lo = Math.max(0, floor - pad);
    }
    var nt = niceTicks(lo, hi + (hi - lo) * 0.08, 5);
    var L = 76, R = 16, T = 28, Bm = 62;
    var y = lin(nt.lo, nt.hi, H - Bm, T);
    var n = bars.length, slot = (W - L - R) / Math.max(1, n), bw = Math.min(o.barW || 72, slot * 0.56);
    var s = svgOpen(W, H) + gridY(y, nt.ticks, L, W - R, fmtAxis);
    var broken = nt.lo > 0;
    bars.forEach(function (b, i) {
      var cx = L + slot * i + slot / 2, x = cx - bw / 2, isTot = b.s.kind === 'total';
      var col = isTot ? (b.s.color || COLORS.actual) : (b.s.v >= 0 ? COLORS.pos : COLORS.neg);
      var y0 = y(Math.max(b.a, nt.lo)), y1 = y(Math.max(b.b, nt.lo));
      var d = isTot ? barPath(x, y(Math.max(0, nt.lo)), y(b.b), bw, 4) : roundRect(x, Math.min(y0, y1), bw, Math.max(1.5, Math.abs(y1 - y0)), 4);
      s += "<g class='mk'" + tip(b.s.tip || { title: b.s.label, rows: [[isTot ? 'Value' : 'Effect', fmtMoney(b.s.v, !isTot)]] }) + '>';
      s += "<path d='" + d + "' fill='" + col + "'/>";
      s += "<rect x='" + f1(cx - slot / 2) + "' y='" + T + "' width='" + f1(slot) + "' height='" + (H - Bm - T) + "' fill='transparent'/></g>";
      if (i < n - 1) {
        var nx = L + slot * (i + 1) + slot / 2 - bw / 2;
        s += "<line x1='" + f1(x + bw) + "' x2='" + f1(nx) + "' y1='" + f1(y(b.b)) + "' y2='" + f1(y(b.b)) + "' class='conn'/>";
      }
      var up = isTot ? b.b >= 0 : b.s.v >= 0;
      var ly = up ? Math.min(y0, y1) - 10 : Math.max(y0, y1) + 20;
      s += txt(cx, ly, fmtMoney(b.s.v, !isTot), { anchor: 'middle', cls: isTot ? 'lbl lblb' : 'lbl' });
      wrapLabel(b.s.label, o.wrap || 14).forEach(function (ln, j) { s += txt(cx, H - Bm + 24 + j * 16, ln, { anchor: 'middle', cls: 'xl' }); });
    });
    var out = s + '</svg>';
    return broken ? "<div class='axnote'>Axis starts at " + esc(fmtAxis(nt.lo)) + '</div>' + out : out;
  }
  function roundRect(x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    return 'M' + f1(x + r) + ' ' + f1(y) + 'H' + f1(x + w - r) + 'Q' + f1(x + w) + ' ' + f1(y) + ' ' + f1(x + w) + ' ' + f1(y + r) + 'V' + f1(y + h - r) + 'Q' + f1(x + w) + ' ' + f1(y + h) + ' ' + f1(x + w - r) + ' ' + f1(y + h) +
      'H' + f1(x + r) + 'Q' + f1(x) + ' ' + f1(y + h) + ' ' + f1(x) + ' ' + f1(y + h - r) + 'V' + f1(y + r) + 'Q' + f1(x) + ' ' + f1(y) + ' ' + f1(x + r) + ' ' + f1(y) + 'Z';
  }
  function linePath(pts) {
    var d = '', pen = false;
    pts.forEach(function (p) {
      if (!p || !isNum(p[1])) { pen = false; return; }
      d += (pen ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1]);
      pen = true;
    });
    return d;
  }

  // 12-point sparkline: de-emphasis line, forecast dashed, current period in the accent.
  function sparkline(values, opts) {
    opts = opts || {};
    var W = opts.w || 168, H = opts.h || 56, P = 6;
    var vals = values.filter(isNum);
    if (!vals.length) return "<div class='spark-empty'>No trend</div>";
    var lo = Math.min.apply(null, vals.concat(opts.bars ? [0] : [])), hi = Math.max.apply(null, vals.concat(opts.bars ? [0] : []));
    if (lo === hi) { lo -= 1; hi += 1; }
    var x = lin(0, values.length - 1, P, W - P), y = lin(lo, hi, H - P, P);
    var s = svgOpen(W, H, 'spark');
    if (opts.bars) {
      var bw = Math.max(3, (W - 2 * P) / values.length - 4);
      s += "<line x1='0' x2='" + W + "' y1='" + f1(y(0)) + "' y2='" + f1(y(0)) + "' class='base'/>";
      values.forEach(function (v, i) {
        if (!isNum(v)) return;
        var cx = x(i);
        s += "<path d='" + barPath(cx - bw / 2, y(0), y(v), bw, 2) + "' fill='" + (v >= 0 ? COLORS.pos : COLORS.neg) + "'" + (opts.closed && !opts.closed[i] ? " opacity='0.5'" : '') + '/>';
      });
    } else {
      var solid = [], dash = [];
      values.forEach(function (v, i) {
        var p = isNum(v) ? [x(i), y(v)] : null;
        var c = !opts.closed || opts.closed[i];
        if (c) solid.push(p); else solid.push(null);
        if (!c || (opts.closed && opts.closed[i] && !opts.closed[i + 1])) dash.push(p); else dash.push(null);
      });
      if (opts.area) {
        var pts = values.map(function (v, i) { return isNum(v) ? [x(i), y(v)] : null; }).filter(Boolean);
        if (pts.length > 1) s += "<path d='" + linePath(pts) + 'L' + f1(pts[pts.length - 1][0]) + ' ' + (H - P) + 'L' + f1(pts[0][0]) + ' ' + (H - P) + "Z' fill='" + COLORS.actual + "' opacity='0.1'/>";
      }
      s += "<path d='" + linePath(solid) + "' class='spl'/>";
      s += "<path d='" + linePath(dash) + "' class='spl spd'/>";
    }
    if (isNum(opts.sel) && isNum(values[opts.sel])) s += "<circle cx='" + f1(x(opts.sel)) + "' cy='" + f1(y(values[opts.sel])) + "' r='4.5' class='spdot'/>";
    var slot = (W - 2 * P) / Math.max(1, values.length - 1);
    values.forEach(function (v, i) {
      if (!isNum(v)) return;
      var lab = opts.labels ? opts.labels[i] : '';
      s += "<rect x='" + f1(x(i) - slot / 2) + "' y='0' width='" + f1(slot) + "' height='" + H + "' fill='transparent'" + tip({ title: lab, rows: [[opts.name || 'Value', opts.fmt ? opts.fmt(v) : fmtMoney(v)]], note: opts.closed && !opts.closed[i] ? 'Forecast' : null }) + '/>';
    });
    return s + '</svg>';
  }

  // SECTION: states
  function skeleton(kind) {
    if (kind === 'kpis') {
      var s = '';
      for (var i = 0; i < 6; i++) s += "<div class='card sk-card' style='" + pos(tileX(i), 196 + Math.floor(i / 3) * 200, TILE_W, 176) + "'><div class='sk' style='width:40%;height:14px'></div><div class='sk' style='width:60%;height:36px;margin-top:20px'></div><div class='sk' style='width:45%;height:22px;margin-top:20px'></div></div>";
      return s + "<div class='card sk-card' style='" + pos(72, 596, 1456, 224) + "'><div class='sk' style='width:16%;height:14px'></div><div class='sk' style='width:88%;height:18px;margin-top:28px'></div><div class='sk' style='width:80%;height:18px;margin-top:24px'></div><div class='sk' style='width:84%;height:18px;margin-top:24px'></div></div>";
    }
    return '';
  }
  function skelChart(h) {
    var bars = '';
    for (var i = 0; i < 12; i++) bars += "<div class='sk' style='height:" + (30 + ((i * 37) % 55)) + "%'></div>";
    return "<div class='sk-chart' style='height:" + (h || 420) + "px'>" + bars + '</div>';
  }
  function stateBox(kind, title, msg) {
    var icon = kind === 'error' ? '!' : kind === 'empty' ? '∅' : '';
    return "<div class='state state-" + kind + "'><div class='state-ic'>" + icon + "</div><div class='state-t'>" + esc(title) + "</div><div class='state-m'>" + esc(msg) + '</div></div>';
  }
  function panelState(keys) {
    var anyLoading = false, err = null, allEmpty = true, refreshing = false;
    keys.forEach(function (k) {
      var st = store[k];
      if (st.status === 'error' && !err) err = k;
      if ((st.status === 'loading' || st.status === 'idle') && !st.parsed) anyLoading = true;
      if (st.status !== 'empty') allEmpty = false;
      if (st.refreshing) refreshing = true;
    });
    if (err) return { kind: 'error', key: err, refreshing: refreshing };
    if (anyLoading) return { kind: 'loading', refreshing: refreshing };
    if (allEmpty) return { kind: 'empty', key: keys[0], refreshing: refreshing };
    return { kind: 'ready', refreshing: refreshing };
  }
  function guard(keys, h, renderFn) {
    var ps = panelState(keys);
    if (ps.kind === 'loading') return skelChart(h);
    if (ps.kind === 'error') return stateBox('error', 'Could not load “' + VIEWS[ps.key].name + '”', store[ps.key].error || 'The View returned an error.');
    if (ps.kind === 'empty') return stateBox('empty', PERIOD_VIEWS.indexOf(ps.key) >= 0 || ps.key === 'vLand' ? 'No data for ' + monthLong(state.monthKey) : 'No data returned', 'The View “' + VIEWS[ps.key].name + '” returned no rows for this selection.');
    var out = renderFn();
    return ps.refreshing ? "<div class='dim'>" + out + "</div><div class='upd'>Updating…</div>" : out;
  }
  var TILE_W = Math.floor((1456 - 48) / 3);
  function tileX(i) { return Math.round(72 + (i % 3) * ((1456 - 48) / 3 + 24)); }
  function pos(x, y, w, h) { return 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px'; }
  function card(x, y, w, h, inner, cls) { return "<div class='card " + (cls || '') + "' style='" + pos(x, y, w, h) + "'>" + inner + '</div>'; }
  function cardHead(title, sub) { return "<div class='ch'><div class='ct'>" + esc(title) + '</div>' + (sub ? "<div class='cs'>" + esc(sub) + '</div>' : '') + '</div>'; }
  function legend(items) {
    return "<div class='lg'>" + items.map(function (it) {
      var sw = it.kind === 'line' ? "<span class='sw-l' style='border-color:" + it.color + (it.dash ? ';border-top-style:dashed' : '') + "'></span>"
        : it.kind === 'hatch' ? "<span class='sw sw-h' style='color:" + it.color + "'></span>"
          : "<span class='sw' style='background:" + it.color + "'></span>";
      return "<span class='lgi'>" + sw + esc(it.label) + '</span>';
    }).join('') + '</div>';
  }
  function badge(v, text, good) {
    if (!isNum(v)) return "<span class='bdg bdg-n'>" + esc(text || 'No comparison') + '</span>';
    var g = good == null ? v >= 0 : good;
    return "<span class='bdg " + (g ? 'bdg-p' : 'bdg-m') + "'><span class='bdg-g'>" + (v >= 0 ? '▲' : '▼') + '</span>' + esc(text) + '</span>';
  }

  // SECTION: slides
  var SLIDES = ['Cover', 'Executive summary', 'P&L overview', 'Revenue & margin trend', 'Rolling forecast', 'Operating expenses',
    'Cash flow', 'Cash trend & runway', 'Price, volume & mix bridge', 'Price, volume & mix by product', 'Appendix'];

  function shell(i, title, so, body, source, M) {
    var right = M && M.ready ? monthLong(M.sel) + ' · vs ' + (state.comp === 'py' ? 'Prior year' : 'Budget') : '';
    return "<section class='slide' data-i='" + i + "'>" +
      "<div class='sh'><span class='sh-co'>" + esc(CONFIG.company) + "</span><span class='sh-sep'></span><span>" + esc(CONFIG.reportTitle) + "</span><span class='sh-r'>" + esc(right) + '</span></div>' +
      "<div class='st'><h1>" + esc(title) + '</h1>' + (so ? "<p class='so'>" + esc(so) + '</p>' : "<p class='so so-sk'><span class='sk' style='width:520px;height:16px;display:inline-block'></span></p>") + '</div>' +
      body +
      "<div class='sf'><span>Confidential</span><span class='sf-src'>" + esc(source || '') + '</span><span>' + (i + 1) + ' / ' + SLIDES.length + '</span></div></section>';
  }
  function srcOf(keys) {
    var boards = {};
    keys.forEach(function (k) { boards[VIEWS[k].board] = true; });
    return 'Source: Pigment · ' + Object.keys(boards).join(' · ');
  }

  // 1. Cover
  function slideCover(M) {
    var period = M.ready ? monthLong(M.sel) : '';
    var today = new Date();
    var prepared = today.getDate() + ' ' + MON_FULL[today.getMonth()] + ' ' + today.getFullYear();
    var hero = svgOpen(680, 680, 'hero') +
      "<circle cx='380' cy='330' r='250' fill='" + COLORS.blue + "'/>" +
      "<circle cx='118' cy='120' r='46' fill='" + COLORS.peach + "'/>" +
      "<circle cx='600' cy='96' r='26' fill='" + COLORS.lavender + "'/>" +
      "<circle cx='200' cy='236' r='14' fill='" + COLORS.sage + "'/>" +
      "<circle cx='612' cy='520' r='60' fill='" + COLORS.blush + "' opacity='0.85'/>";
    var hs = [150, 220, 270, 340, 410], fills = [COLORS.sage, COLORS.butter, COLORS.peach, COLORS.lavender, COLORS.blush];
    hs.forEach(function (h, i) { hero += "<path d='" + barPath(150 + i * 92, 600, 600 - h, 64, 16) + "' fill='" + fills[i] + "'/>"; });
    hero += "<path d='M138 470 C 260 430, 330 400, 420 330 S 560 210, 640 168' fill='none' stroke='" + COLORS.ink + "' stroke-opacity='0.28' stroke-width='2.5' stroke-linecap='round'/>" +
      "<circle cx='640' cy='168' r='9' fill='#FFFFFF' stroke='" + COLORS.ink + "' stroke-opacity='0.45' stroke-width='2.5'/>" +
      "<line x1='120' x2='640' y1='600' y2='600' stroke='" + COLORS.ink + "' stroke-opacity='0.12' stroke-width='2'/></svg>";
    return "<section class='slide cover' data-i='0'>" +
      "<div class='cv-l'><div class='cv-k'>Monthly business review</div><div class='cv-co'>" + esc(CONFIG.company) + "</div><div class='cv-t'>" + esc(CONFIG.reportTitle) + '</div>' +
      "<div class='cv-p'><span class='cv-pl'>Reporting period</span><span class='cv-pv'>" + (period ? esc(period) : "<span class='sk' style='width:200px;height:28px;display:inline-block'></span>") + '</span></div>' +
      "<div class='cv-m'>Compared with " + (state.comp === 'py' ? 'prior year' : 'budget') + ' · Prepared ' + esc(prepared) + '</div></div>' +
      "<div class='cv-h'>" + hero + '</div>' +
      "<div class='sf'><span>Confidential</span><span class='sf-src'>" + esc(CONFIG.application) + '</span><span>1 / ' + SLIDES.length + '</span></div></section>';
  }

  // 2. Executive summary
  function slideExec(M) {
    var keys = ['vLand', 'vCompMonth', 'vCompYtd'];
    if (!M.ready || panelState(['vLand']).kind === 'loading') return shell(1, 'Executive summary', null, skeleton('kpis'), srcOf(['vLand', 'vCash']), M);
    var cp = M.compPeriod || {}, ref = ' vs ' + M.compShort, labels = M.months.map(monthShort);
    var tiles = [];
    var rv = varOf(M.period.rev, cp.rev);
    tiles.push({ label: 'Revenue', sub: monthLong(M.sel) + ' · ' + M.curLabel, value: fmtMoney(M.period.rev), b: badge(rv, fmtMoney(rv, true) + ' · ' + fmtPct(varPct(M.period.rev, cp.rev), true) + ref),
      spark: sparkline(M.monthly.map(function (o) { return o.rev; }), { closed: M.closed, sel: M.selIdx, labels: labels, name: 'Revenue' }), keys: ['vLand', 'vCompMonth'] });
    var gv = varOf(M.period.gm, cp.gm);
    tiles.push({ label: 'Gross margin', sub: 'Gross profit ÷ revenue', value: fmtPct(M.period.gm), b: badge(gv, fmtPp(gv) + ref),
      spark: sparkline(M.monthly.map(function (o) { return o.gm; }), { closed: M.closed, sel: M.selIdx, labels: labels, name: 'Gross margin', fmt: fmtPct }), keys: ['vLand', 'vCompMonth'] });
    var ev = varOf(M.period.ebitda, cp.ebitda);
    tiles.push({ label: 'EBITDA', sub: monthLong(M.sel) + (isNum(M.period.em) ? ' · ' + fmtPct(M.period.em) + ' margin' : ''), value: fmtMoney(M.period.ebitda),
      b: badge(ev, fmtMoney(ev, true) + ' · ' + fmtPct(varPct(M.period.ebitda, cp.ebitda), true) + ref),
      spark: sparkline(M.monthly.map(function (o) { return o.ebitda; }), { closed: M.closed, sel: M.selIdx, labels: labels, name: 'EBITDA' }), keys: ['vLand', 'vCompMonth'] });
    var cRef = state.comp === 'py' ? M.cashPy : M.cashPrev, cv = varOf(M.cfNow, cRef);
    tiles.push({ label: 'Closing cash', sub: monthLong(M.cashAnchor) + (M.cashVersion === 'budget' ? ' · Budget version' : ''), value: fmtMoney(M.cfNow),
      b: badge(cv, fmtMoney(cv, true) + (state.comp === 'py' ? ' vs PY' : ' vs prior month')),
      spark: sparkline(M.cashWindow.map(function (x) { return x.cf; }), { sel: M.cashWindow.length - 1, labels: M.cashWindow.map(function (x) { return monthShort(x.k); }), name: 'Closing cash', area: true }), keys: ['vCash'] });
    var yv = varOf(M.ytd.rev, M.budRevYtd);
    tiles.push({ label: 'Revenue vs budget', sub: 'Year to date to ' + monthShort(M.sel), value: fmtMoney(yv, true), b: badge(yv, fmtPct(varPct(M.ytd.rev, M.budRevYtd), true) + ' vs budget YTD'),
      spark: sparkline(M.monthly.map(function (o, i) { return varOf(o.rev, M.budRevMonthly[i]); }), { bars: true, closed: M.closed, sel: null, labels: labels, name: 'Revenue vs budget', fmt: function (v) { return fmtMoney(v, true); } }), keys: ['vLand', 'vRev'] });
    var cum = 0, cumS = M.monthly.map(function (o) { cum += num(o.rev); return cum || null; });
    var fv = varOf(M.fy.rev, M.budRevFy);
    tiles.push({ label: 'Full-year outlook', sub: 'Revenue · actuals plus forecast', value: fmtMoney(M.fy.rev), b: badge(fv, fmtMoney(fv, true) + ' · ' + fmtPct(varPct(M.fy.rev, M.budRevFy), true) + ' vs budget'),
      spark: sparkline(cumS, { closed: M.closed, sel: 11, labels: labels, name: 'Cumulative revenue', area: true }), keys: ['vLand', 'vRev'] });
    var body = '';
    tiles.forEach(function (t, i) {
      var ps = panelState(t.keys), inner;
      if (ps.kind === 'loading') inner = "<div class='sk' style='width:40%;height:14px'></div><div class='sk' style='width:60%;height:36px;margin-top:20px'></div>";
      else if (ps.kind === 'error') inner = "<div class='kt'>" + esc(t.label) + "</div><div class='kerr'><span class='kerr-i'>!</span>Could not load “" + esc(VIEWS[ps.key].name) + "”</div><div class='ks'>" + esc(store[ps.key].error || 'The View returned an error.') + '</div>';
      else inner = "<div class='kt'>" + esc(t.label) + "</div><div class='ks'>" + esc(t.sub) + "</div><div class='kv'>" + esc(t.value) + "</div><div class='kb'>" + t.b + "</div><div class='kspark'>" + t.spark + '</div>';
      body += card(tileX(i), 196 + Math.floor(i / 3) * 200, i % 3 === 2 ? 1528 - tileX(i) : TILE_W, 176, (ps.refreshing ? "<div class='dim'>" + inner + '</div>' : inner), 'kpi');
    });
    var hl = M.headlines.length ? "<ul class='hl'>" + M.headlines.map(function (h) {
      return "<li><span class='hl-dot " + (h.tone > 0 ? 'p' : h.tone < 0 ? 'm' : 'n') + "'></span><span>" + esc(h.text) + '</span></li>';
    }).join('') + '</ul>' : "<div class='hl-empty'>Headlines appear once the P&L and comparison Views have loaded.</div>";
    body += card(72, 596, 1456, 224, cardHead('Headlines', 'Generated from the largest variances in this pack') + hl, 'hl-card');
    var so = isNum(M.period.rev) ? monthLong(M.sel) + ' revenue ' + fmtMoney(M.period.rev) + (isNum(rv) ? ' (' + fmtPct(varPct(M.period.rev, cp.rev), true) + ' vs ' + M.compLabel.toLowerCase() + ')' : '') +
      (isNum(M.period.ebitda) ? ', EBITDA ' + fmtMoney(M.period.ebitda) : '') + (isNum(M.cfNow) ? ', closing cash ' + fmtMoney(M.cfNow) : '') + '.' : 'Key figures for the period.';
    return shell(1, 'Executive summary', so, body, srcOf(['vLand', 'vCash', 'vPvm']), M);
  }

  // 3. P&L overview
  function tint(v, base) {
    if (!isNum(v) || v === 0) return '';
    var p = isNum(base) && base !== 0 ? Math.abs(v / base) : 0.05;
    var a = clamp(0.16 + p * 4, 0.16, 0.62);
    return v > 0 ? "style='background:rgba(168,213,186," + (a * 0.62).toFixed(2) + ")'" : "style='background:rgba(232,169,176," + (a * 0.62).toFixed(2) + ")'";
  }
  function slidePL(M) {
    if (!M.ready) return shell(2, 'P&L overview', null, card(72, 196, 1456, 624, skelChart(560)), srcOf(['vLand']), M);
    var cp = M.compPeriod || {}, cy = M.compYtd || {}, bf = M.budFy || {};
    var rows = [['rev', 'Revenue'], ['dc', 'Direct costs'], ['gp', 'Gross profit', 'sub'], ['gm', 'Gross margin %', 'ratio'], ['opex', 'Operating expenses'],
      ['ebitda', 'EBITDA', 'sub'], ['em', 'EBITDA margin %', 'ratio'], ['other', 'ITDA & other'], ['ni', 'Net income', 'sub']];
    var ytdRange = monthAbbr(M.months[0]) + '–' + monthShort(M.sel);
    var compYtdLabel = state.comp === 'py' ? 'PY YTD' : 'Budget';
    function cells(cur, cmp, ratioRow, withPct, tipTitle) {
      var v = ratioRow ? sub(cur, cmp) : varOf(cur, cmp), vp = ratioRow ? null : varPct(cur, cmp);
      var f = ratioRow ? fmtPct : fmtMoney;
      var t = tip({ title: tipTitle, rows: [['Current', f(cur)], ['Comparison', f(cmp)], ['Variance', ratioRow ? fmtPp(v) : fmtMoney(v, true) + (isNum(vp) ? ' · ' + fmtPct(vp, true) : '')]] });
      return '<td' + t + '>' + f(cur) + "</td><td class='c'>" + f(cmp) + "</td><td class='v' " + tint(v, ratioRow ? 0.2 : cmp) + '>' + (ratioRow ? fmtPp(v) : fmtMoney(v, true)) + '</td>' +
        (withPct ? "<td class='v vp' " + tint(v, ratioRow ? 0.2 : cmp) + '>' + (ratioRow ? '' : fmtPct(vp, true)) + '</td>' : '');
    }
    var html = "<table class='pl'><colgroup><col style='width:220px'>" + new Array(12).join("<col>") + '</colgroup>' +
      "<thead><tr class='g'><th></th><th colspan='4'>" + esc(monthLong(M.sel)) + "</th><th colspan='4'>Year to date · " + esc(ytdRange) + "</th><th colspan='3'>Full year " + M.fyYear + '</th></tr>' +
      "<tr class='h'><th></th><th>" + esc(M.curLabel) + '</th><th>' + esc(M.compPeriodLabel) + '</th><th>Var</th><th>Var %</th><th>' + (M.selClosed ? 'Actual' : 'Act + Fcst') + '</th><th>' + esc(compYtdLabel) +
      "</th><th>Var</th><th>Var %</th><th>Forecast</th><th>Budget</th><th>Var</th></tr></thead><tbody>";
    rows.forEach(function (r) {
      var k = r[0], ratioRow = r[2] === 'ratio';
      html += "<tr class='" + (r[2] || '') + "'><td class='ln'>" + esc(r[1]) + '</td>' +
        cells(M.period[k], cp[k], ratioRow, true, r[1] + ' · ' + monthLong(M.sel)) +
        cells(M.ytd[k], cy[k], ratioRow, true, r[1] + ' · year to date') +
        cells(M.fy[k], bf[k], ratioRow, false, r[1] + ' · full year') + '</tr>';
    });
    html += '</tbody></table>';
    var compState = panelState(['vCompMonth', 'vCompYtd']);
    var note = "<div class='pl-note'>Costs are carried as negatives, so a positive variance is favourable for every line. Full year = actuals to date plus forecast, against the full-year Budget." +
      (compState.kind === 'error' ? ' Comparison View unavailable: ' + esc(store[compState.key].error || '') : '') + '</div>';
    var body = card(72, 196, 1456, 624, guard(['vLand'], 540, function () { return html + note; }), 'pl-card');
    var ev = varOf(M.ytd.ebitda, cy.ebitda);
    var so = isNum(M.ytd.rev) ? 'Year to date: revenue ' + fmtMoney(M.ytd.rev) + (isNum(cy.rev) ? ' (' + fmtPct(varPct(M.ytd.rev, cy.rev), true) + ')' : '') + ', EBITDA ' + fmtMoney(M.ytd.ebitda) +
      (isNum(ev) ? ' (' + fmtMoney(ev, true) + ' vs ' + M.compLabel.toLowerCase() + ')' : '') + (isNum(M.fy.ebitda) ? '; full-year EBITDA outlook ' + fmtMoney(M.fy.ebitda) + '.' : '.') : 'Actual against comparison for the period, year to date and full year.';
    return shell(2, 'P&L overview', so, body, srcOf(['vLand']), M);
  }

  // 4. Revenue & margin trend (two aligned panels share the month axis; no second y-axis)
  function trendSvg(M) {
    var W = 1408, H = 548, L = 84, R = 24, T1 = 40, B1 = 330, T2 = 384, B2 = 488;
    var n = 12, slot = (W - L - R) / n;
    var revs = M.monthly.map(function (o) { return o.rev; }), cmps = M.compRevMonthly;
    var nt = niceTicks(0, Math.max.apply(null, revs.concat(cmps).filter(isNum).concat([1])) * 1.08, 4);
    var y = lin(0, nt.hi, B1, T1);
    var gms = M.monthly.map(function (o) { return o.gm; }).filter(isNum);
    var g0 = gms.length ? Math.min.apply(null, gms) : 0, g1 = gms.length ? Math.max.apply(null, gms) : 1;
    var gt = niceTicks(g0 - (g1 - g0) * 0.3 - 0.005, g1 + (g1 - g0) * 0.3 + 0.005, 2);
    var y2 = lin(gt.lo, gt.hi, B2, T2);
    var s = svgOpen(W, H) + '<defs>' + hatchDef('hatch-rev', COLORS.actual, '#E6EFFB') + '</defs>';
    if (M.selIdx >= 0) s += "<rect x='" + f1(L + slot * M.selIdx + 4) + "' y='8' width='" + f1(slot - 8) + "' height='" + (H - 30) + "' rx='12' fill='" + COLORS.butter + "' opacity='0.6'/>";
    s += gridY(y, nt.ticks, L, W - R, fmtAxis);
    s += gridY(y2, gt.ticks, L, W - R, function (v) { return fmtPct(v); });
    s += txt(L, 22, 'Revenue', { cls: 'pt' }) + txt(L, T2 - 18, 'Gross margin %', { cls: 'pt' });
    var firstOpen = M.closed.indexOf(false);
    if (firstOpen > 0) {
      var fx = L + slot * firstOpen;
      s += "<line x1='" + f1(fx) + "' x2='" + f1(fx) + "' y1='" + T1 + "' y2='" + B2 + "' class='fline'/>" + txt(fx + 8, T1 + 4, 'Forecast →', { cls: 'axn' });
    }
    var bw = 26, gap = 4, gmPts = [], gmDash = [];
    M.months.forEach(function (k, i) {
      var cx = L + slot * i + slot / 2, o = M.monthly[i], closed = M.closed[i], cmp = cmps[i];
      var hasCmp = isNum(cmp), x1 = hasCmp ? cx - bw - gap / 2 : cx - bw / 2, x2 = cx + gap / 2;
      var v = varOf(o.rev, cmp);
      s += "<g class='col'" + tip({ title: monthLong(k) + ' · ' + (closed ? 'Actual' : 'Forecast'), rows: [['Revenue', fmtMoney(o.rev), COLORS.actual], [M.compLabel, fmtMoney(cmp), COLORS.compare],
        ['Variance', isNum(v) ? fmtMoney(v, true) + ' · ' + fmtPct(varPct(o.rev, cmp), true) : '—'], ['Gross margin', fmtPct(o.gm), COLORS.line]] }) + '>';
      s += "<rect class='colhl' x='" + f1(L + slot * i + 2) + "' y='12' width='" + f1(slot - 4) + "' height='" + (H - 38) + "' rx='12'/>";
      if (isNum(o.rev)) s += "<path d='" + barPath(x1, y(0), y(Math.max(0, o.rev)), bw, 4) + "' fill='" + (closed ? COLORS.actual : 'url(#hatch-rev)') + "'/>";
      if (hasCmp) s += "<path d='" + barPath(x2, y(0), y(Math.max(0, cmp)), bw, 4) + "' fill='" + COLORS.compare + "'/>";
      if (isNum(o.rev)) s += txt(cx, y(Math.max(0, o.rev, num(cmp))) - 10, fmtMoney(o.rev).replace(curSymbol(), ''), { anchor: 'middle', cls: i === M.selIdx ? 'lbl lblb' : 'lbl lbls' });
      if (isNum(o.gm)) {
        var p = [cx, y2(o.gm)];
        gmPts.push(closed ? p : null);
        gmDash.push(!closed || (closed && M.closed[i + 1] === false) ? p : null);
        s += txt(cx, y2(o.gm) - 12, fmtPct(o.gm), { anchor: 'middle', cls: i === M.selIdx ? 'lbl lblb' : 'lbl lbls' });
      } else { gmPts.push(null); gmDash.push(null); }
      s += txt(cx, H - 18, monthAbbr(k), { anchor: 'middle', cls: i === M.selIdx ? 'xl xlb' : 'xl' });
      s += "<rect x='" + f1(L + slot * i) + "' y='0' width='" + f1(slot) + "' height='" + H + "' fill='transparent'/></g>";
    });
    s += "<path d='" + linePath(gmPts) + "' class='ln2' stroke='" + COLORS.line + "'/>";
    s += "<path d='" + linePath(gmDash) + "' class='ln2 lnd' stroke='" + COLORS.line + "'/>";
    M.months.forEach(function (k, i) { var o = M.monthly[i]; if (isNum(o.gm)) s += "<circle cx='" + f1(L + slot * i + slot / 2) + "' cy='" + f1(y2(o.gm)) + "' r='4.5' class='dot' fill='" + COLORS.line + "'/>"; });
    return s + '</svg>';
  }
  function slideTrend(M) {
    if (!M.ready) return shell(3, 'Revenue & margin trend', null, card(72, 196, 1456, 624, skelChart(560)), srcOf(['vLand']), M);
    var lg = legend([{ label: 'Actual', color: COLORS.actual }, { label: 'Forecast', color: COLORS.actual, kind: 'hatch' }, { label: M.compLabel, color: COLORS.compare }, { label: 'Gross margin %', color: COLORS.line, kind: 'line' }]);
    var inner = "<div class='ch ch-row'><div><div class='ct'>Revenue and gross margin by month · " + M.fyYear + "</div><div class='cs'>Comparison bars: " + esc(M.compLabel.toLowerCase()) + (state.comp === 'py' ? ' (same month, ' + (M.fyYear - 1) + ')' : '') + '</div></div>' + lg + '</div>' +
      guard(['vLand', 'vRev'], 520, function () { return trendSvg(M); });
    var gmA = M.monthly.filter(function (o, i) { return M.closed[i] && isNum(o.gm); }).map(function (o) { return o.gm; });
    var cmpY = sumArr(M.compRevMonthly.slice(0, M.selIdx + 1));
    var so = isNum(M.ytd.rev) ? 'Revenue year to date ' + fmtMoney(M.ytd.rev) + (isNum(cmpY) ? ', ' + fmtPct(varPct(M.ytd.rev, cmpY), true) + ' vs ' + M.compLabel.toLowerCase() : '') +
      (gmA.length ? '; gross margin averaged ' + fmtPct(sumArr(gmA) / gmA.length) + ' across actual months' : '') + (isNum(M.fy.gm) ? ' and is forecast at ' + fmtPct(M.fy.gm) + ' for the year.' : '.') : 'Monthly revenue with gross margin.';
    return shell(3, 'Revenue & margin trend', so, card(72, 196, 1456, 624, inner), srcOf(['vLand', 'vRev']), M);
  }

  // 5. Rolling forecast
  function monthLines(M) {
    var W = 512, H = 404, L = 72, R = 20, T = 20, B = 40;
    var cur = M.monthly.map(function (o) { return o.rev; }), bud = M.budRevMonthly, py = M.pyRevMonthly;
    var all = cur.concat(bud, py).filter(isNum);
    var lo = all.length ? Math.min.apply(null, all) : 0, hi = all.length ? Math.max.apply(null, all) : 1, pad = (hi - lo) * 0.15 || hi * 0.1 || 1;
    var nt = niceTicks(Math.max(0, lo - pad), hi + pad, 4);
    var x = lin(0, 11, L + 16, W - R - 16), y = lin(nt.lo, nt.hi, H - B, T);
    var s = svgOpen(W, H) + gridY(y, nt.ticks, L, W - R, fmtAxis);
    function pts(a) { return a.map(function (v, i) { return isNum(v) ? [x(i), y(v)] : null; }); }
    var curSolid = pts(cur).map(function (p, i) { return M.closed[i] ? p : null; });
    var curDash = pts(cur).map(function (p, i) { return !M.closed[i] || M.closed[i + 1] === false ? p : null; });
    s += "<path d='" + linePath(pts(py)) + "' class='ln2 lnd' stroke='" + COLORS.line + "'/>";
    s += "<path d='" + linePath(pts(bud)) + "' class='ln2' stroke='" + COLORS.compare + "'/>";
    s += "<path d='" + linePath(curSolid) + "' class='ln2' stroke='" + COLORS.actual + "'/>";
    s += "<path d='" + linePath(curDash) + "' class='ln2 lnd' stroke='" + COLORS.actual + "'/>";
    M.months.forEach(function (k, i) {
      s += txt(x(i), H - 14, monthAbbr(k).charAt(0) + monthAbbr(k).slice(1, 3), { anchor: 'middle', cls: i === M.selIdx ? 'xl xlb' : 'xl' });
      s += "<g class='col'" + tip({ title: monthLong(k) + ' · ' + (M.closed[i] ? 'Actual' : 'Forecast'), rows: [['Latest forecast', fmtMoney(cur[i]), COLORS.actual], ['Budget', fmtMoney(bud[i]), COLORS.compare], ['Prior year', fmtMoney(py[i]), COLORS.line], ['vs budget', fmtMoney(varOf(cur[i], bud[i]), true)]] }) + '>' +
        "<line class='colhl xh' x1='" + f1(x(i)) + "' x2='" + f1(x(i)) + "' y1='" + T + "' y2='" + (H - B) + "'/><rect x='" + f1(x(i) - 18) + "' y='0' width='36' height='" + H + "' fill='transparent'/></g>";
      if (isNum(cur[i])) s += "<circle cx='" + f1(x(i)) + "' cy='" + f1(y(cur[i])) + "' r='4' class='dot' fill='" + COLORS.actual + "'/>";
    });
    return { svg: s + '</svg>', cur: sumArr(cur), bud: sumArr(bud), py: sumArr(py) };
  }
  function slideRolling(M) {
    if (!M.ready) return shell(4, 'Rolling forecast', null, card(72, 196, 872, 624, skelChart(560)) + card(968, 196, 560, 624, skelChart(560)), srcOf(['vLand']), M);
    var b = M.budFyFull ? M.budFy : null, f = M.fy, steps = [];
    if (b) {
      steps.push({ label: 'Budget EBITDA', v: b.ebitda, kind: 'total', color: COLORS.compare, tip: { title: 'Full-year Budget EBITDA', rows: [['EBITDA', fmtMoney(b.ebitda)], ['Revenue', fmtMoney(b.rev)], ['Margin', fmtPct(b.em)]] } });
      steps.push({ label: 'Revenue', v: varOf(f.rev, b.rev), tip: { title: 'Revenue', rows: [['Forecast', fmtMoney(f.rev)], ['Budget', fmtMoney(b.rev)], ['Effect on EBITDA', fmtMoney(varOf(f.rev, b.rev), true)]] } });
      steps.push({ label: 'Direct costs', v: varOf(f.dc, b.dc), tip: { title: 'Direct costs', rows: [['Forecast', fmtMoney(f.dc)], ['Budget', fmtMoney(b.dc)], ['Effect on EBITDA', fmtMoney(varOf(f.dc, b.dc), true)]] } });
      var top = M.opexVar.slice(0, 3), topSum = 0;
      top.forEach(function (o) { topSum += o.v; steps.push({ label: o.label, v: o.v, tip: { title: o.label + ' (opex)', rows: [['Forecast', fmtMoney(o.fy)], ['Budget', fmtMoney(o.bud)], ['Effect on EBITDA', fmtMoney(o.v, true)]] } }); });
      var restOpex = isNum(varOf(f.opex, b.opex)) ? varOf(f.opex, b.opex) - topSum : null;
      if (isNum(restOpex)) steps.push({ label: top.length ? 'Other opex' : 'Opex', v: restOpex, tip: { title: 'Other operating expenses', rows: [['Effect on EBITDA', fmtMoney(restOpex, true)]] } });
      steps.push({ label: 'Forecast EBITDA', v: f.ebitda, kind: 'total', tip: { title: 'Full-year forecast EBITDA', rows: [['EBITDA', fmtMoney(f.ebitda)], ['Revenue', fmtMoney(f.rev)], ['Margin', fmtPct(f.em)], ['vs Budget', fmtMoney(varOf(f.ebitda, b.ebitda), true)]] } });
    }
    var left = cardHead('Full-year EBITDA bridge · Budget to current forecast', 'FY ' + M.fyYear + ': actuals to ' + monthShort(M.lastClosed || M.sel) + ' plus forecast') +
      guard(['vLand', 'vBudFy'], 500, function () { return waterfallSvg('wf-roll', 824, 520, steps, { barW: 64, wrap: 13, zoom: true }); });
    var cl = monthLines(M);
    var right = cardHead('Monthly revenue · ' + M.fyYear, 'Latest forecast against budget and prior year; full-year totals in the key') +
      legend([{ label: 'Latest forecast ' + fmtMoney(cl.cur), color: COLORS.actual, kind: 'line' }, { label: 'Budget ' + fmtMoney(cl.bud), color: COLORS.compare, kind: 'line' }, { label: 'Prior year ' + fmtMoney(cl.py), color: COLORS.line, kind: 'line', dash: true }]) +
      guard(['vLand', 'vRev'], 400, function () { return cl.svg; }) +
      "<div class='fnote'>Prior-forecast versions are stored as Pigment scenarios, which Frames cannot read, so the latest forecast is compared with Budget and prior year.</div>";
    var dv = b ? varOf(f.ebitda, b.ebitda) : null;
    var so = isNum(f.ebitda) ? 'Full-year EBITDA is forecast at ' + fmtMoney(f.ebitda) + (isNum(dv) ? ', ' + fmtMoney(dv, true) + ' (' + fmtPct(varPct(f.ebitda, b.ebitda), true) + ') against budget' : '') +
      (isNum(f.rev) ? ', on revenue of ' + fmtMoney(f.rev) + (isNum(M.budRevFy) ? ' (' + fmtPct(varPct(f.rev, M.budRevFy), true) + ')' : '') : '') + '.' : 'Full-year outlook against budget.';
    return shell(4, 'Rolling forecast', so, card(72, 196, 872, 624, left) + card(968, 196, 560, 624, right), srcOf(['vLand', 'vBudFy']), M);
  }

  // 6. Operating expenses
  function opexSvg(M) {
    var W = 896, H = 476, L = 72, R = 12, T = 24, B = 40, n = 12, slot = (W - L - R) / n, bw = 34;
    var cats = M.opexTop.map(function (a, i) { return { label: a.label, color: COLORS.series[i], series: a.series }; });
    if (M.opexRest.length) cats.push({ label: 'Other opex', color: COLORS.other, series: M.months.map(function (k, i) { return sumArr(M.opexRest.map(function (a) { return a.series[i]; })); }) });
    var totals = M.months.map(function (k, i) { return sumArr(cats.map(function (c) { return isNum(c.series[i]) ? -c.series[i] : null; })); });
    var nt = niceTicks(0, Math.max.apply(null, totals.filter(isNum).concat([1])) * 1.1, 4);
    var y = lin(0, nt.hi, H - B, T);
    var s = svgOpen(W, H);
    if (M.selIdx >= 0) s += "<rect x='" + f1(L + slot * M.selIdx + 4) + "' y='4' width='" + f1(slot - 8) + "' height='" + (H - 8) + "' rx='12' fill='" + COLORS.butter + "' opacity='0.6'/>";
    s += gridY(y, nt.ticks, L, W - R, fmtAxis);
    var firstOpen = M.closed.indexOf(false);
    if (firstOpen > 0) { var fx = L + slot * firstOpen; s += "<line x1='" + f1(fx) + "' x2='" + f1(fx) + "' y1='" + T + "' y2='" + (H - B) + "' class='fline'/>" + txt(fx + 8, T + 4, 'Forecast →', { cls: 'axn' }); }
    M.months.forEach(function (k, i) {
      var cx = L + slot * i + slot / 2, x = cx - bw / 2, acc = 0, closed = M.closed[i];
      var segs = cats.map(function (c) { return { c: c, v: isNum(c.series[i]) ? -c.series[i] : 0 }; }).filter(function (sg) { return sg.v > 0; });
      segs.forEach(function (sg, j) {
        var y0 = y(acc), y1 = y(acc + sg.v), top = j === segs.length - 1;
        acc += sg.v;
        var hgt = y0 - y1 - (j > 0 ? 2 : 0);
        if (hgt <= 0.5) return;
        var base = j > 0 ? y0 - 2 : y0;
        var d = top ? barPath(x, base, y1, bw, 4) : 'M' + f1(x) + ' ' + f1(base) + 'V' + f1(y1) + 'H' + f1(x + bw) + 'V' + f1(base) + 'Z';
        s += "<path class='mk' d='" + d + "' fill='" + sg.c.color + "'" + (closed ? '' : " opacity='0.5'") + tip({ title: monthLong(k) + ' · ' + (closed ? 'Actual' : 'Forecast'), rows: [[sg.c.label, fmtMoney(sg.v), sg.c.color], ['Share of month', fmtPct(ratio(sg.v, totals[i]))], ['Month total', fmtMoney(totals[i])]] }) + '/>';
      });
      if (isNum(totals[i])) s += txt(cx, y(totals[i]) - 8, fmtMoney(totals[i]).replace(curSymbol(), ''), { anchor: 'middle', cls: i === M.selIdx ? 'lbl lblb' : 'lbl lbls' });
      s += txt(cx, H - 14, monthAbbr(k), { anchor: 'middle', cls: i === M.selIdx ? 'xl xlb' : 'xl' });
    });
    return { svg: s + '</svg>', cats: cats };
  }
  function slideOpex(M) {
    if (!M.ready) return shell(5, 'Operating expenses', null, card(72, 196, 944, 624, skelChart(560)) + card(1040, 196, 488, 624, skelChart(560)), srcOf(['vLand']), M);
    var chart = opexSvg(M);
    var left = "<div class='ch ch-row'><div><div class='ct'>Operating expenses by category · " + M.fyYear + "</div><div class='cs'>Five largest accounts by full-year spend; forecast months lighter</div></div></div>" +
      legend(chart.cats.map(function (c) { return { label: c.label, color: c.color }; })) + guard(['vLand'], 470, function () { return chart.svg; });
    var right = '';
    var ps = panelState(['vBudFy']);
    var top = M.opexVar.slice(0, 3);
    if (ps.kind !== 'ready' || !top.length) {
      right = card(1040, 196, 488, 624, cardHead('Largest full-year variances', 'Forecast against budget') + (ps.kind === 'loading' ? skelChart(480) : stateBox(ps.kind === 'error' ? 'error' : 'empty', 'Budget by account unavailable', ps.kind === 'error' ? (store.vBudFy.error || '') : 'The full-year budget View returned no opex accounts.')));
    } else {
      top.forEach(function (o, i) {
        var mx = Math.max(Math.abs(num(o.fy)), Math.abs(num(o.bud)), 1);
        var good = o.v >= 0;
        var inner = "<div class='cx-h'><span class='cx-n'>" + (i + 1) + "</span><span class='cx-t'>" + esc(o.label) + '</span>' + badge(o.v, fmtMoney(o.v, true) + (good ? ' favourable' : ' adverse'), good) + '</div>' +
          "<div class='cx-s'>Full-year forecast " + fmtMoney(-o.fy) + ' against a ' + fmtMoney(-o.bud) + ' budget (' + fmtPct(varPct(-o.fy, -o.bud), true) + ' spend)</div>' +
          "<div class='cx-b'" + tip({ title: o.label, rows: [['Forecast (FY)', fmtMoney(-o.fy), COLORS.actual], ['Budget (FY)', fmtMoney(-o.bud), COLORS.compare], ['Variance', fmtMoney(o.v, true)]] }) + '>' +
          "<div class='cx-r'><span>Forecast</span><div class='cx-bar'><i style='width:" + (100 * Math.abs(num(o.fy)) / mx).toFixed(1) + '%;background:' + COLORS.actual + "'></i></div></div>" +
          "<div class='cx-r'><span>Budget</span><div class='cx-bar'><i style='width:" + (100 * Math.abs(num(o.bud)) / mx).toFixed(1) + '%;background:' + COLORS.compare + "'></i></div></div></div>";
        right += card(1040, 196 + i * 216, 488, 192, inner, 'cx');
      });
    }
    var cy = M.compYtd || {}, ov = varOf(M.ytd.opex, cy.opex);
    var so = isNum(M.ytd.opex) ? 'Operating expenses year to date ' + fmtMoney(-M.ytd.opex) + (isNum(ov) ? ', ' + fmtMoney(Math.abs(ov)) + (ov >= 0 ? ' under ' : ' over ') + M.compLabel.toLowerCase() : '') +
      (top.length ? '; the largest full-year variance is ' + top[0].label + ' at ' + fmtMoney(top[0].v, true) + '.' : '.') : 'Operating expenses by category.';
    return shell(5, 'Operating expenses', so, card(72, 196, 944, 624, left) + right, srcOf(['vLand', 'vBudFy']), M);
  }

  // 7. Cash flow waterfall
  function slideCashFlow(M) {
    if (!M.ready) return shell(6, 'Cash flow', null, card(72, 196, 944, 624, skelChart(560)) + card(1040, 196, 488, 624, skelChart(560)), srcOf(['vCash']), M);
    var c = M.cashAt || {}, k = M.cashAnchor;
    var bf = c.bf, inf = c.inflow, outf = c.outflow, cf = c.cf;
    var steps = [{ label: 'Opening cash', v: bf, kind: 'total', tip: { title: 'Opening cash · ' + monthLong(k), rows: [['Balance b/f', fmtMoney(bf)]] } },
      { label: 'Cash inflows', v: inf, tip: { title: 'Cash inflows · ' + monthLong(k), rows: [['Receipts', fmtMoney(inf, true)], ['vs prior month', fmtMoney(varOf(inf, (M.cash[mkAdd(k, -1)] || {}).inflow), true)]] } },
      { label: 'Cash outflows', v: outf, tip: { title: 'Cash outflows · ' + monthLong(k), rows: [['Payments', fmtMoney(outf, true)], ['vs prior month', fmtMoney(varOf(outf, (M.cash[mkAdd(k, -1)] || {}).outflow), true)]] } }];
    var resid = isNum(bf) && isNum(cf) ? cf - bf - num(inf) - num(outf) : null;
    if (isNum(resid) && Math.abs(resid) > Math.max(1, Math.abs(cf) * 0.001)) steps.push({ label: 'Other movements', v: resid, tip: { title: 'Other movements', rows: [['Balancing item', fmtMoney(resid, true)]], note: 'Closing less opening, inflows and outflows' } });
    steps.push({ label: 'Closing cash', v: cf, kind: 'total', tip: { title: 'Closing cash · ' + monthLong(k), rows: [['Balance c/f', fmtMoney(cf)], ['vs prior month', fmtMoney(varOf(cf, M.cashPrev), true)], ['vs prior year', fmtMoney(varOf(cf, M.cashPy), true)]] } });
    var net = isNum(inf) || isNum(outf) ? num(inf) + num(outf) : (isNum(cf) && isNum(bf) ? cf - bf : null);
    var verNote = (M.cashVersion === 'budget' ? 'Budget version, as planned on board 3.4' : 'Actual version') + (k !== M.sel ? ' · latest actual month (' + monthLong(M.sel) + ' is a forecast month)' : '');
    var left = cardHead('Cash bridge · ' + monthLong(k), verNote) + guard(['vCash'], 500, function () { return waterfallSvg('wf-cash', 896, 520, steps, { barW: 88, zoom: true }); });
    function kv(l, v, cls) { return "<div class='kvr " + (cls || '') + "'><span>" + esc(l) + '</span><span>' + v + '</span></div>'; }
    var right = cardHead('Cash summary', monthLong(k)) + guard(['vCash'], 300, function () {
      return kv('Opening cash', fmtMoney(bf)) + kv('Cash inflows', fmtMoney(inf, true)) + kv('Cash outflows', fmtMoney(outf, true)) + kv('Net cash movement', fmtMoney(net, true), 'kvr-s') + kv('Closing cash', fmtMoney(cf), 'kvr-t') +
        kv('Change vs prior month', fmtMoney(varOf(cf, M.cashPrev), true)) + kv('Change vs prior year', fmtMoney(varOf(cf, M.cashPy), true));
    }) + "<div class='fnote'>Board 3.4 models operating receipts and payments. Investing and financing cash flows are not modelled separately, so they do not appear as their own bars.</div>";
    var so = isNum(cf) ? 'Cash ' + (net >= 0 ? 'rose' : 'fell') + ' by ' + fmtMoney(Math.abs(num(net))) + ' in ' + monthLong(k) + ' to ' + fmtMoney(cf) + ': inflows ' + fmtMoney(inf) + ', outflows ' + fmtMoney(Math.abs(num(outf))) + '.' : 'Opening to closing cash for the period.';
    return shell(6, 'Cash flow', so, card(72, 196, 944, 624, left) + card(1040, 196, 488, 624, right), srcOf(['vCash']), M);
  }

  // 8. Cash trend & runway
  function cashTrendSvg(M) {
    var W = 896, H = 504, L = 80, R = 24, T1 = 28, B1 = 324, T2 = 372, B2 = 468;
    var win = M.cashWindow, n = win.length, slot = (W - L - R) / n;
    var cfs = win.map(function (x) { return x.cf; }).filter(isNum);
    var lo = cfs.length ? Math.min.apply(null, cfs) : 0, hi = cfs.length ? Math.max.apply(null, cfs) : 1;
    var nt = niceTicks(Math.min(0, lo), hi * 1.08, 4);
    var y = lin(nt.lo, nt.hi, B1, T1);
    var nets = win.map(function (x) { return x.net; }).filter(isNum);
    var na = nets.length ? Math.max.apply(null, nets.map(Math.abs)) : 1;
    var nt2 = niceTicks(-na, na, 2), y2 = lin(nt2.lo, nt2.hi, B2, T2);
    var s = svgOpen(W, H) + gridY(y, nt.ticks, L, W - R, fmtAxis) + gridY(y2, nt2.ticks, L, W - R, fmtAxis);
    s += txt(L, 16, 'Closing cash', { cls: 'pt' }) + txt(L, T2 - 16, 'Net cash movement', { cls: 'pt' });
    var pts = win.map(function (x, i) { return isNum(x.cf) ? [L + slot * i + slot / 2, y(x.cf)] : null; });
    var real = pts.filter(Boolean);
    if (real.length > 1) s += "<path d='" + linePath(real) + 'L' + f1(real[real.length - 1][0]) + ' ' + f1(y(Math.max(0, nt.lo))) + 'L' + f1(real[0][0]) + ' ' + f1(y(Math.max(0, nt.lo))) + "Z' fill='" + COLORS.actual + "' opacity='0.1'/>";
    if (M.cashLow) {
      var ly = y(M.cashLow.cf);
      s += "<line x1='" + L + "' x2='" + (W - R) + "' y1='" + f1(ly) + "' y2='" + f1(ly) + "' class='minl'/>" + txt(W - R, ly + 18, 'Low point ' + fmtMoney(M.cashLow.cf) + ' · ' + monthShort(M.cashLow.k), { anchor: 'end', cls: 'axn' });
    }
    s += "<path d='" + linePath(pts) + "' class='ln2' stroke='" + COLORS.actual + "'/>";
    win.forEach(function (x, i) {
      var cx = L + slot * i + slot / 2;
      s += "<g class='col'" + tip({ title: monthLong(x.k), rows: [['Closing cash', fmtMoney(x.cf), COLORS.actual], ['Net movement', fmtMoney(x.net, true)], ['Inflows', fmtMoney(x.inflow, true)], ['Outflows', fmtMoney(x.outflow, true)]] }) + '>' +
        "<rect class='colhl' x='" + f1(L + slot * i + 2) + "' y='8' width='" + f1(slot - 4) + "' height='" + (H - 36) + "' rx='10'/>";
      if (isNum(x.net)) s += "<path d='" + barPath(cx - 12, y2(0), y2(x.net), 24, 4) + "' fill='" + (x.net >= 0 ? COLORS.pos : COLORS.neg) + "'/>";
      if (isNum(x.cf)) s += "<circle cx='" + f1(cx) + "' cy='" + f1(y(x.cf)) + "' r='4.5' class='dot' fill='" + COLORS.actual + "'/>";
      if (isNum(x.cf) && (i === n - 1 || i === 0)) s += txt(cx, y(x.cf) - 14, fmtMoney(x.cf), { anchor: 'middle', cls: i === n - 1 ? 'lbl lblb' : 'lbl' });
      s += txt(cx, H - 12, monthAbbr(x.k) + (mkMon(x.k) === 0 || i === 0 ? ' ' + String(mkYear(x.k)).slice(2) : ''), { anchor: 'middle', cls: i === n - 1 ? 'xl xlb' : 'xl' });
      s += "<rect x='" + f1(L + slot * i) + "' y='0' width='" + f1(slot) + "' height='" + H + "' fill='transparent'/></g>";
    });
    return s + '</svg>';
  }
  function slideCashTrend(M) {
    if (!M.ready) return shell(7, 'Cash trend & runway', null, card(72, 196, 944, 624, skelChart(560)), srcOf(['vCash']), M);
    var left = cardHead('Closing cash, trailing ' + CONFIG.trendWindow + ' months', (M.cashVersion === 'budget' ? 'Budget version · ' : 'Actual version · ') + 'dashed line marks the lowest balance') +
      guard(['vCash'], 500, function () { return cashTrendSvg(M); });
    var ps = panelState(['vCash']), cards = '';
    function kc(i, title, val, cap, extra) {
      var inner = ps.kind === 'loading' ? "<div class='sk' style='width:50%;height:14px'></div><div class='sk' style='width:40%;height:40px;margin-top:20px'></div>"
        : "<div class='kt'>" + esc(title) + "</div><div class='kv kv-xl'>" + val + '</div>' + (extra || '') + "<div class='ks'>" + esc(cap) + '</div>';
      cards += card(1040, 196 + i * 216, 488, 192, inner, 'kpi');
    }
    if (M.cashGenerative) kc(0, 'Months of runway', 'Cash generative', 'Net cash movement has averaged ' + fmtMoney(M.avgNet, true) + ' a month over the last ' + CONFIG.runwayLookback + ' months, so there is no burn to measure.');
    else kc(0, 'Months of runway', fmtMonths(M.runway), 'Closing cash ÷ average monthly net outflow over the last ' + CONFIG.runwayLookback + ' months.');
    kc(1, 'Average net movement', fmtMoney(M.avgNet, true), 'Monthly average, last ' + CONFIG.runwayLookback + ' months to ' + monthShort(M.cashAnchor) + '.');
    kc(2, 'Low point', M.cashLow ? fmtMoney(M.cashLow.cf) : '—', M.cashLow ? 'Lowest month-end balance in the window: ' + monthLong(M.cashLow.k) + '.' : 'No balances in the window.');
    var so = isNum(M.cfNow) ? 'Closing cash of ' + fmtMoney(M.cfNow) + ' at ' + monthLong(M.cashAnchor) + (M.cashLow ? '; the 12-month low was ' + fmtMoney(M.cashLow.cf) + ' in ' + monthLong(M.cashLow.k) : '') +
      (M.cashGenerative ? '; the business is cash generative over the last ' + CONFIG.runwayLookback + ' months.' : isNum(M.runway) ? '; runway is ' + fmtMonths(M.runway) + ' months at the recent burn.' : '.') : 'Closing cash by month with runway.';
    return shell(7, 'Cash trend & runway', so, card(72, 196, 944, 624, left) + cards, srcOf(['vCash']), M);
  }

  // 9. Price / volume / mix bridge
  function slidePvm(M) {
    var p = M.pvm || {};
    var steps = [{ label: M.pvmBaseLabel, v: p.base, kind: 'total', color: COLORS.compare, tip: { title: 'Base revenue', rows: [[M.pvmBaseLabel, fmtMoney(p.base)]] } }];
    [['price', 'Price effect'], ['vol', 'Volume effect'], ['mix', 'Mix effect'], ['fx', 'FX effect']].forEach(function (e) {
      if (isNum(p[e[0]])) steps.push({ label: e[1], v: p[e[0]], tip: { title: e[1], rows: [['Effect', fmtMoney(p[e[0]], true)], ['Share of change', fmtPct(ratio(p[e[0]], sub(p.rev, p.base)))]] } });
    });
    var explained = sumArr([p.price, p.vol, p.mix, p.fx]);
    var resid = isNum(p.rev) && isNum(p.base) && isNum(explained) ? p.rev - p.base - explained : null;
    if (isNum(resid) && Math.abs(resid) > Math.max(1, Math.abs(p.rev) * 0.001)) steps.push({ label: 'Unexplained', v: resid, tip: { title: 'Unexplained', rows: [['Residual', fmtMoney(resid, true)]], note: 'Current less base revenue and the four effects' } });
    steps.push({ label: M.pvmCurLabel, v: p.rev, kind: 'total', tip: { title: 'Current revenue', rows: [[M.pvmCurLabel, fmtMoney(p.rev)], ['Change', fmtMoney(sub(p.rev, p.base), true) + ' · ' + fmtPct(varPct(p.rev, p.base), true)]] } });
    var chips = "<div class='chips'><span class='chip'>Base · " + esc(M.pvmBaseLabel) + "</span><span class='chip-arrow'>→</span><span class='chip chip-b'>Compared · " + esc(M.pvmCurLabel) + "</span><span class='chip-note'>Set on board 3.5 (PVM Settings); the deck period does not change it.</span></div>";
    var inner = cardHead('Revenue bridge: price, volume, mix and FX', 'Group revenue in ' + currencyLabel()) + chips + guard(['vPvm'], 470, function () { return waterfallSvg('wf-pvm', 1408, 476, steps, { barW: 96, zoom: true, wrap: 18 }); });
    var ch = sub(p.rev, p.base);
    var so = isNum(ch) ? 'Revenue ' + (ch >= 0 ? 'grew ' : 'fell ') + fmtMoney(Math.abs(ch)) + ' (' + fmtPct(varPct(p.rev, p.base), true) + ') from ' + M.pvmBaseLabel + ' to ' + M.pvmCurLabel + ': price ' + fmtMoney(p.price, true) + ', volume ' + fmtMoney(p.vol, true) + ', mix ' + fmtMoney(p.mix, true) + (isNum(p.fx) ? ', FX ' + fmtMoney(p.fx, true) : '') + '.' : 'Revenue change decomposed into price, volume, mix and FX.';
    return shell(8, 'Price, volume & mix bridge', so, card(72, 196, 1456, 624, inner), srcOf(['vPvm']), M);
  }

  // 10. PVM by product (heat-grid sorted by absolute impact)
  function slidePvmProd(M) {
    var rows = M.pvmProd, effs = [['price', 'Price'], ['vol', 'Volume'], ['mix', 'Mix'], ['fx', 'FX']];
    var mx = 1;
    rows.forEach(function (r) { effs.forEach(function (e) { if (isNum(r[e[0]])) mx = Math.max(mx, Math.abs(r[e[0]])); }); });
    var tmx = Math.max.apply(null, rows.map(function (r) { return Math.abs(num(r.total)); }).concat([1]));
    function cellBg(v) {
      if (!isNum(v) || v === 0) return 'background:#F4F4F1';
      var a = 0.14 + 0.8 * Math.abs(v) / mx;
      return v > 0 ? 'background:rgba(168,213,186,' + a.toFixed(2) + ')' : 'background:rgba(232,169,176,' + a.toFixed(2) + ')';
    }
    var grid = function () {
      var rh = Math.min(64, Math.floor(440 / Math.max(1, rows.length)));
      var h = "<div class='hg'><div class='hg-r hg-h'><div class='hg-n'>Product</div>" + effs.map(function (e) { return "<div class='hg-c'>" + e[1] + '</div>'; }).join('') + "<div class='hg-t'>Total change</div><div class='hg-v'>Revenue</div></div>";
      rows.forEach(function (r) {
        h += "<div class='hg-r' style='height:" + rh + "px'><div class='hg-n'>" + esc(r.name) + '</div>';
        effs.forEach(function (e) {
          var v = r[e[0]];
          h += "<div class='hg-c hg-cell' style='" + cellBg(v) + "'" + tip({ title: r.name + ' · ' + e[1] + ' effect', rows: [['Effect', fmtMoney(v, true)], ['Share of product change', fmtPct(ratio(v, r.total))], ['Base revenue', fmtMoney(r.base)], ['Current revenue', fmtMoney(r.rev)]] }) + '>' + fmtMoney(v, true) + '</div>';
        });
        var w = 100 * Math.abs(num(r.total)) / tmx / 2;
        h += "<div class='hg-t'" + tip({ title: r.name, rows: [['Total change', fmtMoney(r.total, true)], ['Change %', fmtPct(varPct(r.rev, r.base), true)], ['Price', fmtMoney(r.price, true)], ['Volume', fmtMoney(r.vol, true)], ['Mix', fmtMoney(r.mix, true)], ['FX', fmtMoney(r.fx, true)]] }) + ">" +
          "<div class='dv'><div class='dv-z'></div><i class='" + (num(r.total) >= 0 ? 'p' : 'm') + "' style='width:" + w.toFixed(1) + '%;' + (num(r.total) >= 0 ? 'left:50%' : 'right:50%') + "'></i></div><span>" + fmtMoney(r.total, true) + '</span></div>' +
          "<div class='hg-v'>" + fmtMoney(r.base) + ' → ' + fmtMoney(r.rev) + '</div></div>';
      });
      return h + '</div>';
    };
    var inner = cardHead('Effects by product', 'Sorted by absolute revenue change · ' + M.pvmBaseLabel + ' → ' + M.pvmCurLabel) +
      legend([{ label: 'Adds revenue', color: COLORS.pos }, { label: 'Reduces revenue', color: COLORS.neg }]) + guard(['vPvmProd'], 470, grid);
    var best = rows.slice().sort(function (a, b) { return num(b.total) - num(a.total); });
    var up = best[0], dn = best[best.length - 1];
    function driver(r) { var e = effs.map(function (x) { return [x[1].toLowerCase(), r[x[0]]]; }).filter(function (x) { return isNum(x[1]); }).sort(function (a, b) { return Math.abs(b[1]) - Math.abs(a[1]); })[0]; return e ? e[0] : 'mix'; }
    var so = up && isNum(up.total) ? up.name + ' adds the most revenue (' + fmtMoney(up.total, true) + ', mainly ' + driver(up) + ')' + (dn && dn !== up && num(dn.total) < 0 ? '; ' + dn.name + ' is the largest drag (' + fmtMoney(dn.total, true) + ', mainly ' + driver(dn) + ').' : '.') : 'Price, volume, mix and FX effects for each product.';
    return shell(9, 'Price, volume & mix by product', so, card(72, 196, 1456, 624, inner), srcOf(['vPvmProd']), M);
  }

  // 11. Appendix
  function checks(M) {
    var out = [];
    var R = M.revVer && M.revVer.actual;
    if (R && M.revSource === 'vLand') {
      var d = 0, b = 0;
      M.months.forEach(function (k, i) { if (M.closed[i] && i <= M.selIdx && isNum(M.monthly[i].rev) && isNum(R[k])) { d += Math.abs(M.monthly[i].rev - R[k]); b += Math.abs(R[k]); } });
      if (b) out.push([d / b < 0.005, 'Actual revenue ties between “P&L Reforecast” and “Actuals vs. Budget vs. Forecast”', d / b < 0.005 ? 'within 0.5%' : 'differs by ' + fmtPct(d / b) + ': check the currency or overrides on the P&L Reforecast View']);
    }
    var p = M.pvm;
    if (isNum(p.rev) && isNum(p.base)) {
      var r = p.rev - p.base - num(p.price) - num(p.vol) - num(p.mix) - num(p.fx);
      out.push([Math.abs(r) <= Math.abs(p.rev) * 0.001 + 1, 'Price, volume, mix and FX reconcile base to current revenue', Math.abs(r) <= Math.abs(p.rev) * 0.001 + 1 ? 'fully explained' : 'residual ' + fmtMoney(r, true) + ' shown as Unexplained']);
    }
    var c = M.cashAt;
    if (c && isNum(c.cf) && isNum(c.bf)) {
      var rr = c.cf - c.bf - num(c.inflow) - num(c.outflow);
      out.push([Math.abs(rr) <= Math.abs(c.cf) * 0.001 + 1, 'Cash rolls forward: opening + inflows + outflows = closing', Math.abs(rr) <= Math.abs(c.cf) * 0.001 + 1 ? 'balanced' : 'balancing item ' + fmtMoney(rr, true)]);
    }
    return out;
  }
  function slideAppendix(M) {
    var defs = [
      ['Actual and forecast months', 'Taken from “Manage Actual Period” (Load Actuals). Closed months use the Actual version; open months use the Forecast version.'],
      ['Current forecast (landing)', 'Actuals for closed months plus forecast for the remaining months, from the “P&L Reforecast” View.'],
      ['Comparison', 'Budget: the Budget version for the same months. Prior year: the Actual version for the same months a year earlier. Prior forecast is not offered because prior forecasts are held as Pigment scenarios, which Frames cannot read.'],
      ['Gross margin %', 'Gross profit ÷ revenue, where gross profit = revenue + direct costs.'],
      ['EBITDA and net income', 'EBITDA = gross profit + operating expenses. Net income = EBITDA + ITDA & other.'],
      ['Variance', 'Current minus comparison. Costs are carried as negatives, so a positive variance is favourable on every line.'],
      ['Runway and low point', 'Runway = closing cash ÷ average monthly net outflow over the last ' + CONFIG.runwayLookback + ' months. Low point = lowest month-end balance in the trailing ' + CONFIG.trendWindow + ' months.'],
      ['Price, volume, mix, FX', 'ΔPrice = (actual price − base price) × actual qty; ΔVolume = (actual qty at base mix − base qty) × base price; ΔMix = (actual qty − qty at base mix) × base price; ΔFX = price at actual rate − price at base rate, × actual qty.']
    ];
    var left = cardHead('Definitions', null) + "<dl class='defs'>" + defs.map(function (d) { return '<dt>' + esc(d[0]) + '</dt><dd>' + esc(d[1]) + '</dd>'; }).join('') + '</dl>';
    var latest = null;
    var rowsH = VIEW_KEYS.map(function (k) {
      var st = store[k], v = VIEWS[k];
      if (st.updatedAt && (!latest || st.updatedAt > latest)) latest = st.updatedAt;
      var chip = st.status === 'ready' ? "<span class='sc sc-ok'>Ready</span>" : st.status === 'empty' ? "<span class='sc sc-e'>No rows</span>" : st.status === 'error' ? "<span class='sc sc-x'" + tip({ title: v.name, rows: [['Error', st.error || '']] }) + '>Error</span>' : "<span class='sc'>Loading</span>";
      return "<tr><td><span class='vb'>" + esc(v.board.split(' ')[0]) + "</span><span class='vn'>" + esc(v.name) + '</span></td><td>' + esc(v.role) + '</td><td>' + chip + "</td><td class='tn'>" + (st.updatedAt ? esc(timeStr(st.updatedAt)) : '—') + '</td></tr>';
    }).join('');
    var ck = M.ready ? checks(M) : [];
    var right = cardHead('Data sources', 'Views read from ' + CONFIG.application) +
      "<table class='src'><thead><tr><th>View</th><th>Used for</th><th>Status</th><th>Retrieved</th></tr></thead><tbody>" + rowsH + '</tbody></table>' +
      "<div class='ck-h'>Data checks</div>" + (ck.length ? ck.map(function (c) { return "<div class='ck'><span class='ck-i " + (c[0] ? 'ok' : 'x') + "'>" + (c[0] ? '✓' : '!') + '</span><span>' + esc(c[1]) + ': ' + esc(c[2]) + '</span></div>'; }).join('') : "<div class='ck'><span>Checks run once the Views have loaded.</span></div>") +
      "<div class='rf'>Data refreshed " + (latest ? esc(dateTimeStr(latest)) : '—') + ' · figures in ' + esc(currencyLabel()) + ' (' + esc(curSymbol().trim()) + ') where the View exposes a currency · scenario: as served to Frames</div>';
    return shell(10, 'Appendix', 'Definitions, data sources and refresh status.', card(72, 196, 688, 624, left) + card(784, 196, 744, 624, right, 'src-card'), 'Source: Pigment · ' + CONFIG.application, M);
  }
  function timeStr(d) { return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2); }
  function dateTimeStr(d) { return d.getDate() + ' ' + MON_SHORT[d.getMonth()] + ' ' + d.getFullYear() + ' at ' + timeStr(d).slice(0, 5); }

  var RENDERERS = [slideCover, slideExec, slidePL, slideTrend, slideRolling, slideOpex, slideCashFlow, slideCashTrend, slidePvm, slidePvmProd, slideAppendix];

  // SECTION: styles
  var CSS = [
    ':root{--bg:#FAFAF8;--ink:#2E3440;--ink2:#7B8392;--muted:#A7ADB8;--hair:#ECECE7;--card:#FFFFFF;--pos:#A8D5BA;--neg:#E8A9B0;--font:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}',
    '.mrp{position:fixed;inset:0;background:var(--bg);color:var(--ink);font-family:var(--font);-webkit-font-smoothing:antialiased;overflow:hidden}',
    '.mrp *{box-sizing:border-box}',
    '.mrp button{font:inherit;color:inherit}',
    '.tb{position:absolute;left:0;right:0;top:0;height:56px;display:flex;align-items:center;gap:16px;padding:0 24px;border-bottom:1px solid var(--hair);background:rgba(250,250,248,.94);z-index:5}',
    '.tb-title{font-size:15px;color:var(--ink);white-space:nowrap}',
    '.tb-title b{font-weight:500}',
    '.tb-ctl{display:flex;align-items:center;gap:16px;margin-left:auto}',
    '.tb-lab{font-size:13px;color:var(--ink2);display:flex;align-items:center;gap:8px;white-space:nowrap}',
    '.seg button,.mrp .ib{white-space:nowrap}',
    '@media (max-width:1360px){.tb-title{display:none}.tb-ctl{margin-left:0;flex:1;justify-content:flex-end}}',
    '@media (max-width:1100px){.nb-h,.tb-lab-t{display:none}}',
    '.tb select{appearance:none;-webkit-appearance:none;font:inherit;font-size:14px;color:var(--ink);background:#fff url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%276%27%3E%3Cpath d=%27M1 1l4 4 4-4%27 fill=%27none%27 stroke=%27%237B8392%27 stroke-width=%271.5%27/%3E%3C/svg%3E") no-repeat right 12px center;border:1px solid var(--hair);border-radius:8px;height:36px;padding:0 32px 0 12px;cursor:pointer}',
    '.seg{display:flex;background:#F1F1EC;border-radius:10px;padding:3px}',
    '.seg button{border:0;background:transparent;height:30px;padding:0 14px;border-radius:8px;font-size:13px;color:var(--ink2);cursor:pointer}',
    '.seg button.on{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(46,52,64,.08)}',
    '.seg button:disabled{cursor:not-allowed;opacity:.5}',
    '.mrp .ib{border:1px solid var(--hair);background:#fff;height:36px;padding:0 12px;border-radius:8px;cursor:pointer;font-size:13px;color:var(--ink);display:flex;align-items:center;gap:8px}',
    '.mrp .ib:hover{background:#F6F6F2}',
    '.axnote{position:absolute;right:24px;top:28px;font-size:12px;color:var(--muted)}',
    '.banner{position:absolute;left:24px;right:24px;top:64px;z-index:6;display:none;align-items:center;gap:12px;background:#FBEFF0;color:#6E3842;border-radius:10px;padding:8px 12px 8px 16px;font-size:13px}',
    '.banner.on{display:flex}',
    '.banner .bx{margin-left:auto;border:0;background:transparent;cursor:pointer;color:#6E3842;font-size:16px;line-height:1}',
    '.stage-wrap{position:absolute;left:0;right:0;top:56px;bottom:56px;overflow:hidden}',
    '.mrp.has-banner .stage-wrap{top:104px}',
    '.mrp.present .stage-wrap{top:0;bottom:0}',
    '.mrp.present .banner{top:8px}',
    '.mrp.present .tb,.mrp.present .nb{display:none}',
    '.stage{position:absolute;left:0;top:0;width:1600px;height:900px;transform-origin:0 0}',
    '.slide{position:absolute;inset:0;background:var(--bg);opacity:0;transition:opacity 360ms ease;pointer-events:none}',
    '.slide.on{opacity:1;pointer-events:auto}',
    '.sh{position:absolute;left:72px;right:72px;top:24px;height:24px;display:flex;align-items:center;gap:12px;font-size:13px;color:var(--ink2);letter-spacing:.02em}',
    '.sh-co{color:var(--ink)}',
    '.sh-sep{width:4px;height:4px;border-radius:2px;background:var(--muted)}',
    '.sh-r{margin-left:auto}',
    '.st{position:absolute;left:72px;right:72px;top:72px}',
    '.st h1{margin:0;font-size:40px;line-height:48px;font-weight:300;letter-spacing:-.01em;color:var(--ink)}',
    '.so{margin:8px 0 0;font-size:18px;line-height:28px;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.sf{position:absolute;left:72px;right:72px;bottom:24px;height:20px;display:flex;align-items:center;gap:24px;font-size:12px;color:var(--muted);letter-spacing:.02em}',
    '.sf-src{margin-left:auto;margin-right:auto}',
    '.card{position:absolute;background:var(--card);border-radius:12px;box-shadow:0 1px 2px rgba(46,52,64,.04),0 6px 24px rgba(46,52,64,.05);padding:24px;overflow:hidden}',
    '.ch{margin-bottom:12px}',
    '.ch-row{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}',
    '.ct{font-size:16px;line-height:24px;color:var(--ink)}',
    '.cs{font-size:13px;line-height:20px;color:var(--ink2)}',
    '.lg{display:flex;flex-wrap:wrap;gap:8px 20px;font-size:13px;color:var(--ink2);margin:0 0 8px}',
    '.lgi{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}',
    '.sw{width:12px;height:12px;border-radius:3px;display:inline-block}',
    '.sw-h{background:repeating-linear-gradient(135deg,currentColor 0 2px,#E6EFFB 2px 5px)}',
    '.sw-l{width:16px;height:0;border-top:2px solid;display:inline-block}',
    '.chart{display:block;overflow:visible}',
    '.chart text{font-family:var(--font)}',
    '.ax{font-size:12px;fill:var(--ink2);font-variant-numeric:tabular-nums}',
    '.axn{font-size:12px;fill:var(--muted)}',
    '.xl{font-size:13px;fill:var(--ink2)}',
    '.xlb{fill:var(--ink)}',
    '.pt{font-size:12px;fill:var(--ink2);letter-spacing:.04em;text-transform:uppercase}',
    '.lbl{font-size:13px;fill:var(--ink);font-variant-numeric:tabular-nums}',
    '.lbls{font-size:12px;fill:var(--ink2)}',
    '.lblb{font-weight:500;fill:var(--ink)}',
    '.grid{stroke:#F0F0EB;stroke-width:1}',
    '.base{stroke:#DCDCD5;stroke-width:1}',
    '.conn{stroke:#C9CDD4;stroke-width:1}',
    '.fline{stroke:#D8D9D3;stroke-width:1}',
    '.minl{stroke:#C98E97;stroke-width:1.5;stroke-dasharray:6 5}',
    '.ln2{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}',
    '.lnd{stroke-dasharray:5 5}',
    '.dot{stroke:#fff;stroke-width:2}',
    '.mk{transition:opacity 150ms ease-in;cursor:default}',
    '.mk:hover{opacity:.78}',
    '.col .colhl{fill:#F2F2EE;opacity:0;transition:opacity 150ms ease-in}',
    '.col .xh{stroke:#C9CDD4;stroke-width:1;fill:none}',
    '.col:hover .colhl{opacity:1}',
    '.spark{display:block}',
    '.spl{fill:none;stroke:#AEB6C2;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}',
    '.spd{stroke-dasharray:3 4}',
    '.spdot{fill:#73A8E8;stroke:#fff;stroke-width:2}',
    '.spark-empty{font-size:12px;color:var(--muted)}',
    '.kpi .kt{font-size:14px;color:var(--ink)}',
    '.kpi .ks{font-size:12px;line-height:18px;color:var(--ink2);margin-top:2px}',
    '.kpi .kv{font-size:40px;line-height:48px;font-weight:300;margin-top:12px;letter-spacing:-.01em;white-space:nowrap}',
    '.kpi .kv-xl{font-size:44px;line-height:56px}',
    '.kpi .kb{margin-top:8px}',
    '.kerr{display:flex;align-items:center;gap:8px;margin-top:24px;font-size:15px;color:var(--ink)}',
    '.kerr-i{width:22px;height:22px;border-radius:11px;background:#F9E6E8;color:#8E4552;display:inline-flex;align-items:center;justify-content:center;font-size:12px}',
    '.kpi .kspark{position:absolute;right:24px;top:28px}',
    '.bdg{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:13px;font-size:13px;white-space:nowrap;font-variant-numeric:tabular-nums}',
    '.bdg-p{background:#E3F2E9;color:#2F6B4E}',
    '.bdg-m{background:#F9E6E8;color:#8E4552}',
    '.bdg-n{background:#F1F1EC;color:var(--ink2)}',
    '.bdg-g{font-size:9px}',
    '.hl{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:16px}',
    '.hl li{display:flex;gap:16px;font-size:18px;line-height:26px;color:var(--ink)}',
    '.hl-dot{flex:none;width:10px;height:10px;border-radius:5px;margin-top:8px;background:#C9CDD4}',
    '.hl-dot.p{background:var(--pos)}',
    '.hl-dot.m{background:var(--neg)}',
    '.hl-empty{font-size:15px;color:var(--ink2)}',
    '.pl{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:15px}',
    '.pl th{font-weight:400;color:var(--ink2);font-size:13px;text-align:right;padding:8px 12px}',
    '.pl tr.g th{color:var(--ink);font-size:14px;text-align:center;border-bottom:1px solid var(--hair)}',
    '.pl tr.g th+th,.pl tr.h th:nth-child(2),.pl tr.h th:nth-child(6),.pl tr.h th:nth-child(10),.pl td:nth-child(2),.pl td:nth-child(6),.pl td:nth-child(10){border-left:12px solid #fff}',
    '.pl td{text-align:right;padding:0 12px;height:54px;font-variant-numeric:tabular-nums;color:var(--ink);border-bottom:1px solid #F4F4F0;white-space:nowrap}',
    '.pl td.ln{text-align:left;color:var(--ink)}',
    '.pl td.c{color:var(--ink2)}',
    '.pl td.v{border-radius:0}',
    '.pl td.vp{color:var(--ink2)}',
    '.pl tr.sub td{font-weight:500;border-top:1px solid #E4E4DE}',
    '.pl tr.ratio td{color:var(--ink2);font-size:14px;height:42px}',
    '.pl tr.ratio td.ln{padding-left:24px;font-style:italic}',
    '.pl tbody tr:hover td{background-color:#FAFAF6}',
    '.pl-note{margin-top:16px;font-size:13px;color:var(--ink2)}',
    '.fnote{position:absolute;left:24px;right:24px;bottom:20px;font-size:12px;line-height:18px;color:var(--ink2)}',
    '.cx .cx-h{display:flex;align-items:center;gap:12px}',
    '.cx-n{width:28px;height:28px;border-radius:14px;background:#E3DAF5;display:inline-flex;align-items:center;justify-content:center;font-size:13px}',
    '.cx-t{font-size:18px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cx-s{margin-top:12px;font-size:13px;line-height:20px;color:var(--ink2)}',
    '.cx-b{margin-top:16px;display:flex;flex-direction:column;gap:8px}',
    '.cx-r{display:flex;align-items:center;gap:12px;font-size:12px;color:var(--ink2)}',
    '.cx-r span{width:64px}',
    '.cx-bar{flex:1;height:12px;background:#F4F4F0;border-radius:6px;overflow:hidden}',
    '.cx-bar i{display:block;height:100%;border-radius:0 6px 6px 0}',
    '.kvr{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #F2F2EE;font-size:15px;font-variant-numeric:tabular-nums}',
    '.kvr span:first-child{color:var(--ink2)}',
    '.kvr-s{font-weight:500}',
    '.kvr-t{font-weight:500;border-bottom:1px solid #E4E4DE;margin-bottom:12px}',
    '.chips{display:flex;align-items:center;gap:12px;margin:0 0 8px;font-size:13px}',
    '.chip{background:#F1F1EC;border-radius:13px;padding:4px 12px;color:var(--ink)}',
    '.chip-b{background:#CFE0F5}',
    '.chip-arrow{color:var(--muted)}',
    '.chip-note{margin-left:auto;color:var(--ink2)}',
    '.hg{display:flex;flex-direction:column;gap:6px;margin-top:8px}',
    '.hg-r{display:grid;grid-template-columns:240px repeat(4,1fr) 300px 200px;gap:6px;align-items:stretch}',
    '.hg-h{font-size:13px;color:var(--ink2);height:28px}',
    '.hg-h>div{display:flex;align-items:center;justify-content:center}',
    '.hg-h .hg-n{justify-content:flex-start}',
    '.hg-n{display:flex;align-items:center;font-size:15px;padding-left:4px}',
    '.hg-c{display:flex;align-items:center;justify-content:center;font-size:15px;border-radius:8px;font-variant-numeric:tabular-nums}',
    '.hg-cell{transition:opacity 150ms ease-in}',
    '.hg-cell:hover{opacity:.8}',
    '.hg-t{display:flex;align-items:center;gap:12px;font-size:14px;font-variant-numeric:tabular-nums;padding:0 8px}',
    '.hg-t span{width:84px;text-align:right}',
    '.hg-v{display:flex;align-items:center;justify-content:flex-end;font-size:13px;color:var(--ink2);font-variant-numeric:tabular-nums}',
    '.dv{position:relative;flex:1;height:14px}',
    '.dv-z{position:absolute;left:50%;top:-4px;bottom:-4px;width:1px;background:#DCDCD5}',
    '.dv i{position:absolute;top:0;height:14px}',
    '.dv i.p{background:var(--pos);border-radius:0 4px 4px 0}',
    '.dv i.m{background:var(--neg);border-radius:4px 0 0 4px}',
    '.defs{margin:8px 0 0;display:grid;grid-template-columns:184px 1fr;gap:12px 24px;font-size:13px;line-height:19px}',
    '.defs dt{color:var(--ink)}',
    '.defs dd{margin:0;color:var(--ink2)}',
    '.src{width:100%;border-collapse:collapse;font-size:12px;line-height:16px}',
    '.src th{text-align:left;font-weight:400;color:var(--ink2);padding:6px 8px;border-bottom:1px solid var(--hair)}',
    '.src td{padding:6px 8px;border-bottom:1px solid #F4F4F0;vertical-align:middle;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.src{table-layout:fixed}',
    '.src th:nth-child(1){width:40%}.src th:nth-child(2){width:36%}.src th:nth-child(3){width:12%}',
    '.src .vn{color:var(--ink)}',
    '.src .vb{display:inline-block;width:28px;color:var(--muted);font-variant-numeric:tabular-nums}',
    '.src .tn{font-variant-numeric:tabular-nums}',
    '.sc{display:inline-block;padding:2px 8px;border-radius:10px;background:#F1F1EC;color:var(--ink2);white-space:nowrap}',
    '.sc-ok{background:#E3F2E9;color:#2F6B4E}',
    '.sc-e{background:#FBF4DA;color:#6F5A1E}',
    '.sc-x{background:#F9E6E8;color:#8E4552}',
    '.ck-h{margin-top:16px;font-size:13px;color:var(--ink)}',
    '.ck{display:flex;gap:8px;margin-top:6px;font-size:12px;line-height:17px;color:var(--ink2)}',
    '.ck-i{flex:none;width:16px;height:16px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:10px}',
    '.ck-i.ok{background:#E3F2E9;color:#2F6B4E}',
    '.ck-i.x{background:#F9E6E8;color:#8E4552}',
    '.rf{position:absolute;left:24px;right:24px;bottom:20px;font-size:12px;color:var(--muted)}',
    '.cover .cv-l{position:absolute;left:96px;top:200px;width:720px}',
    '.cv-k{font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2)}',
    '.cv-co{margin-top:24px;font-size:64px;line-height:72px;font-weight:300;letter-spacing:-.02em}',
    '.cv-t{margin-top:8px;font-size:32px;line-height:40px;font-weight:300;color:var(--ink2)}',
    '.cv-p{margin-top:56px;display:inline-flex;flex-direction:column;gap:4px;background:#FBEFC3;border-radius:16px;padding:16px 24px}',
    '.cv-pl{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6F5A1E}',
    '.cv-pv{font-size:28px;line-height:36px;font-weight:300}',
    '.cv-m{margin-top:32px;font-size:16px;color:var(--ink2)}',
    '.cv-h{position:absolute;right:72px;top:96px;width:680px;height:680px}',
    '.sk{background:linear-gradient(90deg,#EFEFEA 0%,#F7F7F3 45%,#EFEFEA 90%);background-size:200% 100%;animation:mrpsk 1.6s ease-in-out infinite;border-radius:6px}',
    '.sk-chart{display:flex;align-items:flex-end;gap:16px;padding:24px 8px 8px}',
    '.sk-chart .sk{flex:1;border-radius:6px 6px 0 0}',
    '@keyframes mrpsk{0%{background-position:100% 0}100%{background-position:-100% 0}}',
    '.state{height:calc(100% - 48px);min-height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;padding:24px}',
    '.state-ic{width:40px;height:40px;border-radius:20px;background:#F1F1EC;display:flex;align-items:center;justify-content:center;color:var(--ink2);font-size:18px}',
    '.state-error .state-ic{background:#F9E6E8;color:#8E4552}',
    '.state-t{font-size:15px;color:var(--ink)}',
    '.state-m{font-size:13px;color:var(--ink2);max-width:420px}',
    '.dim{opacity:.45;transition:opacity 200ms ease-in-out}',
    '.upd{position:absolute;right:24px;top:24px;font-size:12px;color:var(--ink2);background:#F1F1EC;border-radius:10px;padding:2px 10px}',
    '.nb{position:absolute;left:0;right:0;bottom:0;height:56px;display:flex;align-items:center;justify-content:center;gap:16px;z-index:5}',
    '.nb .nav{width:36px;height:36px;border-radius:18px;border:1px solid var(--hair);background:#fff;cursor:pointer;font-size:18px;line-height:1;color:var(--ink2)}',
    '.nb .nav:hover{color:var(--ink);background:#F6F6F2}',
    '.nb .nav:disabled{opacity:.35;cursor:default}',
    '.dots{display:flex;gap:8px}',
    '.dots button{width:8px;height:8px;border-radius:4px;border:0;padding:0;background:#D6D8DC;cursor:pointer;transition:width 200ms ease-in-out,background 200ms ease-in-out}',
    '.dots button.on{width:24px;background:#73A8E8}',
    '.nb-n{position:absolute;right:24px;font-size:12px;color:var(--muted)}',
    '.nb-h{position:absolute;left:24px;font-size:12px;color:var(--muted)}',
    '.menu{position:absolute;left:24px;top:60px;width:320px;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(46,52,64,.12);padding:8px;z-index:7;display:none}',
    '.menu.on{display:block}',
    '.menu button{display:flex;width:100%;align-items:center;gap:12px;border:0;background:transparent;text-align:left;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:14px}',
    '.menu button:hover{background:#F6F6F2}',
    '.menu button.on{background:#EEF4FC}',
    '.menu .mn{width:20px;color:var(--muted);font-variant-numeric:tabular-nums}',
    '.mrp-tip{position:fixed;z-index:2147483000;pointer-events:none;background:#fff;color:#2E3440;border-radius:10px;box-shadow:0 8px 28px rgba(46,52,64,.14);padding:10px 12px;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-size:13px;min-width:180px;max-width:320px;opacity:0;transition:opacity 150ms ease-in}',
    '.mrp-tip.on{opacity:1}',
    '.mrp-tip .tt{color:#7B8392;font-size:12px;margin-bottom:6px}',
    '.mrp-tip .tr{display:flex;align-items:center;gap:8px;margin-top:4px}',
    '.mrp-tip .tk{width:12px;height:0;border-top:2px solid #C9CDD4;flex:none}',
    '.mrp-tip .tl{color:#7B8392;flex:1}',
    '.mrp-tip .tv{font-variant-numeric:tabular-nums;font-weight:500}',
    '.mrp-tip .tn{margin-top:6px;color:#A7ADB8;font-size:12px}'
  ].join('\n');

  // SECTION: chrome
  var styleEl = document.getElementById('mrp-styles') || document.createElement('style');
  styleEl.id = 'mrp-styles';
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);
  root.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;overflow:hidden;background:#FAFAF8;';
  root.innerHTML = "<div class='mrp'>" +
    "<div class='tb'><button class='ib' data-act='menu' aria-label='Slide index'>☰ Slides</button><div class='tb-title'><b>" + esc(CONFIG.deckName) + '</b> · ' + esc(CONFIG.company) + '</div>' +
    "<div class='tb-ctl'><label class='tb-lab'>Reporting period <select class='sel-month' aria-label='Reporting period'></select></label>" +
    "<span class='tb-lab tb-lab-t'>Compare with</span><div class='seg' role='group' aria-label='Comparison'><button data-comp='budget'>Budget</button>" +
    "<span title='Prior forecasts are held as Pigment scenarios, which Frames cannot read.'><button data-comp='pf' disabled>Prior forecast</button></span><button data-comp='py'>Prior year</button></div>" +
    "<button class='ib' data-act='present' title='Presenter mode (P)'>Present</button></div></div>" +
    "<div class='banner' role='status'></div>" +
    "<div class='stage-wrap'><div class='stage'></div></div>" +
    "<div class='nb'><span class='nb-h'>← → to navigate · P to present</span><button class='nav' data-act='prev' aria-label='Previous slide'>‹</button><div class='dots'></div><button class='nav' data-act='next' aria-label='Next slide'>›</button></div>" +
    "<div class='menu' role='menu'></div></div>";
  var el = {
    app: root.querySelector('.mrp'), stage: root.querySelector('.stage'), wrap: root.querySelector('.stage-wrap'), sel: root.querySelector('.sel-month'),
    seg: root.querySelector('.seg'), banner: root.querySelector('.banner'), dots: root.querySelector('.dots'), menu: root.querySelector('.menu')
  };
  var tipEl = document.createElement('div');
  tipEl.className = 'mrp-tip';
  document.body.appendChild(tipEl);

  // SECTION: render
  var lastSelHtml = '';
  function scheduleRender() {
    if (timers.render) return;
    timers.render = setTimeout(function () { timers.render = null; render(); }, 16);
  }
  function render() {
    hideTip();
    TIPS = [];
    var M;
    try { M = buildModel(); } catch (e) { M = { ready: false }; reportInternal(e); }
    var html = '';
    RENDERERS.forEach(function (fn, i) {
      try { html += fn(M); } catch (e) { reportInternal(e); html += shell(i, SLIDES[i], 'This slide could not be drawn.', card(72, 196, 1456, 624, stateBox('error', 'Rendering error', String(e && e.message || e))), '', M); }
    });
    el.stage.innerHTML = html;
    setActive(false);
    renderControls(M);
    renderBanner();
  }
  function reportInternal(e) { if (window.console && console.error) console.error('[Management Reporting Pack]', e); }
  function renderControls(M) {
    var keys = M.ready ? M.months : [];
    var h = keys.map(function (k, i) { return { k: k, closed: M.closed[i] }; });
    var act = h.filter(function (x) { return x.closed; }), fc = h.filter(function (x) { return !x.closed; });
    var opt = function (x) { return "<option value='" + x.k + "'" + (x.k === state.monthKey ? ' selected' : '') + '>' + esc(monthLong(x.k)) + '</option>'; };
    var sh = !keys.length ? "<option>Loading…</option>" : (act.length ? "<optgroup label='Actuals'>" + act.map(opt).join('') + '</optgroup>' : '') + (fc.length ? "<optgroup label='Forecast'>" + fc.map(opt).join('') + '</optgroup>' : '');
    if (sh !== lastSelHtml) { el.sel.innerHTML = sh; lastSelHtml = sh; }
    el.sel.disabled = !keys.length;
    Array.prototype.forEach.call(el.seg.querySelectorAll('button'), function (b) { b.classList.toggle('on', b.getAttribute('data-comp') === state.comp); });
    el.dots.innerHTML = SLIDES.map(function (t, i) { return "<button data-go='" + i + "' class='" + (i === state.slide ? 'on' : '') + "' aria-label='" + esc((i + 1) + '. ' + t) + "' title='" + esc((i + 1) + '. ' + t) + "'></button>"; }).join('');
    el.menu.innerHTML = SLIDES.map(function (t, i) { return "<button data-go='" + i + "' class='" + (i === state.slide ? 'on' : '') + "'><span class='mn'>" + (i + 1) + '</span>' + esc(t) + '</button>'; }).join('');
    el.menu.classList.toggle('on', state.menuOpen);
    root.querySelector("[data-act='prev']").disabled = state.slide === 0;
    root.querySelector("[data-act='next']").disabled = state.slide === SLIDES.length - 1;
  }
  function renderBanner() {
    var errs = VIEW_KEYS.filter(function (k) { return store[k].status === 'error'; });
    var msgs = [];
    if (!SDK) msgs.push('PigmentSDK is not available: open this Frame inside Pigment to load data.');
    if (errs.length) msgs.push('Could not load ' + errs.map(function (k) { return '“' + VIEWS[k].name + '”'; }).join(', ') + '. Affected panels show details; the rest of the deck is unaffected.');
    LIST_KEYS.forEach(function (k) { if (lists[k].partial) msgs.push('The ' + k + ' list was truncated by Pigment; some selector items may be missing.'); });
    if (VIEW_KEYS.some(function (k) { return store[k].truncated; })) msgs.push('A View returned more than 1,000 rows; only the first 1,000 are shown.');
    var show = msgs.length && !state.bannerDismissed;
    el.banner.classList.toggle('on', !!show);
    if (el.app.classList.contains('has-banner') !== !!show) { el.app.classList.toggle('has-banner', !!show); layout(); }
    el.banner.innerHTML = show ? '<span>' + esc(msgs.join(' ')) + "</span><button class='bx' data-act='dismiss' aria-label='Dismiss'>×</button>" : '';
  }
  function setActive(animate) {
    var nodes = el.stage.querySelectorAll('.slide');
    Array.prototype.forEach.call(nodes, function (n) {
      var on = +n.getAttribute('data-i') === state.slide;
      if (!animate) n.style.transition = 'none';
      n.classList.toggle('on', on);
      if (!animate) { void n.offsetWidth; n.style.transition = ''; }
    });
  }
  function go(i) {
    i = clamp(i, 0, SLIDES.length - 1);
    if (i === state.slide) return;
    state.slide = i;
    state.menuOpen = false;
    hideTip();
    setActive(true);
    renderControls(lastModelStub());
  }
  function lastModelStub() {
    if (!state.monthKey) return { ready: false };
    var y = mkYear(state.monthKey), ms = yearMonths(y);
    return { ready: true, months: ms, closed: ms.map(isClosed) };
  }
  function layout() {
    var w = el.wrap.clientWidth || window.innerWidth, h = el.wrap.clientHeight || window.innerHeight;
    var pad = state.presenter ? 0 : 16;
    var s = Math.max(0.2, Math.min((w - pad * 2) / CONFIG.stageW, (h - pad * 2) / CONFIG.stageH));
    var x = (w - CONFIG.stageW * s) / 2, y = (h - CONFIG.stageH * s) / 2;
    el.stage.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
  }

  // SECTION: tooltips
  var tipIdx = -1;
  function showTip(i, ev) {
    var o = TIPS[i];
    if (!o) return;
    if (i !== tipIdx) {
      tipIdx = i;
      tipEl.textContent = '';
      if (o.title) { var t = document.createElement('div'); t.className = 'tt'; t.textContent = o.title; tipEl.appendChild(t); }
      (o.rows || []).forEach(function (r) {
        var row = document.createElement('div'); row.className = 'tr';
        var k = document.createElement('span'); k.className = 'tk'; if (r[2]) k.style.borderTopColor = r[2]; row.appendChild(k);
        var l = document.createElement('span'); l.className = 'tl'; l.textContent = r[0]; row.appendChild(l);
        var v = document.createElement('span'); v.className = 'tv'; v.textContent = r[1]; row.appendChild(v);
        tipEl.appendChild(row);
      });
      if (o.note) { var n = document.createElement('div'); n.className = 'tn'; n.textContent = o.note; tipEl.appendChild(n); }
    }
    var W = window.innerWidth, H = window.innerHeight, r = tipEl.getBoundingClientRect();
    var x = ev.clientX + 16, y = ev.clientY + 16;
    if (x + r.width > W - 8) x = ev.clientX - r.width - 16;
    if (y + r.height > H - 8) y = ev.clientY - r.height - 16;
    tipEl.style.left = Math.max(8, x) + 'px';
    tipEl.style.top = Math.max(8, y) + 'px';
    tipEl.classList.add('on');
  }
  function hideTip() { tipIdx = -1; tipEl.classList.remove('on'); }

  // SECTION: events
  function onPointerMove(ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest('[data-tip]') : null;
    if (t && el.stage.contains(t)) showTip(+t.getAttribute('data-tip'), ev); else hideTip();
  }
  function onPointerLeave() { hideTip(); }
  function onClick(ev) {
    var t = ev.target.closest ? ev.target.closest('[data-act],[data-go],[data-comp]') : null;
    if (!t) { if (state.menuOpen && !ev.target.closest('.menu')) { state.menuOpen = false; el.menu.classList.remove('on'); } return; }
    if (t.hasAttribute('data-go')) { go(+t.getAttribute('data-go')); return; }
    if (t.hasAttribute('data-comp')) { if (!t.disabled) setComparison(t.getAttribute('data-comp')); return; }
    var a = t.getAttribute('data-act');
    if (a === 'prev') go(state.slide - 1);
    else if (a === 'next') go(state.slide + 1);
    else if (a === 'menu') { state.menuOpen = !state.menuOpen; el.menu.classList.toggle('on', state.menuOpen); }
    else if (a === 'present') togglePresenter();
    else if (a === 'dismiss') { state.bannerDismissed = true; renderBanner(); }
  }
  function onSelect() { var k = +el.sel.value; if (k) setPeriod(k, false); }
  function togglePresenter() { state.presenter = !state.presenter; el.app.classList.toggle('present', state.presenter); layout(); }
  function onKey(ev) {
    if (ev.target && /select|input|textarea/i.test(ev.target.tagName)) return;
    var k = ev.key;
    if (ev.target && /button/i.test(ev.target.tagName) && (k === ' ' || k === 'Enter')) return;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { go(state.slide + 1); ev.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { go(state.slide - 1); ev.preventDefault(); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(SLIDES.length - 1);
    else if (k === 'p' || k === 'P') togglePresenter();
    else if (k === 'Escape') { if (state.menuOpen) { state.menuOpen = false; el.menu.classList.remove('on'); } else if (state.presenter) togglePresenter(); }
  }
  function onResize() {
    if (timers.resize) clearTimeout(timers.resize);
    timers.resize = setTimeout(function () { timers.resize = null; layout(); }, 120);
  }
  root.addEventListener('click', onClick);
  el.sel.addEventListener('change', onSelect);
  el.stage.addEventListener('pointermove', onPointerMove);
  el.stage.addEventListener('pointerleave', onPointerLeave);
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);
  var ro = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
  if (ro) ro.observe(document.documentElement);

  // SECTION: init
  layout();
  render();
  LIST_KEYS.forEach(subscribeList);
  STATIC_VIEWS.forEach(applyStatic);
  // If no source names a closed month, fall back to the latest month in the Month list.
  timers.period = setTimeout(function () {
    timers.period = null;
    if (state.monthKey) return;
    var n = (listNames('month') || []).map(parseMonth).filter(Boolean);
    if (n.length) setPeriod(Math.max.apply(null, n), true);
  }, 8000);

  // SECTION: cleanup
  root.__cleanup = function () {
    Object.keys(subs).forEach(function (k) { try { subs[k].unsubscribe(); } catch (e) { /* already closed */ } });
    Object.keys(listSubs).forEach(function (k) { try { listSubs[k].unsubscribe(); } catch (e) { /* already closed */ } });
    VIEW_KEYS.forEach(function (k) { if (store[k].emptyTimer) clearTimeout(store[k].emptyTimer); store[k].parsed = null; });
    Object.keys(timers).forEach(function (k) { if (timers[k]) clearTimeout(timers[k]); timers[k] = null; });
    root.removeEventListener('click', onClick);
    el.sel.removeEventListener('change', onSelect);
    el.stage.removeEventListener('pointermove', onPointerMove);
    el.stage.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    if (ro) ro.disconnect();
    if (tipEl.parentNode) tipEl.parentNode.removeChild(tipEl);
    if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    TIPS = [];
    root.innerHTML = '';
    root.__cleanup = null;
  };
})();
