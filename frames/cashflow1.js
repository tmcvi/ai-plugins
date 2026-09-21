(function () {
  'use strict';
  var SDK = window.PigmentSDK;
  var root = document.getElementById('app');
  if (root.__cleanup) root.__cleanup();

  var DASH = String.fromCharCode(8211), DOTS = String.fromCharCode(8230), ARR = String.fromCharCode(8594);
  var QT = String.fromCharCode(39);
  function q(s) { return QT + s + QT; }
  var INK = '#111827', MUT = '#6B7280', FNT = '#9CA3AF', BRD = '#E5E7EB', BG = '#F6F7F9';
  var ACC = '#4F46E5', POS = '#1E3A8A', PAY = '#F97316', REV = '#BE185D', OK = '#059669', WARN = '#D97706';
  var BAD = '#B91C1C';
  var FF = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  var PAL = [ACC, '#0EA5E9', OK, WARN, PAY, REV, POS, '#7C3AED'];

  var listeners = [], subs = [], styleEl = document.createElement('style');
  function on(t, e, f) { t.addEventListener(e, f); listeners.push([t, e, f]); }

  styleEl.textContent =
    '.cf *{box-sizing:border-box}' +
    '.cf{position:fixed;inset:0;overflow:auto;background:' + BG + ';color:' + INK + ';font-family:' + FF + ';font-size:14px;line-height:1.45}' +
    '.cf-hd{position:sticky;top:0;z-index:9;min-height:56px;display:flex;align-items:center;gap:14px;padding:0 24px;background:#fff;border-bottom:1px solid ' + BRD + ';flex-wrap:wrap}' +
    '.cf-t{font-size:16px;font-weight:600}' +
    '.cf-sp{flex:1 1 auto}' +
    '.cf-lb{color:' + MUT + ';font-size:12px;text-transform:uppercase;letter-spacing:.04em}' +
    '.cf-bd{padding:24px;max-width:1500px;margin:0 auto;display:grid;grid-template-columns:repeat(12,1fr);gap:16px;align-items:start}' +
    '.cf-c{background:#fff;border:1px solid ' + BRD + ';border-radius:8px;padding:16px;min-width:0}' +
    '.cf-c h2{margin:0 0 10px;font-size:14px;font-weight:600}' +
    '.cf-c h2 span{color:' + MUT + ';font-size:12px;font-weight:400;margin-left:8px}' +
    '.cf-s{font:inherit;font-size:13px;padding:6px 10px;border-radius:6px;border:1px solid #D1D5DB;max-width:320px}' +
    '.cf-in{font:inherit;font-size:13px;padding:5px 8px;border-radius:6px;border:1px solid #D1D5DB;width:72px;text-align:right;font-variant-numeric:tabular-nums}' +
    '.cf-seg{display:inline-flex;border:1px solid #D1D5DB;border-radius:6px;overflow:hidden}' +
    '.cf-seg button{appearance:none;border:0;background:#fff;color:' + INK + ';font:inherit;font-size:13px;padding:6px 12px;cursor:pointer}' +
    '.cf-seg button+button{border-left:1px solid #D1D5DB}' +
    '.cf-seg button.on{background:' + ACC + ';color:#fff}' +
    '.cf-b{appearance:none;border:1px solid #D1D5DB;background:#fff;color:' + INK + ';font:inherit;font-size:13px;padding:5px 10px;border-radius:6px;cursor:pointer}' +
    '.cf-b:hover{border-color:' + ACC + ';color:' + ACC + '}' +
    '.cf-b.p{background:' + ACC + ';border-color:' + ACC + ';color:#fff}' +
    '.cf-b:disabled{opacity:.5;cursor:default}' +
    '.cf-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}' +
    '.cf-kv{font-size:24px;font-weight:600;font-variant-numeric:tabular-nums;margin-top:4px}' +
    '.cf-kn{font-size:11px;color:' + FNT + ';margin-top:2px}' +
    '.cf-cv{width:100%;overflow:hidden}.cf-cv canvas{display:block}' +
    '.cf-lg{display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:' + MUT + ';margin-top:8px}' +
    '.cf-lg i{width:9px;height:9px;border-radius:2px;display:inline-block;margin-right:5px}' +
    '.cf-bar{display:flex;height:34px;border-radius:6px;overflow:hidden;border:1px solid ' + BRD + ';background:' + BG + '}' +
    '.cf-sg{position:relative;min-width:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#fff;overflow:hidden;white-space:nowrap}' +
    '.cf-gr{position:absolute;top:0;right:0;bottom:0;width:8px;cursor:ew-resize;background:rgba(255,255,255,.55)}' +
    '.cf-gr:hover{background:#fff}' +
    '.cf-tot{display:flex;align-items:center;gap:12px;margin-top:10px;font-size:13px}' +
    '.cf-tot b{font-variant-numeric:tabular-nums}' +
    '.cf-warn{color:' + BAD + ';font-weight:600}' +
    '.cf-tb{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}' +
    '.cf-tb th{text-align:left;color:' + MUT + ';font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:6px 6px;border-bottom:1px solid ' + BRD + '}' +
    '.cf-tb td{padding:5px 6px;border-bottom:1px solid ' + BRD + '}' +
    '.cf-n{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}' +
    '.cf-st{padding:32px 16px;text-align:center;color:' + MUT + '}' +
    '.cf-st.e{color:' + BAD + '}' +
    '.cf-ws{font-size:12px;color:' + MUT + ';min-height:18px;margin-top:8px}' +
    '.cf-ws.ok{color:' + OK + '}.cf-ws.bad{color:' + BAD + '}' +
    '.cf-note{font-size:12px;color:' + MUT + ';margin-top:8px}' +
    '.cf-off{opacity:.45;pointer-events:none}' +
    '.cf-alert{background:#FFFBEB;border:1px solid #FDE68A;color:#92400E;border-radius:6px;padding:8px 10px;font-size:12px;margin-bottom:12px}' +
    '.cf-pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;color:#fff}' +
    '.cf-tip{position:fixed;z-index:9999;pointer-events:none;opacity:0;background:#111827;color:#fff;font-family:' + FF + ';font-size:12px;line-height:1.5;padding:8px 10px;border-radius:6px;transition:opacity .08s}' +
    '@media (max-width:1100px){.cf-bd{grid-template-columns:repeat(6,1fr)}.cf-kpi{grid-template-columns:repeat(2,1fr)}}';
  document.head.appendChild(styleEl);

  var tip = document.createElement('div');
  tip.className = 'cf-tip';
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
  function pct(v, dp) {
    var n = num(v); if (n === null) return DASH;
    return (n * 100).toFixed(dp == null ? 1 : dp) + '%';
  }
  function pctTot(v) {
    var n = num(v); if (n === null) return DASH;
    var p = n * 100;
    return (Math.abs(p - Math.round(p)) < 0.05) ? Math.round(p) + '%' : p.toFixed(1) + '%';
  }
  function statusCol(raw) {
    var s = String(raw || '').toLowerCase();
    if (!s) return FNT;
    if (s.indexOf('approv') === 0) return OK;
    if (s.indexOf('await') >= 0 || s.indexOf('request') >= 0) return WARN;
    return MUT;
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
    cash: ['receipts', 'cost', 'earnt'],
    assum: ['billing', 'terms', 'request', 'peak', 'currency'],
    sched: ['pct', 'amount', 'achieved'],
    appr: ['status', 'approver'],
    bands: ['phase']
  };
  function ci(s, k) { var i = COLS[s].indexOf(k); return i < 0 ? 0 : i; }
  var NAMES = ['cash', 'assum', 'sched', 'appr', 'bands'];
  var S = {}, i0;
  for (i0 = 0; i0 < NAMES.length; i0++) S[NAMES[i0]] = { d: null, err: null };
  var versions = [], billingOpts = [], sel = null, timer = null;
  var msg = '', msgCls = '', busy = false, dragPct = null;

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
  function st(c, m) { return '<div class=' + q('cf-st' + (c || '')) + '>' + esc(m) + '</div>'; }
  function bump() { if (timer) clearTimeout(timer); timer = setTimeout(paint, 30); }
  function say(m, cls) { msg = m; msgCls = cls || ''; paint(); }

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
  sub('cash', 1000); sub('assum'); sub('sched'); sub('appr'); sub('bands', 1000);
  try {
    subs.push(SDK.subscribeToItems('versions', {
      onData: function (d) {
        versions = (d && d.items) ? d.items : [];
        if (!sel && versions.length) sel = versions[0];
        bump();
      },
      onError: function () { versions = []; bump(); }
    }));
    subs.push(SDK.subscribeToItems('billingTypes', {
      onData: function (d) { billingOpts = (d && d.items) ? d.items : []; bump(); },
      onError: function () { billingOpts = []; bump(); }
    }));
  } catch (e) {}

  function assum(k) { var r = mine1('assum'); return r ? val(r, ci('assum', k)) : null; }
  function cur() { return txt(assum('currency')); }
  function billing() { return txt(assum('billing')); }
  function isMilestones() { return billing().toLowerCase().indexOf('milestone') >= 0; }

  function schedule() {
    var rows = mine('sched'), order = axisOf('sched', 1), byName = {}, out = [], i;
    for (i = 0; i < rows.length; i++) byName[lab(rows[i], 1)] = rows[i];
    for (i = 0; i < order.length; i++) {
      var r = byName[order[i]];
      if (!r) continue;
      out.push({
        name: order[i],
        pct: num(val(r, ci('sched', 'pct'))),
        amount: num(val(r, ci('sched', 'amount'))),
        achieved: txt(val(r, ci('sched', 'achieved')))
      });
    }
    return out;
  }
  function pctTotal(list) {
    var t = 0, i, any = false;
    for (i = 0; i < list.length; i++) if (list[i].pct !== null) { t += list[i].pct; any = true; }
    return any ? t : null;
  }

  function series() {
    var rows = mine('cash');
    if (!rows.length) return null;
    var order = axisOf('cash', 1), rk = {}, i;
    for (i = 0; i < order.length; i++) rk[order[i]] = i;
    rows = rows.slice().sort(function (a, b) { return (rk[lab(a, 1)] || 0) - (rk[lab(b, 1)] || 0); });
    var m = [], rc = [], cs = [], er = [], cr = [], cc = [], ps = [], a = 0, b = 0;
    for (i = 0; i < rows.length; i++) {
      var x1 = num(val(rows[i], ci('cash', 'receipts'))) || 0;
      var x2 = num(val(rows[i], ci('cash', 'cost'))) || 0;
      var x3 = num(val(rows[i], ci('cash', 'earnt'))) || 0;
      m.push(lab(rows[i], 1)); rc.push(x1); cs.push(x2); er.push(x3);
      a += x1; b += x2; cr.push(a); cc.push(b); ps.push(a - b);
    }
    return { m: m, rc: rc, cs: cs, er: er, cr: cr, cc: cc, ps: ps };
  }
  function monthsToPositive(s) {
    if (!s) return null;
    for (var i = 0; i < s.ps.length; i++) if (s.ps[i] >= 0) return { n: i, month: s.m[i] };
    return null;
  }
  function peakMonth(s) {
    if (!s || !s.ps.length) return null;
    var k = 0, i;
    for (i = 1; i < s.ps.length; i++) if (s.ps[i] < s.ps[k]) k = i;
    return { v: s.ps[k], month: s.m[k] };
  }

  /* -- writes ------------------------------------------------------------- */
  function write(alias, coords, value, label, after) {
    if (!sel) { say('Pick a version first.', 'bad'); return; }
    busy = true;
    say('Saving ' + label + DOTS, '');
    Promise.resolve(SDK.editValue(alias, coords, value)).then(function () {
      busy = false;
      say(label + ' saved. Pigment is recalculating' + DOTS, 'ok');
      if (after) after();
    })['catch'](function (e) {
      busy = false;
      say('Not saved: ' + ((e && e.message) ? e.message : 'the write was rejected.'), 'bad');
    });
  }
  function writeStagePct(stage, p) {
    var co = {}; co.versions = sel; co.stages = stage;
    write('milestonePct', co, p, stage + ' at ' + Math.round(p * 100) + '%');
  }
  function writeTerms(days) {
    var co = {}; co.versions = sel;
    write('terms', co, days, 'Payment terms ' + days + ' days');
  }
  function writeBilling(name) {
    var co = {}; co.versions = sel;
    write('billingType', co, name, 'Billing type ' + name);
  }
  function writeRequest(flag) {
    var co = {}; co.versions = sel;
    write('requestApprovals', co, flag, flag ? 'Approvals requested' : 'Approval request withdrawn');
  }
  /* Normalise rewrites all eight stages proportionally. Sequential, because a
     burst of eight concurrent writes to the same metric is the kind of thing
     that races; slower and correct beats faster and wrong. */
  function normalise() {
    var list = schedule(), tot = pctTotal(list), i;
    if (!tot) { say('Nothing to normalise: no percentages are set.', 'bad'); return; }
    /* Whole points that still sum to exactly 100. Rounding each share on its
       own lands on 99 or 101 as often as 100, so floor them all and hand the
       leftover points to the largest remainders. */
    var floors = [], rem = [], sum = 0, ord = [];
    for (i = 0; i < list.length; i++) {
      var raw = ((list[i].pct || 0) / tot) * 100;
      var f = Math.floor(raw);
      floors.push(f); rem.push(raw - f); sum += f; ord.push(i);
    }
    ord.sort(function (a, b) { return rem[b] - rem[a]; });
    var left = 100 - sum;
    for (i = 0; i < left && i < ord.length; i++) floors[ord[i]] += 1;

    var chain = Promise.resolve();
    busy = true;
    say('Normalising eight stages to whole percentage points' + DOTS, '');
    for (i = 0; i < list.length; i++) {
      (function (stage, p) {
        chain = chain.then(function () {
          var co = {}; co.versions = sel; co.stages = stage;
          return SDK.editValue('milestonePct', co, p);
        });
      })(list[i].name, floors[i] / 100);
    }
    chain.then(function () {
      busy = false;
      say('Normalised to 100%. Milestone amounts are recalculating' + DOTS, 'ok');
    })['catch'](function (e) {
      busy = false;
      say('Normalise stopped partway: ' + ((e && e.message) ? e.message : 'a write was rejected.') +
          ' The split may not sum to 100% ' + DASH + ' check before relying on it.', 'bad');
    });
  }

  root.className = 'cf';
  root.innerHTML =
    '<div class=' + q('cf-hd') + '>' +
      '<span class=' + q('cf-t') + '>Cashflow</span>' +
      '<select class=' + q('cf-s') + ' id=' + q('cf-v') + '></select>' +
      '<span class=' + q('cf-lb') + '>Billing</span><span id=' + q('cf-bt') + '></span>' +
      '<span class=' + q('cf-lb') + '>Terms (days)</span>' +
      '<input class=' + q('cf-in') + ' id=' + q('cf-tm') + ' type=' + q('number') + ' min=' + q('0') + ' step=' + q('1') + '>' +
      '<span class=' + q('cf-sp') + '></span>' +
    '</div><div class=' + q('cf-bd') + ' id=' + q('cf-body') + '></div>';
  var elV = root.querySelector('#cf-v'), elBT = root.querySelector('#cf-bt');
  var elTM = root.querySelector('#cf-tm'), elB = root.querySelector('#cf-body');
  on(elV, 'change', function () { sel = elV.value; msg = ''; paint(); });
  on(elTM, 'change', function () {
    var n = parseInt(elTM.value, 10);
    if (isNaN(n) || n < 0) { say('Payment terms must be a whole number of days.', 'bad'); return; }
    writeTerms(n);
  });

  function card(title, span, inner, sub2) {
    return '<section class=' + q('cf-c') + ' style=' + q('grid-column:span ' + span) + '><h2>' + esc(title) +
      (sub2 ? '<span>' + esc(sub2) + '</span>' : '') + '</h2>' + inner + '</section>';
  }

  function kpis() {
    var s = series(), c = cur();
    if (S.cash.err) return st(' e', S.cash.err);
    if (!ready(S.cash.d)) return st('', 'Loading' + DOTS);
    if (!s) return st('', 'No cashflow for this version.');
    var pk = peakMonth(s), pos = monthsToPositive(s);
    var totE = 0, totR = 0, i;
    for (i = 0; i < s.m.length; i++) { totE += s.er[i]; totR += s.rc[i]; }
    var declared = num(assum('peak'));
    var shown = declared === null ? (pk ? pk.v : null) : declared;
    var note = pk ? 'lowest in ' + pk.month : '';
    if (declared !== null && pk && Math.abs(declared - pk.v) > Math.max(1, Math.abs(declared) * 0.001)) {
      note = 'model says ' + comp(declared, c) + ', this series ' + comp(pk.v, c) + ' ' + DASH + ' check';
    }
    return '<div class=' + q('cf-kpi') + '>' +
      kp('Peak cash drawdown', comp(shown, c), (shown !== null && shown < 0) ? BAD : POS, note) +
      kp('Total earnt revenue', comp(totE, c), REV, s.m.length + ' months') +
      kp('Total cash receipts', comp(totR, c), ACC, 'after payment terms') +
      kp('Months to cash positive', pos ? String(pos.n) : DASH, pos ? OK : WARN,
         pos ? 'from ' + pos.month : 'never in this window') +
      '</div>';
  }
  function kp(l, v, col, note) {
    return '<div><div class=' + q('cf-lb') + '>' + esc(l) + '</div>' +
      '<div class=' + q('cf-kv') + ' style=' + q('color:' + col) + '>' + esc(v) + '</div>' +
      '<div class=' + q('cf-kn') + '>' + esc(note || '') + '</div></div>';
  }

  function chartBlock() {
    if (S.cash.err) return st(' e', S.cash.err);
    if (!ready(S.cash.d)) return st('', 'Loading' + DOTS);
    if (!series()) return st('', 'No cashflow months for this version.');
    return '<div class=' + q('cf-cv') + ' id=' + q('cf-chart') + '></div>' +
      '<div class=' + q('cf-lg') + '>' +
      lgd(ACC, 'Receipts (cum.)') + lgd(PAY, 'Payments (cum.)') + lgd(POS, 'Net position (cum.)') +
      lgd(REV, 'Earnt revenue (monthly, own scale)') +
      '<span style=' + q('color:' + FNT) + '>bands behind the lines are the study phases</span>' +
      '</div>';
  }
  function lgd(c, t) { return '<span><i style=' + q('background:' + c) + '></i>' + esc(t) + '</span>'; }

  function bandsFor() {
    var rows = mine('bands'), order = axisOf('bands', 2), rk = {}, i;
    for (i = 0; i < order.length; i++) rk[order[i]] = i;
    var by = {}, ord = [];
    for (i = 0; i < rows.length; i++) {
      var s2 = lab(rows[i], 1), mo = lab(rows[i], 2), v = num(val(rows[i], 0));
      if (!s2 || !mo || v === null || v <= 0) continue;
      var k = rk[mo]; if (k === undefined) continue;
      if (!by[s2]) { by[s2] = { n: s2, lo: k, hi: k }; ord.push(s2); }
      else { if (k < by[s2].lo) by[s2].lo = k; if (k > by[s2].hi) by[s2].hi = k; }
    }
    var out = [];
    for (i = 0; i < ord.length; i++) out.push(by[ord[i]]);
    return { list: out, order: order };
  }

  function drawChart(host) {
    var s = series();
    if (!s || !s.m.length) return;
    var pl = 62, pr = 14, pt = 14, pb = 26;
    var w = Math.max(320, host.clientWidth || 640), h = 300;
    host.innerHTML = '<canvas></canvas>';
    var cv = host.firstChild, x = fitC(cv, w, h);
    var pw = w - pl - pr, ph = h - pt - pb, n = s.m.length, i;

    var hi = 0, lo = 0;
    function track(v) { if (v > hi) hi = v; if (v < lo) lo = v; }
    for (i = 0; i < n; i++) { track(s.cr[i]); track(s.cc[i]); track(s.ps[i]); }
    if (hi === lo) hi = lo + 1;
    var pad = (hi - lo) * 0.08; hi += pad; lo -= pad;
    function X(k) { return pl + (n === 1 ? pw / 2 : (k / (n - 1)) * pw); }
    function Y(v) { return pt + ph - ((v - lo) / (hi - lo)) * ph; }

    /* phase bands first, so everything else sits on top of them */
    var bd = bandsFor(), idx = {};
    for (i = 0; i < s.m.length; i++) idx[s.m[i]] = i;
    for (i = 0; i < bd.list.length; i++) {
      var b = bd.list[i];
      var a1 = idx[bd.order[b.lo]], a2 = idx[bd.order[b.hi]];
      if (a1 === undefined || a2 === undefined) continue;
      var bx0 = X(a1), bx1 = X(a2);
      x.fillStyle = PAL[i % PAL.length];
      x.globalAlpha = 0.07;
      x.fillRect(bx0, pt, Math.max(1, bx1 - bx0), ph);
      x.globalAlpha = 1;
      x.fillStyle = FNT;
      x.font = '9px ' + FF;
      if (bx1 - bx0 > 26) x.fillText(String(i + 1), bx0 + 3, pt + 10);
    }

    x.font = '10px ' + FF;
    x.strokeStyle = BRD; x.lineWidth = 1;
    x.beginPath(); x.moveTo(pl, Y(0)); x.lineTo(w - pr, Y(0)); x.stroke();
    x.fillStyle = FNT; x.textAlign = 'right';
    x.fillText(comp(hi), pl - 6, Y(hi) + 8);
    x.fillText(comp(0), pl - 6, Y(0) - 3);
    x.fillText(comp(lo), pl - 6, Y(lo));
    x.textAlign = 'left';
    x.fillText(s.m[0], pl, h - 8);
    if (n > 1) { x.textAlign = 'right'; x.fillText(s.m[n - 1], w - pr, h - 8); x.textAlign = 'left'; }

    var emax = 0;
    for (i = 0; i < n; i++) if (Math.abs(s.er[i]) > emax) emax = Math.abs(s.er[i]);
    var bw = Math.max(1, (pw / Math.max(1, n)) * 0.55), cap = ph * 0.3;
    x.fillStyle = REV; x.globalAlpha = 0.3;
    for (i = 0; i < n; i++) {
      if (!s.er[i] || !emax) continue;
      var bh = Math.max(1, (Math.abs(s.er[i]) / emax) * cap);
      x.fillRect(X(i) - bw / 2, pt + ph - bh, bw, bh);
    }
    x.globalAlpha = 1;

    ln(x, s.cr, X, Y, ACC, 1.8); ln(x, s.cc, X, Y, PAY, 1.8); ln(x, s.ps, X, Y, POS, 2.4);

    var pk = peakMonth(s);
    if (pk) {
      var pi = idx[pk.month];
      if (pi !== undefined) {
        x.fillStyle = BAD;
        x.beginPath(); x.arc(X(pi), Y(pk.v), 3.5, 0, Math.PI * 2); x.fill();
      }
    }

    var c = cur();
    cv.addEventListener('mousemove', function (ev) {
      var r = cv.getBoundingClientRect(), mx = ev.clientX - r.left;
      if (mx < pl - 4 || mx > w - pr + 4) { tipHide(); return; }
      var k = n === 1 ? 0 : Math.round(((mx - pl) / pw) * (n - 1));
      k = Math.max(0, Math.min(n - 1, k));
      tipShow('<b>' + esc(s.m[k]) + '</b><br>Receipts (cum.) ' + money(s.cr[k], c) +
        '<br>Payments (cum.) ' + money(s.cc[k], c) +
        '<br>Net position ' + money(s.ps[k], c) +
        '<br>Earnt revenue ' + money(s.er[k], c), ev.clientX, ev.clientY);
    });
    cv.addEventListener('mouseleave', tipHide);
  }
  function ln(x, arr, X, Y, c, w) {
    x.strokeStyle = c; x.lineWidth = w; x.lineJoin = 'round'; x.beginPath();
    for (var i = 0; i < arr.length; i++) { if (i === 0) x.moveTo(X(i), Y(arr[i])); else x.lineTo(X(i), Y(arr[i])); }
    x.stroke();
  }

  function scheduleBlock() {
    if (S.sched.err) return st(' e', S.sched.err);
    if (!ready(S.sched.d)) return st('', 'Loading' + DOTS);
    var list = schedule();
    if (!list.length) return st('', 'No milestone schedule for this version.');
    var tot = pctTotal(list), c = cur(), i;
    var off = !isMilestones();

    var h = '';
    if (off) {
      h += '<div class=' + q('cf-alert') + '>Billing type is <b>' + esc(billing() || 'Monthly Billing') +
        '</b>, so this schedule is not in use ' + DASH + ' receipts follow earnt revenue shifted by the ' +
        'payment terms. Switch to Milestones in the header to use it.</div>';
    }
    if (tot !== null && Math.abs(tot - 1) > 0.0005) {
      h += '<div class=' + q('cf-alert') + '>The split totals <b>' + pctTot(tot) +
        '</b>, not 100%, so every Milestone Amount is wrong by that factor. Normalise before relying on ' +
        'the schedule or the chart in Milestones mode.</div>';
    }

    h += '<div class=' + (off ? q('cf-off') : q('')) + '>';
    h += '<div class=' + q('cf-bar') + ' id=' + q('cf-msbar') + '>';
    for (i = 0; i < list.length; i++) {
      var p = list[i].pct === null ? 0 : list[i].pct;
      var wpc = Math.max(0, p * 100);
      h += '<div class=' + q('cf-sg') + ' data-stage=' + q(esc(list[i].name)) + ' data-idx=' + q(String(i)) +
        ' style=' + q('width:' + wpc + '%;background:' + PAL[i % PAL.length]) + '>' +
        (wpc > 6 ? esc((p * 100).toFixed(0) + '%') : '') +
        '<span class=' + q('cf-gr') + ' data-grip=' + q(String(i)) + '></span></div>';
    }
    h += '</div>';
    h += '<div class=' + q('cf-tot') + '>Total <b class=' +
      (tot !== null && Math.abs(tot - 1) > 0.0005 ? q('cf-warn') : q('')) + '>' + pctTot(tot) + '</b>' +
      '<button class=' + q('cf-b') + ' id=' + q('cf-norm') + (busy ? ' disabled' : '') +
      '>Normalise to 100%</button>' +
      '<span class=' + q('cf-note') + ' style=' + q('margin:0') + '>whole percentage points ' + DASH +
      ' drag a segment edge, or type below</span></div>';

    h += '<table class=' + q('cf-tb') + '><thead><tr><th>Milestone</th><th class=' + q('cf-n') + '>Share</th>' +
      '<th class=' + q('cf-n') + '>Amount</th><th>Billed in</th></tr></thead><tbody>';
    for (i = 0; i < list.length; i++) {
      h += '<tr><td>' + esc(list[i].name) + '</td>' +
        '<td class=' + q('cf-n') + '><input class=' + q('cf-in') + ' type=' + q('number') +
        ' min=' + q('0') + ' max=' + q('100') + ' step=' + q('1') +
        ' data-pct=' + q(esc(list[i].name)) +
        ' value=' + q(list[i].pct === null ? '' : String(Math.round(list[i].pct * 100))) +
        (busy ? ' disabled' : '') + '></td>' +
        '<td class=' + q('cf-n') + '>' + money(list[i].amount, c) + '</td>' +
        '<td>' + esc(list[i].achieved || DASH) + '</td></tr>';
    }
    h += '</tbody></table></div>';
    return h;
  }

  function approvalsBlock() {
    var req = assum('request');
    var on2 = (req === true || String(req).toLowerCase() === 'true');
    var h = '<div style=' + q('display:flex;align-items:center;gap:12px;flex-wrap:wrap') + '>' +
      '<button class=' + q('cf-b' + (on2 ? ' p' : '')) + ' id=' + q('cf-req') + (busy ? ' disabled' : '') + '>' +
      (on2 ? 'Approvals requested' : 'Request departmental approvals') + '</button>' +
      '<span class=' + q('cf-note') + ' style=' + q('margin:0') + '>' +
      (on2 ? 'Departments can approve; press again to withdraw.' : 'Nothing is asked of approvers yet.') +
      '</span></div>';
    if (S.appr.err) return h + st(' e', S.appr.err);
    if (!ready(S.appr.d)) return h + st('', 'Loading' + DOTS);
    var rows = mine('appr'), i, counts = {}, order = [];
    for (i = 0; i < rows.length; i++) {
      var s2 = txt(val(rows[i], ci('appr', 'status'))) || 'Not set';
      if (!counts[s2]) { counts[s2] = 0; order.push(s2); }
      counts[s2]++;
    }
    if (!order.length) return h + st('', 'No approval rows for this version.');
    h += '<div style=' + q('margin-top:12px;display:flex;gap:8px;flex-wrap:wrap') + '>';
    for (i = 0; i < order.length; i++) {
      h += '<span class=' + q('cf-pill') + ' style=' + q('background:' + statusCol(order[i])) + '>' +
        esc(order[i]) + ' ' + counts[order[i]] + '</span>';
    }
    h += '</div>';
    return h;
  }

  function paint() {
    var opts = '', i;
    for (i = 0; i < versions.length; i++) {
      opts += '<option' + (versions[i] === sel ? ' selected' : '') + '>' + esc(versions[i]) + '</option>';
    }
    elV.innerHTML = opts;

    var bt = '<span class=' + q('cf-seg') + '>', b = billing();
    for (i = 0; i < billingOpts.length; i++) {
      bt += '<button data-bill=' + q(esc(billingOpts[i])) + ' class=' +
        q(billingOpts[i] === b ? 'on' : '') + (busy ? ' disabled' : '') + '>' +
        esc(billingOpts[i]) + '</button>';
    }
    elBT.innerHTML = bt + '</span>';

    var tm = num(assum('terms'));
    if (document.activeElement !== elTM) elTM.value = tm === null ? '' : String(tm);

    elB.innerHTML =
      card('Position', 12, kpis()) +
      card('Cash over time', 12, chartBlock(), 'cumulative; the Frame cumulates, the model stores monthly') +
      card('Milestone schedule', 7, scheduleBlock(), 'one write per edit, so the total can drift') +
      card('Departmental approvals', 5, approvalsBlock()) +
      (msg ? card('Last action', 12,
        '<div class=' + q('cf-ws' + (msgCls ? ' ' + msgCls : '')) + '>' + esc(msg) + '</div>') : '');

    var host = elB.querySelector('#cf-chart');
    if (host) drawChart(host);
    wire();
  }

  var grip = null;
  function wire() {
    var i;
    var bills = elBT.querySelectorAll('button[data-bill]');
    for (i = 0; i < bills.length; i++) {
      on(bills[i], 'click', function (ev) {
        var name = ev.currentTarget.getAttribute('data-bill');
        if (name !== billing()) writeBilling(name);
      });
    }
    var nm = elB.querySelector('#cf-norm');
    if (nm) on(nm, 'click', normalise);
    var rq = elB.querySelector('#cf-req');
    if (rq) {
      on(rq, 'click', function () {
        var req = assum('request');
        writeRequest(!(req === true || String(req).toLowerCase() === 'true'));
      });
    }
    var pcts = elB.querySelectorAll('input[data-pct]');
    for (i = 0; i < pcts.length; i++) {
      on(pcts[i], 'change', function (ev) {
        var el = ev.currentTarget, stage = el.getAttribute('data-pct');
        var v = Math.round(parseFloat(el.value));
        if (isNaN(v) || v < 0) { say('Share must be a whole percentage of 0 or more.', 'bad'); return; }
        writeStagePct(stage, v / 100);
      });
    }
    var grips = elB.querySelectorAll('span[data-grip]');
    for (i = 0; i < grips.length; i++) on(grips[i], 'mousedown', gripDown);
  }

  /* Dragging an edge changes only that stage, per the briefing: the Frame
     never silently rebalances a neighbour, so the total drifts and the
     Normalise action is the way back to 100%. */
  function gripDown(ev) {
    var bar = elB.querySelector('#cf-msbar');
    if (!bar || busy) return;
    ev.preventDefault();
    var seg = ev.currentTarget.parentNode;
    grip = {
      stage: seg.getAttribute('data-stage'), seg: seg, bar: bar,
      barW: bar.getBoundingClientRect().width,
      x0: seg.getBoundingClientRect().left
    };
    document.addEventListener('mousemove', gripMove);
    document.addEventListener('mouseup', gripUp);
  }
  function gripMove(ev) {
    if (!grip) return;
    var wpx = Math.max(0, ev.clientX - grip.x0);
    var p = Math.max(0, Math.min(1, wpx / grip.barW));
    dragPct = p;
    grip.seg.style.width = (p * 100) + '%';
    /* keep the label honest while dragging, or the number lags the bar */
    var pcTxt = Math.round(p * 100) + '%';
    grip.seg.textContent = (p * 100) > 6 ? pcTxt : '';
    var g = document.createElement('span');
    g.className = 'cf-gr';
    g.setAttribute('data-grip', '1');
    grip.seg.appendChild(g);
  }
  function gripUp() {
    document.removeEventListener('mousemove', gripMove);
    document.removeEventListener('mouseup', gripUp);
    if (!grip) return;
    var stage = grip.stage, p = dragPct;
    grip = null; dragPct = null;
    if (p === null || p === undefined) { paint(); return; }
    writeStagePct(stage, Math.round(p * 100) / 100);
  }

  var rsz = null;
  function onRz() {
    if (rsz) clearTimeout(rsz);
    rsz = setTimeout(function () {
      var host = elB.querySelector('#cf-chart');
      if (host) drawChart(host);
    }, 150);
  }
  on(window, 'resize', onRz);

  root.__cleanup = function () {
    if (timer) clearTimeout(timer);
    if (rsz) clearTimeout(rsz);
    document.removeEventListener('mousemove', gripMove);
    document.removeEventListener('mouseup', gripUp);
    var i;
    for (i = 0; i < subs.length; i++) { try { subs[i].unsubscribe(); } catch (e) {} }
    for (i = 0; i < listeners.length; i++) {
      try { listeners[i][0].removeEventListener(listeners[i][1], listeners[i][2]); } catch (e) {}
    }
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
    subs = []; listeners = []; grip = null; root.innerHTML = '';
    root.__cleanup = null;
  };

  paint();
})();
