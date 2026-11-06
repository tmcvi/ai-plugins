/*
 * Airport Profitability Map — Pigment Frame body.
 *
 * Pure JavaScript, no network, no libraries: paste as the Frame body in Pigment.
 * Reads everything through window.PigmentSDK using these binding aliases:
 *   units (List, read+write)  features (List, read)  unitKpis (View)
 *   unitTrend (View)          gatePax (View)         revenueShare (Metric, write)
 * Page selector aliases: months (Month list), units (Unit list).
 */
(function () {
  'use strict';
  var root = document.getElementById('app');
  if (root.__cleanup) root.__cleanup();
  var SDK = window.PigmentSDK;
  if (!SDK) {
    root.innerHTML = '<p style=\'font:14px system-ui;padding:24px\'>PigmentSDK is not available. Open this Frame inside Pigment.</p>';
    return;
  }

  // ------------------------------------------------------------- constants
  var ALIAS = { units: 'units', features: 'features', kpis: 'unitKpis', trend: 'unitTrend', gates: 'gatePax', rate: 'revenueShare', months: 'months' };
  var COL = { sales: 'Tenant Sales', conc: 'Concession Income', other: 'Other Income', direct: 'Direct Cost', alloc: 'Allocated Cost', profit: 'Airport Profit', budget: 'Budget Profit', tx: 'Transactions', pax: 'Passengers Exposed', bpax: 'Budget Passengers Exposed', rate: 'Revenue Share' };
  var MONTHS = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026'];
  var LAST_ACTUAL = 9;
  var AS_OF = new Date('2026-10-31T00:00:00Z');
  var PERIODS = [{ key: 'ytd', label: 'YTD Oct 2026', months: MONTHS.slice(0, 10) }, { key: 'fy', label: 'FY 2026 · actual + forecast', months: MONTHS.slice() }];
  MONTHS.forEach(function (m, i) { PERIODS.push({ key: 'm' + i, label: m + (i > LAST_ACTUAL ? ' · forecast' : ''), months: [m] }); });
  var WORLD = { x: 0, y: 0, w: 1600, h: 1000 };
  var SCOPES = {
    all: { label: 'Airport', box: WORLD, test: function () { return true; } },
    T1: { label: 'Terminal 1', box: { x: 50, y: 70, w: 720, h: 830 }, test: function (u) { return u.terminal === 'T1'; } },
    T2: { label: 'Terminal 2', box: { x: 850, y: 60, w: 720, h: 840 }, test: function (u) { return u.terminal === 'T2'; } },
    Link: { label: 'Airside Link', box: { x: 700, y: 560, w: 220, h: 160 }, test: function (u) { return u.terminal === 'Link'; } },
    Ground: { label: 'Car parks & ground', box: { x: 60, y: 860, w: 1480, h: 140 }, test: function (u) { return u.terminal === 'Ground'; } }
  };
  var CAT_GROUP = {
    'Duty Free': 'Duty Free', 'Café & Bakery': 'Food & Beverage', 'Bar & Restaurant': 'Food & Beverage', 'Quick Service': 'Food & Beverage',
    'Fashion & Luxury': 'Specialist Retail', 'Health & Beauty': 'Specialist Retail', 'Tech & Electronics': 'Specialist Retail',
    'News & Convenience': 'Convenience', 'Lounge': 'Lounges', 'Parking': 'Parking & Mobility', 'Car Rental': 'Parking & Mobility',
    'Currency Exchange': 'Services', 'Advertising': 'Advertising'
  };
  var GROUP_COLORS = [['Duty Free', '#3987e5'], ['Food & Beverage', '#d95926'], ['Specialist Retail', '#199e70'], ['Convenience', '#c98500'], ['Lounges', '#d55181'], ['Parking & Mobility', '#008300'], ['Services', '#9085e9'], ['Advertising', '#e66767']];
  var RETAIL = { 'Duty Free': 1, 'Food & Beverage': 1, 'Specialist Retail': 1, 'Convenience': 1, 'Services': 1 };
  var RETENANT = ['Café & Bakery', 'Bar & Restaurant', 'Quick Service', 'News & Convenience', 'Health & Beauty', 'Fashion & Luxury', 'Tech & Electronics', 'Duty Free', 'Currency Exchange'];
  var DEFAULT_RATE = { 'Duty Free': 0.36, 'Fashion & Luxury': 0.16, 'Health & Beauty': 0.17, 'Tech & Electronics': 0.12, 'News & Convenience': 0.20, 'Café & Bakery': 0.15, 'Bar & Restaurant': 0.15, 'Quick Service': 0.13, 'Currency Exchange': 0.30 };

  var NEUTRAL = '#3a414b';
  var DIV_POS = [NEUTRAL, '#1f4f8f', '#2a78d6', '#5598e7', '#9ec5f4'];
  var DIV_NEG = [NEUTRAL, '#7a3434', '#c24141', '#e66767', '#f4a6a6'];
  var SEQ = ['#1f2a36', '#184f95', '#2a78d6', '#6da7ec', '#cde2fb'];
  var STATUS = { critical: '#d03b3b', serious: '#ec835a', warning: '#fab219', ok: NEUTRAL };

  var LENSES = [
    { key: 'profit', label: 'Profit', hint: 'Airport profit after space costs' },
    { key: 'sqm', label: 'Profit / m²', hint: 'Profit per square metre of space' },
    { key: 'spp', label: 'Spend / pax', hint: 'Tenant sales per passenger walking past' },
    { key: 'var', label: 'vs Budget', hint: 'Profit variance to budget' },
    { key: 'lease', label: 'Lease expiry', hint: 'Months until the lease ends' },
    { key: 'cat', label: 'Category', hint: 'What trades in each unit' }
  ];

  // ----------------------------------------------------------------- state
  var S = {
    units: [], byCode: {}, features: [], kpi: {}, gatePax: {}, gateBudget: {}, trend: null,
    lens: 'profit', period: 'ytd', scope: 'all', zone: null, selected: null, flow: false,
    view: { x: 0, y: 0, w: 1600, h: 1000 }, stale: true, edits: [], baseline: null, busy: false,
    playing: false, ready: { units: false, features: false, kpis: false }, error: null, toast: null
  };
  var subs = [];
  var trendCode = null;
  var timers = [];
  var rafId = 0;
  var tooltip = null;
  var svg = null;
  var unitEls = {};
  var built = false;

  // ------------------------------------------------------------ formatting
  function money(v, opts) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    var a = Math.abs(v), s = v < 0 ? '−€' : (opts && opts.sign && v > 0 ? '+€' : '€');
    if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
    if (a >= 1e3) return s + (a / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k';
    return s + (a === 0 ? '0' : a.toFixed(a < 10 ? 2 : 0));
  }
  function num(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    var a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k';
    return Math.round(v).toString();
  }
  function pct(v, sign) {
    if (v === null || v === undefined || isNaN(v) || !isFinite(v)) return '—';
    var s = (v * 100).toFixed(Math.abs(v) < 0.1 ? 1 : 0) + '%';
    return sign && v > 0 ? '+' + s : s.replace('-', '−');
  }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>'"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]; }); }
  function prop(item, name) {
    if (!item) return undefined;
    if (item[name] !== undefined) return item[name];
    if (item.properties && item.properties[name] !== undefined) return item.properties[name];
    if (item.values && item.values[name] !== undefined) return item.values[name];
    return undefined;
  }
  function lastLabel(path) {
    if (!Array.isArray(path)) return typeof path === 'string' ? path : null;
    for (var i = path.length - 1; i >= 0; i--) if (typeof path[i] === 'string') return path[i];
    return null;
  }
  function shape(s) { var p = String(s || '').split(',').map(Number); return { x: p[0] || 0, y: p[1] || 0, w: p[2] || 0, h: p[3] || 0 }; }
  function monthsUntil(iso) {
    if (!iso) return null;
    var d = new Date(iso + 'T00:00:00Z');
    if (isNaN(d)) return null;
    return (d.getUTCFullYear() - AS_OF.getUTCFullYear()) * 12 + (d.getUTCMonth() - AS_OF.getUTCMonth());
  }
  function fmtDate(iso) {
    var d = new Date(iso + 'T00:00:00Z');
    return isNaN(d) ? '—' : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }

  // ---------------------------------------------------------------- colour
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function ramp(stops, t) {
    t = Math.max(0, Math.min(1, t));
    var f = t * (stops.length - 1), i = Math.floor(f), k = f - i;
    if (i >= stops.length - 1) return stops[stops.length - 1];
    var a = hexRgb(stops[i]), b = hexRgb(stops[i + 1]);
    return 'rgb(' + a.map(function (v, j) { return Math.round(v + (b[j] - v) * k); }).join(',') + ')';
  }
  function symlog(v, k) { return (v < 0 ? -1 : 1) * Math.log10(1 + Math.abs(v) / k); }
  function lum(c) {
    var m = c.match(/\d+/g), rgb = m && m.length >= 3 ? m.slice(0, 3).map(Number) : hexRgb(c);
    return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  }

  // -------------------------------------------------------------- derived
  function unitData(code) { return S.kpi[code] || null; }
  function periodObj() { return PERIODS.filter(function (p) { return p.key === S.period; })[0]; }
  function inScope(u) {
    if (!SCOPES[S.scope].test(u)) return false;
    if (S.zone && u.zone !== S.zone) return false;
    return true;
  }
  function scopeLabel() { return S.zone || SCOPES[S.scope].label; }
  function onMag(u, d) {
    if (!d || u.model !== 'Concession' || !u.mag) return false;
    var n = periodObj().months.length;
    return d.rate !== null && d.sales * d.rate < u.mag * n / 12 * 0.999;
  }
  function lensValue(u, lens) {
    var d = unitData(u.code);
    if (lens === 'lease') return monthsUntil(u.lease);
    if (lens === 'cat') return CAT_GROUP[u.category] || 'Services';
    if (!d) return null;
    if (lens === 'profit') return d.profit;
    if (lens === 'sqm') return u.area ? d.profit / u.area : null;
    if (lens === 'spp') return d.pax ? d.sales / d.pax : null;
    if (lens === 'var') return d.budget ? (d.profit - d.budget) / Math.abs(d.budget) : null;
    return null;
  }
  function domain(lens) {
    var vals = S.units.map(function (u) { return lensValue(u, lens); }).filter(function (v) { return v !== null && isFinite(v); });
    if (!vals.length) return { min: 0, max: 1 };
    var abs = vals.map(Math.abs).sort(function (a, b) { return a - b; });
    var sorted = vals.slice().sort(function (a, b) { return a - b; });
    return { maxAbs: abs[abs.length - 1], min: sorted[0], max: sorted[sorted.length - 1] };
  }
  var LENS_K = { profit: 8000, sqm: 15 };
  function colorFor(u, lens, dom) {
    var v = lensValue(u, lens);
    if (lens === 'cat') { for (var i = 0; i < GROUP_COLORS.length; i++) if (GROUP_COLORS[i][0] === v) return GROUP_COLORS[i][1]; return NEUTRAL; }
    if (lens === 'lease') {
      if (v === null) return '#2a313b';
      return v <= 6 ? STATUS.critical : v <= 12 ? STATUS.serious : v <= 24 ? STATUS.warning : STATUS.ok;
    }
    if (v === null || !isFinite(v)) return '#2a313b';
    if (lens === 'profit' || lens === 'sqm') {
      var k = LENS_K[lens], t = symlog(v, k) / symlog(dom.maxAbs || 1, k);
      return t >= 0 ? ramp(DIV_POS, t) : ramp(DIV_NEG, -t);
    }
    if (lens === 'var') { var tv = Math.max(-1, Math.min(1, v / 0.4)); return tv >= 0 ? ramp(DIV_POS, tv) : ramp(DIV_NEG, -tv); }
    if (lens === 'spp') {
      var lo = Math.log10(Math.max(dom.min, 0.01)), hi = Math.log10(Math.max(dom.max, 0.02));
      return ramp(SEQ, (Math.log10(Math.max(v, 0.01)) - lo) / (hi - lo || 1));
    }
    return NEUTRAL;
  }
  function fmtLens(u, lens) {
    var v = lensValue(u, lens);
    if (lens === 'profit') return money(v);
    if (lens === 'sqm') return v === null ? '—' : money(v) + '/m²';
    if (lens === 'spp') return v === null ? '—' : money(v);
    if (lens === 'var') return pct(v, true);
    if (lens === 'lease') return v === null ? 'Airport-operated' : v <= 0 ? 'Expired' : v + ' months';
    if (lens === 'cat') return u.category;
    return '';
  }
  function totals(filter) {
    var t = { profit: 0, budget: 0, sales: 0, retail: 0, conc: 0, area: 0, areaProfit: 0, n: 0, loss: 0 };
    var groundOnly = S.scope === 'Ground';
    S.units.forEach(function (u) {
      if (!filter(u)) return;
      var d = unitData(u.code); if (!d) return;
      t.profit += d.profit; t.budget += d.budget; t.sales += d.sales; t.conc += d.conc + d.other; t.n++;
      if (RETAIL[CAT_GROUP[u.category]]) t.retail += d.sales;
      if (groundOnly || u.terminal !== 'Ground') { t.area += u.area; t.areaProfit += d.profit; }
      if (d.profit < 0) t.loss++;
    });
    return t;
  }
  function departingPax() {
    var s = 0, b = 0;
    var t = S.scope, z = S.zone;
    S.features.forEach(function (f) {
      if (f.type !== 'gate') return;
      if (t !== 'all' && t !== 'Ground' && t !== 'Link' && f.terminal !== t) return;
      if (z && z.indexOf('Pier ') === 0 && f.pier !== z.slice(5)) return;
      s += S.gatePax[f.label] || 0; b += S.gateBudget[f.label] || 0;
    });
    return { actual: s, budget: b };
  }

  // ------------------------------------------------------------------ CSS
  var css = [
    '.apm{--bg:#0b0f14;--surface:#121821;--raise:#18202b;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.14);--ink:#eef1f4;--ink2:#a9b3bf;--muted:#7d8794;--sign:#ffc627;--signInk:#14110a;--good:#4fb3ff;--bad:#f06b6b;',
    'position:fixed;inset:0;display:flex;flex-direction:column;background:var(--bg);color:var(--ink);font:13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color-scheme:dark;overflow:hidden}',
    '.apm *{box-sizing:border-box}',
    '.apm [hidden]{display:none!important}',
    '.apm button,.apm select,.apm input{font:inherit;color:inherit}',
    '.apm :focus-visible{outline:2px solid var(--sign);outline-offset:2px}',
    '.apm-top{display:flex;align-items:center;gap:14px;padding:10px max(16px,env(safe-area-inset-right,0px)) 10px max(16px,env(safe-area-inset-left,0px));border-bottom:1px solid var(--line);background:var(--surface);flex-wrap:wrap}',
    '.apm-brand{display:flex;align-items:center;gap:10px;min-width:0}',
    '.apm-mark{width:30px;height:30px;border-radius:6px;background:var(--sign);color:var(--signInk);display:grid;place-items:center;font-weight:800;font-size:15px;flex:none}',
    '.apm-title{font-weight:700;font-size:15px;letter-spacing:.01em;white-space:nowrap}',
    '.apm-sub{color:var(--muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}',
    '.apm-tabs{display:flex;gap:2px;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:2px;overflow-x:auto;max-width:100%}',
    '.apm-tab{background:none;border:0;padding:6px 10px;border-radius:6px;cursor:pointer;color:var(--ink2);white-space:nowrap}',
    '.apm-tab:hover{color:var(--ink);background:var(--raise)}',
    '.apm-tab[aria-pressed=true]{background:var(--sign);color:var(--signInk);font-weight:700}',
    '.apm-spacer{flex:1}',
    '.apm-period{display:flex;align-items:center;gap:6px}',
    '.apm-select{background:var(--raise);border:1px solid var(--line2);border-radius:7px;padding:6px 8px;cursor:pointer}',
    '.apm-btn{background:var(--raise);border:1px solid var(--line2);border-radius:7px;padding:6px 10px;cursor:pointer;white-space:nowrap}',
    '.apm-btn:hover{border-color:var(--ink2)}',
    '.apm-btn.primary{background:var(--sign);color:var(--signInk);border-color:var(--sign);font-weight:700}',
    '.apm-btn:disabled{opacity:.5;cursor:default}',
    '.apm-search{position:relative}',
    '.apm-search input{background:var(--raise);border:1px solid var(--line2);border-radius:7px;padding:6px 10px;width:200px}',
    '.apm-results{position:absolute;right:0;top:calc(100% + 4px);width:280px;background:var(--raise);border:1px solid var(--line2);border-radius:8px;box-shadow:0 12px 32px rgba(0,0,0,.45);z-index:20;overflow:hidden}',
    '.apm-results button{display:flex;justify-content:space-between;gap:8px;width:100%;text-align:left;background:none;border:0;padding:8px 10px;cursor:pointer}',
    '.apm-results button:hover{background:var(--surface)}',
    '.apm-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-bottom:1px solid var(--line);background:var(--surface);overflow-x:auto}',
    '.apm-kpi{padding:10px 16px;border-right:1px solid var(--line);min-width:150px}',
    '.apm-kpi:last-child{border-right:0}',
    '.apm-kpi-l{color:var(--muted);font-size:11px;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}',
    '.apm-kpi-v{font-size:22px;font-weight:700;letter-spacing:-.01em;margin-top:2px;white-space:nowrap}',
    '.apm-kpi-d{font-size:12px;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.apm-kpi-l{overflow:hidden;text-overflow:ellipsis}',
    '.up{color:var(--good)}.dn{color:var(--bad)}',
    '.apm-main{flex:1;display:flex;min-height:0}',
    '.apm-map{position:relative;flex:1;min-width:0;overflow:hidden;background:radial-gradient(ellipse at 50% 30%,#121a24 0%,var(--bg) 70%)}',
    '.apm-map svg{display:block;width:100%;height:100%;cursor:grab;touch-action:none;user-select:none}',
    '.apm-map svg.drag{cursor:grabbing}',
    '.apm-float{position:absolute;display:flex;gap:6px;align-items:center;z-index:5}',
    '.apm-lens{top:12px;left:12px;flex-wrap:wrap;max-width:calc(100% - 24px)}',
    '.apm-seg{display:flex;background:rgba(18,24,33,.92);border:1px solid var(--line2);border-radius:8px;padding:2px;backdrop-filter:blur(6px);overflow-x:auto;max-width:100%}',
    '.apm-seg button{background:none;border:0;border-radius:6px;padding:6px 10px;cursor:pointer;color:var(--ink2);white-space:nowrap}',
    '.apm-seg button:hover{color:var(--ink)}',
    '.apm-seg button[aria-pressed=true]{background:var(--ink);color:var(--bg);font-weight:600}',
    '.apm-crumbs{top:56px;left:12px;font-size:12px;color:var(--ink2);background:rgba(18,24,33,.92);border:1px solid var(--line2);border-radius:8px;padding:4px 6px;max-width:calc(100% - 24px);overflow:hidden}',
    '.apm-crumbs button{background:none;border:0;cursor:pointer;color:var(--ink2);padding:2px 4px;border-radius:4px;white-space:nowrap}',
    '.apm-crumbs button:hover{color:var(--ink);background:var(--raise)}',
    '.apm-crumbs b{color:var(--ink);padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.apm-legend{left:12px;bottom:12px;flex-direction:column;align-items:stretch;background:rgba(18,24,33,.92);border:1px solid var(--line2);border-radius:8px;padding:10px 12px;min-width:220px;gap:6px}',
    '.apm-legend-t{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}',
    '.apm-grad{height:10px;border-radius:3px}',
    '.apm-ticks{display:flex;justify-content:space-between;font-size:11px;color:var(--ink2);font-variant-numeric:tabular-nums}',
    '.apm-sw{display:grid;grid-template-columns:repeat(2,auto);gap:4px 14px;font-size:12px;color:var(--ink2)}',
    '.apm-sw span{display:flex;align-items:center;gap:6px;white-space:nowrap}',
    '.apm-sw i{width:10px;height:10px;border-radius:2px;display:inline-block;flex:none}',
    '.apm-zoom{right:12px;bottom:12px;flex-direction:column;gap:4px}',
    '.apm-zoom .apm-btn{width:34px;height:34px;padding:0;display:grid;place-items:center;font-size:16px;background:rgba(18,24,33,.92)}',
    '.apm-tools{top:12px;right:12px;flex-direction:column;align-items:flex-end}',
    '.apm-chip{display:flex;align-items:center;gap:8px;background:rgba(18,24,33,.92);border:1px solid var(--line2);border-radius:8px;padding:6px 10px;font-size:12px;white-space:nowrap}',
    '.apm-chip.scn{border-color:var(--sign)}',
    '.apm-chip .dot{width:8px;height:8px;border-radius:50%;background:var(--sign)}',
    '.apm-chip.busy .dot{animation:apmPulse 0.8s ease-in-out infinite alternate}',
    '@keyframes apmPulse{from{opacity:.25}to{opacity:1}}',
    '.apm-month{position:absolute;right:64px;bottom:14px;font-size:42px;font-weight:800;letter-spacing:.02em;color:var(--sign);opacity:.9;pointer-events:none;z-index:4;text-shadow:0 2px 18px rgba(0,0,0,.6)}',
    '.apm-side{width:380px;flex:none;border-left:1px solid var(--line);background:var(--surface);overflow-y:auto;overscroll-behavior:contain}',
    '.apm-sec{padding:14px 16px;border-bottom:1px solid var(--line)}',
    '.apm-h{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 8px;font-weight:600}',
    '.apm-name{font-size:18px;font-weight:700;margin:0;text-wrap:balance}',
    '.apm-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
    '.apm-pill{font-size:11px;border:1px solid var(--line2);border-radius:999px;padding:2px 8px;color:var(--ink2);white-space:nowrap}',
    '.apm-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--sign);color:var(--signInk);border-color:var(--sign);font-weight:700}',
    '.apm-big{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}',
    '.apm-big b{font-size:30px;letter-spacing:-.02em}',
    '.apm-flag{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:7px;background:var(--raise);margin-top:6px;font-size:12px;color:var(--ink2)}',
    '.apm-flag i{flex:none;width:18px;height:18px;border-radius:4px;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:11px;color:#111}',
    '.apm-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}',
    '.apm-grid div{min-width:0}',
    '.apm-grid small{display:block;color:var(--muted);font-size:11px}',
    '.apm-grid b{font-size:15px;font-variant-numeric:tabular-nums}',
    '.apm-list{display:flex;flex-direction:column;gap:2px}',
    '.apm-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;background:none;border:0;padding:6px 8px;margin:0 -8px;border-radius:6px;cursor:pointer;text-align:left;width:calc(100% + 16px)}',
    '.apm-row:hover{background:var(--raise)}',
    '.apm-row span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.apm-row small{color:var(--muted);margin-left:6px}',
    '.apm-row b{font-variant-numeric:tabular-nums}',
    '.apm-bar{height:4px;border-radius:2px;background:var(--line);grid-column:1/-1;overflow:hidden}',
    '.apm-bar i{display:block;height:100%;border-radius:2px}',
    '.apm-whatif{background:var(--raise);border:1px solid var(--line2);border-radius:9px;padding:12px}',
    '.apm-field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}',
    '.apm-field label{font-size:12px;color:var(--ink2);display:flex;justify-content:space-between}',
    '.apm-field input[type=range]{width:100%;accent-color:#ffc627}',
    '.apm-actions{display:flex;gap:8px;flex-wrap:wrap}',
    '.apm-note{font-size:12px;color:var(--muted);margin:8px 0 0}',
    '.apm-chart svg{display:block;width:100%;height:auto;overflow:visible}',
    '.apm-close{float:right;background:none;border:1px solid var(--line2);border-radius:6px;cursor:pointer;color:var(--ink2);padding:2px 8px}',
    '.apm-tip{position:fixed;z-index:50;pointer-events:none;background:#1d2633;border:1px solid rgba(255,255,255,.16);color:#eef1f4;border-radius:8px;padding:8px 10px;font:12px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);max-width:260px}',
    '.apm-tip b{font-size:13px}',
    '.apm-tip .k{color:#a9b3bf}',
    '.apm-state{position:absolute;inset:0;display:grid;place-items:center;color:var(--ink2);z-index:6;pointer-events:none}',
    '.apm-state div{background:rgba(18,24,33,.95);border:1px solid var(--line2);border-radius:10px;padding:14px 18px;max-width:340px;text-align:center}',
    '.apm-toast{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:8px 14px;border-radius:8px;font-weight:600;z-index:8;white-space:nowrap}',
    /* svg classes */
    '.u{transition:fill .45s ease;cursor:pointer}',
    '.u:hover{stroke:#fff;stroke-width:1.4}',
    '.stale .u{animation:apmPulse .7s ease-in-out infinite alternate}',
    '.dim{opacity:.22}',
    '.ul{fill:#fff;font-size:5.4px;font-weight:600;pointer-events:none;opacity:0;transition:opacity .2s}',
    '.ul.dk{fill:#0b0f14}',
    '.lod1 .ul.big,.lod2 .ul{opacity:1}',
    '.gl{fill:#ffc627;font-size:9px;font-weight:800;letter-spacing:.04em;pointer-events:none}',
    '.zl{fill:rgba(238,241,244,.45);font-size:11px;font-weight:700;letter-spacing:.18em;pointer-events:none}',
    '.zh{fill:transparent;cursor:zoom-in}',
    '.zh:hover{fill:rgba(255,198,39,.05);stroke:rgba(255,198,39,.4);stroke-width:1}',
    '.flow{fill:none;stroke:#ffc627;stroke-linecap:round;stroke-dasharray:2 10;animation:apmFlow 1.1s linear infinite;opacity:.85;pointer-events:none}',
    '@keyframes apmFlow{to{stroke-dashoffset:-24}}',
    '@media (prefers-reduced-motion:reduce){.flow,.stale .u,.apm-chip.busy .dot{animation:none}.u{transition:none}}',
    '@media (max-width:820px){.apm-main{flex-direction:column}.apm-side{width:auto;height:46%;border-left:0;border-top:1px solid var(--line)}.apm-kpis{grid-template-columns:repeat(5,minmax(140px,1fr))}.apm-search input{width:140px}.apm-legend{min-width:0;padding:6px 8px}.apm-legend .apm-note{display:none}.apm-month{font-size:24px}.apm-kpi-v{font-size:18px}.apm-tools{top:auto;bottom:12px;right:56px}}'
  ].join('\n');

  var styleEl = document.createElement('style');
  styleEl.id = 'apm-style';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  root.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;overflow:hidden;';
  root.innerHTML = '';
  var app = document.createElement('div');
  app.className = 'apm';
  root.appendChild(app);

  // --------------------------------------------------------- shell markup
  function shellHtml() {
    var tabs = ['all', 'T1', 'T2', 'Link', 'Ground'].map(function (k) {
      return '<button class=\'apm-tab\' data-act=\'scope\' data-v=\'' + k + '\' aria-pressed=\'false\'>' + esc(SCOPES[k].label) + '</button>';
    }).join('');
    var opts = PERIODS.map(function (p) { return '<option value=\'' + p.key + '\'>' + esc(p.label) + '</option>'; }).join('');
    var lens = LENSES.map(function (l) { return '<button data-act=\'lens\' data-v=\'' + l.key + '\' title=\'' + esc(l.hint) + '\' aria-pressed=\'false\'>' + esc(l.label) + '</button>'; }).join('');
    return '' +
      '<header class=\'apm-top\'>' +
        '<div class=\'apm-brand\'><div class=\'apm-mark\' aria-hidden=\'true\'>✈</div><div><div class=\'apm-title\'>Aurora International</div><div class=\'apm-sub\'>Commercial profitability map</div></div></div>' +
        '<nav class=\'apm-tabs\' aria-label=\'Area\'>' + tabs + '</nav>' +
        '<div class=\'apm-spacer\'></div>' +
        '<div class=\'apm-period\'><label for=\'apm-period\' class=\'apm-sub\'>Period</label><select id=\'apm-period\' class=\'apm-select\' data-act=\'period\'>' + opts + '</select>' +
        '<button class=\'apm-btn\' data-act=\'play\' id=\'apm-play\' title=\'Play Jan to Oct month by month\'>▶ Play 2026</button></div>' +
        '<div class=\'apm-search\'><input id=\'apm-q\' type=\'search\' placeholder=\'Find a unit or tenant\' autocomplete=\'off\' aria-label=\'Find a unit or tenant\'><div class=\'apm-results\' id=\'apm-results\' hidden></div></div>' +
      '</header>' +
      '<section class=\'apm-kpis\' id=\'apm-kpis\' aria-label=\'Headline figures\'></section>' +
      '<div class=\'apm-main\'>' +
        '<div class=\'apm-map\' id=\'apm-map\'>' +
          '<div class=\'apm-float apm-lens\'><div class=\'apm-seg\' role=\'group\' aria-label=\'Colour units by\'>' + lens + '</div></div>' +
          '<div class=\'apm-float apm-crumbs\' id=\'apm-crumbs\'></div>' +
          '<div class=\'apm-float apm-tools\'><button class=\'apm-btn\' data-act=\'flow\' id=\'apm-flowbtn\' aria-pressed=\'false\'>Passenger flow</button><div id=\'apm-scn\'></div></div>' +
          '<div class=\'apm-float apm-legend\' id=\'apm-legend\'></div>' +
          '<div class=\'apm-float apm-zoom\'><button class=\'apm-btn\' data-act=\'zin\' aria-label=\'Zoom in\'>+</button><button class=\'apm-btn\' data-act=\'zout\' aria-label=\'Zoom out\'>−</button><button class=\'apm-btn\' data-act=\'zreset\' aria-label=\'Show whole airport\'>⤢</button></div>' +
          '<div class=\'apm-month\' id=\'apm-month\' hidden></div>' +
          '<div class=\'apm-state\' id=\'apm-state\'><div>Loading the airport model…</div></div>' +
        '</div>' +
        '<aside class=\'apm-side\' id=\'apm-side\' aria-live=\'polite\'></aside>' +
      '</div>';
  }
  app.innerHTML = shellHtml();
  var $ = function (id) { return document.getElementById(id); };

  // ------------------------------------------------------------ map build
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var PLANE = 'M0,-30 C3,-30 4,-24 4,-18 L4,-6 L28,6 L28,11 L4,4 L4,18 L11,24 L11,28 L0,25 L-11,28 L-11,24 L-4,18 L-4,4 L-28,11 L-28,6 L-4,-6 L-4,-18 C-4,-24 -3,-30 0,-30 Z';

  function buildMap() {
    var host = $('apm-map');
    if (svg) svg.remove();
    svg = el('svg', { viewBox: '0 0 1600 1000', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Airport floor plan coloured by the selected measure' });
    host.insertBefore(svg, host.firstChild);
    var defs = el('defs', {}, svg);
    var pat = el('pattern', { id: 'apm-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('rect', { width: 6, height: 6, fill: '#1a222c' }, pat);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: '#2c3643', 'stroke-width': 2 }, pat);
    var glow = el('filter', { id: 'apm-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: 3, result: 'b' }, glow);
    var mg = el('feMerge', {}, glow); el('feMergeNode', { in: 'b' }, mg); el('feMergeNode', { in: 'SourceGraphic' }, mg);

    var gBg = el('g', {}, svg), gZone = el('g', {}, svg), gUnits = el('g', { id: 'apm-units' }, svg);
    var gFlow = el('g', { id: 'apm-flow' }, svg), gGates = el('g', {}, svg), gLabels = el('g', {}, svg), gSel = el('g', {}, svg);
    var order = { apron: 0, runway: 1, taxiway: 1, road: 1, terminal: 2, zone: 3, pier: 3, security: 4, checkin: 4, holdroom: 4, stand: 5, gate: 6 };
    var feats = S.features.slice().sort(function (a, b) { return (order[a.type] || 0) - (order[b.type] || 0); });
    feats.forEach(function (f) {
      var r = f.box;
      switch (f.type) {
        case 'apron': el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 18, fill: '#0f151c', stroke: 'rgba(255,255,255,.04)' }, gBg); break;
        case 'runway':
          el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 3, fill: '#1b2129' }, gBg);
          el('line', { x1: r.x + 70, y1: r.y + r.h / 2, x2: r.x + r.w - 70, y2: r.y + r.h / 2, stroke: '#4b5562', 'stroke-width': 1.5, 'stroke-dasharray': '18 14' }, gBg);
          for (var i = 0; i < 6; i++) { el('rect', { x: r.x + 8, y: r.y + 3 + i * 4.4, width: 26, height: 2.2, fill: '#4b5562' }, gBg); el('rect', { x: r.x + r.w - 34, y: r.y + 3 + i * 4.4, width: 26, height: 2.2, fill: '#4b5562' }, gBg); }
          break;
        case 'taxiway': el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 3, fill: '#151b22' }, gBg); el('line', { x1: r.x, y1: r.y + r.h / 2, x2: r.x + r.w, y2: r.y + r.h / 2, stroke: '#7a6420', 'stroke-width': 0.8 }, gBg); break;
        case 'road': el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 4, fill: '#161c24' }, gBg); el('line', { x1: r.x + 10, y1: r.y + r.h / 2, x2: r.x + r.w - 10, y2: r.y + r.h / 2, stroke: '#3a4350', 'stroke-dasharray': '10 8' }, gBg); break;
        case 'terminal': el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 10, fill: '#18202a', stroke: 'rgba(255,255,255,.12)', 'stroke-width': 1.2 }, gBg); break;
        case 'pier':
          el('rect', { x: r.x, y: r.y, width: r.w, height: r.h + 4, rx: 10, fill: '#18202a', stroke: 'rgba(255,255,255,.12)', 'stroke-width': 1.2 }, gBg);
          el('rect', { x: r.x + 52, y: r.y + 6, width: r.w - 104, height: r.h - 4, fill: '#1d2631' }, gBg);
          break;
        case 'security':
          el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 4, fill: '#141a22', stroke: 'rgba(255,255,255,.08)' }, gBg);
          for (var s = 0; s < 10; s++) el('line', { x1: r.x + 16 + s * (r.w - 32) / 9, y1: r.y + 6, x2: r.x + 16 + s * (r.w - 32) / 9, y2: r.y + r.h - 6, stroke: '#2a3340', 'stroke-width': 3 }, gBg);
          break;
        case 'checkin': el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 4, fill: '#202935', stroke: 'rgba(255,255,255,.06)' }, gBg); break;
        case 'holdroom':
          el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 3, fill: 'url(#apm-hatch)' }, gBg);
          break;
        case 'stand':
          var cx = r.x + r.w / 2, cy = r.y + r.h / 2, sc = r.w / 64;
          el('path', { d: PLANE, fill: '#2a3440', stroke: '#3a4655', 'stroke-width': 1 / sc, transform: 'translate(' + cx + ',' + cy + ') rotate(' + (f.heading || 0) + ') scale(' + sc + ')' }, gBg);
          break;
        case 'gate':
          el('circle', { cx: r.x, cy: r.y, r: 3, fill: '#ffc627' }, gGates);
          var left = f.side === 'L';
          var tx = el('text', { x: r.x + (left ? 7 : -7), y: r.y + 3, class: 'gl', 'text-anchor': left ? 'start' : 'end' }, gLabels);
          tx.textContent = f.label;
          break;
      }
      if (f.type === 'zone' || f.type === 'pier') {
        var z = el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 8, class: 'zh', 'data-zone': f.zone, 'data-term': f.terminal }, gZone);
        var ttl = el('title', {}, z); ttl.textContent = 'Zoom into ' + f.zone;
      }
      if (f.label && f.type !== 'gate' && f.type !== 'stand') {
        var lx = r.x + r.w / 2, ly;
        if (f.type === 'pier') ly = r.y - 8;
        else if (f.type === 'terminal') ly = r.y + r.h + 29;
        else if (f.type === 'runway') ly = r.y + r.h / 2 + 4;
        else ly = r.y + r.h / 2 + 4;
        if (f.type === 'zone' && f.zone !== 'Airside Link') return;
        var t = el('text', { x: lx, y: f.type === 'zone' ? r.y - 6 : ly, class: 'zl', 'text-anchor': 'middle' }, gLabels);
        if (f.type === 'checkin' || f.type === 'security' || f.type === 'road' || f.type === 'runway') t.setAttribute('style', 'font-size:8px;letter-spacing:.14em;fill:rgba(238,241,244,.32)');
        t.textContent = f.label;
      }
    });

    unitEls = {};
    S.units.forEach(function (u) {
      var r = u.box;
      var rect = el('rect', { x: r.x + 0.8, y: r.y + 0.8, width: Math.max(r.w - 1.6, 1), height: Math.max(r.h - 1.6, 1), rx: 2.5, class: 'u', fill: NEUTRAL, stroke: '#0b0f14', 'stroke-width': 1, 'data-code': u.code, tabindex: 0, role: 'button', 'aria-label': u.name }, gUnits);
      var big = r.w * r.h > 2500;
      var label = el('text', { x: r.x + r.w / 2, y: r.y + r.h / 2 + 2, class: 'ul' + (big ? ' big' : ''), 'text-anchor': 'middle' }, gLabels);
      var nm = u.name.length > (r.w / 3.2) ? u.name.slice(0, Math.max(3, Math.floor(r.w / 3.2) - 1)) + '…' : u.name;
      label.textContent = nm;
      if (big) label.setAttribute('style', 'font-size:' + Math.min(10, Math.max(6, r.w / 14)) + 'px');
      unitEls[u.code] = { rect: rect, label: label };
    });
    el('rect', { id: 'apm-selbox', x: 0, y: 0, width: 0, height: 0, rx: 3, fill: 'none', stroke: '#ffc627', 'stroke-width': 2.4, filter: 'url(#apm-glow)', visibility: 'hidden', 'pointer-events': 'none' }, gSel);
    built = true;
    applyView();
  }

  // ------------------------------------------------------------- painting
  function paint() {
    if (!built) return;
    var dom = domain(S.lens);
    S.units.forEach(function (u) {
      var e = unitEls[u.code]; if (!e) return;
      var c = colorFor(u, S.lens, dom);
      e.rect.setAttribute('fill', c);
      e.label.setAttribute('class', e.label.getAttribute('class').replace(' dk', '') + (lum(c) > 0.55 ? ' dk' : ''));
      var dim = !inScope(u);
      e.rect.classList.toggle('dim', dim);
    });
    svg.classList.toggle('stale', S.stale);
    var sb = $('apm-selbox');
    var su = S.selected && S.byCode[S.selected];
    if (su) { sb.setAttribute('x', su.box.x - 1); sb.setAttribute('y', su.box.y - 1); sb.setAttribute('width', su.box.w + 2); sb.setAttribute('height', su.box.h + 2); sb.setAttribute('visibility', 'visible'); }
    else sb.setAttribute('visibility', 'hidden');
    paintFlow();
    renderLegend(dom);
  }

  function paintFlow() {
    var g = $('apm-flow'); if (!g) return;
    while (g.firstChild) g.removeChild(g.firstChild);
    $('apm-flowbtn').setAttribute('aria-pressed', S.flow ? 'true' : 'false');
    if (!S.flow) return;
    var piers = {}, maxP = 1;
    S.features.forEach(function (f) {
      if (f.type !== 'gate') return;
      var p = piers[f.pier] = piers[f.pier] || { pax: 0, budget: 0 };
      p.pax += S.gatePax[f.label] || 0; p.budget += S.gateBudget[f.label] || 0;
    });
    for (var k in piers) maxP = Math.max(maxP, piers[k].pax);
    var maxGate = 1;
    S.features.forEach(function (f) { if (f.type === 'gate') maxGate = Math.max(maxGate, S.gatePax[f.label] || 0); });
    S.features.forEach(function (f) {
      if (f.type === 'pier') {
        var sec = S.features.filter(function (x) { return x.type === 'security' && x.terminal === f.terminal; })[0];
        if (!sec) return;
        var p = piers[f.zone.slice(5)] || { pax: 0 };
        var sx = sec.box.x + sec.box.w / 2, sy = sec.box.y;
        var px = f.box.x + f.box.w / 2;
        var d = 'M' + sx + ',' + sy + ' C' + sx + ',' + (sy - 60) + ' ' + px + ',' + (f.box.y + f.box.h + 40) + ' ' + px + ',' + (f.box.y + f.box.h - 10) + ' L' + px + ',' + (f.box.y + 14);
        el('path', { d: d, class: 'flow', 'stroke-width': 2 + 14 * p.pax / maxP }, g);
      }
      if (f.type === 'gate') {
        var v = S.gatePax[f.label] || 0, b = S.gateBudget[f.label] || 0;
        var rad = 3 + 13 * Math.sqrt(v / maxGate);
        var c = el('circle', { cx: f.box.x, cy: f.box.y, r: rad, fill: b && v < b * 0.8 ? 'rgba(240,107,107,.35)' : 'rgba(255,198,39,.28)', stroke: b && v < b * 0.8 ? '#f06b6b' : '#ffc627', 'stroke-width': 1 }, g);
        var t = el('title', {}, c); t.textContent = 'Gate ' + f.label + ': ' + num(v) + ' departing pax (' + pct(b ? v / b - 1 : null, true) + ' vs budget)';
      }
    });
  }

  function renderLegend(dom) {
    var L = LENSES.filter(function (l) { return l.key === S.lens; })[0];
    var h = '<div class=\'apm-legend-t\'>' + esc(L.label) + ' · ' + esc(periodObj().label) + '</div>';
    if (S.lens === 'profit' || S.lens === 'sqm') {
      var m = dom.maxAbs || 1, suf = S.lens === 'sqm' ? '/m²' : '';
      h += '<div class=\'apm-grad\' style=\'background:linear-gradient(90deg,' + DIV_NEG.slice().reverse().join(',') + ',' + DIV_POS.slice(1).join(',') + ')\'></div>';
      h += '<div class=\'apm-ticks\'><span>' + money(-m) + suf + '</span><span>Loss · 0 · Profit</span><span>' + money(m) + suf + '</span></div>';
      h += '<div class=\'apm-note\' style=\'margin:0\'>Log scale so small units stay visible.</div>';
    } else if (S.lens === 'var') {
      h += '<div class=\'apm-grad\' style=\'background:linear-gradient(90deg,' + DIV_NEG.slice().reverse().join(',') + ',' + DIV_POS.slice(1).join(',') + ')\'></div>';
      h += '<div class=\'apm-ticks\'><span>−40% or worse</span><span>on budget</span><span>+40%</span></div>';
    } else if (S.lens === 'spp') {
      h += '<div class=\'apm-grad\' style=\'background:linear-gradient(90deg,' + SEQ.join(',') + ')\'></div>';
      h += '<div class=\'apm-ticks\'><span>' + money(dom.min) + '</span><span>per passenger walking past</span><span>' + money(dom.max) + '</span></div>';
    } else if (S.lens === 'lease') {
      h += '<div class=\'apm-sw\'><span><i style=\'background:' + STATUS.critical + '\'></i>≤ 6 months</span><span><i style=\'background:' + STATUS.serious + '\'></i>7–12 months</span><span><i style=\'background:' + STATUS.warning + '\'></i>13–24 months</span><span><i style=\'background:' + STATUS.ok + '\'></i>Over 24 months</span><span><i style=\'background:#2a313b;outline:1px solid #3a4655\'></i>Airport-operated</span></div>';
    } else {
      h += '<div class=\'apm-sw\'>' + GROUP_COLORS.map(function (g) { return '<span><i style=\'background:' + g[1] + '\'></i>' + esc(g[0]) + '</span>'; }).join('') + '</div>';
    }
    $('apm-legend').innerHTML = h;
  }

  // ------------------------------------------------------------ KPI strip
  function renderKpis() {
    var t = totals(inScope);
    var pax = departingPax();
    var vb = t.budget ? (t.profit - t.budget) / Math.abs(t.budget) : null;
    var spp = pax.actual ? t.retail / pax.actual : null;
    var tiles = [
      ['Commercial profit', money(t.profit), '<span class=\'' + (vb >= 0 ? 'up' : 'dn') + '\'>' + pct(vb, true) + '</span> vs budget ' + money(t.budget)],
      ['Airport income', money(t.conc), 'Concessions, services and operated revenue'],
      ['Tenant sales', money(t.sales), t.n + ' units · ' + t.loss + ' loss-making'],
      ['Retail spend per pax', spp === null ? '—' : money(spp), num(pax.actual) + ' departing pax (' + pct(pax.budget ? pax.actual / pax.budget - 1 : null, true) + ' vs budget)'],
      [S.scope === 'Ground' ? 'Profit per m²' : 'Terminal profit per m²', t.area ? money(t.areaProfit / t.area) : '—', num(t.area) + ' m² of ' + (S.scope === 'Ground' ? 'car parks and rental' : 'terminal space')]
    ];
    $('apm-kpis').innerHTML = tiles.map(function (k) {
      return '<div class=\'apm-kpi\'><div class=\'apm-kpi-l\'>' + esc(k[0]) + ' · ' + esc(scopeLabel()) + '</div><div class=\'apm-kpi-v\'>' + k[1] + '</div><div class=\'apm-kpi-d\'>' + k[2] + '</div></div>';
    }).join('');
  }

  // ---------------------------------------------------------- chrome bits
  function renderChrome() {
    app.querySelectorAll('[data-act=scope]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === S.scope && !S.zone ? 'true' : b.getAttribute('data-v') === S.scope ? 'true' : 'false'); });
    app.querySelectorAll('[data-act=lens]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === S.lens ? 'true' : 'false'); });
    $('apm-period').value = S.period;
    $('apm-play').textContent = S.playing ? '❚❚ Pause' : '▶ Play 2026';
    var c = '<button data-act=\'crumb\' data-v=\'all\'>Airport</button>';
    if (S.scope !== 'all') c += ' / <button data-act=\'crumb\' data-v=\'' + S.scope + '\'>' + esc(SCOPES[S.scope].label) + '</button>';
    if (S.zone) c += ' / <button data-act=\'crumb\' data-v=\'zone\'>' + esc(S.zone) + '</button>';
    var su = S.selected && S.byCode[S.selected];
    if (su) c += ' / <b>' + esc(su.name) + '</b>';
    $('apm-crumbs').innerHTML = c;
    var scn = '';
    if (S.edits.length || S.busy) {
      var cur = totals(function () { return true; }).profit;
      var delta = S.baseline !== null && S.baselinePeriod === S.period ? cur - S.baseline : null;
      scn = '<div class=\'apm-chip scn' + (S.busy || S.stale ? ' busy' : '') + '\'><span class=\'dot\'></span>' +
        (S.busy || S.stale ? 'Pigment is recalculating…' : 'Scenario: ' + S.edits.length + ' change' + (S.edits.length === 1 ? '' : 's') + (delta === null ? '' : ' · <b class=\'' + (delta >= 0 ? 'up' : 'dn') + '\'>' + money(delta, { sign: true }) + '</b> profit')) +
        (S.edits.length && !S.busy ? ' <button class=\'apm-btn\' data-act=\'reset\' style=\'padding:2px 8px\'>Undo all</button>' : '') + '</div>';
    }
    $('apm-scn').innerHTML = scn;
    var st = $('apm-state');
    if (S.error) { st.hidden = false; st.innerHTML = '<div><b>Could not load data.</b><br>' + esc(S.error) + '<br><small>Check the Frame bindings in Pigment.</small></div>'; }
    else if (!built || !S.ready.kpis) { st.hidden = false; st.innerHTML = '<div>Loading the airport model…</div>'; }
    else st.hidden = true;
    var mo = $('apm-month');
    var p = periodObj();
    mo.hidden = !(S.playing || p.months.length === 1);
    mo.textContent = p.months.length === 1 ? p.months[0].toUpperCase() : '';
  }

  // ------------------------------------------------------------ side panel
  function rowBtn(u, value, extra, barPct, barColor) {
    return '<button class=\'apm-row\' data-act=\'select\' data-v=\'' + esc(u.code) + '\'><span>' + esc(u.name) + '<small>' + esc(extra) + '</small></span><b>' + value + '</b>' +
      (barPct !== undefined ? '<div class=\'apm-bar\'><i style=\'width:' + Math.max(2, Math.min(100, barPct)) + '%;background:' + barColor + '\'></i></div>' : '') + '</button>';
  }

  function renderInsights() {
    var list = S.units.filter(inScope).filter(function (u) { return unitData(u.code); });
    var by = function (f) { return list.slice().sort(function (a, b) { return f(b) - f(a); }); };
    var P = function (u) { return unitData(u.code).profit; };
    var top = by(P).slice(0, 5);
    var maxTop = top.length ? Math.abs(P(top[0])) : 1;
    var losers = by(function (u) { return -P(u); }).filter(function (u) { return P(u) < 0; }).slice(0, 5);
    var mags = list.filter(function (u) { return onMag(u, unitData(u.code)); });
    var expiring = list.filter(function (u) { var m = monthsUntil(u.lease); return m !== null && m <= 12; });
    var atRisk = 0;
    var nM = periodObj().months.length;
    expiring.forEach(function (u) { atRisk += unitData(u.code).profit * 12 / nM; });
    // zone variance
    var zones = {};
    list.forEach(function (u) { var d = unitData(u.code), z = zones[u.zone] = zones[u.zone] || { p: 0, b: 0 }; z.p += d.profit; z.b += d.budget; });
    var zl = Object.keys(zones).map(function (k) { return { k: k, v: zones[k].b ? (zones[k].p - zones[k].b) / Math.abs(zones[k].b) : 0, d: zones[k].p - zones[k].b }; }).sort(function (a, b) { return a.v - b.v; });

    var h = '<div class=\'apm-sec\'><h2 class=\'apm-h\'>Insights · ' + esc(scopeLabel()) + ' · ' + esc(periodObj().label) + '</h2>' +
      '<p class=\'apm-note\' style=\'margin:0\'>Click any unit on the map, or a row below, to drill in. Click a pier or zone to zoom.</p></div>';

    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Variance to budget by zone</h3><div class=\'apm-list\'>' + zl.map(function (z) {
      var w = Math.min(100, Math.abs(z.v) * 250);
      return '<button class=\'apm-row\' data-act=\'zone\' data-v=\'' + esc(z.k) + '\'><span>' + esc(z.k) + '<small>' + money(z.d, { sign: true }) + '</small></span><b class=\'' + (z.v >= 0 ? 'up' : 'dn') + '\'>' + pct(z.v, true) + '</b><div class=\'apm-bar\'><i style=\'width:' + Math.max(2, w) + '%;background:' + (z.v >= 0 ? '#2a78d6' : '#d03b3b') + '\'></i></div></button>';
    }).join('') + '</div></div>';

    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Biggest profit pools</h3><div class=\'apm-list\'>' +
      top.map(function (u) { return rowBtn(u, money(P(u)), u.zone, Math.abs(P(u)) / maxTop * 100, '#2a78d6'); }).join('') + '</div></div>';

    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Loss-making units (' + list.filter(function (u) { return P(u) < 0; }).length + ')</h3><div class=\'apm-list\'>' +
      (losers.length ? losers.map(function (u) { return rowBtn(u, money(P(u)), u.category); }).join('') : '<p class=\'apm-note\' style=\'margin:0\'>No loss-making units in this area.</p>') + '</div></div>';

    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Watch list</h3>' +
      '<div class=\'apm-flag\'><i style=\'background:' + STATUS.serious + '\'>!</i><div><b>' + expiring.length + (expiring.length === 1 ? ' lease ends' : ' leases end') + ' within 12 months</b><br>' + money(atRisk) + ' of annualised profit to renew or re-let. <button class=\'apm-btn\' data-act=\'lens\' data-v=\'lease\' style=\'padding:1px 8px;margin-top:4px\'>Show on map</button></div></div>' +
      '<div class=\'apm-flag\'><i style=\'background:' + STATUS.warning + '\'>€</i><div><b>' + mags.length + ' tenant' + (mags.length === 1 ? '' : 's') + ' paying only the minimum guarantee</b><br>' +
      (mags.length ? mags.slice(0, 3).map(function (u) { return '<button class=\'apm-btn\' data-act=\'select\' data-v=\'' + esc(u.code) + '\' style=\'padding:1px 8px;margin:4px 4px 0 0\'>' + esc(u.name) + '</button>'; }).join('') : 'All tenants are trading above their guarantee.') + '</div></div></div>';
    $('apm-side').innerHTML = h;
  }

  function trendSvg(t) {
    if (!t) return '<p class=\'apm-note\'>Loading monthly trend…</p>';
    var W = 340, H = 150, padL = 44, padR = 6, padT = 10, padB = 22;
    var vals = t.profit.concat(t.budget).filter(function (v) { return v !== null; });
    var max = Math.max.apply(null, vals.concat([0])), min = Math.min.apply(null, vals.concat([0]));
    if (max === min) max = min + 1;
    var span = max - min; max += span * 0.06; if (min < 0) min -= span * 0.06;
    var y = function (v) { return padT + (max - v) / (max - min) * (H - padT - padB); };
    var bw = (W - padL - padR) / 12;
    var s = '<svg viewBox=\'0 0 ' + W + ' ' + H + '\' role=\'img\' aria-label=\'Monthly profit against budget\'>';
    s += '<defs><pattern id=\'apm-fc\' width=\'4\' height=\'4\' patternUnits=\'userSpaceOnUse\' patternTransform=\'rotate(45)\'><rect width=\'4\' height=\'4\' fill=\'#1f4f8f\'/><line x1=\'0\' y1=\'0\' x2=\'0\' y2=\'4\' stroke=\'#5598e7\' stroke-width=\'1.5\'/></pattern></defs>';
    var ticks = [max, (max + min) / 2, min];
    if (min < 0 && max > 0) ticks = [max, 0, min];
    ticks.forEach(function (v) { s += '<line x1=\'' + padL + '\' x2=\'' + (W - padR) + '\' y1=\'' + y(v) + '\' y2=\'' + y(v) + '\' stroke=\'rgba(255,255,255,' + (v === 0 ? '.25' : '.07') + ')\'/><text x=\'' + (padL - 6) + '\' y=\'' + (y(v) + 3) + '\' fill=\'#7d8794\' font-size=\'9\' text-anchor=\'end\'>' + money(v) + '</text>'; });
    t.profit.forEach(function (v, i) {
      if (v === null) return;
      var x = padL + i * bw + 3, top = y(Math.max(v, 0)), bot = y(Math.min(v, 0));
      var fill = i > LAST_ACTUAL ? 'url(#apm-fc)' : (v >= 0 ? '#2a78d6' : '#d03b3b');
      s += '<rect x=\'' + x + '\' y=\'' + top + '\' width=\'' + (bw - 6) + '\' height=\'' + Math.max(1, bot - top) + '\' rx=\'2\' fill=\'' + fill + '\'/>';
    });
    var pts = t.budget.map(function (v, i) { return (padL + i * bw + bw / 2) + ',' + y(v || 0); }).join(' ');
    s += '<polyline points=\'' + pts + '\' fill=\'none\' stroke=\'#ffc627\' stroke-width=\'2\' stroke-linejoin=\'round\'/>';
    t.budget.forEach(function (v, i) { s += '<circle cx=\'' + (padL + i * bw + bw / 2) + '\' cy=\'' + y(v || 0) + '\' r=\'2.5\' fill=\'#ffc627\' stroke=\'#121821\' stroke-width=\'1\'/>'; });
    MONTHS.forEach(function (m, i) {
      s += '<text x=\'' + (padL + i * bw + bw / 2) + '\' y=\'' + (H - 6) + '\' fill=\'' + (i > LAST_ACTUAL ? '#5d6773' : '#7d8794') + '\' font-size=\'9\' text-anchor=\'middle\'>' + m[0] + '</text>';
      s += '<rect class=\'apm-hit\' data-m=\'' + i + '\' x=\'' + (padL + i * bw) + '\' y=\'' + padT + '\' width=\'' + bw + '\' height=\'' + (H - padT - padB) + '\' fill=\'transparent\'/>';
    });
    return s + '</svg>';
  }

  function waterfall(d) {
    var items = [['Concession / operating income', d.conc, 1], ['Service charge recovery', d.other, 1], ['Direct costs', -d.direct, 0], ['Space cost (security, cleaning, utilities)', -d.alloc, 0]];
    var max = Math.max(d.conc + d.other, d.direct + d.alloc, Math.abs(d.profit), 1);
    var h = '<div class=\'apm-list\'>';
    items.forEach(function (it) {
      if (!it[1]) return;
      h += '<div class=\'apm-row\' style=\'cursor:default\'><span>' + esc(it[0]) + '</span><b>' + money(it[1], { sign: true }) + '</b><div class=\'apm-bar\'><i style=\'width:' + Math.abs(it[1]) / max * 100 + '%;background:' + (it[2] ? '#2a78d6' : '#7a3434') + '\'></i></div></div>';
    });
    h += '<div class=\'apm-row\' style=\'cursor:default;border-top:1px solid rgba(255,255,255,.1);border-radius:0;padding-top:8px\'><span><b>Airport profit</b></span><b class=\'' + (d.profit >= 0 ? 'up' : 'dn') + '\'>' + money(d.profit) + '</b></div>';
    return h + '</div>';
  }

  function explain(u, d) {
    var out = [];
    var n = periodObj().months.length;
    if (d.profit < 0) out.push([STATUS.critical, '−', '<b>Loss-making.</b> Space costs of ' + money(d.alloc) + ' outweigh income of ' + money(d.conc + d.other) + '.']);
    if (onMag(u, d)) out.push([STATUS.warning, '€', '<b>Paying the minimum guarantee.</b> Sales of ' + money(d.sales) + ' earn ' + money(d.sales * d.rate) + ' at ' + pct(d.rate) + ', below the ' + money(u.mag * n / 12) + ' guarantee. Tenant may ask to renegotiate.']);
    var vb = d.budget ? (d.profit - d.budget) / Math.abs(d.budget) : 0;
    var pv = d.bpax ? d.pax / d.bpax - 1 : 0;
    if (vb < -0.12) out.push([STATUS.serious, '↓', '<b>' + pct(vb, true) + ' vs budget.</b> ' + (pv < -0.1 ? 'Passengers walking past are down ' + pct(-pv) + ' on budget' + (u.gate ? ' (nearest gate ' + esc(u.gate) + ')' : '') + '.' : 'Spend per passenger is below plan.')]);
    if (vb > 0.12) out.push(['#2a78d6', '↑', '<b>' + pct(vb, true) + ' vs budget.</b> ' + (pv > 0.1 ? 'Passengers walking past are up ' + pct(pv) + ' on budget.' : 'Trading ahead of plan.')]);
    var ml = monthsUntil(u.lease);
    if (ml !== null && ml <= 12) out.push([STATUS.serious, '⏱', '<b>Lease ends ' + fmtDate(u.lease) + '</b> (' + Math.max(ml, 0) + ' months). ' + money(d.profit * 12 / n) + ' of annual profit to secure.']);
    // rank on profit / m2 within group
    var grp = CAT_GROUP[u.category];
    var peers = S.units.filter(function (x) { return CAT_GROUP[x.category] === grp && unitData(x.code); }).sort(function (a, b) { return unitData(b.code).profit / b.area - unitData(a.code).profit / a.area; });
    var rank = peers.indexOf(u) + 1;
    if (peers.length > 2) out.push(['#9085e9', '#', 'Ranks <b>' + rank + ' of ' + peers.length + '</b> in ' + esc(grp) + ' on profit per m².']);
    return out.map(function (f) { return '<div class=\'apm-flag\'><i style=\'background:' + f[0] + '\'>' + f[1] + '</i><div>' + f[2] + '</div></div>'; }).join('');
  }

  function renderDetail() {
    var u = S.byCode[S.selected];
    var d = unitData(u.code);
    if (!d) { $('apm-side').innerHTML = '<div class=\'apm-sec\'>Loading…</div>'; return; }
    var vb = d.budget ? (d.profit - d.budget) / Math.abs(d.budget) : null;
    var h = '<div class=\'apm-sec\'><button class=\'apm-close\' data-act=\'deselect\' aria-label=\'Close unit details\'>✕</button>' +
      '<h2 class=\'apm-name\'>' + esc(u.name) + '</h2>' +
      '<div class=\'apm-meta\'><span class=\'apm-pill apm-code\'>' + esc(u.code) + '</span><span class=\'apm-pill\'>' + esc(u.category) + '</span><span class=\'apm-pill\'>' + esc(u.zone) + '</span><span class=\'apm-pill\'>' + num(u.area) + ' m²</span>' + (u.gate ? '<span class=\'apm-pill\'>Gate ' + esc(u.gate) + '</span>' : '') + '</div>' +
      '<p class=\'apm-note\'>' + esc(u.tenant) + ' · ' + esc(u.model) + (u.lease ? ' · lease to ' + fmtDate(u.lease) : '') + '</p></div>';
    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Airport profit · ' + esc(periodObj().label) + '</h3><div class=\'apm-big\'><b class=\'' + (d.profit >= 0 ? '' : 'dn') + '\'>' + money(d.profit) + '</b><span class=\'' + (vb >= 0 ? 'up' : 'dn') + '\'>' + pct(vb, true) + ' vs budget (' + money(d.budget) + ')</span></div>' + explain(u, d) + '</div>';
    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Profit bridge</h3>' + waterfall(d) + '</div>';
    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Trading</h3><div class=\'apm-grid\'>' +
      '<div><small>Tenant sales</small><b>' + money(d.sales) + '</b></div>' +
      '<div><small>Transactions</small><b>' + num(d.tx) + '</b></div>' +
      '<div><small>Passengers walking past</small><b>' + num(d.pax) + '</b></div>' +
      '<div><small>Conversion</small><b>' + pct(d.pax ? d.tx / d.pax : null) + '</b></div>' +
      '<div><small>Spend per passenger</small><b>' + (d.pax ? money(d.sales / d.pax) : '—') + '</b></div>' +
      '<div><small>Profit per m²</small><b>' + money(d.profit / u.area) + '</b></div>' +
      '<div><small>Revenue share</small><b>' + (d.rate === null || d.rate === undefined ? 'n/a' : pct(d.rate)) + '</b></div>' +
      '<div><small>Minimum guarantee</small><b>' + (u.mag ? money(u.mag) + '/yr' : 'n/a') + '</b></div></div></div>';
    h += '<div class=\'apm-sec apm-chart\'><h3 class=\'apm-h\'>2026 profit by month <span style=\'text-transform:none;letter-spacing:0;color:#a9b3bf\'>· bars actual, hatched forecast, <span style=\'color:#ffc627\'>line budget</span></span></h3><div id=\'apm-trend\'>' + trendSvg(S.trend && S.trend.code === u.code ? S.trend : null) + '</div></div>';
    if (u.model === 'Airport-operated') {
      h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>What if</h3><p class=\'apm-note\' style=\'margin:0\'>This unit is run by the airport. Model tariffs and staffing in the operational planning app; this map picks up the result.</p></div>';
    } else {
      var rate = d.rate || 0;
      var opts = RETENANT.map(function (c) { return '<option' + (c === u.category ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
      h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>What if · writes to Pigment</h3><div class=\'apm-whatif\'>' +
        '<div class=\'apm-field\'><label for=\'apm-rate\'><span>Revenue share to airport</span><b id=\'apm-rate-v\'>' + pct(rate) + '</b></label><input id=\'apm-rate\' type=\'range\' min=\'0.05\' max=\'0.45\' step=\'0.01\' value=\'' + rate + '\'></div>' +
        (u.model === 'Concession' ? '<div class=\'apm-field\'><label for=\'apm-cat\'><span>Re-let the unit as</span></label><select id=\'apm-cat\' class=\'apm-select\'>' + opts + '</select></div>' : '') +
        '<div class=\'apm-actions\'><button class=\'apm-btn primary\' data-act=\'apply\'' + (S.busy ? ' disabled' : '') + '>Apply and recalculate</button></div>' +
        '<p class=\'apm-note\'>Updates the Revenue Share metric and the Unit list in Pigment. The whole map recalculates.</p></div></div>';
    }
    $('apm-side').innerHTML = h;
  }

  function renderSide() {
    if (!S.ready.kpis) { $('apm-side').innerHTML = '<div class=\'apm-sec\'><p class=\'apm-note\'>Loading insights…</p></div>'; return; }
    if (S.selected && S.byCode[S.selected]) renderDetail(); else renderInsights();
  }

  function renderAll() { renderChrome(); renderKpis(); paint(); renderSide(); }
  var renderTimer = 0;
  function scheduleRender() { clearTimeout(renderTimer); renderTimer = setTimeout(renderAll, 16); }

  // ------------------------------------------------------------ view box
  function applyView() {
    if (!svg) return;
    var v = S.view;
    svg.setAttribute('viewBox', v.x + ' ' + v.y + ' ' + v.w + ' ' + v.h);
    svg.classList.toggle('lod1', v.w < 1100);
    svg.classList.toggle('lod2', v.w < 620);
  }
  function animateTo(box, pad) {
    pad = pad === undefined ? 0 : pad;
    var target = { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 };
    var from = { x: S.view.x, y: S.view.y, w: S.view.w, h: S.view.h };
    var t0 = performance.now(), dur = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 520;
    cancelAnimationFrame(rafId);
    function step(now) {
      var k = dur ? Math.min(1, (now - t0) / dur) : 1;
      var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      ['x', 'y', 'w', 'h'].forEach(function (p) { S.view[p] = from[p] + (target[p] - from[p]) * e; });
      applyView();
      if (k < 1) rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }
  function svgPoint(cx, cy) {
    var r = svg.getBoundingClientRect();
    var s = Math.max(S.view.w / r.width, S.view.h / r.height);
    var ox = (r.width * s - S.view.w) / 2, oy = (r.height * s - S.view.h) / 2;
    return { x: S.view.x - ox + (cx - r.left) * s, y: S.view.y - oy + (cy - r.top) * s, s: s };
  }
  function zoomAt(cx, cy, f) {
    var p = svgPoint(cx, cy);
    var w = Math.max(160, Math.min(2400, S.view.w * f)), k = w / S.view.w;
    S.view = { x: p.x - (p.x - S.view.x) * k, y: p.y - (p.y - S.view.y) * k, w: w, h: S.view.h * k };
    applyView();
  }

  // ---------------------------------------------------------- interactions
  function setScope(k) {
    S.scope = k; S.zone = null; S.selected = null;
    animateTo(SCOPES[k].box);
    renderAll();
  }
  function setZone(z) {
    var f = S.features.filter(function (x) { return (x.type === 'pier' || x.type === 'zone') && x.zone === z; })[0];
    var u = S.units.filter(function (x) { return x.zone === z; })[0];
    if (!f && !u) return;
    S.zone = z; S.selected = null;
    S.scope = f ? (f.terminal || 'all') : u.terminal;
    if (!SCOPES[S.scope]) S.scope = 'all';
    var box = f ? f.box : SCOPES[S.scope].box;
    if (z === 'Car Parks & Ground') { S.scope = 'Ground'; S.zone = null; box = SCOPES.Ground.box; }
    animateTo(box, 40);
    renderAll();
  }
  function selectUnit(code, fly) {
    var u = S.byCode[code]; if (!u) return;
    S.selected = code;
    if (!SCOPES[S.scope].test(u) || (S.zone && S.zone !== u.zone)) { S.scope = SCOPES[u.terminal] ? u.terminal : 'all'; S.zone = null; }
    if (fly) {
      var b = u.box, w = Math.max(b.w * 5, 360), h = w * 0.62;
      animateTo({ x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w: w, h: h });
    }
    S.trend = S.trend && S.trend.code === code ? S.trend : null;
    trendCode = code;
    trendSub.updatePageDefinitions([{ alias: ALIAS.units, selection: [code] }]);
    renderAll();
  }

  function setPeriod(key) {
    S.period = key;
    var months = periodObj().months;
    var pd = [{ alias: ALIAS.months, selection: months }];
    kpiSub.updatePageDefinitions(pd);
    gateSub.updatePageDefinitions(pd);
    renderChrome();
  }
  var playIdx = 0, playTimer = 0;
  function togglePlay() {
    S.playing = !S.playing;
    clearInterval(playTimer);
    if (S.playing) {
      playIdx = 0; setPeriod('m0');
      playTimer = setInterval(function () {
        playIdx++;
        if (playIdx > LAST_ACTUAL) { S.playing = false; clearInterval(playTimer); setPeriod('ytd'); return; }
        setPeriod('m' + playIdx);
      }, 1300);
    } else setPeriod('ytd');
    renderChrome();
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'apm-toast'; t.textContent = msg; t.setAttribute('role', 'status');
    $('apm-map').appendChild(t);
    timers.push(setTimeout(function () { t.remove(); }, 2600));
  }

  function totalProfit() { return totals(function () { return true; }).profit; }

  function applyWhatIf() {
    var u = S.byCode[S.selected]; if (!u || S.busy) return;
    var d = unitData(u.code);
    var rateEl = $('apm-rate'), catEl = $('apm-cat');
    var newRate = rateEl ? Math.round(Number(rateEl.value) * 100) / 100 : null;
    var newCat = catEl ? catEl.value : u.category;
    var writes = [];
    if (S.baseline === null) { S.baseline = totalProfit(); S.baselinePeriod = S.period; }
    if (newCat !== u.category) {
      S.edits.push({ code: u.code, kind: 'item', from: { 'Category': u.category, 'Tenant': u.tenant }, to: { 'Category': newCat, 'Tenant': 'Proposed ' + newCat + ' tenant' } });
      writes.push(function () { return SDK.editItem(ALIAS.units, u.code, { 'Category': newCat, 'Tenant': 'Proposed ' + newCat + ' tenant' }); });
      if (rateEl && Math.abs(newRate - (d.rate || 0)) < 0.001) newRate = DEFAULT_RATE[newCat] || newRate;
    }
    if (newRate !== null && Math.abs(newRate - (d.rate || 0)) >= 0.001) {
      S.edits.push({ code: u.code, kind: 'rate', from: d.rate, to: newRate });
      writes.push(function () { var c = {}; c[ALIAS.units] = u.code; return SDK.editValue(ALIAS.rate, c, newRate); });
    }
    if (!writes.length) { toast('Nothing changed. Move the slider or pick a new category.'); return; }
    runWrites(writes, 'Recalculated. Map, KPIs and insights updated.');
  }
  function resetEdits() {
    if (S.busy || !S.edits.length) return;
    var writes = S.edits.slice().reverse().map(function (e) {
      return function () {
        if (e.kind === 'item') return SDK.editItem(ALIAS.units, e.code, e.from);
        var c = {}; c[ALIAS.units] = e.code; return SDK.editValue(ALIAS.rate, c, e.from);
      };
    });
    S.edits = [];
    runWrites(writes, 'Scenario cleared. Back to the original plan.', function () { S.baseline = null; });
  }
  function runWrites(writes, msg, after) {
    S.busy = true; renderChrome(); renderSide();
    var chain = Promise.resolve();
    writes.forEach(function (w) { chain = chain.then(w); });
    chain.then(function () {
      S.busy = false; if (after) after(); S.pendingToast = msg; renderAll();
    }, function (err) {
      S.busy = false; toast('Write failed: ' + (err && err.message ? err.message : err)); renderAll();
    });
  }

  // tooltip
  function showTip(html, x, y) {
    if (!tooltip) { tooltip = document.createElement('div'); tooltip.className = 'apm-tip'; document.body.appendChild(tooltip); }
    tooltip.innerHTML = html; tooltip.hidden = false;
    var w = tooltip.offsetWidth, h = tooltip.offsetHeight;
    var left = x + 14, top = y + 14;
    if (left + w > window.innerWidth - 8) left = x - w - 14;
    if (top + h > window.innerHeight - 8) top = y - h - 14;
    tooltip.style.left = Math.max(8, left) + 'px'; tooltip.style.top = Math.max(8, top) + 'px';
  }
  function hideTip() { if (tooltip) tooltip.hidden = true; }
  function unitTip(u) {
    var d = unitData(u.code);
    var L = LENSES.filter(function (l) { return l.key === S.lens; })[0];
    return '<b>' + esc(u.name) + '</b><br><span class=\'k\'>' + esc(u.category) + ' · ' + esc(u.zone) + '</span><br>' +
      '<span class=\'k\'>' + esc(L.label) + ':</span> <b>' + fmtLens(u, S.lens) + '</b>' +
      (d && S.lens !== 'profit' ? '<br><span class=\'k\'>Profit:</span> ' + money(d.profit) : '') +
      (d ? '<br><span class=\'k\'>Sales:</span> ' + money(d.sales) : '');
  }

  // events (delegated once)
  var drag = null;
  function onClick(e) {
    var a = e.target.closest('[data-act]');
    if (!a || !app.contains(a)) return;
    var act = a.getAttribute('data-act'), v = a.getAttribute('data-v');
    if (act === 'scope') setScope(v);
    else if (act === 'lens') { S.lens = v; renderAll(); }
    else if (act === 'select') selectUnit(v, true);
    else if (act === 'deselect') { S.selected = null; renderAll(); }
    else if (act === 'zone') setZone(v);
    else if (act === 'crumb') { if (v === 'all') setScope('all'); else if (v === 'zone') { S.selected = null; setZone(S.zone); } else setScope(v); }
    else if (act === 'play') togglePlay();
    else if (act === 'flow') { S.flow = !S.flow; paint(); }
    else if (act === 'zin') { var r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 0.7); }
    else if (act === 'zout') { var r2 = svg.getBoundingClientRect(); zoomAt(r2.left + r2.width / 2, r2.top + r2.height / 2, 1.4); }
    else if (act === 'zreset') setScope('all');
    else if (act === 'apply') applyWhatIf();
    else if (act === 'reset') resetEdits();
  }
  function onChange(e) {
    if (e.target.id === 'apm-period') { if (S.playing) { S.playing = false; clearInterval(playTimer); } setPeriod(e.target.value); }
  }
  function onInput(e) {
    if (e.target.id === 'apm-rate') { var o = $('apm-rate-v'); if (o) o.textContent = pct(Number(e.target.value)); }
    if (e.target.id === 'apm-q') search(e.target.value);
  }
  function search(q) {
    var box = $('apm-results');
    q = (q || '').trim().toLowerCase();
    if (q.length < 2) { box.hidden = true; return; }
    var hits = S.units.filter(function (u) { return (u.name + ' ' + u.tenant + ' ' + u.code + ' ' + u.category).toLowerCase().indexOf(q) >= 0; }).slice(0, 7);
    box.innerHTML = hits.length ? hits.map(function (u) { return '<button data-act=\'pick\' data-v=\'' + esc(u.code) + '\'><span>' + esc(u.name) + '</span><small style=\'color:#7d8794\'>' + esc(u.code) + '</small></button>'; }).join('') : '<div style=\'padding:8px 10px;color:#7d8794\'>No unit matches “' + esc(q) + '”.</div>';
    box.hidden = false;
  }
  function onPick(e) {
    var b = e.target.closest('[data-act=pick]'); if (!b) return;
    $('apm-results').hidden = true; $('apm-q').value = '';
    selectUnit(b.getAttribute('data-v'), true);
  }
  function onPointerDown(e) {
    if (!svg || !svg.contains(e.target)) return;
    drag = { x: e.clientX, y: e.clientY, vx: S.view.x, vy: S.view.y, moved: false, id: e.pointerId, target: e.target };
  }
  function onPointerMove(e) {
    if (drag && drag.id === e.pointerId) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; svg.classList.add('drag'); try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } cancelAnimationFrame(rafId); }
      if (drag.moved) {
        var s = svgPoint(0, 0).s;
        S.view.x = drag.vx - dx * s; S.view.y = drag.vy - dy * s; applyView(); hideTip(); return;
      }
    }
    var t = e.target;
    if (svg && svg.contains(t) && t.classList && t.classList.contains('u')) showTip(unitTip(S.byCode[t.getAttribute('data-code')]), e.clientX, e.clientY);
    else if (t.classList && t.classList.contains('apm-hit') && S.trend) {
      var i = Number(t.getAttribute('data-m'));
      showTip('<b>' + MONTHS[i] + (i > LAST_ACTUAL ? ' · forecast' : '') + '</b><br><span class=\'k\'>Profit:</span> ' + money(S.trend.profit[i]) + '<br><span class=\'k\'>Budget:</span> ' + money(S.trend.budget[i]) + '<br><span class=\'k\'>Sales:</span> ' + money(S.trend.sales[i]), e.clientX, e.clientY);
    } else hideTip();
  }
  function onPointerUp(e) {
    if (!drag || drag.id !== e.pointerId) return;
    var wasDrag = drag.moved, target = drag.target;
    svg.classList.remove('drag');
    drag = null;
    if (wasDrag) return;
    if (target.classList.contains('u')) selectUnit(target.getAttribute('data-code'), false);
    else if (target.classList.contains('zh')) setZone(target.getAttribute('data-zone'));
  }
  function onWheel(e) {
    if (!svg || !svg.contains(e.target)) return;
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, Math.pow(1.0015, e.deltaY));
  }
  function onKey(e) {
    if (e.key === 'Escape') { if (S.selected) { S.selected = null; renderAll(); } $('apm-results').hidden = true; return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('u')) { e.preventDefault(); selectUnit(e.target.getAttribute('data-code'), true); }
  }
  function onFocusIn(e) { if (e.target.classList && e.target.classList.contains('u')) { var r = e.target.getBoundingClientRect(); showTip(unitTip(S.byCode[e.target.getAttribute('data-code')]), r.right, r.bottom); } }
  var resizeTimer = 0;
  function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { applyView(); renderSide(); }, 120); }

  app.addEventListener('click', onClick);
  app.addEventListener('click', onPick);
  app.addEventListener('change', onChange);
  app.addEventListener('input', onInput);
  app.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  app.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);
  app.addEventListener('focusin', onFocusIn);
  app.addEventListener('mouseleave', hideTip);
  window.addEventListener('resize', onResize);
  var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
  if (ro) ro.observe(document.documentElement);

  // ------------------------------------------------------------- data in
  function hasLoadingKind(arr) {
    for (var i = 0; i < arr.length; i++) {
      var it = arr[i];
      if (Array.isArray(it)) { if (hasLoadingKind(it)) return true; }
      else if (it && typeof it === 'object' && it.kind === 'loading') return true;
    }
    return false;
  }
  function isReady(d) {
    if (!d || !d.labels || !d.labels.columns.length) return false;
    return !hasLoadingKind(d.labels.rows) && !hasLoadingKind(d.labels.columns) && !hasLoadingKind(d.cells);
  }
  function numCell(v) { return typeof v === 'number' ? v : (v === null || v === undefined || typeof v === 'object' ? null : Number(v)); }
  function colIndex(d) { var m = {}; d.labels.columns.forEach(function (c, i) { m[lastLabel(c)] = i; }); return m; }
  function onErr(err) { S.error = err && err.message ? err.message : String(err); renderChrome(); }

  function maybeBuild() {
    if (S.ready.units && S.ready.features && !built) buildMap();
    if (built) scheduleRender();
  }

  var unitSub = SDK.subscribeToItems(ALIAS.units, {
    onData: function (d) {
      S.units = (d.items || []).map(function (it) {
        return {
          code: String(prop(it, 'Unit Code') || prop(it, 'name') || ''), name: prop(it, 'Unit Name') || prop(it, 'Unit Code'), tenant: prop(it, 'Tenant') || '',
          category: prop(it, 'Category') || '', terminal: prop(it, 'Terminal') || '', zone: prop(it, 'Zone') || '', area: Number(prop(it, 'Area (m²)')) || 0,
          model: prop(it, 'Operating Model') || 'Concession', box: shape(prop(it, 'Shape')), lease: prop(it, 'Lease Expiry') || '', mag: Number(prop(it, 'MAG (€/yr)')) || 0, gate: prop(it, 'Nearest Gate') || ''
        };
      }).filter(function (u) { return u.code && u.box.w > 0; });
      S.byCode = {}; S.units.forEach(function (u) { S.byCode[u.code] = u; });
      if (d.partialResult) toast('Only part of the Unit list loaded. Some units are missing from the map.');
      var first = !S.ready.units;
      S.ready.units = true;
      if (built && !first) {
        // labels may change after a re-let; refresh names without rebuilding geometry
        S.units.forEach(function (u) { var e = unitEls[u.code]; if (e) e.rect.setAttribute('aria-label', u.name); });
      }
      maybeBuild();
    },
    onError: onErr
  });
  var featSub = SDK.subscribeToItems(ALIAS.features, {
    onData: function (d) {
      S.features = (d.items || []).map(function (it) {
        return { name: prop(it, 'Feature'), type: prop(it, 'Type'), box: shape(prop(it, 'Shape')), label: prop(it, 'Label') || '', terminal: prop(it, 'Terminal') || '', zone: prop(it, 'Zone') || '', pier: prop(it, 'Pier') || '', heading: Number(prop(it, 'Heading')) || 0, side: Number(prop(it, 'Heading')) ? '' : '' };
      });
      // gate side: which side of its pier the gate sits on
      var piers = {};
      S.features.forEach(function (f) { if (f.type === 'pier') piers[f.zone.slice(5)] = f; });
      S.features.forEach(function (f) { if (f.type === 'gate' && piers[f.pier]) f.side = f.box.x <= piers[f.pier].box.x + 1 ? 'L' : 'R'; });
      S.ready.features = true;
      maybeBuild();
    },
    onError: onErr
  });
  var kpiSub = SDK.subscribeToVizualization(ALIAS.kpis, {
    pageDefinitions: [{ alias: ALIAS.months, selection: periodObj().months }],
    onData: function (d) {
      if (!isReady(d)) { if (S.ready.kpis) { S.stale = true; if (svg) svg.classList.add('stale'); renderChrome(); } return; }
      var ci = colIndex(d), kpi = {};
      d.labels.rows.forEach(function (path, r) {
        var code = lastLabel(path); if (!code) return;
        var g = function (k) { var c = ci[COL[k]]; return c === undefined ? null : numCell(d.cells[c][r]); };
        kpi[code] = { sales: g('sales') || 0, conc: g('conc') || 0, other: g('other') || 0, direct: g('direct') || 0, alloc: g('alloc') || 0, profit: g('profit') || 0, budget: g('budget') || 0, tx: g('tx') || 0, pax: g('pax') || 0, bpax: g('bpax') || 0, rate: g('rate') };
      });
      S.kpi = kpi; S.stale = false; S.ready.kpis = true; S.error = null;
      if (S.pendingToast && !S.busy) { toast(S.pendingToast); S.pendingToast = null; }
      if (S.edits.length === 0 && !S.busy) S.baseline = null;
      maybeBuild(); scheduleRender();
    },
    onError: onErr
  });
  var gateSub = SDK.subscribeToVizualization(ALIAS.gates, {
    pageDefinitions: [{ alias: ALIAS.months, selection: periodObj().months }],
    onData: function (d) {
      if (!isReady(d)) return;
      var ci = colIndex(d), a = ci['Departing Pax'], b = ci['Budget Departing Pax'];
      S.gatePax = {}; S.gateBudget = {};
      d.labels.rows.forEach(function (p, r) { var g = lastLabel(p); S.gatePax[g] = numCell(d.cells[a][r]) || 0; if (b !== undefined) S.gateBudget[g] = numCell(d.cells[b][r]) || 0; });
      scheduleRender();
    },
    onError: onErr
  });
  var trendSub = SDK.subscribeToVizualization(ALIAS.trend, {
    pageDefinitions: [],
    onData: function (d) {
      if (!isReady(d) || !trendCode) return;
      var ci = colIndex(d);
      var col = function (n) { return d.cells[ci[n]] ? d.cells[ci[n]].map(numCell) : MONTHS.map(function () { return null; }); };
      S.trend = { code: trendCode, profit: col('Airport Profit'), budget: col('Budget Profit'), sales: col('Tenant Sales') };
      var host = $('apm-trend');
      if (host && S.selected === S.trend.code) host.innerHTML = trendSvg(S.trend);
    },
    onError: onErr
  });
  subs.push(unitSub, featSub, kpiSub, gateSub, trendSub);
  renderChrome();

  // ------------------------------------------------------------- cleanup
  root.__cleanup = function () {
    subs.forEach(function (s) { try { s.unsubscribe(); } catch (e) { /* ignore */ } });
    app.removeEventListener('click', onClick);
    app.removeEventListener('click', onPick);
    app.removeEventListener('change', onChange);
    app.removeEventListener('input', onInput);
    app.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    app.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKey);
    app.removeEventListener('focusin', onFocusIn);
    app.removeEventListener('mouseleave', hideTip);
    window.removeEventListener('resize', onResize);
    if (ro) ro.disconnect();
    clearTimeout(renderTimer); clearTimeout(resizeTimer); clearInterval(playTimer);
    timers.forEach(clearTimeout);
    cancelAnimationFrame(rafId);
    if (tooltip) tooltip.remove();
    if (styleEl) styleEl.remove();
    S.kpi = {}; S.units = []; S.features = [];
    root.innerHTML = '';
  };
})();
