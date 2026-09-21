/* Frame 4 - Executive Summary cockpit, stage 1.
   Self-contained (BARE) and deliberately compact so the body can be pushed
   through the API without a hand-paste. Reads dataSources from the manifest
   on Frame ddaf6ce8; every source has versions as label 0 and is narrowed
   client-side, so no dynamicFilters are needed. No double quotes, no
   backslashes - build.py enforces it. */
(function () {
  'use strict';
  var SDK = window.PigmentSDK;
  var root = document.getElementById('app');
  if (root.__cleanup) root.__cleanup();

  var DASH = String.fromCharCode(8211), ARROW = String.fromCharCode(8594), DOTS = String.fromCharCode(8230);
  var QT = String.fromCharCode(39);
  function q(s) { return QT + s + QT; }
  var INK = '#111827', MUT = '#6B7280', FNT = '#9CA3AF', BRD = '#E5E7EB', BG = '#F6F7F9';
  var ACC = '#4F46E5', POS = '#1E3A8A', PAY = '#F97316', REV = '#BE185D', OK = '#059669', WARN = '#D97706';
  var FF = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

  var listeners = [], subs = [], styleEl = null;
  function on(t, e, f) { t.addEventListener(e, f); listeners.push([t, e, f]); }

  styleEl = document.createElement('style');
  styleEl.textContent =
    '.ck *{box-sizing:border-box}' +
    '.ck{position:fixed;inset:0;overflow:auto;background:' + BG + ';color:' + INK + ';font-family:' + FF + ';font-size:14px;line-height:1.45}' +
    '.ck-hd{position:sticky;top:0;z-index:9;min-height:56px;display:flex;align-items:center;gap:14px;padding:0 24px;background:#fff;border-bottom:1px solid ' + BRD + ';flex-wrap:wrap}' +
    '.ck-t{font-size:16px;font-weight:600}' +
    '.ck-sp{flex:1 1 auto}' +
    '.ck-bd{padding:24px;max-width:1400px;margin:0 auto;display:grid;grid-template-columns:repeat(12,1fr);gap:16px}' +
    '.ck-c{background:#fff;border:1px solid ' + BRD + ';border-radius:8px;padding:16px;min-width:0}' +
    '.ck-c h2{margin:0 0 12px;font-size:14px;font-weight:600}' +
    '.ck-c h2 span{color:' + MUT + ';font-size:12px;font-weight:400;margin-left:8px}' +
    '.ck-lb{color:' + MUT + ';font-size:12px;text-transform:uppercase;letter-spacing:.04em}' +
    '.ck-vl{font-size:22px;font-weight:600;font-variant-numeric:tabular-nums;margin-top:4px;overflow-wrap:anywhere}' +
    '.ck-vl.s{font-size:15px;font-weight:500}' +
    '.ck-ti{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}' +
    '.ck-pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;color:#fff}' +
    '.ck-chip{display:inline-block;padding:3px 10px;border-radius:6px;font-size:12px;margin:0 6px 6px 0;background:' + BG + ';border:1px solid ' + BRD + '}' +
    '.ck-chip.o{color:' + FNT + ';text-decoration:line-through}' +
    '.ck-tag{display:inline-block;padding:1px 8px;border-radius:4px;font-size:11px;background:' + BG + ';border:1px dashed #D1D5DB;color:' + MUT + '}' +
    '.ck-b{appearance:none;border:1px solid #D1D5DB;background:#fff;color:' + INK + ';font:inherit;font-size:13px;padding:6px 12px;border-radius:6px;cursor:pointer}' +
    '.ck-b.p{background:' + ACC + ';border-color:' + ACC + ';color:#fff}' +
    '.ck-b:disabled{opacity:.5;cursor:default}' +
    '.ck-s{font:inherit;font-size:13px;padding:6px 10px;border-radius:6px;border:1px solid #D1D5DB;max-width:320px}' +
    '.ck-tb{width:100%;border-collapse:collapse;font-size:13px}' +
    '.ck-tb th{text-align:left;color:' + MUT + ';font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:6px 8px;border-bottom:1px solid ' + BRD + '}' +
    '.ck-tb td{padding:7px 8px;border-bottom:1px solid ' + BRD + ';vertical-align:top}' +
    '.ck-n{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}' +
    '.ck-tot td{background:' + BG + ';border-bottom:1px solid #D1D5DB}' +
    '.ck-bar{position:relative;height:16px;background:' + BG + ';border-radius:3px;overflow:hidden}' +
    '.ck-bar i{position:absolute;left:0;top:0;bottom:0;display:block}' +
    '.ck-st{padding:32px 16px;text-align:center;color:' + MUT + '}' +
    '.ck-st.e{color:#B91C1C}' +
    '.ck-ta{width:100%;min-height:90px;font:inherit;font-size:13px;padding:10px;border-radius:6px;border:1px solid #D1D5DB;resize:vertical}' +
    '.ck-ws{font-size:12px;color:' + MUT + ';min-height:16px}' +
    '.ck-ws.ok{color:' + OK + '}.ck-ws.bad{color:#B91C1C}' +
    '.ck-lg{display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:' + MUT + ';margin-top:8px}' +
    '.ck-lg i{width:9px;height:9px;border-radius:2px;display:inline-block;margin-right:5px}' +
    '.ck-cv{width:100%;overflow:hidden}.ck-cv canvas{display:block}' +
    '@media (max-width:1023px){.ck-bd{grid-template-columns:repeat(6,1fr)}.ck-ti{grid-template-columns:repeat(3,1fr)}}' +
    '@media print{.ck{position:static;background:#fff}.ck-hd{position:static}.ck-np{display:none}.ck-c{break-inside:avoid}}';
  document.head.appendChild(styleEl);

  function esc(s) {
    var t = String(s == null ? '' : s);
    t = t.split('&').join('&amp;'); t = t.split('<').join('&lt;'); t = t.split('>').join('&gt;');
    t = t.split(String.fromCharCode(34)).join('&quot;'); t = t.split(QT).join('&#39;');
    return t;
  }
  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
  function txt(v) { return (v == null || typeof v === 'object') ? '' : String(v); }
  function money(v, c) {
    var n = num(v); if (n === null) return DASH;
    var s = n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return c ? c + ' ' + s : s;
  }
  function comp(v, c) {
    var n = num(v); if (n === null) return DASH;
    var a = Math.abs(n), s;
    if (a >= 1e9) s = (n / 1e9).toFixed(1) + 'bn';
    else if (a >= 1e6) s = (n / 1e6).toFixed(2) + 'm';
    else if (a >= 1e3) s = Math.round(n / 1e3) + 'k';
    else s = String(Math.round(n));
    return c ? c + ' ' + s : s;
  }
  function pct(v) { var n = num(v); return n === null ? DASH : (n * 100).toFixed(1) + '%'; }
  function fdate(v) {
    var s = txt(v); if (!s) return DASH;
    var d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  }
  function statusCol(raw) {
    var s = String(raw || '').toLowerCase();
    if (!s) return FNT;
    if (s.indexOf('approv') === 0 || s.indexOf('won') >= 0) return OK;
    if (s.indexOf('await') >= 0 || s.indexOf('request') >= 0 || s.indexOf('probable') >= 0) return WARN;
    if (s.indexOf('supersed') >= 0) return FNT;
    return MUT;
  }
  function splitList(v) {
    var s = txt(v); if (!s) return [];
    var parts = [s], seps = [';', '|', String.fromCharCode(10), ','], i, j, nx;
    for (i = 0; i < seps.length; i++) {
      nx = []; for (j = 0; j < parts.length; j++) nx = nx.concat(parts[j].split(seps[i]));
      parts = nx;
    }
    var out = [];
    for (i = 0; i < parts.length; i++) { var p = parts[i].trim(); if (p) out.push(p); }
    return out;
  }
  function rankOf(name) {
    var s = String(name || ''), i = 0, d = '';
    while (i < s.length && s.charAt(i) === ' ') i++;
    while (i < s.length && s.charAt(i) >= '0' && s.charAt(i) <= '9') { d += s.charAt(i); i++; }
    return d ? parseInt(d, 10) : 999;
  }
  function fitC(cv, w, h) {
    var r = window.devicePixelRatio || 1;
    cv.width = Math.max(1, Math.round(w * r)); cv.height = Math.max(1, Math.round(h * r));
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    var x = cv.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.scale(r, r); x.clearRect(0, 0, w, h);
    return x;
  }

  /* -- state ------------------------------------------------------------- */
  var COLS = {
    hdr: ['sponsor', 'indication', 'programPhase', 'status', 'currency', 'patients', 'sites', 'peak'],
    svc: ['in', 'out'], budget: ['price', 'cost'],
    appr: ['status', 'approver', 'date', 'comment'],
    gantt: ['phase'], cash: ['receipts', 'cost', 'earnt'], note: ['text']
  };
  function ci(src, k) { var i = COLS[src].indexOf(k); return i < 0 ? 0 : i; }

  var NAMES = ['hdr', 'svc', 'budget', 'appr', 'gantt', 'cash', 'note'];
  var S = {}, i0;
  for (i0 = 0; i0 < NAMES.length; i0++) S[NAMES[i0]] = { d: null, err: null };
  var versions = [], sel = null, dirty = false, timer = null;

  function ready(d) { return !!(d && d.rows && typeof d.rows.length === 'number'); }
  function lab(r, i) { return (r && r.labels && r.labels[i] != null) ? String(r.labels[i]) : ''; }
  function val(r, i) { return (r && r.values) ? r.values[i] : null; }
  function mine(n) {
    var d = S[n].d, out = [], i;
    if (!sel || !ready(d)) return out;
    for (i = 0; i < d.rows.length; i++) if (lab(d.rows[i], 0) === sel) out.push(d.rows[i]);
    return out;
  }
  function mine1(n) { var r = mine(n); return r.length ? r[0] : null; }
  function axisOf(n, i) {
    var d = S[n].d, seen = {}, out = [], k, j;
    if (!ready(d)) return out;
    for (j = 0; j < d.rows.length; j++) { k = lab(d.rows[j], i); if (k && !seen[k]) { seen[k] = 1; out.push(k); } }
    return out;
  }
  function cur() { var r = mine1('hdr'); return r ? txt(val(r, ci('hdr', 'currency'))) : ''; }
  function st(cls, m) { return '<div class=' + q('ck-st' + (cls || '')) + '>' + esc(m) + '</div>'; }
  function guard(n, empty) {
    if (S[n].err) return st(' e', S[n].err);
    if (!ready(S[n].d)) return st('', 'Loading' + DOTS);
    if (!mine(n).length) return st('', empty);
    return null;
  }
  function bump() { if (timer) clearTimeout(timer); timer = setTimeout(paint, 30); }

  /* -- subscriptions ----------------------------------------------------- */
  function sub(n, rows) {
    var o = {
      dynamicFilters: [],
      onData: function (d) { S[n].err = null; S[n].d = d; bump(); },
      onError: function (e) { S[n].err = (e && e.message) ? e.message : 'Could not load this section.'; bump(); }
    };
    if (rows) o.scroll = { offset: 0, numberOfRows: rows };
    try { subs.push(SDK.subscribeToDataSource(n, o)); }
    catch (e) { S[n].err = 'Subscription failed: ' + (e && e.message ? e.message : String(e)); }
  }
  sub('hdr'); sub('svc'); sub('budget'); sub('appr'); sub('gantt', 1000); sub('cash', 1000); sub('note');
  try {
    subs.push(SDK.subscribeToItems('versions', {
      onData: function (d) {
        versions = (d && d.items) ? d.items : [];
        if (!sel && versions.length) sel = versions[0];
        bump();
      },
      onError: function () { versions = []; bump(); }
    }));
  } catch (e) {}

  /* -- shell ------------------------------------------------------------- */
  root.className = 'ck';
  root.innerHTML =
    '<div class=' + q('ck-hd') + '>' +
      '<span class=' + q('ck-t') + '>Executive Summary</span>' +
      '<span id=' + q('ck-cr') + '></span>' +
      '<select class=' + q('ck-s') + ' id=' + q('ck-v') + '></select>' +
      '<span class=' + q('ck-sp') + '></span>' +
      '<button class=' + q('ck-b ck-np') + ' id=' + q('ck-pr') + '>Print / PDF</button>' +
    '</div><div class=' + q('ck-bd') + ' id=' + q('ck-body') + '></div>';
  var elCr = root.querySelector('#ck-cr'), elV = root.querySelector('#ck-v'), elB = root.querySelector('#ck-body');
  on(root.querySelector('#ck-pr'), 'click', function () { window.print(); });
  on(elV, 'change', function () { sel = elV.value; dirty = false; paint(); });

  /* -- panels ------------------------------------------------------------ */
  function card(title, span, inner, sub2) {
    return '<section class=' + q('ck-c') + ' style=' + q('grid-column:span ' + span) + '><h2>' + esc(title) +
      (sub2 ? '<span>' + esc(sub2) + '</span>' : '') + '</h2>' + inner + '</section>';
  }

  function study() {
    if (S.hdr.err) return st(' e', S.hdr.err);
    if (!ready(S.hdr.d)) return st('', 'Loading' + DOTS);
    var r = mine1('hdr');
    if (!r) return st('', 'No study header for this version.');
    var c = cur();
    var t = [
      ['Sponsor', txt(val(r, ci('hdr', 'sponsor'))), 1],
      ['Indication', txt(val(r, ci('hdr', 'indication'))), 1],
      ['Programme phase', txt(val(r, ci('hdr', 'programPhase'))), 1],
      ['Patients randomized', num(val(r, ci('hdr', 'patients'))) === null ? '' : money(val(r, ci('hdr', 'patients'))), 0],
      ['Active sites', num(val(r, ci('hdr', 'sites'))) === null ? '' : money(val(r, ci('hdr', 'sites'))), 0],
      ['Peak cash drawdown', comp(val(r, ci('hdr', 'peak')), c), 0]
    ];
    var h = '<div class=' + q('ck-ti') + '>', i;
    for (i = 0; i < t.length; i++) {
      var v = t[i][1], empty = (v === '' || v === DASH);
      h += '<div><div class=' + q('ck-lb') + '>' + esc(t[i][0]) + '</div><div class=' +
        q('ck-vl' + (t[i][2] ? ' s' : '')) + '>' +
        (empty ? '<span style=' + q('color:' + FNT) + '>' + DASH + '</span>' : esc(v)) + '</div></div>';
    }
    h += '</div>';
    if (ready(S.svc.d)) {
      var sr = mine1('svc');
      h += '<div style=' + q('margin-top:16px;padding-top:16px;border-top:1px solid ' + BRD) + '>' +
        chips('Services included', sr ? splitList(val(sr, ci('svc', 'in'))) : [], 0) +
        chips('Services excluded', sr ? splitList(val(sr, ci('svc', 'out'))) : [], 1) + '</div>';
    } else if (S.svc.err) { h += st(' e', S.svc.err); }
    return h;
  }
  function chips(label, list, out) {
    var h = '<div class=' + q('ck-lb') + ' style=' + q('margin-bottom:6px') + '>' + esc(label) +
      ' (' + list.length + ')</div><div style=' + q('margin-bottom:10px') + '>', i;
    if (!list.length) h += '<span style=' + q('color:' + FNT + ';font-size:13px') + '>none listed</span>';
    for (i = 0; i < list.length; i++) h += '<span class=' + q('ck-chip' + (out ? ' o' : '')) + '>' + esc(list[i]) + '</span>';
    return h + '</div>';
  }

  function gapTag(name) {
    var a = mine('appr'), i;
    for (i = 0; i < a.length; i++) {
      if (lab(a[i], 1) === name) {
        return txt(val(a[i], ci('appr', 'approver'))) ? '' : ' <span class=' + q('ck-tag') + '>no approver assigned</span>';
      }
    }
    return '';
  }

  function budget() {
    var g = guard('budget', 'No budget for this version ' + DASH + ' versions start empty.');
    if (g) return g;
    var rows = mine('budget'), list = [], i;
    for (i = 0; i < rows.length; i++) {
      var nm = lab(rows[i], 1); if (!nm) continue;
      var p = num(val(rows[i], ci('budget', 'price'))), k = num(val(rows[i], ci('budget', 'cost')));
      if (p === null && k === null) continue;
      list.push({ n: nm, r: rankOf(nm), p: p || 0, c: k || 0 });
    }
    if (!list.length) return st('', 'No priced departments for this version.');
    list.sort(function (a, b) { return a.r - b.r || (a.n < b.n ? -1 : 1); });
    var tp = 0, tc = 0, mx = 0, c = cur();
    for (i = 0; i < list.length; i++) { tp += list[i].p; tc += list[i].c; if (list[i].p > mx) mx = list[i].p; }
    var h = '<table class=' + q('ck-tb') + '><thead><tr><th style=' + q('width:34%') + '>Department</th>' +
      '<th class=' + q('ck-n') + '>Budget</th><th class=' + q('ck-n') + '>Cost</th>' +
      '<th class=' + q('ck-n') + '>Margin</th><th style=' + q('width:22%') + '>Mix</th></tr></thead><tbody>' +
      '<tr class=' + q('ck-tot') + '><td><b>Total</b></td><td class=' + q('ck-n') + '><b>' + money(tp, c) +
      '</b></td><td class=' + q('ck-n') + '>' + money(tc, c) + '</td><td class=' + q('ck-n') + '>' +
      (tp ? pct((tp - tc) / tp) : DASH) + '</td><td></td></tr>';
    for (i = 0; i < list.length; i++) {
      var w = mx > 0 ? (list[i].p / mx) * 100 : 0;
      var inner = list[i].p > 0 ? Math.min(100, (list[i].c / list[i].p) * 100) : 0;
      var m = list[i].p > 0 ? (list[i].p - list[i].c) / list[i].p : null;
      h += '<tr><td>' + esc(list[i].n) + gapTag(list[i].n) + '</td>' +
        '<td class=' + q('ck-n') + '>' + money(list[i].p, c) + '</td>' +
        '<td class=' + q('ck-n') + '>' + money(list[i].c, c) + '</td>' +
        '<td class=' + q('ck-n') + '>' + (m === null ? DASH : pct(m)) + '</td>' +
        '<td><div class=' + q('ck-bar') + ' style=' + q('width:' + Math.max(6, w) + '%') + '>' +
        '<i style=' + q('width:100%;background:' + ACC + ';opacity:.22') + '></i>' +
        '<i style=' + q('width:' + inner + '%;background:' + PAY + ';opacity:.85') + '></i>' +
        '</div></td></tr>';
    }
    return h + '</tbody></table>';
  }

  function approvals() {
    var g = guard('appr', 'No approval rows for this version.');
    if (g) return g;
    var rows = mine('appr'), list = [], i;
    for (i = 0; i < rows.length; i++) {
      var nm = lab(rows[i], 1); if (!nm) continue;
      list.push({ n: nm, r: rankOf(nm),
        s: txt(val(rows[i], ci('appr', 'status'))), a: txt(val(rows[i], ci('appr', 'approver'))),
        d: val(rows[i], ci('appr', 'date')), c: txt(val(rows[i], ci('appr', 'comment'))) });
    }
    if (!list.length) return st('', 'No approval rows for this version.');
    list.sort(function (a, b) { return a.r - b.r || (a.n < b.n ? -1 : 1); });
    var h = '<table class=' + q('ck-tb') + '><thead><tr><th>Department</th><th>Status</th><th>Approver</th>' +
      '<th>Approved</th></tr></thead><tbody>';
    for (i = 0; i < list.length; i++) {
      h += '<tr><td>' + esc(list[i].n) + '</td><td>' +
        (list[i].s ? '<span class=' + q('ck-pill') + ' style=' + q('background:' + statusCol(list[i].s)) + '>' +
          esc(list[i].s) + '</span>' : '<span class=' + q('ck-tag') + '>not set</span>') + '</td><td>' +
        (list[i].a ? esc(list[i].a) : '<span class=' + q('ck-tag') + '>none</span>') + '</td><td class=' +
        q('ck-n') + '>' + fdate(list[i].d) + '</td></tr>';
      if (list[i].c) {
        h += '<tr><td colspan=' + q('4') + ' style=' + q('padding-top:0;color:' + MUT + ';font-size:12px') + '>' +
          esc(list[i].c.length > 200 ? list[i].c.slice(0, 199) + DOTS : list[i].c) + '</td></tr>';
      }
    }
    return h + '</tbody></table>';
  }

  function series() {
    var rows = mine('cash');
    if (!rows.length) return null;
    var order = axisOf('cash', 1), rk = {}, i;
    for (i = 0; i < order.length; i++) rk[order[i]] = i;
    rows = rows.slice().sort(function (a, b) { return (rk[lab(a, 1)] || 0) - (rk[lab(b, 1)] || 0); });
    var m = [], rc = [], cs = [], er = [], ps = [], run = 0;
    for (i = 0; i < rows.length; i++) {
      var a = num(val(rows[i], ci('cash', 'receipts'))) || 0;
      var b = num(val(rows[i], ci('cash', 'cost'))) || 0;
      var e = num(val(rows[i], ci('cash', 'earnt'))) || 0;
      m.push(lab(rows[i], 1)); rc.push(a); cs.push(b); er.push(e); run += a - b; ps.push(run);
    }
    return { m: m, rc: rc, cs: cs, er: er, ps: ps };
  }

  function cash() {
    var g = guard('cash', 'No cashflow for this version.');
    if (g) return g;
    var s = series();
    if (!s || !s.m.length) return st('', 'No cashflow months for this version.');
    var c = cur(), te = 0, tc = 0, i;
    for (i = 0; i < s.m.length; i++) { te += s.er[i]; tc += s.cs[i]; }
    var hr = mine1('hdr'), pk = hr ? val(hr, ci('hdr', 'peak')) : null;
    return '<div style=' + q('display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px') + '>' +
      kp('Earnt revenue', comp(te, c), REV) + kp('Cash payments', comp(tc, c), PAY) +
      kp('Peak drawdown', comp(pk, c), POS) + '</div>' +
      '<div class=' + q('ck-cv') + ' id=' + q('ck-cash') + '></div>' +
      '<div class=' + q('ck-lg') + '>' + lgd(ACC, 'Receipts (cum.)') + lgd(PAY, 'Payments (cum.)') +
      lgd(POS, 'Net position') + lgd(REV, 'Earnt revenue (monthly)') + '</div>';
  }
  function kp(l, v, c) {
    return '<div><div class=' + q('ck-lb') + '>' + esc(l) + '</div><div class=' + q('ck-vl') +
      ' style=' + q('color:' + c) + '>' + esc(v) + '</div></div>';
  }
  function lgd(c, t) { return '<span><i style=' + q('background:' + c) + '></i>' + esc(t) + '</span>'; }

  function notes() {
    if (S.note.err) return st(' e', S.note.err);
    var loaded = ready(S.note.d), r = mine1('note');
    var v = r ? txt(val(r, ci('note', 'text'))) : '';
    return '<textarea class=' + q('ck-ta') + ' id=' + q('ck-nt') + (loaded ? '' : ' disabled') + '>' +
      esc(v) + '</textarea><div style=' + q('display:flex;gap:12px;align-items:center;margin-top:8px') + '>' +
      '<button class=' + q('ck-b p') + ' id=' + q('ck-sv') + ' disabled>Save note</button>' +
      '<button class=' + q('ck-b') + ' id=' + q('ck-rv') + ' disabled>Revert</button>' +
      '<span class=' + q('ck-ws') + ' id=' + q('ck-nw') + '></span></div>';
  }

  /* -- paint ------------------------------------------------------------- */
  function paint() {
    var keep = null, live = elB.querySelector('#ck-nt');
    if (live && dirty) {
      keep = { v: live.value, f: document.activeElement === live, a: live.selectionStart, b: live.selectionEnd };
    }
    var opts = '', i;
    for (i = 0; i < versions.length; i++) {
      opts += '<option' + (versions[i] === sel ? ' selected' : '') + '>' + esc(versions[i]) + '</option>';
    }
    elV.innerHTML = opts;
    var hr = mine1('hdr'), stv = hr ? txt(val(hr, ci('hdr', 'status'))) : '';
    elCr.innerHTML = stv ? '<span class=' + q('ck-pill') + ' style=' + q('background:' + statusCol(stv)) + '>' +
      esc(stv) + '</span>' : '';

    elB.innerHTML =
      card('Study', 12, study()) +
      card('Budget by department', 7, budget(), 'Main Scope only') +
      card('Approval status', 5, approvals()) +
      card('Timeline', 7, '<div class=' + q('ck-cv') + ' id=' + q('ck-gantt') + '></div>',
           'read-only ' + DASH + ' edit on the Timeline Frame') +
      card('Cashflow', 5, cash(), 'read-only ' + DASH + ' edit on the Cashflow Frame') +
      card('Preparer submission notes', 12, notes());

    if (keep) {
      var ta = elB.querySelector('#ck-nt');
      if (ta) {
        ta.value = keep.v;
        if (keep.f) { ta.focus(); try { ta.setSelectionRange(keep.a, keep.b); } catch (e) {} }
      }
    }
    drawAll();
    wire();
  }

  function drawAll() {
    var gh = elB.querySelector('#ck-gantt');
    if (gh) {
      var g = guard('gantt', 'No timeline for this version.');
      if (g) gh.innerHTML = g; else gantt(gh);
    }
    var chh = elB.querySelector('#ck-cash');
    if (chh) chart(chh, series());
  }

  function gantt(host) {
    var rows = mine('gantt'), order = axisOf('gantt', 2), rk = {}, i;
    for (i = 0; i < order.length; i++) rk[order[i]] = i;
    var by = {}, ord = [];
    for (i = 0; i < rows.length; i++) {
      var s = lab(rows[i], 1), mo = lab(rows[i], 2), v = num(val(rows[i], 0));
      if (!s || !mo || v === null || v <= 0) continue;
      var m = rk[mo]; if (m === undefined) continue;
      if (!by[s]) { by[s] = { n: s, lo: m, hi: m, lf: v, hf: v }; ord.push(s); }
      else {
        if (m < by[s].lo) { by[s].lo = m; by[s].lf = v; }
        if (m > by[s].hi) { by[s].hi = m; by[s].hf = v; }
      }
    }
    if (!ord.length) { host.innerHTML = st('', 'No live phase months for this version.'); return; }
    var stg = [];
    for (i = 0; i < ord.length; i++) stg.push(by[ord[i]]);
    stg.sort(function (a, b) { return a.lo - b.lo; });
    var lo = stg[0].lo, hi = stg[0].hi;
    for (i = 0; i < stg.length; i++) { if (stg[i].lo < lo) lo = stg[i].lo; if (stg[i].hi > hi) hi = stg[i].hi; }
    lo = Math.max(0, lo - 1); hi = Math.min(order.length - 1, hi + 1);
    var span = Math.max(1, hi - lo + 1);
    var rh = 20, gp = 6, pl = 190, pr = 14, pt = 20, pb = 10;
    var w = Math.max(320, host.clientWidth || 640), h = pt + pb + stg.length * (rh + gp);
    host.innerHTML = '<canvas></canvas>';
    var x = fitC(host.firstChild, w, h), cw = (w - pl - pr) / span;
    x.font = '11px ' + FF;
    x.strokeStyle = BRD; x.fillStyle = FNT; x.lineWidth = 1;
    for (i = lo; i <= hi; i++) {
      if (i === lo || order[i].indexOf('Jan') === 0) {
        var gx = pl + (i - lo) * cw;
        x.beginPath(); x.moveTo(gx, pt - 5); x.lineTo(gx, h - pb); x.stroke();
        x.fillText(order[i], gx + 3, pt - 8);
      }
    }
    var pal = [ACC, '#0EA5E9', OK, WARN, PAY, REV, POS, '#7C3AED'];
    for (i = 0; i < stg.length; i++) {
      var y = pt + i * (rh + gp);
      var x0 = pl + (stg[i].lo - lo + (1 - stg[i].lf)) * cw;
      var x1 = pl + (stg[i].hi - lo + stg[i].hf) * cw;
      x.fillStyle = MUT; x.textAlign = 'right';
      x.fillText(clip(x, stg[i].n, pl - 12), pl - 10, y + rh / 2 + 4);
      x.textAlign = 'left'; x.fillStyle = pal[i % pal.length];
      x.fillRect(x0, y, Math.max(3, x1 - x0), rh);
    }
  }
  function clip(x, s, w) {
    if (x.measureText(s).width <= w) return s;
    var t = s;
    while (t.length > 1 && x.measureText(t + DOTS).width > w) t = t.slice(0, -1);
    return t + DOTS;
  }

  function chart(host, s) {
    if (!s || !s.m.length) return;
    var pl = 54, pr = 10, pt = 10, pb = 22;
    var w = Math.max(260, host.clientWidth || 420), h = 170;
    host.innerHTML = '<canvas></canvas>';
    var x = fitC(host.firstChild, w, h), pw = w - pl - pr, ph = h - pt - pb, n = s.m.length, i;
    var cr = [], cc = [], a = 0, b = 0;
    for (i = 0; i < n; i++) { a += s.rc[i]; b += s.cs[i]; cr.push(a); cc.push(b); }
    var hi = 0, lo = 0;
    for (i = 0; i < n; i++) {
      [cr[i], cc[i], s.ps[i], s.er[i]].forEach(function (v) { if (v > hi) hi = v; if (v < lo) lo = v; });
    }
    if (hi === lo) hi = lo + 1;
    var pd = (hi - lo) * 0.08; hi += pd; lo -= pd;
    function X(k) { return pl + (n === 1 ? pw / 2 : (k / (n - 1)) * pw); }
    function Y(v) { return pt + ph - ((v - lo) / (hi - lo)) * ph; }
    x.strokeStyle = BRD; x.lineWidth = 1;
    x.beginPath(); x.moveTo(pl, Y(0)); x.lineTo(w - pr, Y(0)); x.stroke();
    x.font = '10px ' + FF; x.fillStyle = FNT; x.textAlign = 'right';
    x.fillText(comp(hi), pl - 6, Y(hi) + 8); x.fillText(comp(lo), pl - 6, Y(lo));
    x.textAlign = 'left'; x.fillText(s.m[0], pl, h - 6);
    if (n > 1) { x.textAlign = 'right'; x.fillText(s.m[n - 1], w - pr, h - 6); }
    var bw = Math.max(1, (pw / Math.max(1, n)) * 0.55);
    x.fillStyle = REV; x.globalAlpha = 0.2;
    for (i = 0; i < n; i++) {
      if (!s.er[i]) continue;
      var y0 = Y(Math.max(0, s.er[i])), y1 = Y(Math.min(0, s.er[i]));
      x.fillRect(X(i) - bw / 2, y0, bw, Math.max(1, y1 - y0));
    }
    x.globalAlpha = 1;
    ln(x, cr, X, Y, ACC, 1.8); ln(x, cc, X, Y, PAY, 1.8); ln(x, s.ps, X, Y, POS, 2.4);
  }
  function ln(x, arr, X, Y, c, w) {
    x.strokeStyle = c; x.lineWidth = w; x.lineJoin = 'round'; x.beginPath();
    for (var i = 0; i < arr.length; i++) { if (i === 0) x.moveTo(X(i), Y(arr[i])); else x.lineTo(X(i), Y(arr[i])); }
    x.stroke();
  }

  function wire() {
    var ta = elB.querySelector('#ck-nt'), sv = elB.querySelector('#ck-sv');
    var rv = elB.querySelector('#ck-rv'), ws = elB.querySelector('#ck-nw');
    if (!ta || !sv || !rv) return;
    var r = mine1('note');
    var base = r ? txt(val(r, ci('note', 'text'))) : '';
    function syn() {
      var ch = ta.value !== base;
      dirty = ch; sv.disabled = !ch; rv.disabled = !ch;
      if (!ch) { ws.className = 'ck-ws'; ws.textContent = ''; }
    }
    on(ta, 'input', syn);
    on(rv, 'click', function () { ta.value = base; syn(); });
    on(sv, 'click', function () {
      if (!sel) { ws.className = 'ck-ws bad'; ws.textContent = 'Pick a version first.'; return; }
      sv.disabled = true; rv.disabled = true;
      ws.className = 'ck-ws'; ws.textContent = 'Saving' + DOTS;
      var co = {}; co.versions = sel;
      Promise.resolve(SDK.editValue('notesWrite', co, ta.value)).then(function () {
        ws.className = 'ck-ws ok'; ws.textContent = 'Saved. Waiting for Pigment to recalculate' + DOTS;
        dirty = false;
      })['catch'](function (e) {
        ws.className = 'ck-ws bad';
        ws.textContent = 'Not saved: ' + ((e && e.message) ? e.message : 'the write was rejected.');
        sv.disabled = false; rv.disabled = false;
      });
    });
  }

  var rsz = null;
  function onRz() { if (rsz) clearTimeout(rsz); rsz = setTimeout(drawAll, 150); }
  on(window, 'resize', onRz);

  root.__cleanup = function () {
    if (timer) clearTimeout(timer);
    if (rsz) clearTimeout(rsz);
    var i;
    for (i = 0; i < subs.length; i++) { try { subs[i].unsubscribe(); } catch (e) {} }
    for (i = 0; i < listeners.length; i++) {
      try { listeners[i][0].removeEventListener(listeners[i][1], listeners[i][2]); } catch (e) {}
    }
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    subs = []; listeners = []; root.innerHTML = '';
    root.__cleanup = null;
  };

  paint();
})();
