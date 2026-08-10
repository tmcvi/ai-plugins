/* Niguri Honda — Frame F1 · "Journey Ribbons"  (B1 centrepiece)
   Live-bound Pigment AI Frame. Reads the B1 view via PigmentSDK.subscribeToVizualization.
   Every number and date is drawn from onData — nothing here is hardcoded except the focus
   cohort (Model + Production Week), which is a SELECTION, not data. A native edit to a
   lead-time / demand / allocation input re-fires onData and the ribbons re-animate.

   Backing View: 63d5254a-062e-4742-8246-e715fd307223  ("Where this week's cars go — and when")
   Binding alias 'V'. Columns, in order:
     0 Allocated, units (number)   1 Ships (ISO)   2 Arrives (ISO)
     3 In stock (ISO)              4 Sells (ISO)   5 In-market cover, wks (number)
   Rows: one market each (label = last pivot entry).

   Page scope driven via List aliases ModelList / PWList to the demo focus cohort.
   Palette: white #FFFFFF · Honda red #CC0000 · charcoal #1A1A1A · greys.  Serif titles (match F4).
*/
(function () {
  'use strict';

  var root = document.getElementById('app');
  if (root && root.__cleanup) root.__cleanup();
  if (!root) { root = document.body; }
  root.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;overflow:hidden;background:#FFFFFF;';

  // ---- Focus cohort (a selection, not data) -------------------------------
  var MODEL_SEL = 'Civic LHD';
  var PW_SEL = 'WC 2026-09-21';

  // ---- Palette / type -----------------------------------------------------
  var C = {
    white: '#FFFFFF', red: '#CC0000', charcoal: '#1A1A1A',
    grey80: '#6E6E73', grey60: '#C9C9CE', grey40: '#E3E3E7', grey20: '#F7F7F8'
  };
  var SERIF = '"Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif';
  var SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  var NS = 'http://www.w3.org/2000/svg';

  // ---- Cover bands (plain language) ---------------------------------------
  // < 2 wks = tight (red) · 2–4 = balanced (charcoal) · > 4 = long cover (grey)
  function bandColor(cov) {
    if (cov == null || isNaN(cov)) return C.grey60;
    if (cov < 2) return C.red;
    if (cov <= 4) return C.charcoal;
    return C.grey80;
  }
  function bandLabel(cov) {
    if (cov == null || isNaN(cov)) return '—';
    if (cov < 2) return 'Tight';
    if (cov <= 4) return 'Balanced';
    return 'Long cover';
  }

  // ---- Small helpers ------------------------------------------------------
  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function html(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }
  function parseDate(v) {
    if (v == null) return null;
    if (typeof v === 'number') return new Date(v);
    var d = new Date(String(v));
    return isNaN(d.getTime()) ? null : d;
  }
  var DAY = 86400000;
  function fmtDate(d) {
    if (!d) return '—';
    var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return d.getUTCDate() + ' ' + mo[d.getUTCMonth()] + ' ' + String(d.getUTCFullYear()).slice(2);
  }
  function weeksBetween(a, b) {
    if (!a || !b) return null;
    return Math.round((b.getTime() - a.getTime()) / (7 * DAY));
  }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ---- Loading-guard (per skill) ------------------------------------------
  function hasLoadingKind(arr) {
    if (!arr) return false;
    for (var i = 0; i < arr.length; i++) {
      var it = arr[i];
      if (Array.isArray(it)) { if (hasLoadingKind(it)) return true; }
      else if (it && typeof it === 'object' && it.kind === 'loading') return true;
    }
    return false;
  }
  function isReady(d) {
    if (!d || !d.labels || !d.labels.columns || !d.labels.columns.length) return false;
    return !hasLoadingKind(d.labels.rows) && !hasLoadingKind(d.labels.columns) && !hasLoadingKind(d.cells);
  }

  // ---- Parse view payload -> rows ----------------------------------------
  function lastLabel(lbl) {
    if (Array.isArray(lbl)) { var v = lbl[lbl.length - 1]; return (v && typeof v === 'object') ? '' : String(v); }
    return (lbl && typeof lbl === 'object') ? '' : String(lbl);
  }
  function num(v) { return (typeof v === 'number' && !isNaN(v)) ? v : (v == null ? null : (isNaN(+v) ? null : +v)); }

  function parseRows(data) {
    var cols = data.labels.columns, rows = data.labels.rows, cells = data.cells;
    var out = [];
    for (var r = 0; r < rows.length; r++) {
      var name = lastLabel(rows[r]);
      var alloc = num(cells[0] ? cells[0][r] : null);
      var ships = parseDate(cells[1] ? cells[1][r] : null);
      var arr = parseDate(cells[2] ? cells[2][r] : null);
      var stock = parseDate(cells[3] ? cells[3][r] : null);
      var sells = parseDate(cells[4] ? cells[4][r] : null);
      var cover = num(cells[5] ? cells[5][r] : null);
      if (!alloc || alloc <= 0) continue;           // only markets that received cars
      if (!ships || !sells) continue;               // need a journey to draw
      out.push({ name: name, alloc: alloc, ships: ships, arrives: arr, stock: stock, sells: sells, cover: cover });
    }
    // biggest allocation first — visual weight top-down
    out.sort(function (a, b) { return b.alloc - a.alloc; });
    return out;
  }

  // ---- State --------------------------------------------------------------
  var state = 'loading';        // 'loading' | 'error' | 'empty' | 'ready'
  var rowsData = [];
  var errMsg = '';
  var lastKey = '';             // detect real data changes -> re-animate
  var firstReveal = true;

  // animation registry: per market name -> { cur:{x0,x1,x2,x3,hh}, tgt:{...}, t0, dur, reveal, delay }
  var anim = {};
  var rafId = null, animT0 = 0;

  // ---- DOM scaffold -------------------------------------------------------
  var wrap = html('div', 'position:absolute;inset:0;display:flex;flex-direction:column;background:' + C.white + ';');
  root.appendChild(wrap);

  var header = html('div', 'flex:0 0 auto;padding:26px 40px 14px 40px;');
  wrap.appendChild(header);
  var kicker = html('div', 'font:600 11px/1.2 ' + SANS + ';letter-spacing:.16em;text-transform:uppercase;color:' + C.grey80 + ';', 'Niguri · Honda — one production week, traced');
  var title = html('div', 'margin-top:6px;font:400 30px/1.15 ' + SERIF + ';color:' + C.charcoal + ';', 'Where this week’s cars go — and when');
  var sub = html('div', 'margin-top:6px;font:400 14px/1.4 ' + SANS + ';color:' + C.grey80 + ';');
  header.appendChild(kicker); header.appendChild(title); header.appendChild(sub);

  var legend = html('div', 'display:flex;gap:18px;align-items:center;margin-top:12px;font:500 12px/1 ' + SANS + ';color:' + C.charcoal + ';');
  function legSwatch(color, label, hatch) {
    var d = html('div', 'display:flex;gap:7px;align-items:center;');
    var sw = html('span', 'width:14px;height:14px;border-radius:3px;display:inline-block;background:' + color + ';');
    if (hatch) sw.style.background = 'repeating-linear-gradient(45deg,' + C.grey60 + ',' + C.grey60 + ' 2px,' + C.white + ' 2px,' + C.white + ' 5px)';
    d.appendChild(sw); d.appendChild(html('span', '', label)); return d;
  }
  legend.appendChild(legSwatch(null, 'At sea', true));
  legend.appendChild(legSwatch(C.grey40, 'Landing'));
  legend.appendChild(legSwatch(C.red, 'Tight cover (<2 wks)'));
  legend.appendChild(legSwatch(C.charcoal, 'Balanced (2–4)'));
  legend.appendChild(legSwatch(C.grey80, 'Long cover (>4)'));
  header.appendChild(legend);

  var stage = html('div', 'position:relative;flex:1 1 auto;min-height:0;');
  wrap.appendChild(stage);

  var footer = html('div', 'flex:0 0 auto;padding:8px 40px 14px 40px;font:italic 400 12px/1.3 ' + SANS + ';color:' + C.grey80 + ';', 'Illustrative demonstration model — not a solution design. Change a lead time on the right and watch the dates move.');
  wrap.appendChild(footer);

  var svg = el('svg', { width: '100%', height: '100%' });
  svg.style.cssText = 'position:absolute;inset:0;display:block;';
  stage.appendChild(svg);

  // hatch pattern for "at sea"
  var defs = el('defs');
  var pat = el('pattern', { id: 'f1hatch', width: '7', height: '7', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pat.appendChild(el('rect', { width: '7', height: '7', fill: C.white }));
  pat.appendChild(el('rect', { width: '2.4', height: '7', fill: C.grey60 }));
  defs.appendChild(pat);
  svg.appendChild(defs);

  // tooltip on body
  var tip = html('div', 'position:fixed;z-index:99;pointer-events:none;opacity:0;transition:opacity .12s;max-width:280px;background:' + C.charcoal + ';color:' + C.white + ';padding:10px 12px;border-radius:8px;font:500 12px/1.5 ' + SANS + ';box-shadow:0 8px 24px rgba(0,0,0,.28);');
  document.body.appendChild(tip);

  // ---- Layout metrics -----------------------------------------------------
  var M = { top: 18, bottom: 34, left: 168, right: 40 };
  function stageSize() {
    return { w: stage.clientWidth || window.innerWidth, h: stage.clientHeight || (window.innerHeight - 200) };
  }

  // time scale across all rows
  function timeScale(w) {
    var min = null, max = null;
    for (var i = 0; i < rowsData.length; i++) {
      var d = rowsData[i];
      var s = d.ships.getTime(), e = d.sells.getTime();
      if (min == null || s < min) min = s;
      if (max == null || e > max) max = e;
    }
    if (min == null) { min = Date.now(); max = min + 120 * DAY; }
    // pad: a little before ships, a little after last sale
    min -= 7 * DAY; max += 10 * DAY;
    var x0 = M.left, x1 = w - M.right, span = Math.max(1, max - min);
    return {
      min: min, max: max,
      x: function (t) { return x0 + (t - min) / span * (x1 - x0); },
      x0: x0, x1: x1
    };
  }

  function allocScale(rowH) {
    var maxA = 1;
    for (var i = 0; i < rowsData.length; i++) maxA = Math.max(maxA, rowsData[i].alloc);
    var maxHalf = Math.min(rowH * 0.40, 26), minHalf = 4;
    return function (a) {
      var t = Math.sqrt(Math.max(0, a) / maxA);   // sqrt so small markets stay visible
      return minHalf + t * (maxHalf - minHalf);
    };
  }

  // ---- Build / rebuild SVG geometry ---------------------------------------
  var built = {};   // name -> {group, seaEl, landEl, salePoly, originEl, tickLine, tickDot, hit, labelEl, chipEl, coverEl}

  function clearSvg() {
    while (svg.lastChild && svg.lastChild !== defs) svg.removeChild(svg.lastChild);
    // keep defs
    if (svg.firstChild !== defs) { svg.insertBefore(defs, svg.firstChild); }
    built = {};
  }

  function buildStatic() {
    clearSvg();
    var sz = stageSize(), w = sz.w, h = sz.h;
    var n = rowsData.length;
    var innerTop = M.top, innerBot = h - M.bottom;
    var rowH = n > 0 ? (innerBot - innerTop) / n : 0;
    var ts = timeScale(w);

    // month gridlines + axis labels
    var gg = el('g');
    var d0 = new Date(ts.min); d0.setUTCDate(1); d0.setUTCHours(0, 0, 0, 0);
    var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (var mt = d0.getTime(); mt <= ts.max; ) {
      var dt = new Date(mt);
      var x = ts.x(mt);
      if (x >= ts.x0 - 1 && x <= ts.x1 + 1) {
        gg.appendChild(el('line', { x1: x, y1: innerTop - 4, x2: x, y2: innerBot + 6, stroke: C.grey40, 'stroke-width': 1 }));
        var tl = el('text', { x: x + 4, y: innerBot + 22, fill: C.grey80, 'font-family': SANS, 'font-size': 11 });
        tl.textContent = mo[dt.getUTCMonth()] + ' ' + String(dt.getUTCFullYear()).slice(2);
        gg.appendChild(tl);
      }
      dt.setUTCMonth(dt.getUTCMonth() + 1); mt = dt.getTime();
    }
    svg.appendChild(gg);

    var aScale = allocScale(rowH);

    for (var i = 0; i < n; i++) {
      var d = rowsData[i];
      var cy = innerTop + rowH * (i + 0.5);
      var hh = aScale(d.alloc);

      var g = el('g');
      // faint row baseline
      g.appendChild(el('line', { x1: M.left, y1: cy, x2: ts.x1, y2: cy, stroke: C.grey20, 'stroke-width': 1 }));

      // market label + allocated chip (left gutter)
      var lab = el('text', { x: 24, y: cy - 2, fill: C.charcoal, 'font-family': SANS, 'font-size': 14, 'font-weight': 600 });
      lab.textContent = d.name; g.appendChild(lab);
      var chip = el('text', { x: 24, y: cy + 15, fill: C.grey80, 'font-family': SANS, 'font-size': 11 });
      chip.textContent = Math.round(d.alloc).toLocaleString() + ' cars'; g.appendChild(chip);

      // segments (geometry filled in by animate())
      var sea = el('rect', { y: cy - hh, height: hh * 2, fill: 'url(#f1hatch)', stroke: C.grey60, 'stroke-width': 0.75, rx: 2 });
      var land = el('rect', { y: cy - hh, height: hh * 2, fill: C.grey40, rx: 2 });
      var sale = el('polygon', { fill: bandColor(d.cover), opacity: 0.92 });
      var origin = el('rect', { width: 9, height: 9, fill: C.charcoal, rx: 1.5 });
      var tickLine = el('line', { stroke: C.red, 'stroke-width': 2 });
      var tickDot = el('circle', { r: 3.5, fill: C.red });
      var coverT = el('text', { fill: C.charcoal, 'font-family': SANS, 'font-size': 11, 'font-weight': 600, 'text-anchor': 'start' });
      coverT.textContent = (d.cover != null ? (Math.round(d.cover * 10) / 10) + ' wks · ' + bandLabel(d.cover) : '');

      g.appendChild(sea); g.appendChild(land); g.appendChild(sale);
      g.appendChild(origin); g.appendChild(tickLine); g.appendChild(tickDot); g.appendChild(coverT);

      // hit area for hover
      var hit = el('rect', { x: M.left, y: cy - Math.max(hh, 12), width: ts.x1 - M.left, height: Math.max(hh, 12) * 2, fill: 'transparent' });
      hit.style.cursor = 'pointer';
      (function (row) {
        hit.addEventListener('mousemove', function (ev) { showTip(ev, row); });
        hit.addEventListener('mouseleave', hideTip);
      })(d);
      g.appendChild(hit);

      svg.appendChild(g);
      built[d.name] = { g: g, cy: cy, hh: hh, sea: sea, land: land, sale: sale, origin: origin, tickLine: tickLine, tickDot: tickDot, coverT: coverT, ts: ts };

      // animation record
      var xs = ts.x(d.ships.getTime());
      var xa = ts.x((d.arrives || d.ships).getTime());
      var xk = ts.x((d.stock || d.arrives || d.ships).getTime());
      var xl = ts.x(d.sells.getTime());
      var tgt = { xs: xs, xa: xa, xk: xk, xl: xl };
      if (firstReveal || !anim[d.name]) {
        anim[d.name] = { cur: { xs: xs, xa: xs, xk: xs, xl: xs }, tgt: tgt, reveal: 0, delay: i * 90 };
      } else {
        anim[d.name].tgt = tgt; anim[d.name].reveal = 1;   // keep cur, tween to new tgt
      }
    }
  }

  // ---- Animate ------------------------------------------------------------
  function drawRow(name) {
    var b = built[name], a = anim[name];
    if (!b || !a) return;
    var cy = b.cy, hh = b.hh;
    var xs = a.cur.xs, xa = a.cur.xa, xk = a.cur.xk, xl = a.cur.xl;

    // at sea: ships -> arrives
    b.sea.setAttribute('x', xs);
    b.sea.setAttribute('width', Math.max(0, xa - xs));
    // landing: arrives -> in stock
    b.land.setAttribute('x', xa);
    b.land.setAttribute('width', Math.max(0, xk - xa));
    // on sale: taper in stock -> sells (full height -> 30%)
    var hhe = hh * 0.30;
    b.sale.setAttribute('points',
      xk + ',' + (cy - hh) + ' ' + xl + ',' + (cy - hhe) + ' ' + xl + ',' + (cy + hhe) + ' ' + xk + ',' + (cy + hh));
    // origin square at ships
    b.origin.setAttribute('x', xs - 4.5); b.origin.setAttribute('y', cy - 4.5);
    // handover tick at sells
    b.tickLine.setAttribute('x1', xl); b.tickLine.setAttribute('x2', xl);
    b.tickLine.setAttribute('y1', cy - hh - 5); b.tickLine.setAttribute('y2', cy + hh + 5);
    b.tickDot.setAttribute('cx', xl); b.tickDot.setAttribute('cy', cy - hh - 8);
    // cover label just right of sells
    b.coverT.setAttribute('x', xl + 10); b.coverT.setAttribute('y', cy + 4);
  }

  function tick(ts) {
    if (!animT0) animT0 = ts;
    var t = ts - animT0;
    var dur = 780;
    var stillAnimating = false;

    for (var name in anim) {
      var a = anim[name];
      if (a.reveal < 1) {
        // first-load reveal: grow from origin to full journey, staggered
        var local = Math.max(0, t - (a.delay || 0));
        var p = easeOutCubic(Math.min(1, local / dur));
        a.reveal = p;
        a.cur.xs = a.tgt.xs;
        a.cur.xa = lerp(a.tgt.xs, a.tgt.xa, p);
        a.cur.xk = lerp(a.tgt.xs, a.tgt.xk, p);
        a.cur.xl = lerp(a.tgt.xs, a.tgt.xl, p);
        if (p < 1) stillAnimating = true;
      } else if (a.tweenFrom) {
        // data-change tween: move cur -> tgt
        var p2 = easeOutCubic(Math.min(1, (t - a.tweenStart) / dur));
        a.cur.xs = lerp(a.tweenFrom.xs, a.tgt.xs, p2);
        a.cur.xa = lerp(a.tweenFrom.xa, a.tgt.xa, p2);
        a.cur.xk = lerp(a.tweenFrom.xk, a.tgt.xk, p2);
        a.cur.xl = lerp(a.tweenFrom.xl, a.tgt.xl, p2);
        if (p2 < 1) stillAnimating = true; else a.tweenFrom = null;
      } else {
        a.cur.xs = a.tgt.xs; a.cur.xa = a.tgt.xa; a.cur.xk = a.tgt.xk; a.cur.xl = a.tgt.xl;
      }
      drawRow(name);
    }
    if (stillAnimating) rafId = requestAnimationFrame(tick);
    else rafId = null;
  }

  function startAnim(fromTween) {
    if (fromTween) {
      for (var name in anim) {
        var a = anim[name];
        a.tweenFrom = { xs: a.cur.xs, xa: a.cur.xa, xk: a.cur.xk, xl: a.cur.xl };
        a.tweenStart = 0;
      }
    }
    animT0 = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  // ---- Tooltip ------------------------------------------------------------
  function showTip(ev, d) {
    var seaW = weeksBetween(d.ships, d.arrives);
    var lines = [];
    lines.push('<div style="font:700 13px/1.3 ' + SANS + ';margin-bottom:4px;">' + esc(d.name) + '</div>');
    lines.push(row2('Allocated', Math.round(d.alloc).toLocaleString() + ' cars'));
    lines.push(row2('Ships', fmtDate(d.ships)));
    lines.push(row2('At sea', (seaW != null ? seaW + ' wks → ' : '') + fmtDate(d.arrives)));
    lines.push(row2('In stock', fmtDate(d.stock)));
    lines.push(row2('On sale from', fmtDate(d.sells)));
    lines.push(row2('Weeks of cover', (d.cover != null ? (Math.round(d.cover * 10) / 10) + ' · ' + bandLabel(d.cover) : '—')));
    tip.innerHTML = lines.join('');
    tip.style.opacity = '1';
    var pad = 16, tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + tw > window.innerWidth - 8) x = ev.clientX - tw - pad;
    if (y + th > window.innerHeight - 8) y = ev.clientY - th - pad;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function row2(k, v) {
    return '<div style="display:flex;justify-content:space-between;gap:16px;">' +
      '<span style="color:' + C.grey60 + ';">' + esc(k) + '</span>' +
      '<span style="color:#fff;font-weight:600;">' + esc(v) + '</span></div>';
  }
  function hideTip() { tip.style.opacity = '0'; }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; }); }

  // ---- State views (skeleton / empty / error) -----------------------------
  function renderState() {
    if (state === 'ready') {
      sub.textContent = MODEL_SEL + ' · week commencing ' + PW_SEL.replace('WC ', '') + ' · ' + rowsData.length + ' markets';
      buildStatic();
      startAnim(!firstReveal);
      firstReveal = false;
      return;
    }
    // non-ready: clear svg, show a centered message / skeleton
    clearSvg();
    var sz = stageSize(), w = sz.w, h = sz.h;
    if (state === 'loading') {
      sub.textContent = MODEL_SEL + ' · loading…';
      for (var i = 0; i < 6; i++) {
        var y = M.top + (h - M.top - M.bottom) / 6 * (i + 0.5);
        var sk = el('rect', { x: M.left, y: y - 9, width: (w - M.left - M.right) * (0.4 + 0.5 * Math.random()), height: 18, rx: 4, fill: C.grey20 });
        var an = el('animate', { attributeName: 'opacity', values: '0.5;1;0.5', dur: '1.3s', repeatCount: 'indefinite' });
        sk.appendChild(an); svg.appendChild(sk);
      }
    } else {
      var msg = state === 'error' ? ('Could not load data — ' + errMsg) : 'No cars were allocated for this week.';
      var t = el('text', { x: w / 2, y: h / 2, fill: C.grey80, 'font-family': SANS, 'font-size': 15, 'text-anchor': 'middle' });
      t.textContent = msg; svg.appendChild(t);
    }
  }

  // ---- Subscription -------------------------------------------------------
  var sub_ = null;
  try {
    sub_ = window.PigmentSDK.subscribeToVizualization('V', {
      pageDefinitions: [
        { alias: 'ModelList', selection: [MODEL_SEL] },
        { alias: 'PWList', selection: [PW_SEL] }
      ],
      scroll: { offset: 0, numberOfRows: 50 },
      onData: function (data) {
        if (!isReady(data)) { if (state !== 'ready') { state = 'loading'; renderState(); } return; }
        var parsed = parseRows(data);
        if (!parsed.length) { state = 'empty'; renderState(); return; }
        var key = parsed.map(function (r) {
          return r.name + '|' + Math.round(r.alloc) + '|' + (+r.ships) + '|' + (+r.arrives) + '|' + (+r.stock) + '|' + (+r.sells) + '|' + r.cover;
        }).join(';');
        if (key === lastKey && state === 'ready') return;   // no real change
        lastKey = key; rowsData = parsed; state = 'ready';
        renderState();
      },
      onError: function (err) { state = 'error'; errMsg = (err && err.message) || String(err); renderState(); }
    });
  } catch (e) {
    state = 'error'; errMsg = e.message; renderState();
  }
  renderState();

  // ---- Resize -------------------------------------------------------------
  var rTimer = null;
  function onResize() {
    if (rTimer) clearTimeout(rTimer);
    rTimer = setTimeout(function () {
      if (state === 'ready') { firstReveal = false; buildStatic(); startAnim(false); }
      else renderState();
    }, 120);
  }
  window.addEventListener('resize', onResize);
  var ro = null;
  try { ro = new ResizeObserver(onResize); ro.observe(document.documentElement); } catch (e) {}

  // ---- Cleanup ------------------------------------------------------------
  root.__cleanup = function () {
    try { if (sub_ && sub_.unsubscribe) sub_.unsubscribe(); } catch (e) {}
    window.removeEventListener('resize', onResize);
    try { if (ro) ro.disconnect(); } catch (e) {}
    if (rTimer) clearTimeout(rTimer);
    if (rafId) cancelAnimationFrame(rafId);
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
  };
})();
