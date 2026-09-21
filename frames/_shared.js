/* ---------------------------------------------------------------------------
 * PF - shared module for the [POC] Clinical Trials Pricing Frames.
 *
 * Inlined verbatim at the top of every Frame body by frames/build.py. The
 * sandbox blocks all network access, so there is no other way to share code.
 * Edit this file, never a Frame body in Pigment.
 *
 * Written against the API this tenant actually serves (see README):
 * subscribeToDataSource returns row-major sparse rows, not cells[c][r], and
 * pageDefinitions is gone in favour of dynamicFilters.
 *
 * Deliberately contains no double-quote and no backslash characters, so a
 * Frame body survives a JSON tool argument without hand-escaping. build.py
 * enforces this.
 * ------------------------------------------------------------------------- */
var PF = (function () {
  'use strict';

  var NL = String.fromCharCode(10);
  var DASH = String.fromCharCode(8211);      /* en dash, for empty values */
  var ARROW = String.fromCharCode(8594);
  var ELLIPSIS = String.fromCharCode(8230);

  /* -- tokens -------------------------------------------------------------- */
  var T = {
    bg: '#F6F7F9',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    borderStrong: '#D1D5DB',
    ink: '#111827',
    muted: '#6B7280',
    faint: '#9CA3AF',
    accent: '#4F46E5',
    accentSoft: '#EEF2FF',
    cashPosition: '#1E3A8A',
    cashPayments: '#F97316',
    earntRevenue: '#BE185D',
    ok: '#059669',
    warn: '#D97706',
    neutral: '#6B7280',
    dormant: '#9CA3AF',
    font: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  };

  /* Colour carries meaning only for status and the cashflow series. Matched
     loosely because several of these lists are free text. */
  function statusColor(raw) {
    var s = String(raw == null ? '' : raw).toLowerCase();
    if (!s) return T.faint;
    if (s.indexOf('approv') === 0 || s.indexOf('won') >= 0 || s.indexOf('complete') >= 0) return T.ok;
    if (s.indexOf('await') >= 0 || s.indexOf('probable') >= 0 || s.indexOf('progress') >= 0 ||
        s.indexOf('request') >= 0) return T.warn;
    if (s.indexOf('supersed') >= 0 || s.indexOf('template') >= 0) return T.dormant;
    if (s.indexOf('reject') >= 0 || s.indexOf('lost') >= 0) return T.earntRevenue;
    return T.neutral;
  }

  /* -- dataSource payloads ------------------------------------------------- */
  /* Shape, confirmed by probe:
       { rows: [ { labels: [String], values: [Number|String] } ],
         rowOffset: Number, totalRowCount: Number }
     Rows are SPARSE - a combination with no data is absent, not null. Never
     assume a row exists for every item. */
  function ready(d) { return !!(d && d.rows && typeof d.rows.length === 'number'); }
  function rows(d) { return ready(d) ? d.rows : []; }
  function truncated(d) {
    if (!ready(d)) return false;
    return typeof d.totalRowCount === 'number' && d.rows.length < d.totalRowCount;
  }
  function lab(row, i) {
    if (!row || !row.labels) return '';
    var v = row.labels[i == null ? 0 : i];
    return v == null ? '' : String(v);
  }
  function val(row, i) {
    if (!row || !row.values) return null;
    var v = row.values[i == null ? 0 : i];
    return v === undefined ? null : v;
  }
  function numOf(v) {
    if (typeof v === 'number' && isFinite(v)) return v;
    return null;
  }
  function textOf(v) {
    if (v == null) return '';
    if (typeof v === 'object') return '';
    return String(v);
  }
  /* Rows whose label at labelIdx equals `key` exactly. The version label is
     always label 0 in these manifests, so this is how a panel narrows to the
     selected version without a server-side filter. */
  function where(d, labelIdx, key) {
    var all = rows(d), out = [], i;
    for (i = 0; i < all.length; i++) {
      if (lab(all[i], labelIdx) === key) out.push(all[i]);
    }
    return out;
  }
  function firstWhere(d, labelIdx, key) {
    var r = where(d, labelIdx, key);
    return r.length ? r[0] : null;
  }
  /* Ordered distinct labels at one index, across the given rows. */
  function axis(list, labelIdx) {
    var seen = {}, out = [], i, k;
    for (i = 0; i < list.length; i++) {
      k = lab(list[i], labelIdx);
      if (k && !seen[k]) { seen[k] = 1; out.push(k); }
    }
    return out;
  }

  /* -- dynamicFilters shape negotiation ------------------------------------ */
  /* pageDefinitions is gone and the replacement's shape is not documented, so
     the Frame works it out at runtime: fetch a baseline, then try each
     candidate and accept the first whose payload actually differs. A shape
     that is silently ignored returns the baseline, which is exactly the
     failure this catches - an error alone would not. */
  var SHAPES = [
    { id: 'selector+values',    make: function (s, v) { return { selector: s, values: v }; } },
    { id: 'binding+values',     make: function (s, v) { return { binding: s, values: v }; } },
    { id: 'alias+selection',    make: function (s, v) { return { alias: s, selection: v }; } },
    { id: 'name+values',        make: function (s, v) { return { name: s, values: v }; } },
    { id: 'selector+selection', make: function (s, v) { return { selector: s, selection: v }; } },
    { id: 'dimension+items',    make: function (s, v) { return { dimension: s, items: v }; } },
    { id: 'binding+modalities', make: function (s, v) { return { binding: s, modalities: v }; } }
  ];

  function fingerprint(d) {
    if (!ready(d)) return 'x';
    var n = d.rows.length, sum = 0, i, j, v;
    for (i = 0; i < n; i++) {
      for (j = 0; j < (d.rows[i].values || []).length; j++) {
        v = numOf(d.rows[i].values[j]);
        if (v !== null) sum += v;
      }
    }
    return n + ':' + d.totalRowCount + ':' + sum.toFixed(4);
  }

  /* negotiate(sdk, dsName, selectorAlias, sampleValue, done)
     done(shapeOrNull) - null means no candidate worked, so callers must fall
     back to fetching unfiltered and narrowing client-side. */
  function negotiate(sdk, dsName, selectorAlias, sampleValue, done) {
    var baseline = null, finished = false, idx = 0, subs = [];

    function cleanup() {
      for (var i = 0; i < subs.length; i++) { try { subs[i].unsubscribe(); } catch (e) {} }
      subs = [];
    }
    function settle(shape) {
      if (finished) return;
      finished = true;
      cleanup();
      done(shape);
    }
    function tryNext() {
      if (idx >= SHAPES.length) { settle(null); return; }
      var shape = SHAPES[idx++];
      var answered = false;
      var sub;
      try {
        sub = sdk.subscribeToDataSource(dsName, {
          dynamicFilters: [shape.make(selectorAlias, [sampleValue])],
          onData: function (d) {
            if (answered) return;
            answered = true;
            if (fingerprint(d) !== baseline) settle(shape);
            else tryNext();                       /* accepted but ignored */
          },
          onError: function () {
            if (answered) return;
            answered = true;
            tryNext();
          }
        });
        subs.push(sub);
      } catch (e) { tryNext(); }
    }

    var base;
    try {
      base = sdk.subscribeToDataSource(dsName, {
        dynamicFilters: [],
        onData: function (d) {
          if (baseline !== null) return;
          baseline = fingerprint(d);
          tryNext();
        },
        onError: function () { settle(null); }
      });
      subs.push(base);
    } catch (e) { settle(null); }
  }

  /* -- formatting ---------------------------------------------------------- */
  function fmtNum(v, dp) {
    var n = numOf(v);
    if (n === null) return DASH;
    var d = dp == null ? 0 : dp;
    return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function money(v, cur) {
    var n = numOf(v);
    if (n === null) return DASH;
    var s = n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return cur ? (cur + ' ' + s) : s;
  }
  function fmtPct(v, dp) {
    var n = numOf(v);
    if (n === null) return DASH;
    return (n * 100).toFixed(dp == null ? 1 : dp) + '%';
  }
  function compact(v, cur) {
    var n = numOf(v);
    if (n === null) return DASH;
    var a = Math.abs(n), s;
    if (a >= 1e9) s = (n / 1e9).toFixed(1) + 'bn';
    else if (a >= 1e6) s = (n / 1e6).toFixed(2) + 'm';
    else if (a >= 1e3) s = Math.round(n / 1e3) + 'k';
    else s = String(Math.round(n));
    return cur ? (cur + ' ' + s) : s;
  }
  function fmtDate(v) {
    var s = textOf(v);
    if (!s) return DASH;
    var d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  }
  function esc(s) {
    var t = String(s == null ? '' : s);
    t = t.split('&').join('&amp;');
    t = t.split('<').join('&lt;');
    t = t.split('>').join('&gt;');
    t = t.split(String.fromCharCode(34)).join('&quot;');
    t = t.split(String.fromCharCode(39)).join('&#39;');
    return t;
  }
  /* A TextList aggregator returns one joined string and the separator is not
     documented, so accept the plausible ones. */
  function splitList(v) {
    var s = textOf(v);
    if (!s) return [];
    var parts = [s], seps = [';', '|', NL, ','], i, j, next;
    for (i = 0; i < seps.length; i++) {
      next = [];
      for (j = 0; j < parts.length; j++) next = next.concat(parts[j].split(seps[i]));
      parts = next;
    }
    var out = [];
    for (i = 0; i < parts.length; i++) {
      var p = trim(parts[i]);
      if (p) out.push(p);
    }
    return out;
  }
  /* String.prototype.trim exists, but a regex trim would put a backslash in
     this file and build.py forbids those - see the header. */
  function trim(s) { return String(s == null ? '' : s).trim(); }

  /* -- DOM ----------------------------------------------------------------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function injectStyles(id, css) {
    var prev = document.getElementById(id);
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
    var st = document.createElement('style');
    st.id = id;
    st.textContent = css;
    document.head.appendChild(st);
    return st;
  }
  function q(s) { return String.fromCharCode(39) + s + String.fromCharCode(39); }

  function baseCss() {
    return '' +
    '*,*::before,*::after{box-sizing:border-box}' +
    '.pf{position:fixed;inset:0;overflow:auto;background:' + T.bg + ';color:' + T.ink + ';' +
      'font-family:' + T.font + ';font-size:14px;line-height:1.45;-webkit-font-smoothing:antialiased}' +
    '.pf-hd{position:sticky;top:0;z-index:20;min-height:56px;display:flex;align-items:center;gap:16px;' +
      'padding:0 24px;background:' + T.surface + ';border-bottom:1px solid ' + T.border + ';flex-wrap:wrap}' +
    '.pf-hd-title{font-size:16px;font-weight:600;white-space:nowrap}' +
    '.pf-crumb{color:' + T.muted + ';font-size:13px;display:flex;align-items:center;gap:6px;min-width:0}' +
    '.pf-crumb b{color:' + T.ink + ';font-weight:600}' +
    '.pf-spacer{flex:1 1 auto}' +
    '.pf-body{padding:24px;max-width:1400px;margin:0 auto}' +
    '.pf-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}' +
    '.pf-card{background:' + T.surface + ';border:1px solid ' + T.border + ';border-radius:8px;padding:16px}' +
    '.pf-card h2{margin:0 0 12px;font-size:14px;font-weight:600}' +
    '.pf-sub{color:' + T.muted + ';font-size:12px;font-weight:400;margin-left:8px}' +
    '.pf-tile-label{color:' + T.muted + ';font-size:12px;text-transform:uppercase;letter-spacing:.04em}' +
    '.pf-tile-value{font-size:24px;font-weight:600;font-variant-numeric:tabular-nums;margin-top:4px;' +
      'overflow-wrap:anywhere}' +
    '.pf-tile-value.pf-sm{font-size:16px;font-weight:500}' +
    '.pf-pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;' +
      'color:#fff;white-space:nowrap}' +
    '.pf-chip{display:inline-block;padding:3px 10px;border-radius:6px;font-size:12px;margin:0 6px 6px 0;' +
      'background:' + T.bg + ';border:1px solid ' + T.border + '}' +
    '.pf-chip.pf-out{color:' + T.faint + ';text-decoration:line-through}' +
    '.pf-tag{display:inline-block;padding:1px 8px;border-radius:4px;font-size:11px;' +
      'background:' + T.bg + ';border:1px dashed ' + T.borderStrong + ';color:' + T.muted + '}' +
    '.pf-btn{appearance:none;border:1px solid ' + T.borderStrong + ';background:' + T.surface + ';' +
      'color:' + T.ink + ';font:inherit;font-size:13px;padding:6px 12px;border-radius:6px;cursor:pointer}' +
    '.pf-btn:hover{border-color:' + T.accent + ';color:' + T.accent + '}' +
    '.pf-btn.pf-primary{background:' + T.accent + ';border-color:' + T.accent + ';color:#fff}' +
    '.pf-btn:disabled{opacity:.5;cursor:default}' +
    '.pf-sel{font:inherit;font-size:13px;padding:6px 10px;border-radius:6px;' +
      'border:1px solid ' + T.borderStrong + ';background:' + T.surface + ';color:' + T.ink + ';max-width:340px}' +
    '.pf-tbl{width:100%;border-collapse:collapse;font-size:13px}' +
    '.pf-tbl th{text-align:left;color:' + T.muted + ';font-weight:600;font-size:11px;text-transform:uppercase;' +
      'letter-spacing:.04em;padding:6px 8px;border-bottom:1px solid ' + T.border + '}' +
    '.pf-tbl td{padding:7px 8px;border-bottom:1px solid ' + T.border + ';vertical-align:top}' +
    '.pf-tbl tr:last-child td{border-bottom:none}' +
    '.pf-num{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}' +
    '.pf-bar{position:relative;height:18px;background:' + T.bg + ';border-radius:3px;overflow:hidden}' +
    '.pf-bar-outer{position:absolute;inset:0 auto 0 0;background:' + T.accent + ';opacity:.22;height:100%}' +
    '.pf-bar-inner{position:absolute;inset:0 auto 0 0;background:' + T.cashPayments + ';opacity:.85;height:100%}' +
    '.pf-state{padding:36px 24px;text-align:center;color:' + T.muted + ';font-size:14px}' +
    '.pf-state.pf-err{color:#B91C1C}' +
    '.pf-banner{background:#FFFBEB;border:1px solid #FDE68A;color:#92400E;border-radius:6px;' +
      'padding:8px 12px;font-size:13px;margin-bottom:12px}' +
    '.pf-ta{width:100%;min-height:96px;font:inherit;font-size:13px;padding:10px;border-radius:6px;' +
      'border:1px solid ' + T.borderStrong + ';background:' + T.surface + ';color:' + T.ink + ';resize:vertical}' +
    '.pf-ta:hover{border-color:' + T.accent + '}' +
    '.pf-ta:focus{outline:2px solid ' + T.accentSoft + ';border-color:' + T.accent + '}' +
    '.pf-wstate{font-size:12px;color:' + T.muted + ';margin-top:6px;min-height:16px}' +
    '.pf-wstate.pf-ok{color:' + T.ok + '}' +
    '.pf-wstate.pf-bad{color:#B91C1C}' +
    '.pf-tip{position:fixed;z-index:9999;pointer-events:none;background:#111827;opacity:0;color:#fff;' +
      'font-family:' + T.font + ';font-size:12px;line-height:1.5;padding:8px 10px;border-radius:6px;' +
      'max-width:320px;transition:opacity .08s}' +
    '@media (max-width:1023px){.pf-grid{grid-template-columns:repeat(6,1fr)}}' +
    '@media print{' +
      '.pf{position:static;overflow:visible;background:#fff}' +
      '.pf-hd{position:static}' +
      '.pf-noprint{display:none}' +
      '.pf-body{width:1120px;max-width:1120px;padding:0}' +
      '.pf-card{break-inside:avoid;border-color:' + T.borderStrong + '}' +
    '}';
  }

  /* -- tooltip ------------------------------------------------------------- */
  function makeTooltip() {
    var node = el('div', 'pf-tip');
    document.body.appendChild(node);
    var shown = false;
    return {
      node: node,
      show: function (html, x, y) {
        node.innerHTML = html;
        node.style.opacity = '1';
        shown = true;
        this.move(x, y);
      },
      move: function (x, y) {
        if (!shown) return;
        var w = node.offsetWidth, h = node.offsetHeight;
        var left = x + 14, top = y + 14;
        if (left + w > window.innerWidth - 8) left = x - w - 14;
        if (top + h > window.innerHeight - 8) top = y - h - 14;
        node.style.left = Math.max(8, left) + 'px';
        node.style.top = Math.max(8, top) + 'px';
      },
      hide: function () { shown = false; node.style.opacity = '0'; },
      destroy: function () { if (node.parentNode) node.parentNode.removeChild(node); }
    };
  }

  /* -- lifecycle ----------------------------------------------------------- */
  function lifecycle() {
    var subs = [], listeners = [], timers = [], frames = [], observers = [], nodes = [];
    return {
      sub: function (s) { if (s) subs.push(s); return s; },
      on: function (target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        listeners.push([target, type, fn, opts]);
        return fn;
      },
      timer: function (id) { timers.push(id); return id; },
      raf: function (id) { frames.push(id); return id; },
      observer: function (o) { observers.push(o); return o; },
      node: function (n) { nodes.push(n); return n; },
      destroy: function () {
        var i;
        for (i = 0; i < subs.length; i++) { try { subs[i].unsubscribe(); } catch (e) {} }
        for (i = 0; i < listeners.length; i++) {
          try {
            listeners[i][0].removeEventListener(listeners[i][1], listeners[i][2], listeners[i][3]);
          } catch (e) {}
        }
        for (i = 0; i < timers.length; i++) { clearTimeout(timers[i]); clearInterval(timers[i]); }
        for (i = 0; i < frames.length; i++) { cancelAnimationFrame(frames[i]); }
        for (i = 0; i < observers.length; i++) { try { observers[i].disconnect(); } catch (e) {} }
        for (i = 0; i < nodes.length; i++) {
          try { if (nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]); } catch (e) {}
        }
        subs = []; listeners = []; timers = []; frames = []; observers = []; nodes = [];
      }
    };
  }

  function debounce(fn, ms) {
    var id = null;
    var wrapped = function () {
      var args = arguments, self = this;
      if (id) clearTimeout(id);
      id = setTimeout(function () { id = null; fn.apply(self, args); }, ms);
    };
    wrapped.cancel = function () { if (id) { clearTimeout(id); id = null; } };
    return wrapped;
  }

  /* -- canvas -------------------------------------------------------------- */
  /* Physical pixels via devicePixelRatio, CSS size kept separately, or the
     bitmap is stretched and blurry on a Retina display. */
  function fitCanvas(canvas, cssW, cssH) {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);
    return ctx;
  }

  /* -- states -------------------------------------------------------------- */
  function stateLoading(msg) { return '<div class=' + q('pf-state') + '>' + esc(msg || ('Loading' + ELLIPSIS)) + '</div>'; }
  function stateEmpty(msg) { return '<div class=' + q('pf-state') + '>' + esc(msg || 'No data for this version.') + '</div>'; }
  function stateError(msg) { return '<div class=' + q('pf-state pf-err') + '>' + esc(msg || 'Something went wrong.') + '</div>'; }
  function banner(msg) { return '<div class=' + q('pf-banner') + '>' + esc(msg) + '</div>'; }

  /* -- version switcher ---------------------------------------------------- */
  /* subscribeToItems returns display-name strings with no properties, so
     Version Type cannot be read from a list subscription. setTypes() accepts
     a name -> type map from a dataSource when one exists; until then the
     superseded toggle stays hidden rather than pretending to work. */
  function versionSwitcher(opts) {
    var wrap = el('div', 'pf-crumb');
    var sel = el('select', 'pf-sel');
    sel.setAttribute('aria-label', 'Project version');
    var toggleWrap = el('label', 'pf-crumb');
    toggleWrap.style.cssText = 'gap:4px;cursor:pointer;font-size:12px;display:none';
    var toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggleWrap.appendChild(toggle);
    toggleWrap.appendChild(document.createTextNode('show superseded'));
    wrap.appendChild(sel);
    wrap.appendChild(toggleWrap);

    var all = [], types = null, current = null;

    function isSuperseded(name) {
      if (!types) return false;
      return String(types[name] || '').toLowerCase().indexOf('supersed') >= 0;
    }
    function visible() {
      if (!types || toggle.checked) return all;
      var out = [], i;
      for (i = 0; i < all.length; i++) if (!isSuperseded(all[i])) out.push(all[i]);
      return out.length ? out : all;
    }
    function paint() {
      var list = visible(), i, found = false;
      sel.innerHTML = '';
      for (i = 0; i < list.length; i++) {
        var o = document.createElement('option');
        o.value = list[i];
        o.textContent = list[i] + (isSuperseded(list[i]) ? '  (superseded)' : '');
        sel.appendChild(o);
        if (list[i] === current) found = true;
      }
      if (!found) current = list.length ? list[0] : null;
      if (current != null) sel.value = current;
    }
    function fire() { if (current != null && opts && opts.onChange) opts.onChange(current); }

    sel.addEventListener('change', function () { current = sel.value; fire(); });
    toggle.addEventListener('change', function () {
      var before = current;
      paint();
      if (current !== before) fire();
    });

    return {
      node: wrap,
      selected: function () { return current; },
      setItems: function (items) {
        all = items || [];
        var had = current;
        paint();
        if (current !== had) fire();
      },
      setTypes: function (map) {
        types = map || null;
        toggleWrap.style.display = types ? 'flex' : 'none';
        var had = current;
        paint();
        if (current !== had) fire();
      }
    };
  }

  return {
    T: T, NL: NL, DASH: DASH, ARROW: ARROW, ELLIPSIS: ELLIPSIS,
    q: q,
    statusColor: statusColor,
    ready: ready, rows: rows, truncated: truncated,
    lab: lab, val: val, numOf: numOf, textOf: textOf,
    where: where, firstWhere: firstWhere, axis: axis,
    SHAPES: SHAPES, negotiate: negotiate, fingerprint: fingerprint,
    fmtNum: fmtNum, money: money, fmtPct: fmtPct, compact: compact, fmtDate: fmtDate,
    esc: esc, splitList: splitList, trim: trim,
    el: el, injectStyles: injectStyles, baseCss: baseCss,
    makeTooltip: makeTooltip, lifecycle: lifecycle, debounce: debounce,
    fitCanvas: fitCanvas,
    stateLoading: stateLoading, stateEmpty: stateEmpty, stateError: stateError, banner: banner,
    versionSwitcher: versionSwitcher
  };
})();
