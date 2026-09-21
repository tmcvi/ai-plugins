/* ---------------------------------------------------------------------------
 * PF - shared module for the [POC] Clinical Trials Pricing Frames.
 *
 * Inlined verbatim at the top of every Frame body by frames/build.py. The
 * sandbox blocks all network access, so there is no other way to share code.
 * Edit this file, never a Frame body in Pigment.
 *
 * House style: neutral Pigment-native (see section 3 of the briefing).
 * No template literals anywhere - Frame bodies travel as JSON tool arguments.
 * ------------------------------------------------------------------------- */
var PF = (function () {
  'use strict';

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
    font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  };

  /* Status colouring is the only place colour carries meaning outside the
     four cashflow series. Matched loosely because the underlying lists are
     free text in places. */
  function statusColor(raw) {
    var s = String(raw == null ? '' : raw).toLowerCase();
    if (!s) return T.faint;
    if (s.indexOf('approv') === 0 || s.indexOf('won') >= 0 || s.indexOf('complete') >= 0) return T.ok;
    if (s.indexOf('await') >= 0 || s.indexOf('probable') >= 0 || s.indexOf('progress') >= 0 || s.indexOf('request') >= 0) return T.warn;
    if (s.indexOf('supersed') >= 0 || s.indexOf('template') >= 0) return T.dormant;
    if (s.indexOf('reject') >= 0 || s.indexOf('lost') >= 0) return T.earntRevenue;
    return T.neutral;
  }

  /* -- SDK readiness ------------------------------------------------------- */
  /* onData fires repeatedly (empty -> loading -> final). Only kind:'loading'
     means not ready; zero rows after loading is a valid empty result. */
  function hasLoadingKind(arr) {
    if (!arr) return false;
    for (var i = 0; i < arr.length; i++) {
      var item = arr[i];
      if (Array.isArray(item)) { if (hasLoadingKind(item)) return true; }
      else if (item && typeof item === 'object' && item.kind === 'loading') return true;
    }
    return false;
  }
  function isReady(data) {
    if (!data || !data.labels || !data.labels.columns || !data.labels.columns.length) return false;
    return !hasLoadingKind(data.labels.rows) &&
           !hasLoadingKind(data.labels.columns) &&
           !hasLoadingKind(data.cells);
  }

  /* A label is a pivot path: take the last plain string in it. */
  function labelText(label) {
    if (label == null) return '';
    if (typeof label === 'string') return label;
    if (Array.isArray(label)) {
      for (var i = label.length - 1; i >= 0; i--) {
        var part = label[i];
        if (typeof part === 'string' && part) return part;
      }
      return '';
    }
    if (typeof label === 'object') {
      if (label.kind === 'total') return 'Total';
      return '';
    }
    return String(label);
  }
  function isTotalLabel(label) {
    if (Array.isArray(label)) {
      for (var i = 0; i < label.length; i++) {
        var p = label[i];
        if (p && typeof p === 'object' && p.kind === 'total') return true;
      }
      return false;
    }
    return !!(label && typeof label === 'object' && label.kind === 'total');
  }

  /* A cell is number | string | boolean | null | {kind}. Anything with a
     kind is not a value. */
  function num(cell) {
    if (typeof cell === 'number' && isFinite(cell)) return cell;
    return null;
  }
  function text(cell) {
    if (cell == null) return '';
    if (typeof cell === 'object') return '';
    return String(cell);
  }
  function cellAt(data, c, r) {
    if (!data || !data.cells || !data.cells[c]) return null;
    return data.cells[c][r];
  }
  /* Find a row index by its label, case-insensitively, substring match. */
  function rowIndexByLabel(data, needle) {
    if (!data || !data.labels || !data.labels.rows) return -1;
    var want = String(needle).toLowerCase();
    var rows = data.labels.rows;
    for (var r = 0; r < rows.length; r++) {
      if (labelText(rows[r]).toLowerCase().indexOf(want) >= 0) return r;
    }
    return -1;
  }
  function colIndexByLabel(data, needle) {
    if (!data || !data.labels || !data.labels.columns) return -1;
    var want = String(needle).toLowerCase();
    var cols = data.labels.columns;
    for (var c = 0; c < cols.length; c++) {
      if (labelText(cols[c]).toLowerCase().indexOf(want) >= 0) return c;
    }
    return -1;
  }

  /* -- formatting ---------------------------------------------------------- */
  function fmtNum(v, dp) {
    var n = num(v);
    if (n === null) return '–';
    var d = dp == null ? 0 : dp;
    return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  /* Currency symbol is deliberately absent: the model carries Budget Currency
     per version and no Frame binds it yet. Numbers are unambiguous without it
     and a wrong symbol would be worse than none. */
  function fmtMoney(v) { return fmtNum(v, 0); }
  function fmtPct(v, dp) {
    var n = num(v);
    if (n === null) return '–';
    var d = dp == null ? 1 : dp;
    return (n * 100).toFixed(d) + '%';
  }
  function fmtCompact(v) {
    var n = num(v);
    if (n === null) return '–';
    var a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(1) + 'bn';
    if (a >= 1e6) return (n / 1e6).toFixed(2) + 'm';
    if (a >= 1e3) return Math.round(n / 1e3) + 'k';
    return String(Math.round(n));
  }
  /* Dates arrive as ISO strings. */
  function fmtDate(v) {
    var s = text(v);
    if (!s) return '–';
    var d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  /* TEXTLIST metrics arrive as one string; the separator is not documented,
     so accept the plausible ones. Verified against live data as part of the
     day-one checks. */
  function splitTextList(v) {
    var s = text(v);
    if (!s) return [];
    var parts = s.split(/\s*(?:;|\||,(?=\s*[A-Z0-9])|\n)\s*/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (p) out.push(p);
    }
    return out;
  }

  /* -- DOM ----------------------------------------------------------------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* One stylesheet per Frame, injected into the document head. */
  function injectStyles(id, css) {
    var prev = document.getElementById(id);
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
    var st = document.createElement('style');
    st.id = id;
    st.textContent = css;
    document.head.appendChild(st);
    return st;
  }

  function baseCss() {
    return '' +
    '*,*::before,*::after{box-sizing:border-box}' +
    '.pf{position:fixed;inset:0;overflow:auto;background:' + T.bg + ';color:' + T.ink + ';' +
      'font-family:' + T.font + ';font-size:14px;line-height:1.45;-webkit-font-smoothing:antialiased}' +
    '.pf-num{font-variant-numeric:tabular-nums;text-align:right}' +
    '.pf-hd{position:sticky;top:0;z-index:20;height:56px;display:flex;align-items:center;gap:16px;' +
      'padding:0 24px;background:' + T.surface + ';border-bottom:1px solid ' + T.border + '}' +
    '.pf-hd-title{font-size:16px;font-weight:600;white-space:nowrap}' +
    '.pf-crumb{color:' + T.muted + ';font-size:13px;display:flex;align-items:center;gap:6px;min-width:0}' +
    '.pf-crumb b{color:' + T.ink + ';font-weight:600}' +
    '.pf-spacer{flex:1 1 auto}' +
    '.pf-body{padding:24px;max-width:1400px;margin:0 auto}' +
    '.pf-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}' +
    '.pf-card{background:' + T.surface + ';border:1px solid ' + T.border + ';border-radius:8px;padding:16px}' +
    '.pf-card h2{margin:0 0 12px;font-size:14px;font-weight:600;letter-spacing:.01em}' +
    '.pf-sub{color:' + T.muted + ';font-size:12px;font-weight:400;margin-left:8px}' +
    '.pf-tile-label{color:' + T.muted + ';font-size:12px;text-transform:uppercase;letter-spacing:.04em}' +
    '.pf-tile-value{font-size:24px;font-weight:600;font-variant-numeric:tabular-nums;margin-top:4px;' +
      'overflow-wrap:anywhere}' +
    '.pf-tile-value.pf-sm{font-size:16px;font-weight:500}' +
    '.pf-pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;' +
      'color:#fff;white-space:nowrap}' +
    '.pf-chip{display:inline-block;padding:3px 10px;border-radius:6px;font-size:12px;margin:0 6px 6px 0;' +
      'background:' + T.bg + ';border:1px solid ' + T.border + ';color:' + T.ink + '}' +
    '.pf-chip.pf-out{color:' + T.faint + ';text-decoration:line-through}' +
    '.pf-tag{display:inline-block;padding:1px 8px;border-radius:4px;font-size:11px;' +
      'background:' + T.bg + ';border:1px dashed ' + T.borderStrong + ';color:' + T.muted + '}' +
    '.pf-btn{appearance:none;border:1px solid ' + T.borderStrong + ';background:' + T.surface + ';' +
      'color:' + T.ink + ';font:inherit;font-size:13px;padding:6px 12px;border-radius:6px;cursor:pointer}' +
    '.pf-btn:hover{border-color:' + T.accent + ';color:' + T.accent + '}' +
    '.pf-btn.pf-primary{background:' + T.accent + ';border-color:' + T.accent + ';color:#fff}' +
    '.pf-btn:disabled{opacity:.5;cursor:default}' +
    '.pf-sel{font:inherit;font-size:13px;padding:6px 10px;border-radius:6px;border:1px solid ' + T.borderStrong + ';' +
      'background:' + T.surface + ';color:' + T.ink + ';max-width:340px}' +
    '.pf-nav{display:flex;gap:8px;flex-wrap:wrap}' +
    '.pf-link{color:' + T.accent + ';font-size:13px;text-decoration:none;cursor:pointer}' +
    '.pf-link:hover{text-decoration:underline}' +
    '.pf-tbl{width:100%;border-collapse:collapse;font-size:13px}' +
    '.pf-tbl th{text-align:left;color:' + T.muted + ';font-weight:600;font-size:11px;text-transform:uppercase;' +
      'letter-spacing:.04em;padding:6px 8px;border-bottom:1px solid ' + T.border + '}' +
    '.pf-tbl td{padding:7px 8px;border-bottom:1px solid ' + T.border + ';vertical-align:top}' +
    '.pf-tbl tr:last-child td{border-bottom:none}' +
    '.pf-tbl .pf-num{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}' +
    '.pf-bar{position:relative;height:18px;background:' + T.bg + ';border-radius:3px;overflow:hidden;min-width:60px}' +
    '.pf-bar-outer{position:absolute;inset:0 auto 0 0;background:' + T.accent + ';opacity:.22}' +
    '.pf-bar-inner{position:absolute;inset:0 auto 0 0;background:' + T.cashPayments + ';opacity:.85;height:100%}' +
    '.pf-state{padding:40px 24px;text-align:center;color:' + T.muted + ';font-size:14px}' +
    '.pf-state.pf-err{color:#B91C1C}' +
    '.pf-banner{background:#FFFBEB;border:1px solid #FDE68A;color:#92400E;border-radius:6px;' +
      'padding:8px 12px;font-size:13px;margin-bottom:12px}' +
    '.pf-skel{background:linear-gradient(90deg,' + T.bg + ' 25%,#EEF0F3 37%,' + T.bg + ' 63%);' +
      'background-size:400% 100%;animation:pf-sh 1.2s ease infinite;border-radius:4px;height:12px}' +
    '@keyframes pf-sh{0%{background-position:100% 50%}100%{background-position:0 50%}}' +
    '.pf-ta{width:100%;min-height:96px;font:inherit;font-size:13px;padding:10px;border-radius:6px;' +
      'border:1px solid ' + T.borderStrong + ';background:' + T.surface + ';color:' + T.ink + ';resize:vertical}' +
    '.pf-ta:hover{border-color:' + T.accent + '}' +
    '.pf-ta:focus{outline:2px solid ' + T.accentSoft + ';border-color:' + T.accent + '}' +
    '.pf-editable{border-bottom:1px dashed ' + T.borderStrong + ';cursor:text}' +
    '.pf-editable:hover{border-bottom-color:' + T.accent + '}' +
    '.pf-wstate{font-size:12px;color:' + T.muted + ';margin-top:6px;min-height:16px}' +
    '.pf-wstate.pf-ok{color:' + T.ok + '}' +
    '.pf-wstate.pf-bad{color:#B91C1C}' +
    '.pf-tip{position:fixed;z-index:9999;pointer-events:none;background:#111827E6;color:#fff;' +
      'font-family:' + T.font + ';font-size:12px;line-height:1.5;padding:8px 10px;border-radius:6px;' +
      'max-width:320px;opacity:0;transition:opacity .08s}' +
    '.pf-tip b{font-weight:600}' +
    '@media (max-width:1023px){.pf-grid{grid-template-columns:repeat(6,1fr)}}' +
    '@media print{' +
      '.pf{position:static;overflow:visible;background:#fff}' +
      '.pf-hd{position:static;border-bottom:1px solid ' + T.border + '}' +
      '.pf-noprint{display:none !important}' +
      '.pf-body{width:1120px;max-width:1120px;padding:0}' +
      '.pf-card{break-inside:avoid;border-color:' + T.borderStrong + '}' +
    '}';
  }

  /* -- tooltip (one instance, on document.body, removed in cleanup) -------- */
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
  /* Everything registered here is torn down by destroy(). Global listeners are
     never anonymous, so they can actually be removed. */
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
          try { listeners[i][0].removeEventListener(listeners[i][1], listeners[i][2], listeners[i][3]); } catch (e) {}
        }
        for (i = 0; i < timers.length; i++) { clearTimeout(timers[i]); clearInterval(timers[i]); }
        for (i = 0; i < frames.length; i++) { cancelAnimationFrame(frames[i]); }
        for (i = 0; i < observers.length; i++) { try { observers[i].disconnect(); } catch (e) {} }
        for (i = 0; i < nodes.length; i++) { try { if (nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]); } catch (e) {} }
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
  /* Physical pixels via devicePixelRatio; CSS size kept separately, or the
     bitmap is stretched and blurry on Retina. */
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
  function stateLoading(msg) {
    return '<div class="pf-state">' + esc(msg || 'Loading…') + '</div>';
  }
  function stateEmpty(msg) {
    return '<div class="pf-state">' + esc(msg || 'No data for this version.') + '</div>';
  }
  function stateError(msg) {
    return '<div class="pf-state pf-err">' + esc(msg || 'Something went wrong.') + '</div>';
  }
  function banner(msg) {
    return '<div class="pf-banner">' + esc(msg) + '</div>';
  }

  /* -- version switcher ---------------------------------------------------- */
  /* Fed by subscribeToItems on Project Version. Defaults to Version Type =
     Current; a checkbox reveals superseded versions. onChange receives the
     item name, which is what updatePageDefinitions expects. */
  function versionSwitcher(opts) {
    var wrap = el('div', 'pf-crumb');
    var sel = el('select', 'pf-sel');
    sel.setAttribute('aria-label', 'Project version');
    var toggleLabel = el('label', 'pf-crumb');
    toggleLabel.style.cssText = 'gap:4px;cursor:pointer;font-size:12px';
    var toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggleLabel.appendChild(toggle);
    toggleLabel.appendChild(document.createTextNode('show superseded'));
    wrap.appendChild(sel);
    wrap.appendChild(toggleLabel);

    var all = [], current = null;

    function typeOf(item) {
      var p = item && item.properties ? item.properties : item;
      if (!p) return '';
      var keys = ['Version Type', 'versionType', 'Version type'];
      for (var i = 0; i < keys.length; i++) {
        if (p[keys[i]] != null) return String(p[keys[i]]);
      }
      return '';
    }
    function nameOf(item) {
      if (item == null) return '';
      if (typeof item === 'string') return item;
      return String(item.name != null ? item.name : (item.label != null ? item.label : ''));
    }
    function visible() {
      if (toggle.checked) return all;
      var out = [];
      for (var i = 0; i < all.length; i++) {
        var t = typeOf(all[i]).toLowerCase();
        /* Keep anything not explicitly superseded: Version Type may be blank
           on versions nobody has classified, and hiding those would make
           projects silently disappear from the switcher. */
        if (t.indexOf('supersed') < 0) out.push(all[i]);
      }
      return out.length ? out : all;
    }
    function paint() {
      var list = visible();
      sel.innerHTML = '';
      for (var i = 0; i < list.length; i++) {
        var nm = nameOf(list[i]);
        var o = document.createElement('option');
        o.value = nm;
        o.textContent = nm + (typeOf(list[i]).toLowerCase().indexOf('supersed') >= 0 ? '  (superseded)' : '');
        sel.appendChild(o);
      }
      var stillThere = false;
      for (var j = 0; j < list.length; j++) { if (nameOf(list[j]) === current) stillThere = true; }
      if (!stillThere) current = list.length ? nameOf(list[0]) : null;
      if (current != null) sel.value = current;
    }
    function fire() {
      if (current != null && opts && opts.onChange) opts.onChange(current);
    }

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
      }
    };
  }

  return {
    T: T,
    statusColor: statusColor,
    isReady: isReady,
    hasLoadingKind: hasLoadingKind,
    labelText: labelText,
    isTotalLabel: isTotalLabel,
    num: num,
    text: text,
    cellAt: cellAt,
    rowIndexByLabel: rowIndexByLabel,
    colIndexByLabel: colIndexByLabel,
    fmtNum: fmtNum,
    fmtMoney: fmtMoney,
    fmtPct: fmtPct,
    fmtCompact: fmtCompact,
    fmtDate: fmtDate,
    esc: esc,
    splitTextList: splitTextList,
    el: el,
    injectStyles: injectStyles,
    baseCss: baseCss,
    makeTooltip: makeTooltip,
    lifecycle: lifecycle,
    debounce: debounce,
    fitCanvas: fitCanvas,
    stateLoading: stateLoading,
    stateEmpty: stateEmpty,
    stateError: stateError,
    banner: banner,
    versionSwitcher: versionSwitcher
  };
})();
