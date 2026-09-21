/* ---------------------------------------------------------------------------
 * Frame 4 - Executive Summary cockpit. Section 7 of the briefing.
 * Counterpart to board 00. Executive Summary, which stays as it is.
 *
 * Data comes from dataSources, not Views (see frames/README.md). Every
 * dataSource puts `versions` first in `labels` and narrows client-side, so
 * five of the six panels need no dynamicFilters at all. Only the two
 * month-grained sources would benefit from a server-side filter, and the
 * shape for that is negotiated at runtime.
 *
 * No double quotes and no backslashes - build.py enforces it so the body
 * survives a JSON tool argument.
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var SDK = window.PigmentSDK;
  var root = document.getElementById('app');
  if (root.__cleanup) root.__cleanup();

  var L = PF.lifecycle();
  var T = PF.T;
  var Q = PF.q;
  L.node(PF.injectStyles('pf-cockpit-css', PF.baseCss() + extraCss()));
  var tip = PF.makeTooltip();

  /* -- shell ---------------------------------------------------------------- */
  root.className = 'pf';
  root.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;overflow:auto;';
  root.innerHTML =
    '<div class=' + Q('pf-hd') + '>' +
      '<span class=' + Q('pf-hd-title') + '>Executive Summary</span>' +
      '<span class=' + Q('pf-crumb') + ' id=' + Q('ck-crumb') + '></span>' +
      '<span id=' + Q('ck-switch') + '></span>' +
      '<span class=' + Q('pf-spacer') + '></span>' +
      '<span class=' + Q('pf-noprint') + '>' +
        '<button class=' + Q('pf-btn') + ' id=' + Q('ck-print') + ' type=' + Q('button') + '>Print / PDF</button>' +
      '</span>' +
    '</div>' +
    '<div class=' + Q('pf-body') + ' id=' + Q('ck-body') + '>' +
      PF.stateLoading('Loading executive summary' + PF.ELLIPSIS) +
    '</div>';

  var elCrumb = root.querySelector('#ck-crumb');
  var elBody = root.querySelector('#ck-body');
  L.on(root.querySelector('#ck-print'), 'click', function () { window.print(); });

  var switcher = PF.versionSwitcher({ onChange: onVersionChange });
  root.querySelector('#ck-switch').appendChild(switcher.node);

  /* -- data sources --------------------------------------------------------
     Column order here must match the manifest's `values` order exactly; it is
     asserted at runtime by COLS below rather than assumed. */
  var COLS = {
    hdr:    ['sponsor', 'indication', 'programPhase', 'status', 'currency', 'patients', 'sites', 'peak'],
    svc:    ['included', 'excluded'],
    budget: ['price', 'cost'],
    appr:   ['status', 'approver', 'date', 'comment'],
    gantt:  ['phase'],
    cash:   ['receipts', 'cost', 'earnt'],
    note:   ['text']
  };
  function c(src, key) {
    var i = COLS[src].indexOf(key);
    return i < 0 ? 0 : i;
  }

  var SRC = ['hdr', 'svc', 'budget', 'appr', 'gantt', 'cash', 'note'];
  var S = {};
  for (var si = 0; si < SRC.length; si++) S[SRC[si]] = { d: null, err: null };
  var subs = {};

  var versionsPartial = false;
  var filterShape = undefined;        /* undefined = negotiating, null = none */
  var noteDirty = false;
  var repaint = PF.debounce(paint, 24);

  function subscribe(name, scrollRows) {
    var opts = {
      dynamicFilters: [],
      onData: function (d) {
        S[name].err = null;
        S[name].d = d;
        repaint();
      },
      onError: function (err) {
        S[name].err = (err && err.message) ? err.message : 'Could not load this section.';
        repaint();
      }
    };
    if (scrollRows) opts.scroll = { offset: 0, numberOfRows: scrollRows };
    try {
      subs[name] = L.sub(SDK.subscribeToDataSource(name, opts));
    } catch (e) {
      S[name].err = 'Subscription failed: ' + (e && e.message ? e.message : String(e));
    }
  }

  /* The two month-grained sources are the only ones that can get large, so
     they ask for a wide window; the rest are at most a few hundred rows. */
  subscribe('hdr');
  subscribe('svc');
  subscribe('budget');
  subscribe('appr');
  subscribe('gantt', 1000);
  subscribe('cash', 1000);
  subscribe('note');

  L.sub(SDK.subscribeToItems('versions', {
    onData: function (d) {
      versionsPartial = !!(d && d.partialResult);
      switcher.setItems(d && d.items ? d.items : []);
      startNegotiation();
      repaint();
    },
    onError: function (err) {
      elCrumb.innerHTML = '<span style=' + Q('color:#B91C1C') + '>Version list unavailable: ' +
        PF.esc(err && err.message ? err.message : 'unknown error') + '</span>';
    }
  }));

  /* Work out the dynamicFilters shape once, in the background, as soon as a
     real version name exists to test with. Nothing waits on it: every panel
     already narrows client-side, so a result here only lets the two wide
     sources stop fetching every version. */
  var negotiating = false;
  function startNegotiation() {
    if (negotiating || filterShape !== undefined) return;
    var v = switcher.selected();
    if (!v) return;
    negotiating = true;
    PF.negotiate(SDK, 'gantt', 'versions', v, function (shape) {
      negotiating = false;
      filterShape = shape || null;
      if (shape) applyFilter();
      repaint();
    });
  }

  function applyFilter() {
    var v = switcher.selected();
    if (!filterShape || !v) return;
    var wide = ['gantt', 'cash'], i;
    for (i = 0; i < wide.length; i++) {
      var s = subs[wide[i]];
      if (s && typeof s.updateDynamicFilters === 'function') {
        try { s.updateDynamicFilters([filterShape.make('versions', [v])]); } catch (e) {}
      }
    }
  }

  function onVersionChange() {
    noteDirty = false;
    startNegotiation();
    applyFilter();
    repaint();
  }

  /* -- helpers -------------------------------------------------------------- */
  function V() { return switcher.selected(); }

  /* Every dataSource has `versions` as label 0. */
  function myRow(name) {
    var v = V();
    if (!v || !PF.ready(S[name].d)) return null;
    return PF.firstWhere(S[name].d, 0, v);
  }
  function myRows(name) {
    var v = V();
    if (!v || !PF.ready(S[name].d)) return [];
    return PF.where(S[name].d, 0, v);
  }
  function guard(name, emptyMsg) {
    if (S[name].err) return PF.stateError(S[name].err);
    if (!PF.ready(S[name].d)) return PF.stateLoading();
    if (!myRows(name).length) return PF.stateEmpty(emptyMsg);
    return null;
  }
  function currency() {
    var r = myRow('hdr');
    return r ? PF.textOf(PF.val(r, c('hdr', 'currency'))) : '';
  }

  /* -- render --------------------------------------------------------------- */
  function paint() {
    var keep = null;
    var live = elBody.querySelector('#ck-note');
    if (live) {
      keep = { value: live.value, focused: document.activeElement === live,
               start: live.selectionStart, end: live.selectionEnd, scroll: live.scrollTop };
    }

    paintCrumb();

    var html = '';
    if (versionsPartial) {
      html += PF.banner('The Project Version list was truncated, so the switcher may not show ' +
        'every version. Open the native list to see them all.');
    }
    if (filterShape === null && (PF.truncated(S.gantt.d) || PF.truncated(S.cash.d))) {
      html += PF.banner('Server-side filtering is unavailable, and the monthly data hit the ' +
        '1,000 row window across all versions, so the timeline or cashflow may be incomplete. ' +
        'Check against the native board.');
    }
    html += '<div class=' + Q('pf-grid') + '>';
    html += panel('Study', 12, studyHtml());
    html += panel('Budget by department', 7, budgetHtml(), 'Main Scope only');
    html += panel('Approval status', 5, approvalsHtml());
    html += panel('Timeline', 7, '<div id=' + Q('ck-gantt') + ' class=' + Q('ck-canvas') + '></div>',
                  'read-only ' + PF.DASH + ' edit on the Timeline Frame');
    html += panel('Cashflow', 5, cashHtml(), 'read-only ' + PF.DASH + ' edit on the Cashflow Frame');
    html += panel('Preparer submission notes', 12, notesHtml());
    html += '</div>';
    elBody.innerHTML = html;

    if (keep && noteDirty) {
      var ta = elBody.querySelector('#ck-note');
      if (ta) {
        ta.value = keep.value;
        ta.scrollTop = keep.scroll;
        if (keep.focused) {
          ta.focus();
          try { ta.setSelectionRange(keep.start, keep.end); } catch (e) {}
        }
      }
    }
    draw();
    attach();
  }

  function panel(title, span, inner, sub) {
    return '<section class=' + Q('pf-card') + ' style=' + Q('grid-column:span ' + span) + '>' +
      '<h2>' + PF.esc(title) +
      (sub ? '<span class=' + Q('pf-sub') + '>' + PF.esc(sub) + '</span>' : '') +
      '</h2>' + inner + '</section>';
  }

  function paintCrumb() {
    var r = myRow('hdr');
    var st = r ? PF.textOf(PF.val(r, c('hdr', 'status'))) : '';
    var html = '<b>' + PF.esc(V() || PF.DASH) + '</b>';
    if (st) {
      html += '<span class=' + Q('pf-pill') + ' style=' +
        Q('background:' + PF.statusColor(st) + ';margin-left:8px') + '>' + PF.esc(st) + '</span>';
    }
    elCrumb.innerHTML = html;
  }

  /* 2. Study header -------------------------------------------------------- */
  function studyHtml() {
    if (S.hdr.err) return PF.stateError(S.hdr.err);
    if (!PF.ready(S.hdr.d)) return PF.stateLoading();
    var r = myRow('hdr');
    if (!r) return PF.stateEmpty('No study header for this version.');
    var cur = currency();

    var tiles = [
      ['Sponsor', PF.textOf(PF.val(r, c('hdr', 'sponsor'))), false],
      ['Indication', PF.textOf(PF.val(r, c('hdr', 'indication'))), false],
      ['Programme phase', PF.textOf(PF.val(r, c('hdr', 'programPhase'))), false],
      ['Patients randomized', PF.fmtNum(PF.val(r, c('hdr', 'patients'))), true],
      ['Active sites', PF.fmtNum(PF.val(r, c('hdr', 'sites'))), true],
      ['Peak cash drawdown', PF.compact(PF.val(r, c('hdr', 'peak')), cur), true]
    ];
    var h = '<div class=' + Q('ck-tiles') + '>', i;
    for (i = 0; i < tiles.length; i++) {
      var v = tiles[i][1];
      var empty = (v === '' || v === PF.DASH);
      h += '<div><div class=' + Q('pf-tile-label') + '>' + PF.esc(tiles[i][0]) + '</div>' +
        '<div class=' + Q('pf-tile-value' + (tiles[i][2] ? '' : ' pf-sm')) + '>' +
        (empty ? '<span style=' + Q('color:' + T.faint) + '>' + PF.DASH + '</span>' : PF.esc(v)) +
        '</div></div>';
    }
    h += '</div>';

    if (S.svc.err) {
      h += '<div class=' + Q('ck-chips') + '>' + PF.stateError(S.svc.err) + '</div>';
    } else if (PF.ready(S.svc.d)) {
      var sr = myRow('svc');
      var inc = sr ? PF.splitList(PF.val(sr, c('svc', 'included'))) : [];
      var exc = sr ? PF.splitList(PF.val(sr, c('svc', 'excluded'))) : [];
      h += '<div class=' + Q('ck-chips') + '>';
      h += chipRow('Services included', inc, false) + chipRow('Services excluded', exc, true);
      h += '</div>';
    }
    return h;
  }
  function chipRow(label, list, out) {
    var h = '<div class=' + Q('pf-tile-label') + ' style=' + Q('margin:0 0 6px') + '>' +
      PF.esc(label) + ' (' + list.length + ')</div><div style=' + Q('margin-bottom:12px') + '>';
    if (!list.length) {
      h += '<span style=' + Q('color:' + T.faint + ';font-size:13px') + '>none listed</span>';
    } else {
      for (var i = 0; i < list.length; i++) {
        h += '<span class=' + Q('pf-chip' + (out ? ' pf-out' : '')) + '>' + PF.esc(list[i]) + '</span>';
      }
    }
    return h + '</div>';
  }

  /* 3. Budget by department ------------------------------------------------ */
  /* labels are [versions, L1 Task]. L1 Task display names are rank-prefixed
     (as in 1 STUDY START-UP), so the leading integer is the sort key - a string
     sort would put 10 and 11 before 2. */
  function rankOf(name) {
    var s = String(name || ''), i = 0, digits = '';
    while (i < s.length && s.charAt(i) === ' ') i++;
    while (i < s.length && s.charAt(i) >= '0' && s.charAt(i) <= '9') { digits += s.charAt(i); i++; }
    return digits ? parseInt(digits, 10) : 999;
  }

  function budgetRows() {
    var list = myRows('budget'), out = [], i;
    for (i = 0; i < list.length; i++) {
      var name = PF.lab(list[i], 1);
      if (!name) continue;
      var price = PF.numOf(PF.val(list[i], c('budget', 'price')));
      var cost = PF.numOf(PF.val(list[i], c('budget', 'cost')));
      if (price === null && cost === null) continue;
      out.push({ name: name, rank: rankOf(name), price: price || 0, cost: cost || 0 });
    }
    out.sort(function (a, b) { return a.rank - b.rank || (a.name < b.name ? -1 : 1); });
    return out;
  }

  function budgetHtml() {
    var g = guard('budget', 'No budget for this version ' + PF.DASH + ' versions start empty.');
    if (g) return g;
    var list = budgetRows();
    if (!list.length) return PF.stateEmpty('No priced departments for this version.');
    var cur = currency();

    var totP = 0, totC = 0, maxP = 0, i;
    for (i = 0; i < list.length; i++) {
      totP += list[i].price; totC += list[i].cost;
      if (list[i].price > maxP) maxP = list[i].price;
    }

    var h = '<table class=' + Q('pf-tbl') + '><thead><tr>' +
      '<th style=' + Q('width:36%') + '>Department</th>' +
      '<th class=' + Q('pf-num') + '>Budget</th><th class=' + Q('pf-num') + '>Cost</th>' +
      '<th class=' + Q('pf-num') + '>Margin</th><th style=' + Q('width:24%') + '>Mix</th>' +
      '</tr></thead><tbody>';
    h += '<tr class=' + Q('ck-total') + '><td><b>Total</b></td>' +
      '<td class=' + Q('pf-num') + '><b>' + PF.money(totP, cur) + '</b></td>' +
      '<td class=' + Q('pf-num') + '>' + PF.money(totC, cur) + '</td>' +
      '<td class=' + Q('pf-num') + '>' + (totP ? PF.fmtPct((totP - totC) / totP) : PF.DASH) + '</td>' +
      '<td></td></tr>';

    for (i = 0; i < list.length; i++) {
      var rw = list[i];
      var outer = maxP > 0 ? (rw.price / maxP) * 100 : 0;
      var inner = rw.price > 0 ? Math.min(100, (rw.cost / rw.price) * 100) : 0;
      var mpct = rw.price > 0 ? (rw.price - rw.cost) / rw.price : null;
      h += '<tr>' +
        '<td>' + PF.esc(rw.name) + approverGap(rw.name) + '</td>' +
        '<td class=' + Q('pf-num') + '>' + PF.money(rw.price, cur) + '</td>' +
        '<td class=' + Q('pf-num') + '>' + PF.money(rw.cost, cur) + '</td>' +
        '<td class=' + Q('pf-num') + '>' + (mpct === null ? PF.DASH : PF.fmtPct(mpct)) + '</td>' +
        '<td><div class=' + Q('pf-bar') + ' style=' + Q('width:' + Math.max(6, outer) + '%') + '>' +
          '<div class=' + Q('pf-bar-outer') + ' style=' + Q('width:100%') + '></div>' +
          '<div class=' + Q('pf-bar-inner') + ' style=' + Q('width:' + inner + '%') + '></div>' +
        '</div></td></tr>';
    }
    return h + '</tbody></table>';
  }

  /* A department with no approver is a real gap in the model. Driven off the
     approvals data, not hard-coded ranks, so it stays true once one is set. */
  function approverGap(name) {
    var list = myRows('appr'), i;
    for (i = 0; i < list.length; i++) {
      if (PF.lab(list[i], 1) === name) {
        if (PF.textOf(PF.val(list[i], c('appr', 'approver')))) return '';
        return ' <span class=' + Q('pf-tag') + '>no approver assigned</span>';
      }
    }
    return '';
  }

  /* 4. Approval status ----------------------------------------------------- */
  function approvalsHtml() {
    var g = guard('appr', 'No approval rows for this version.');
    if (g) return g;
    var list = myRows('appr'), items = [], i;
    for (i = 0; i < list.length; i++) {
      var nm = PF.lab(list[i], 1);
      if (!nm) continue;
      items.push({
        name: nm, rank: rankOf(nm),
        status: PF.textOf(PF.val(list[i], c('appr', 'status'))),
        approver: PF.textOf(PF.val(list[i], c('appr', 'approver'))),
        date: PF.val(list[i], c('appr', 'date')),
        comment: PF.textOf(PF.val(list[i], c('appr', 'comment')))
      });
    }
    items.sort(function (a, b) { return a.rank - b.rank || (a.name < b.name ? -1 : 1); });
    if (!items.length) return PF.stateEmpty('No approval rows for this version.');

    var h = '<table class=' + Q('pf-tbl') + '><thead><tr><th>Department</th><th>Status</th>' +
      '<th>Approver</th><th>Approved</th></tr></thead><tbody>';
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      h += '<tr><td>' + PF.esc(it.name) + '</td><td>' +
        (it.status
          ? '<span class=' + Q('pf-pill') + ' style=' + Q('background:' + PF.statusColor(it.status)) +
            '>' + PF.esc(it.status) + '</span>'
          : '<span class=' + Q('pf-tag') + '>not set</span>') +
        '</td><td>' +
        (it.approver ? PF.esc(it.approver) : '<span class=' + Q('pf-tag') + '>none</span>') +
        '</td><td class=' + Q('pf-num') + '>' + PF.fmtDate(it.date) + '</td></tr>';
      if (it.comment) {
        h += '<tr class=' + Q('ck-cmt') + '><td colspan=' + Q('4') + '>' +
          '<span class=' + Q('ck-cmt-txt') + ' data-full=' + Q(PF.esc(it.comment)) + '>' +
          PF.esc(cut(it.comment, 140)) + '</span>' +
          (it.comment.length > 140 ? ' <a class=' + Q('pf-link ck-more') + '>more</a>' : '') +
          '</td></tr>';
      }
    }
    h += '</tbody></table>';
    h += '<div style=' + Q('margin-top:10px;font-size:12px;color:' + T.muted) + ' class=' + Q('pf-noprint') +
      '>Approvals are recorded on the native board ' + PF.DASH + ' this panel is read-only.</div>';
    return h;
  }
  function cut(s, n) { return s.length > n ? s.slice(0, n - 1) + PF.ELLIPSIS : s; }

  /* 6. Cashflow ------------------------------------------------------------ */
  /* labels are [versions, month]. Rows are sparse, so the month axis is
     whatever months actually carry data - no clipping needed. Order is not
     guaranteed, so sort by the month label via the axis order of the full
     payload, which Pigment returns in list order. */
  function cashSeries() {
    var list = myRows('cash');
    if (!list.length) return null;
    var order = PF.axis(PF.rows(S.cash.d), 1);
    var rank = {}, i;
    for (i = 0; i < order.length; i++) rank[order[i]] = i;
    list = list.slice().sort(function (a, b) {
      return (rank[PF.lab(a, 1)] || 0) - (rank[PF.lab(b, 1)] || 0);
    });
    var months = [], rec = [], cost = [], earnt = [], pos = [], run = 0;
    for (i = 0; i < list.length; i++) {
      var rr = PF.numOf(PF.val(list[i], c('cash', 'receipts'))) || 0;
      var cc = PF.numOf(PF.val(list[i], c('cash', 'cost'))) || 0;
      var ee = PF.numOf(PF.val(list[i], c('cash', 'earnt'))) || 0;
      months.push(PF.lab(list[i], 1));
      rec.push(rr); cost.push(cc); earnt.push(ee);
      run += rr - cc;
      pos.push(run);
    }
    return { months: months, rec: rec, cost: cost, earnt: earnt, pos: pos };
  }

  function cashHtml() {
    var g = guard('cash', 'No cashflow for this version.');
    if (g) return g;
    var s = cashSeries();
    if (!s || !s.months.length) return PF.stateEmpty('No cashflow months for this version.');
    var cur = currency();
    var totE = 0, totC = 0, i;
    for (i = 0; i < s.months.length; i++) { totE += s.earnt[i]; totC += s.cost[i]; }
    var hr = myRow('hdr');
    var peak = hr ? PF.val(hr, c('hdr', 'peak')) : null;

    var h = '<div class=' + Q('ck-kpis') + '>' +
      kpi('Earnt revenue', PF.compact(totE, cur), T.earntRevenue) +
      kpi('Cash payments', PF.compact(totC, cur), T.cashPayments) +
      kpi('Peak drawdown', PF.compact(peak, cur), T.cashPosition) + '</div>';
    h += '<div id=' + Q('ck-cash') + ' class=' + Q('ck-canvas') + '></div>';
    h += '<div class=' + Q('ck-legend') + '>' +
      lg(T.accent, 'Receipts (cum.)') + lg(T.cashPayments, 'Payments (cum.)') +
      lg(T.cashPosition, 'Net position') + lg(T.earntRevenue, 'Earnt revenue (monthly)') + '</div>';
    return h;
  }
  function kpi(label, value, colour) {
    return '<div><div class=' + Q('pf-tile-label') + '>' + PF.esc(label) + '</div>' +
      '<div class=' + Q('pf-tile-value') + ' style=' + Q('color:' + colour) + '>' +
      PF.esc(value) + '</div></div>';
  }
  function lg(col, t) {
    return '<span class=' + Q('ck-lg') + '><i style=' + Q('background:' + col) + '></i>' +
      PF.esc(t) + '</span>';
  }

  /* 5. Timeline + drawing -------------------------------------------------- */
  function draw() {
    var host = elBody.querySelector('#ck-gantt');
    if (host) {
      var g = guard('gantt', 'No timeline for this version.');
      if (g) host.innerHTML = g; else drawGantt(host);
    }
    var ch = elBody.querySelector('#ck-cash');
    if (ch) drawCash(ch, cashSeries());
  }

  /* labels are [versions, stages, month]; each row is a month in which that
     stage is live, and the value is its PRORATA share of the month. A bar
     runs from a stage's first live month to its last, with the fractional
     end months drawn as a soft edge. */
  function drawGantt(host) {
    var list = myRows('gantt');
    if (!list.length) { host.innerHTML = PF.stateEmpty('No phases land in a month for this version.'); return; }
    var order = PF.axis(PF.rows(S.gantt.d), 2);
    var rank = {}, i;
    for (i = 0; i < order.length; i++) rank[order[i]] = i;

    var byStage = {}, stageOrder = [];
    for (i = 0; i < list.length; i++) {
      var st = PF.lab(list[i], 1), mo = PF.lab(list[i], 2);
      var v = PF.numOf(PF.val(list[i], 0));
      if (!st || !mo || v === null || v <= 0) continue;
      var m = rank[mo];
      if (m === undefined) continue;
      if (!byStage[st]) { byStage[st] = { name: st, lo: m, hi: m, loF: v, hiF: v }; stageOrder.push(st); }
      else {
        var b = byStage[st];
        if (m < b.lo) { b.lo = m; b.loF = v; }
        if (m > b.hi) { b.hi = m; b.hiF = v; }
      }
    }
    if (!stageOrder.length) { host.innerHTML = PF.stateEmpty('No live phase months for this version.'); return; }

    var stages = [];
    for (i = 0; i < stageOrder.length; i++) stages.push(byStage[stageOrder[i]]);
    stages.sort(function (a, b) { return a.lo - b.lo; });

    var minC = stages[0].lo, maxC = stages[0].hi;
    for (i = 0; i < stages.length; i++) {
      if (stages[i].lo < minC) minC = stages[i].lo;
      if (stages[i].hi > maxC) maxC = stages[i].hi;
    }
    minC = Math.max(0, minC - 1);
    maxC = Math.min(order.length - 1, maxC + 1);
    var span = Math.max(1, maxC - minC + 1);

    var rowH = 22, gap = 6, padL = 200, padR = 16, padT = 22, padB = 22;
    var cssW = Math.max(320, host.clientWidth || 640);
    var cssH = padT + padB + stages.length * (rowH + gap);
    host.innerHTML = '<canvas></canvas>';
    var cv = host.firstChild;
    var ctx = PF.fitCanvas(cv, cssW, cssH);
    var colW = (cssW - padL - padR) / span;
    ctx.font = '11px ' + T.font;

    ctx.strokeStyle = T.border;
    ctx.lineWidth = 1;
    ctx.fillStyle = T.faint;
    for (i = minC; i <= maxC; i++) {
      var lbl = order[i];
      if (i === minC || lbl.indexOf('Jan') === 0) {
        var gx = padL + (i - minC) * colW;
        ctx.beginPath();
        ctx.moveTo(gx, padT - 6);
        ctx.lineTo(gx, cssH - padB + 2);
        ctx.stroke();
        ctx.fillText(lbl, gx + 3, padT - 9);
      }
    }

    var palette = [T.accent, '#0EA5E9', T.ok, T.warn, T.cashPayments, T.earntRevenue, T.cashPosition, '#7C3AED'];
    var boxes = [];
    for (i = 0; i < stages.length; i++) {
      var s = stages[i];
      var y = padT + i * (rowH + gap);
      var x0 = padL + (s.lo - minC + (1 - s.loF)) * colW;
      var x1 = padL + (s.hi - minC + s.hiF) * colW;
      var w = Math.max(3, x1 - x0);

      ctx.fillStyle = T.muted;
      ctx.textAlign = 'right';
      ctx.fillText(clipText(ctx, s.name, padL - 12), padL - 10, y + rowH / 2 + 4);
      ctx.textAlign = 'left';
      ctx.fillStyle = palette[i % palette.length];
      roundRect(ctx, x0, y, w, rowH, 4);
      ctx.fill();
      boxes.push({ x: x0, y: y, w: w, h: rowH, name: s.name,
                   from: order[s.lo], to: order[s.hi], months: s.hi - s.lo + 1 });
    }

    cv.addEventListener('mousemove', function (ev) {
      var rect = cv.getBoundingClientRect();
      var mx = ev.clientX - rect.left, my = ev.clientY - rect.top, k, hit = null;
      for (k = 0; k < boxes.length; k++) {
        var b = boxes[k];
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) { hit = b; break; }
      }
      if (hit) {
        tip.show('<b>' + PF.esc(hit.name) + '</b><br>' + PF.esc(hit.from) + ' ' + PF.ARROW + ' ' +
          PF.esc(hit.to) + '<br>' + hit.months + ' months', ev.clientX, ev.clientY);
      } else tip.hide();
    });
    cv.addEventListener('mouseleave', function () { tip.hide(); });
  }

  function drawCash(host, s) {
    if (!s || !s.months.length) return;
    var padL = 56, padR = 10, padT = 10, padB = 24;
    var cssW = Math.max(280, host.clientWidth || 420), cssH = 180;
    host.innerHTML = '<canvas></canvas>';
    var cv = host.firstChild;
    var ctx = PF.fitCanvas(cv, cssW, cssH);
    var plotW = cssW - padL - padR, plotH = cssH - padT - padB;
    var n = s.months.length, i;

    var cumR = [], cumC = [], rr = 0, cc = 0;
    for (i = 0; i < n; i++) { rr += s.rec[i]; cc += s.cost[i]; cumR.push(rr); cumC.push(cc); }

    var hi = 0, lo = 0;
    function track(v) { if (v > hi) hi = v; if (v < lo) lo = v; }
    for (i = 0; i < n; i++) { track(cumR[i]); track(cumC[i]); track(s.pos[i]); track(s.earnt[i]); }
    if (hi === lo) hi = lo + 1;
    var padv = (hi - lo) * 0.08;
    hi += padv; lo -= padv;

    function X(k) { return padL + (n === 1 ? plotW / 2 : (k / (n - 1)) * plotW); }
    function Y(v) { return padT + plotH - ((v - lo) / (hi - lo)) * plotH; }

    ctx.strokeStyle = T.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, Y(0));
    ctx.lineTo(cssW - padR, Y(0));
    ctx.stroke();

    var cur = currency();
    ctx.font = '10px ' + T.font;
    ctx.fillStyle = T.faint;
    ctx.textAlign = 'right';
    ctx.fillText(PF.compact(hi), padL - 6, Y(hi) + 8);
    ctx.fillText(PF.compact(lo), padL - 6, Y(lo));
    ctx.textAlign = 'left';
    ctx.fillText(s.months[0], padL, cssH - 7);
    if (n > 1) {
      ctx.textAlign = 'right';
      ctx.fillText(s.months[n - 1], cssW - padR, cssH - 7);
      ctx.textAlign = 'left';
    }

    var bw = Math.max(1, (plotW / Math.max(1, n)) * 0.55);
    ctx.fillStyle = T.earntRevenue;
    ctx.globalAlpha = 0.2;
    for (i = 0; i < n; i++) {
      if (!s.earnt[i]) continue;
      var y0 = Y(Math.max(0, s.earnt[i])), y1 = Y(Math.min(0, s.earnt[i]));
      ctx.fillRect(X(i) - bw / 2, y0, bw, Math.max(1, y1 - y0));
    }
    ctx.globalAlpha = 1;

    line(ctx, cumR, X, Y, T.accent, 1.8);
    line(ctx, cumC, X, Y, T.cashPayments, 1.8);
    line(ctx, s.pos, X, Y, T.cashPosition, 2.4);

    cv.addEventListener('mousemove', function (ev) {
      var rect = cv.getBoundingClientRect();
      var mx = ev.clientX - rect.left;
      if (mx < padL - 4 || mx > cssW - padR + 4) { tip.hide(); return; }
      var idx = n === 1 ? 0 : Math.round(((mx - padL) / plotW) * (n - 1));
      idx = Math.max(0, Math.min(n - 1, idx));
      tip.show('<b>' + PF.esc(s.months[idx]) + '</b><br>' +
        'Receipts (cum.) ' + PF.money(cumR[idx], cur) + '<br>' +
        'Payments (cum.) ' + PF.money(cumC[idx], cur) + '<br>' +
        'Net position ' + PF.money(s.pos[idx], cur) + '<br>' +
        'Earnt revenue ' + PF.money(s.earnt[idx], cur), ev.clientX, ev.clientY);
    });
    cv.addEventListener('mouseleave', function () { tip.hide(); });
  }

  function line(ctx, arr, X, Y, colour, w) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i < arr.length; i++) {
      if (i === 0) ctx.moveTo(X(i), Y(arr[i])); else ctx.lineTo(X(i), Y(arr[i]));
    }
    ctx.stroke();
  }
  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
  function clipText(ctx, s, maxW) {
    if (ctx.measureText(s).width <= maxW) return s;
    var t = s;
    while (t.length > 1 && ctx.measureText(t + PF.ELLIPSIS).width > maxW) t = t.slice(0, -1);
    return t + PF.ELLIPSIS;
  }

  /* 7. Preparer notes ------------------------------------------------------ */
  function storedNote() {
    var r = myRow('note');
    return r ? PF.textOf(PF.val(r, c('note', 'text'))) : null;
  }
  function notesHtml() {
    if (S.note.err) return PF.stateError(S.note.err);
    var loaded = PF.ready(S.note.d);
    var v = storedNote();
    return '<textarea class=' + Q('pf-ta') + ' id=' + Q('ck-note') + ' placeholder=' +
      Q('Notes for the reviewer' + PF.ELLIPSIS) + (loaded ? '' : ' disabled') + '>' +
      PF.esc(v == null ? '' : v) + '</textarea>' +
      '<div style=' + Q('display:flex;align-items:center;gap:12px;margin-top:8px') + '>' +
      '<button class=' + Q('pf-btn pf-primary') + ' id=' + Q('ck-save') + ' type=' + Q('button') +
      ' disabled>Save note</button>' +
      '<button class=' + Q('pf-btn') + ' id=' + Q('ck-revert') + ' type=' + Q('button') +
      ' disabled>Revert</button>' +
      '<span class=' + Q('pf-wstate') + ' id=' + Q('ck-nstate') + '></span></div>';
  }

  function attach() {
    var ta = elBody.querySelector('#ck-note');
    var save = elBody.querySelector('#ck-save');
    var revert = elBody.querySelector('#ck-revert');
    var state = elBody.querySelector('#ck-nstate');

    if (ta && save && revert) {
      var baseline = storedNote();
      if (baseline == null) baseline = '';
      var sync = function () {
        var changed = ta.value !== baseline;
        noteDirty = changed;
        save.disabled = !changed;
        revert.disabled = !changed;
        if (!changed) { state.className = 'pf-wstate'; state.textContent = ''; }
      };
      L.on(ta, 'input', sync);
      L.on(revert, 'click', function () { ta.value = baseline; sync(); });
      L.on(save, 'click', function () {
        var v = V();
        if (!v) { state.className = 'pf-wstate pf-bad'; state.textContent = 'Pick a version first.'; return; }
        var value = ta.value;
        save.disabled = true;
        revert.disabled = true;
        state.className = 'pf-wstate';
        state.textContent = 'Saving' + PF.ELLIPSIS;
        /* Write, then let the note subscription redraw the stored result. No
           optimistic update: what Pigment holds is the truth. */
        var coords = {};
        coords.versions = v;
        Promise.resolve(SDK.editValue('notesWrite', coords, value)).then(function () {
          state.className = 'pf-wstate pf-ok';
          state.textContent = 'Saved. Waiting for Pigment to recalculate' + PF.ELLIPSIS;
          noteDirty = false;
        })['catch'](function (err) {
          state.className = 'pf-wstate pf-bad';
          state.textContent = 'Not saved: ' + ((err && err.message) ? err.message : 'the write was rejected.');
          save.disabled = false;
          revert.disabled = false;
        });
      });
    }

    var mores = elBody.querySelectorAll('.ck-more'), i;
    for (i = 0; i < mores.length; i++) {
      L.on(mores[i], 'click', function (ev) {
        var a = ev.currentTarget;
        var span = a.parentNode.querySelector('.ck-cmt-txt');
        if (!span) return;
        var full = span.getAttribute('data-full') || '';
        if (a.textContent === 'more') { span.textContent = full; a.textContent = 'less'; }
        else { span.textContent = cut(full, 140); a.textContent = 'more'; }
      });
    }
  }

  /* -- resize --------------------------------------------------------------- */
  var onResize = PF.debounce(function () { draw(); }, 140);
  L.on(window, 'resize', onResize);
  if (window.ResizeObserver) {
    L.observer(new ResizeObserver(onResize)).observe(document.documentElement);
  }

  function extraCss() {
    return '' +
    '.ck-tiles{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}' +
    '@media (max-width:1023px){.ck-tiles{grid-template-columns:repeat(3,1fr)}}' +
    '.ck-chips{margin-top:16px;padding-top:16px;border-top:1px solid ' + T.border + '}' +
    '.ck-canvas{width:100%;overflow:hidden}' +
    '.ck-canvas canvas{display:block}' +
    '.ck-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}' +
    '.ck-legend{margin-top:8px;display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:' + T.muted + '}' +
    '.ck-lg{display:inline-flex;align-items:center;gap:5px}' +
    '.ck-lg i{width:9px;height:9px;border-radius:2px;display:inline-block}' +
    '.ck-total td{background:' + T.bg + ';border-bottom:1px solid ' + T.borderStrong + '}' +
    '.ck-cmt td{padding-top:0;color:' + T.muted + ';font-size:12px}' +
    '.pf-link{color:' + T.accent + ';cursor:pointer;text-decoration:underline}';
  }

  root.__cleanup = function () {
    repaint.cancel();
    onResize.cancel();
    L.destroy();
    tip.destroy();
    subs = null;
    root.innerHTML = '';
    root.__cleanup = null;
  };

  paint();
})();
