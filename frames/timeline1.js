(function () {
  'use strict';
  var SDK = window.PigmentSDK;
  var root = document.getElementById('app');
  if (root.__cleanup) root.__cleanup();

  var DASH = String.fromCharCode(8211), DOTS = String.fromCharCode(8230), ARR = String.fromCharCode(8594);
  var QT = String.fromCharCode(39);
  function q(s) { return QT + s + QT; }
  var INK = '#111827', MUT = '#6B7280', FNT = '#9CA3AF', BRD = '#E5E7EB', BG = '#F6F7F9';
  var ACC = '#4F46E5', OK = '#059669', WARN = '#D97706', PAY = '#F97316', REV = '#BE185D', POS = '#1E3A8A';
  var FF = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  var PAL = [ACC, '#0EA5E9', OK, WARN, PAY, REV, POS, '#7C3AED'];

  var listeners = [], subs = [], styleEl = document.createElement('style');
  function on(t, e, f) { t.addEventListener(e, f); listeners.push([t, e, f]); }

  styleEl.textContent =
    '.tl *{box-sizing:border-box}' +
    '.tl{position:fixed;inset:0;overflow:auto;background:' + BG + ';color:' + INK + ';font-family:' + FF + ';font-size:14px;line-height:1.45}' +
    '.tl-hd{position:sticky;top:0;z-index:9;min-height:56px;display:flex;align-items:center;gap:14px;padding:0 24px;background:#fff;border-bottom:1px solid ' + BRD + ';flex-wrap:wrap}' +
    '.tl-t{font-size:16px;font-weight:600}' +
    '.tl-sp{flex:1 1 auto}' +
    '.tl-lb{color:' + MUT + ';font-size:12px;text-transform:uppercase;letter-spacing:.04em}' +
    '.tl-bd{padding:24px;max-width:1500px;margin:0 auto;display:grid;grid-template-columns:repeat(12,1fr);gap:16px;align-items:start}' +
    '.tl-c{background:#fff;border:1px solid ' + BRD + ';border-radius:8px;padding:16px;min-width:0}' +
    '.tl-c h2{margin:0 0 4px;font-size:14px;font-weight:600}' +
    '.tl-c h2 span{color:' + MUT + ';font-size:12px;font-weight:400;margin-left:8px}' +
    '.tl-in{font:inherit;font-size:13px;padding:5px 8px;border-radius:6px;border:1px solid #D1D5DB;background:#fff;color:' + INK + '}' +
    '.tl-in.n{width:64px;text-align:right;font-variant-numeric:tabular-nums}' +
    '.tl-in:focus{outline:2px solid #EEF2FF;border-color:' + ACC + '}' +
    '.tl-s{font:inherit;font-size:13px;padding:6px 10px;border-radius:6px;border:1px solid #D1D5DB;max-width:320px}' +
    '.tl-b{appearance:none;border:1px solid #D1D5DB;background:#fff;color:' + INK + ';font:inherit;font-size:13px;padding:5px 10px;border-radius:6px;cursor:pointer}' +
    '.tl-b:hover{border-color:' + ACC + ';color:' + ACC + '}' +
    '.tl-tb{width:100%;border-collapse:collapse;font-size:13px}' +
    '.tl-tb th{text-align:left;color:' + MUT + ';font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:6px 6px;border-bottom:1px solid ' + BRD + '}' +
    '.tl-tb td{padding:5px 6px;border-bottom:1px solid ' + BRD + '}' +
    '.tl-n{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}' +
    '.tl-ab{display:inline-block;min-width:44px;font-size:11px;font-weight:600;color:' + MUT + '}' +
    '.tl-cv{width:100%;overflow:hidden;cursor:default}.tl-cv canvas{display:block}' +
    '.tl-st{padding:32px 16px;text-align:center;color:' + MUT + '}' +
    '.tl-st.e{color:#B91C1C}' +
    '.tl-ws{font-size:12px;color:' + MUT + ';min-height:18px;margin-top:6px}' +
    '.tl-ws.ok{color:' + OK + '}.tl-ws.bad{color:#B91C1C}' +
    '.tl-note{font-size:12px;color:' + MUT + ';margin-top:8px}' +
    '.tl-hm{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}' +
    '.tl-hm td{height:16px;padding:0;border:1px solid #fff}' +
    '.tl-hm th{font-weight:600;font-size:11px;color:' + MUT + ';text-align:left;padding:2px 6px;white-space:nowrap;width:210px}' +
    '.tl-tag{display:inline-block;padding:1px 8px;border-radius:4px;font-size:11px;background:' + BG + ';border:1px dashed #D1D5DB;color:' + MUT + '}' +
    '@media (max-width:1100px){.tl-bd{grid-template-columns:repeat(6,1fr)}}';
  document.head.appendChild(styleEl);

  function esc(s) {
    var t = String(s == null ? '' : s);
    t = t.split('&').join('&amp;'); t = t.split('<').join('&lt;'); t = t.split('>').join('&gt;');
    t = t.split(String.fromCharCode(34)).join('&quot;'); t = t.split(QT).join('&#39;');
    return t;
  }
  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
  function txt(v) { return (v == null || typeof v === 'object') ? '' : String(v); }
  function fdate(v) {
    var s = txt(v); if (!s) return DASH;
    var d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: '2-digit' });
  }
  function isoOf(v) {
    var s = txt(v); if (!s) return '';
    var d = new Date(s);
    if (isNaN(d.getTime())) return '';
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }
  function fitC(cv, w, h) {
    var r = window.devicePixelRatio || 1;
    cv.width = Math.max(1, Math.round(w * r)); cv.height = Math.max(1, Math.round(h * r));
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    var x = cv.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.scale(r, r); x.clearRect(0, 0, w, h);
    return x;
  }

  var COLS = {
    tl: ['months', 'from', 'to', 'achieved'], sd: ['start'], grid: ['phase'], spans: ['span']
  };
  function ci(s, k) { var i = COLS[s].indexOf(k); return i < 0 ? 0 : i; }
  var NAMES = ['tl', 'sd', 'grid', 'spans'];
  var S = {}, i0;
  for (i0 = 0; i0 < NAMES.length; i0++) S[NAMES[i0]] = { d: null, err: null };
  var versions = [], sel = null, timer = null, showSpans = false, confirmZero = null;
  var pending = {}, msg = '', msgCls = '';

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
  function st(c, m) { return '<div class=' + q('tl-st' + (c || '')) + '>' + esc(m) + '</div>'; }
  function bump() { if (timer) clearTimeout(timer); timer = setTimeout(paint, 30); }

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
  sub('tl'); sub('sd'); sub('grid', 1000); sub('spans', 1000);
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

  function stages() {
    var rows = mine('tl'), out = [], i;
    for (i = 0; i < rows.length; i++) {
      var nm = lab(rows[i], 1);
      if (!nm) continue;
      out.push({
        name: nm, ab: lab(rows[i], 2) || nm.slice(0, 3),
        months: num(val(rows[i], ci('tl', 'months'))),
        from: val(rows[i], ci('tl', 'from')), to: val(rows[i], ci('tl', 'to')),
        achieved: txt(val(rows[i], ci('tl', 'achieved')))
      });
    }
    return out;
  }
  function startDate() { var r = mine1('sd'); return r ? val(r, 0) : null; }

  function say(m, cls) { msg = m; msgCls = cls || ''; paint(); }

  function writeMonths(stage, n) {
    if (!sel) { say('Pick a version first.', 'bad'); return; }
    pending[stage] = true;
    say('Saving ' + stage + DOTS, '');
    var co = {}; co.versions = sel; co.stages = stage;
    Promise.resolve(SDK.editValue('months', co, n)).then(function () {
      delete pending[stage];
      say('Saved. Downstream dates are recalculating' + DOTS, 'ok');
    })['catch'](function (e) {
      delete pending[stage];
      say('Not saved: ' + ((e && e.message) ? e.message : 'the write was rejected.'), 'bad');
    });
  }
  function writeStart(iso) {
    if (!sel) { say('Pick a version first.', 'bad'); return; }
    say('Saving start date' + DOTS, '');
    var co = {}; co.versions = sel;
    Promise.resolve(SDK.editValue('startDate', co, iso)).then(function () {
      say('Saved. The whole timeline is recalculating' + DOTS, 'ok');
    })['catch'](function (e) {
      say('Not saved: ' + ((e && e.message) ? e.message : 'the write was rejected.'), 'bad');
    });
  }

  root.className = 'tl';
  root.innerHTML =
    '<div class=' + q('tl-hd') + '>' +
      '<span class=' + q('tl-t') + '>Timeline</span>' +
      '<select class=' + q('tl-s') + ' id=' + q('tl-v') + '></select>' +
      '<span class=' + q('tl-lb') + '>Start date</span>' +
      '<input class=' + q('tl-in') + ' id=' + q('tl-sd') + ' type=' + q('date') + '>' +
      '<span class=' + q('tl-sp') + '></span>' +
      '<button class=' + q('tl-b') + ' id=' + q('tl-sw') + '>Resourcing spans</button>' +
    '</div><div class=' + q('tl-bd') + ' id=' + q('tl-body') + '></div>';
  var elV = root.querySelector('#tl-v'), elSD = root.querySelector('#tl-sd'), elB = root.querySelector('#tl-body');
  var elSW = root.querySelector('#tl-sw');
  on(elV, 'change', function () { sel = elV.value; msg = ''; paint(); });
  on(elSD, 'change', function () { if (elSD.value) writeStart(elSD.value); });
  on(elSW, 'click', function () { showSpans = !showSpans; paint(); });

  function card(title, span, inner, sub2) {
    return '<section class=' + q('tl-c') + ' style=' + q('grid-column:span ' + span) + '><h2>' + esc(title) +
      (sub2 ? '<span>' + esc(sub2) + '</span>' : '') + '</h2>' + inner + '</section>';
  }

  function rail() {
    if (S.tl.err) return st(' e', S.tl.err);
    if (!ready(S.tl.d)) return st('', 'Loading' + DOTS);
    var sg = stages();
    if (!sg.length) return st('', 'No phases for this version.');
    var h = '<table class=' + q('tl-tb') + '><thead><tr><th>Phase</th><th class=' + q('tl-n') + '>Months</th>' +
      '<th>From</th><th>To</th></tr></thead><tbody>', i, tot = 0;
    for (i = 0; i < sg.length; i++) {
      var m = sg[i].months;
      if (m !== null) tot += m;
      h += '<tr><td><span class=' + q('tl-ab') + '>' + esc(sg[i].ab) + '</span></td>' +
        '<td class=' + q('tl-n') + '><input class=' + q('tl-in n') + ' type=' + q('number') +
        ' min=' + q('0') + ' step=' + q('1') + ' data-stage=' + q(esc(sg[i].name)) +
        ' value=' + q(m === null ? '' : String(m)) + (pending[sg[i].name] ? ' disabled' : '') + '></td>' +
        '<td>' + esc(fdate(sg[i].from)) + '</td><td>' + esc(fdate(sg[i].to)) + '</td></tr>';
    }
    h += '</tbody></table>';
    h += '<div class=' + q('tl-note') + '>Total study duration <b>' + tot + ' months</b>. ' +
      'Dates are the model' + String.fromCharCode(39) + 's, never recomputed here ' + DASH +
      ' the formulas use 30.4-day months.</div>';
    h += '<div class=' + q('tl-ws' + (msgCls ? ' ' + msgCls : '')) + ' id=' + q('tl-msg') + '>' + esc(msg);
    if (confirmZero) {
      h += ' <button class=' + q('tl-b') + ' id=' + q('tl-cz') + '>Set ' + esc(confirmZero) +
        ' to zero</button> <button class=' + q('tl-b') + ' id=' + q('tl-cc') + '>Cancel</button>';
    }
    h += '</div>';
    return h;
  }

  var bars = [], drag = null, geo = null;

  function gantt(host) {
    var rows = mine('grid');
    if (S.grid.err) { host.innerHTML = st(' e', S.grid.err); return; }
    if (!ready(S.grid.d)) { host.innerHTML = st('', 'Loading' + DOTS); return; }
    var order = axisOf('grid', 2), rk = {}, i;
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
    if (!ord.length) { host.innerHTML = st('', 'No phase lands in a month for this version.'); return; }

    var sg = stages(), abOf = {}, achOf = {};
    for (i = 0; i < sg.length; i++) { abOf[sg[i].name] = sg[i].ab; achOf[sg[i].name] = sg[i].achieved; }
    var list = [];
    for (i = 0; i < sg.length; i++) if (by[sg[i].name]) list.push(by[sg[i].name]);
    for (i = 0; i < ord.length; i++) if (!abOf[ord[i]]) list.push(by[ord[i]]);
    if (!list.length) list = [by[ord[0]]];

    var lo = list[0].lo, hi = list[0].hi;
    for (i = 0; i < list.length; i++) { if (list[i].lo < lo) lo = list[i].lo; if (list[i].hi > hi) hi = list[i].hi; }
    lo = Math.max(0, lo - 1); hi = Math.min(order.length - 1, hi + 1);
    var span = Math.max(1, hi - lo + 1);

    var rh = 26, gp = 8, pl = 260, pr = 90, pt = 26, pb = 14;
    var w = Math.max(420, host.clientWidth || 800), h = pt + pb + list.length * (rh + gp);
    host.innerHTML = '<canvas></canvas>';
    var cv = host.firstChild, x = fitC(cv, w, h), cw = (w - pl - pr) / span;
    geo = { cv: cv, pl: pl, cw: cw, lo: lo, w: w };
    x.font = '11px ' + FF;

    x.strokeStyle = BRD; x.fillStyle = FNT; x.lineWidth = 1;
    for (i = lo; i <= hi; i++) {
      if (i === lo || order[i].indexOf('Jan') === 0) {
        var gx = pl + (i - lo) * cw;
        x.beginPath(); x.moveTo(gx, pt - 6); x.lineTo(gx, h - pb); x.stroke();
        x.fillText(order[i], gx + 3, pt - 10);
      }
    }

    bars = [];
    for (i = 0; i < list.length; i++) {
      var b = list[i], y = pt + i * (rh + gp);
      var x0 = pl + (b.lo - lo + (1 - b.lf)) * cw;
      var x1 = pl + (b.hi - lo + b.hf) * cw;
      if (drag && drag.stage === b.n) x1 = Math.max(x0 + cw * 0.25, drag.x1);
      var bw = Math.max(3, x1 - x0);

      x.fillStyle = MUT; x.textAlign = 'right';
      x.fillText(clip(x, b.n, pl - 58), pl - 54, y + rh / 2 + 4);
      x.fillStyle = FNT;
      x.fillText(abOf[b.n] || '', pl - 8, y + rh / 2 + 4);
      x.textAlign = 'left';

      x.globalAlpha = pending[b.n] ? 0.45 : 1;
      x.fillStyle = PAL[i % PAL.length];
      x.fillRect(x0, y, bw, rh);
      x.globalAlpha = 1;

      x.fillStyle = '#ffffff';
      x.globalAlpha = 0.85;
      x.fillRect(x0 + bw - 3, y + 5, 2, rh - 10);
      x.globalAlpha = 1;

      var dx = x0 + bw, dy = y + rh / 2, r = 4;
      x.fillStyle = INK;
      x.beginPath(); x.moveTo(dx, dy - r); x.lineTo(dx + r, dy); x.lineTo(dx, dy + r); x.lineTo(dx - r, dy);
      x.closePath(); x.fill();
      if (achOf[b.n]) {
        x.fillStyle = MUT;
        x.fillText(achOf[b.n], Math.min(dx + 8, w - pr + 4), dy + 4);
      }
      bars.push({ stage: b.n, x0: x0, x1: x0 + bw, y: y, h: rh });
    }

    cv.style.cursor = 'default';
    cv.addEventListener('mousemove', hover);
    cv.addEventListener('mousedown', down);
    cv.addEventListener('mouseleave', function () { if (!drag) cv.style.cursor = 'default'; });
  }

  function hitEdge(mx, my) {
    for (var i = 0; i < bars.length; i++) {
      var b = bars[i];
      if (my >= b.y && my <= b.y + b.h && Math.abs(mx - b.x1) <= 6) return b;
    }
    return null;
  }
  function hover(ev) {
    if (drag || !geo) return;
    var r = geo.cv.getBoundingClientRect();
    geo.cv.style.cursor = hitEdge(ev.clientX - r.left, ev.clientY - r.top) ? 'ew-resize' : 'default';
  }
  function down(ev) {
    if (!geo) return;
    var r = geo.cv.getBoundingClientRect();
    var b = hitEdge(ev.clientX - r.left, ev.clientY - r.top);
    if (!b) return;
    ev.preventDefault();
    var sg = stages(), cm = null, i;
    for (i = 0; i < sg.length; i++) if (sg[i].name === b.stage) cm = sg[i].months;
    drag = { stage: b.stage, x0: b.x0, x1: b.x1, x1o: b.x1, start: ev.clientX,
             months: cm === null ? 0 : cm, raf: 0 };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }
  function move(ev) {
    if (!drag || !geo) return;
    drag.x1 = Math.max(drag.x0 + geo.cw * 0.25, drag.x1o + (ev.clientX - drag.start));
    if (drag.raf) return;
    drag.raf = requestAnimationFrame(function () {
      if (!drag) return;
      drag.raf = 0;
      var host = elB.querySelector('#tl-gantt');
      if (host) gantt(host);
    });
  }
  function up(ev) {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    if (!drag || !geo) { drag = null; return; }
    if (drag.raf) cancelAnimationFrame(drag.raf);
    var d = ev.clientX - drag.start;
    var delta = Math.round(d / geo.cw);
    var next = Math.max(1, drag.months + delta);
    var stage = drag.stage, was = drag.months;
    drag = null;
    if (next === was) { paint(); return; }
    writeMonths(stage, next);
  }
  function clip(x, s, w) {
    if (x.measureText(s).width <= w) return s;
    var t = s;
    while (t.length > 1 && x.measureText(t + DOTS).width > w) t = t.slice(0, -1);
    return t + DOTS;
  }

  function spans() {
    if (S.spans.err) return st(' e', S.spans.err);
    if (!ready(S.spans.d)) return st('', 'Loading' + DOTS);
    var rows = mine('spans'), order = axisOf('spans', 2), all = axisOf('spans', 1);
    if (!all.length) return st('', 'No spans for this version.');
    var rk = {}, i;
    for (i = 0; i < order.length; i++) rk[order[i]] = i;
    var by = {};
    for (i = 0; i < rows.length; i++) {
      var s = lab(rows[i], 1), mo = lab(rows[i], 2), v = num(val(rows[i], 0));
      if (!s || !mo || v === null || v <= 0) continue;
      if (!by[s]) by[s] = {};
      by[s][rk[mo]] = v;
    }
    var lo = order.length, hi = 0, k, j;
    for (k in by) {
      if (!Object.prototype.hasOwnProperty.call(by, k)) continue;
      for (j in by[k]) {
        if (!Object.prototype.hasOwnProperty.call(by[k], j)) continue;
        var n2 = parseInt(j, 10);
        if (n2 < lo) lo = n2; if (n2 > hi) hi = n2;
      }
    }
    if (lo > hi) return st('', 'No span resolves to a month for this version.');
    var h = '<table class=' + q('tl-hm') + '><tbody>';
    for (i = 0; i < all.length; i++) {
      var nm = all[i], cells = by[nm];
      h += '<tr><th>' + esc(nm) + '</th>';
      if (!cells) {
        h += '<td colspan=' + q(String(hi - lo + 1)) + ' style=' + q('padding-left:6px') + '>' +
          '<span class=' + q('tl-tag') + '>not defined in model</span></td>';
      } else {
        for (j = lo; j <= hi; j++) {
          var v2 = cells[j];
          h += '<td style=' + q('background:' + (v2 ? shade(v2) : BG)) + '></td>';
        }
      }
      h += '</tr>';
    }
    h += '</tbody></table>';
    h += '<div class=' + q('tl-note') + '>' + esc(order[lo]) + ' ' + ARR + ' ' + esc(order[hi]) + '</div>';
    return h;
  }
  function shade(v) {
    var a = Math.max(0.18, Math.min(1, v));
    return 'rgba(79,70,229,' + a.toFixed(2) + ')';
  }

  function paint() {
    var opts = '', i;
    for (i = 0; i < versions.length; i++) {
      opts += '<option' + (versions[i] === sel ? ' selected' : '') + '>' + esc(versions[i]) + '</option>';
    }
    elV.innerHTML = opts;
    var sd = startDate();
    if (document.activeElement !== elSD) elSD.value = isoOf(sd);
    elSW.textContent = showSpans ? 'Hide resourcing spans' : 'Resourcing spans';

    var html =
      card('Phases', 8, '<div class=' + q('tl-cv') + ' id=' + q('tl-gantt') + '></div>',
           'drag a bar' + String.fromCharCode(39) + 's right edge to change its length') +
      card('Months', 4, rail(), 'type a value, or drag');
    if (showSpans) html += card('Resourcing spans', 12, spans(), 'Dual Timeline Stages');
    elB.innerHTML = html;

    var host = elB.querySelector('#tl-gantt');
    if (host) gantt(host);
    wire();
  }

  function wire() {
    var cz = elB.querySelector('#tl-cz'), cc = elB.querySelector('#tl-cc');
    if (cz) {
      on(cz, 'click', function () { var s2 = confirmZero; confirmZero = null; writeMonths(s2, 0); });
      on(cc, 'click', function () { confirmZero = null; msg = ''; msgCls = ''; paint(); });
    }
    var ins = elB.querySelectorAll('input[data-stage]'), i;
    for (i = 0; i < ins.length; i++) {
      on(ins[i], 'change', function (ev) {
        var el = ev.currentTarget;
        var stage = el.getAttribute('data-stage');
        var n = parseInt(el.value, 10);
        if (isNaN(n) || n < 0) { say('Months must be a whole number of 0 or more.', 'bad'); return; }
        if (n === 0) {
          confirmZero = stage;
          say('Zero months collapses ' + stage + ' and shifts every later phase.', 'bad');
          return;
        }
        confirmZero = null;
        writeMonths(stage, n);
      });
    }
  }

  var rsz = null;
  function onRz() {
    if (rsz) clearTimeout(rsz);
    rsz = setTimeout(function () {
      var host = elB.querySelector('#tl-gantt');
      if (host) gantt(host);
    }, 150);
  }
  on(window, 'resize', onRz);

  root.__cleanup = function () {
    if (timer) clearTimeout(timer);
    if (rsz) clearTimeout(rsz);
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    if (drag && drag.raf) cancelAnimationFrame(drag.raf);
    var i;
    for (i = 0; i < subs.length; i++) { try { subs[i].unsubscribe(); } catch (e) {} }
    for (i = 0; i < listeners.length; i++) {
      try { listeners[i][0].removeEventListener(listeners[i][1], listeners[i][2]); } catch (e) {}
    }
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    subs = []; listeners = []; bars = []; geo = null; root.innerHTML = '';
    root.__cleanup = null;
  };

  paint();
})();
