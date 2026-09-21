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
    '.tl-tip{position:fixed;z-index:9999;pointer-events:none;opacity:0;background:#111827;color:#fff;font-family:' + FF + ';font-size:12px;line-height:1.5;padding:8px 10px;border-radius:6px;max-width:300px;transition:opacity .08s}' +
    '.tl-help{background:#EEF2FF;border:1px solid #C7D2FE;color:#3730A3;border-radius:6px;padding:8px 10px;font-size:12px;margin-bottom:12px}' +
    '.tl-help b{font-weight:600}' +
    '.tl-chg{background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;border-radius:6px;padding:6px 10px;font-size:12px;margin-top:8px}' +
    '@media (max-width:1100px){.tl-bd{grid-template-columns:repeat(6,1fr)}}';
  document.head.appendChild(styleEl);

  var tip = document.createElement('div');
  tip.className = 'tl-tip';
  document.body.appendChild(tip);
  function tipShow(html, cx, cy) {
    tip.innerHTML = html;
    tip.style.opacity = '1';
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var lx = cx + 14, ly = cy + 14;
    if (lx + tw > window.innerWidth - 8) lx = cx - tw - 14;
    if (ly + th > window.innerHeight - 8) ly = cy - th - 14;
    tip.style.left = Math.max(8, lx) + 'px';
    tip.style.top = Math.max(8, ly) + 'px';
  }
  function tipHide() { tip.style.opacity = '0'; }

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
  var pending = {}, msg = '', msgCls = '', hoverStage = null, lastChange = null;

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
        name: nm,
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
    var was = null, sg = stages(), i;
    for (i = 0; i < sg.length; i++) if (sg[i].name === stage) was = sg[i].months;
    if (was === n) { say('', ''); return; }
    pending[stage] = true;
    lastChange = null;
    say('Saving ' + stage + DOTS, '');
    var co = {}; co.versions = sel; co.stages = stage;
    Promise.resolve(SDK.editValue('months', co, n)).then(function () {
      delete pending[stage];
      lastChange = { stage: stage, was: was, now: n };
      say('', 'ok');
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
    var h = '<div class=' + q('tl-help') + '>Three things are editable here: the <b>start date</b> in the ' +
      'header, and each phase' + String.fromCharCode(39) + 's <b>months</b> ' + DASH +
      ' either type in the column below or drag a bar' + String.fromCharCode(39) + 's right edge. ' +
      'Everything else, including every From and To date, is calculated by the model.</div>';
    h += '<table class=' + q('tl-tb') + '><thead><tr><th>Phase</th><th class=' + q('tl-n') + '>Months</th>' +
      '<th>From</th><th>To</th></tr></thead><tbody>', i, tot = 0;
    for (i = 0; i < sg.length; i++) {
      var m = sg[i].months;
      if (m !== null) tot += m;
      h += '<tr><td>' + esc(sg[i].name) + '</td>' +
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
    if (lastChange) {
      h += '<div class=' + q('tl-chg') + '><b>' + esc(lastChange.stage) + '</b> ' +
        (lastChange.was === null ? DASH : lastChange.was) + ' ' + ARR + ' ' + lastChange.now +
        ' months. Every later phase moved with it ' + DASH + ' compare the From and To columns.</div>';
    }
    return h;
  }

  var bars = [], drag = null, geo = null;

  function toDate(v) {
    var t = txt(v); if (!t) return null;
    var d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }

  function redraw() {
    var host = elB.querySelector('#tl-gantt');
    if (host) gantt(host);
  }

  function gantt(host) {
    if (S.tl.err) { host.innerHTML = st(' e', S.tl.err); return; }
    if (!ready(S.tl.d)) { host.innerHTML = st('', 'Loading' + DOTS); return; }
    var sg = stages(), list = [], i;
    for (i = 0; i < sg.length; i++) {
      var a = toDate(sg[i].from), b = toDate(sg[i].to);
      if (a && b) list.push({ n: sg[i].name, a: a, b: b, m: sg[i].months, ach: sg[i].achieved });
    }
    if (!list.length) { host.innerHTML = st('', 'No dated phases for this version.'); return; }

    var DAY = 86400000;
    var lo = list[0].a.getTime(), hi = list[0].b.getTime();
    for (i = 0; i < list.length; i++) {
      if (list[i].a.getTime() < lo) lo = list[i].a.getTime();
      if (list[i].b.getTime() > hi) hi = list[i].b.getTime();
    }
    lo -= 20 * DAY; hi += 20 * DAY;

    var rh = 26, gp = 8, pl = 260, pr = 96, pt = 30, pb = 16;
    var w = Math.max(420, host.clientWidth || 800), h = pt + pb + list.length * (rh + gp);
    host.innerHTML = '<canvas></canvas>';
    var cv = host.firstChild, x = fitC(cv, w, h);
    var plotW = w - pl - pr;
    function X(t) { return pl + ((t - lo) / (hi - lo)) * plotW; }
    var pxMonth = (plotW / ((hi - lo) / DAY)) * 30.4;
    geo = { cv: cv, pl: pl, pxMonth: pxMonth, w: w };
    x.font = '11px ' + FF;

    var first = new Date(lo);
    var cur = new Date(first.getFullYear(), first.getMonth(), 1);
    while (cur.getTime() <= hi) {
      var gx = X(cur.getTime()), jan = cur.getMonth() === 0;
      if (gx >= pl - 1 && gx <= w - pr + 1) {
        x.strokeStyle = jan ? '#D1D5DB' : '#F1F2F4';
        x.lineWidth = 1;
        x.beginPath(); x.moveTo(gx, pt - 10); x.lineTo(gx, h - pb); x.stroke();
        if (jan || cur.getMonth() % 3 === 0) {
          x.fillStyle = jan ? MUT : FNT;
          x.fillText(cur.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }), gx + 3, pt - 14);
        }
      }
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    bars = [];
    for (i = 0; i < list.length; i++) {
      var r2 = list[i], y = pt + i * (rh + gp);
      var x0 = X(r2.a.getTime()), x1 = X(r2.b.getTime());
      if (drag && drag.stage === r2.n) x1 = Math.max(x0 + 6, drag.x1);
      var bw = Math.max(4, x1 - x0);

      x.fillStyle = hoverStage === r2.n ? INK : MUT;
      x.textAlign = 'right';
      x.fillText(clip(x, r2.n, pl - 16), pl - 12, y + rh / 2 + 4);
      x.textAlign = 'left';

      x.globalAlpha = pending[r2.n] ? 0.4 : 1;
      x.fillStyle = PAL[i % PAL.length];
      x.fillRect(x0, y, bw, rh);
      x.globalAlpha = 1;

      if (hoverStage === r2.n) {
        x.strokeStyle = INK; x.lineWidth = 1.5;
        x.strokeRect(x0 - 0.5, y - 0.5, bw + 1, rh + 1);
      }

      x.fillStyle = '#ffffff'; x.globalAlpha = hoverStage === r2.n ? 1 : 0.8;
      x.fillRect(x0 + bw - 8, y + 6, 2, rh - 12);
      x.fillRect(x0 + bw - 5, y + 6, 2, rh - 12);
      x.globalAlpha = 1;

      if (bw > 40 && r2.m !== null) {
        x.fillStyle = '#ffffff'; x.textAlign = 'center';
        x.fillText(r2.m + 'm', x0 + bw / 2, y + rh / 2 + 4);
        x.textAlign = 'left';
      }

      x.fillStyle = MUT;
      x.fillText(fdate(r2.b), Math.min(x0 + bw + 10, w - pr + 4), y + rh / 2 + 4);
      bars.push({ stage: r2.n, x0: x0, x1: x0 + bw, y: y, h: rh, m: r2.m, a: r2.a, b: r2.b });
    }

    cv.style.cursor = 'default';
    cv.addEventListener('mousemove', hover);
    cv.addEventListener('mousedown', down);
    cv.addEventListener('mouseleave', function () {
      tipHide();
      if (!drag && hoverStage) { hoverStage = null; redraw(); }
    });
  }

  function hitEdge(mx, my) {
    for (var i = 0; i < bars.length; i++) {
      var b = bars[i];
      if (my >= b.y && my <= b.y + b.h && Math.abs(mx - b.x1) <= 6) return b;
    }
    return null;
  }
  function hitBar(mx, my) {
    for (var i = 0; i < bars.length; i++) {
      var b = bars[i];
      if (my >= b.y && my <= b.y + b.h) return b;
    }
    return null;
  }
  function hover(ev) {
    if (drag || !geo) return;
    var r = geo.cv.getBoundingClientRect();
    var mx = ev.clientX - r.left, my = ev.clientY - r.top;
    var edge = hitEdge(mx, my), bar = hitBar(mx, my);
    geo.cv.style.cursor = edge ? 'ew-resize' : 'default';
    if (bar) {
      if (hoverStage !== bar.stage) { hoverStage = bar.stage; redraw(); }
      tipShow('<b>' + esc(bar.stage) + '</b><br>' + esc(fdate(bar.a)) + ' ' + ARR + ' ' + esc(fdate(bar.b)) +
        '<br>' + (bar.m === null ? DASH : bar.m + ' months') +
        '<br><span style=' + q('opacity:.7') + '>' +
        (edge ? 'drag this edge to change it' : 'grab the right edge to change it') + '</span>',
        ev.clientX, ev.clientY);
    } else {
      tipHide();
      if (hoverStage) { hoverStage = null; redraw(); }
    }
  }
  function down(ev) {
    if (!geo) return;
    var r = geo.cv.getBoundingClientRect();
    var b = hitEdge(ev.clientX - r.left, ev.clientY - r.top);
    if (!b) return;
    ev.preventDefault();
    tipHide();
    drag = { stage: b.stage, x0: b.x0, x1: b.x1, x1o: b.x1, start: ev.clientX,
             months: b.m === null ? 0 : b.m, raf: 0 };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }
  function move(ev) {
    if (!drag || !geo) return;
    drag.x1 = Math.max(drag.x0 + 6, drag.x1o + (ev.clientX - drag.start));
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
    var delta = Math.round(d / geo.pxMonth);
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
           'hover a bar; drag its right edge to change the length') +
      card('Months', 4, rail(), 'type a value, or drag an edge');
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
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
    subs = []; listeners = []; bars = []; geo = null; root.innerHTML = '';
    root.__cleanup = null;
  };

  paint();
})();
