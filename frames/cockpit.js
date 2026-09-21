/* ---------------------------------------------------------------------------
 * Frame 4 - Executive Summary cockpit.
 * Section 7 of the briefing. Counterpart to board 00. Executive Summary,
 * which stays as it is. Almost entirely read-only; the one write is the
 * preparer note.
 *
 * Depends on PF from frames/_shared.js, which build.py prepends.
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var SDK = window.PigmentSDK;
  var root = document.getElementById('app');
  if (root.__cleanup) root.__cleanup();

  var L = PF.lifecycle();
  var T = PF.T;
  L.node(PF.injectStyles('pf-cockpit-css', PF.baseCss() + extraCss()));

  var tip = PF.makeTooltip();

  /* -- shell ---------------------------------------------------------------- */
  root.className = 'pf';
  root.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;overflow:auto;';
  root.innerHTML =
    '<div class="pf-hd">' +
      '<span class="pf-hd-title">Executive Summary</span>' +
      '<span class="pf-crumb" id="ck-crumb"></span>' +
      '<span id="ck-switch"></span>' +
      '<span class="pf-spacer"></span>' +
      '<span class="pf-nav pf-noprint" id="ck-nav"></span>' +
    '</div>' +
    '<div class="pf-body" id="ck-body">' + PF.stateLoading('Loading executive summary…') + '</div>';

  var elCrumb = root.querySelector('#ck-crumb');
  var elBody = root.querySelector('#ck-body');
  root.querySelector('#ck-nav').innerHTML =
    '<button class="pf-btn" id="ck-print" type="button">Print / PDF</button>';

  var switcher = PF.versionSwitcher({ onChange: onVersionChange });
  root.querySelector('#ck-switch').appendChild(switcher.node);

  L.on(root.querySelector('#ck-print'), 'click', function () { window.print(); });

  /* -- state ---------------------------------------------------------------- */
  /* One entry per View subscription. `d` is the last ready payload, `err` the
     last error, `loaded` whether anything has arrived at all. */
  var VIEWS = ['header', 'patients', 'sites', 'status', 'services', 'budget',
               'approvals', 'period', 'cashSummary', 'peak', 'notesRead'];
  var S = {};
  for (var i = 0; i < VIEWS.length; i++) S[VIEWS[i]] = { d: null, err: null, loaded: false };

  var subs = {};
  var l1Items = [];
  var versionsPartial = false;
  var noteDirty = false;   /* do not clobber what the user is typing */
  var lastPaintedNote = null;

  var repaint = PF.debounce(paint, 24);

  /* -- subscriptions -------------------------------------------------------- */
  function subscribe(alias) {
    var handle = SDK.subscribeToVizualization(alias, {
      pageDefinitions: [],
      onData: function (data) {
        var slot = S[alias];
        slot.loaded = true;
        if (!PF.isReady(data)) return;
        slot.err = null;
        slot.d = data;
        repaint();
      },
      onError: function (err) {
        var slot = S[alias];
        slot.loaded = true;
        slot.err = (err && err.message) ? err.message : 'Could not load this section.';
        repaint();
      }
    });
    subs[alias] = L.sub(handle);
  }
  for (var v = 0; v < VIEWS.length; v++) subscribe(VIEWS[v]);

  L.sub(SDK.subscribeToItems('versions', {
    onData: function (d) {
      versionsPartial = !!(d && d.partialResult);
      switcher.setItems(d && d.items ? d.items : []);
      repaint();
    },
    onError: function (err) {
      elCrumb.innerHTML = '<span style="color:#B91C1C">Version list unavailable: ' +
        PF.esc(err && err.message ? err.message : 'unknown error') + '</span>';
    }
  }));

  L.sub(SDK.subscribeToItems('l1', {
    onData: function (d) { l1Items = (d && d.items) ? d.items : []; repaint(); },
    onError: function () { l1Items = []; }
  }));

  function onVersionChange(name) {
    var defs = [{ alias: 'versions', selection: [name] }];
    for (var k in subs) {
      if (Object.prototype.hasOwnProperty.call(subs, k) && subs[k]) {
        /* Mark stale so the panels show a loading state rather than the
           previous version's numbers while the new page arrives. */
        S[k].d = null; S[k].err = null; S[k].loaded = false;
        try { subs[k].updatePageDefinitions(defs); } catch (e) {}
      }
    }
    noteDirty = false;
    lastPaintedNote = null;
    paintCrumb(name);
    repaint();
  }

  function paintCrumb(name) {
    var st = S.status.d ? PF.text(PF.cellAt(S.status.d, 0, 0)) : '';
    var html = '<b>' + PF.esc(name || '—') + '</b>';
    if (st) {
      html += '<span class="pf-pill" style="background:' + PF.statusColor(st) + ';margin-left:8px">' +
        PF.esc(st) + '</span>';
    }
    elCrumb.innerHTML = html;
  }

  /* -- render --------------------------------------------------------------- */
  function paint() {
    /* Any of the eleven subscriptions can tick at any moment and repaint the
       body. Preserve the note being typed, along with focus and caret, or the
       one write on this page becomes unusable. */
    var keep = null;
    var live = elBody.querySelector('#ck-note');
    if (live) {
      keep = {
        value: live.value,
        focused: document.activeElement === live,
        start: live.selectionStart,
        end: live.selectionEnd,
        scroll: live.scrollTop
      };
    }

    paintCrumb(switcher.selected());
    var html = '';
    if (versionsPartial) {
      html += PF.banner('The Project Version list was truncated, so the switcher may not show every version. ' +
                        'Open the native list to see them all.');
    }
    html += '<div class="pf-grid">';
    html += panel('Study', 12, studyHtml());
    html += panel('Budget by department', 7, budgetHtml(), 'Main Scope only');
    html += panel('Approval status', 5, approvalsHtml());
    html += panel('Timeline', 7, '<div id="ck-gantt" class="ck-canvas"></div>', 'read-only — edit on the Timeline Frame');
    html += panel('Cashflow', 5, cashHtml(), 'read-only — edit on the Cashflow Frame');
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

    drawGantt();
    attach();
  }

  function panel(title, span, inner, sub) {
    return '<section class="pf-card" style="grid-column:span ' + span + '">' +
      '<h2>' + PF.esc(title) + (sub ? '<span class="pf-sub">' + PF.esc(sub) + '</span>' : '') + '</h2>' +
      inner + '</section>';
  }

  /* Uniform per-panel state handling: error beats stale beats empty. */
  function guard(slot, emptyMsg) {
    if (slot.err) return PF.stateError(slot.err);
    if (!slot.d) return PF.stateLoading();
    if (!slot.d.labels.rows.length) return PF.stateEmpty(emptyMsg);
    return null;
  }

  /* 2. Study header ------------------------------------------------------- */
  function headerField(names) {
    var d = S.header.d;
    if (!d) return null;
    for (var i = 0; i < names.length; i++) {
      var r = PF.rowIndexByLabel(d, names[i]);
      if (r >= 0) {
        var t = PF.text(PF.cellAt(d, 0, r));
        if (t) return t;
      }
    }
    return null;
  }

  function studyHtml() {
    if (S.header.err) return PF.stateError(S.header.err);
    if (!S.header.d && !S.patients.d && !S.sites.d) return PF.stateLoading();

    var tiles = [
      ['Sponsor', headerField(['sponsor', 'client']), false],
      ['Indication', headerField(['indication', 'therapeutic']), false],
      ['Programme phase', headerField(['program phase', 'programme phase', 'phase']), false],
      ['Patients randomized', S.patients.d ? PF.fmtNum(PF.cellAt(S.patients.d, 0, 0)) : null, true],
      ['Active sites', S.sites.d ? PF.fmtNum(PF.cellAt(S.sites.d, 0, 0)) : null, true],
      ['Project status', S.status.d ? PF.text(PF.cellAt(S.status.d, 0, 0)) : null, false]
    ];
    var h = '<div class="ck-tiles">';
    for (var i = 0; i < tiles.length; i++) {
      var val = tiles[i][1];
      h += '<div class="ck-tile">' +
        '<div class="pf-tile-label">' + PF.esc(tiles[i][0]) + '</div>' +
        '<div class="pf-tile-value' + (tiles[i][2] ? '' : ' pf-sm') + '">' +
        (val ? PF.esc(val) : '<span style="color:' + T.faint + '">–</span>') +
        '</div></div>';
    }
    h += '</div>';

    /* Services in / out as two chip rows. The underlying metrics are
       TEXTLIST aggregations, so one string each. */
    if (S.services.d) {
      var inc = PF.splitTextList(PF.cellAt(S.services.d, 0, PF.rowIndexByLabel(S.services.d, 'includ')));
      var exc = PF.splitTextList(PF.cellAt(S.services.d, 0, PF.rowIndexByLabel(S.services.d, 'exclud')));
      h += '<div class="ck-chips">';
      h += '<div class="pf-tile-label" style="margin-bottom:6px">Services included (' + inc.length + ')</div><div>';
      h += inc.length ? chips(inc, false) : '<span style="color:' + T.faint + ';font-size:13px">none listed</span>';
      h += '</div>';
      h += '<div class="pf-tile-label" style="margin:12px 0 6px">Services excluded (' + exc.length + ')</div><div>';
      h += exc.length ? chips(exc, true) : '<span style="color:' + T.faint + ';font-size:13px">none listed</span>';
      h += '</div></div>';
    }
    return h;
  }
  function chips(list, out) {
    var h = '';
    for (var i = 0; i < list.length; i++) {
      h += '<span class="pf-chip' + (out ? ' pf-out' : '') + '">' + PF.esc(list[i]) + '</span>';
    }
    return h;
  }

  /* 3. Budget by department ----------------------------------------------- */
  /* Rows are Task Defintion grouped by L1 Task; columns are the four metrics
     in the order Price, Cost, Net Margin, % of Budget. Matched by label with
     a positional fallback so a reordered view does not silently mislabel. */
  function budgetCols(d) {
    return {
      price: pick(d, ['price', 'budget'], 0),
      cost: pick(d, ['cost'], 1),
      margin: pick(d, ['net margin'], 2),
      share: pick(d, ['% of budget', 'share'], 3)
    };
  }
  function pick(d, needles, fallback) {
    for (var i = 0; i < needles.length; i++) {
      var c = PF.colIndexByLabel(d, needles[i]);
      if (c >= 0) return c;
    }
    return fallback;
  }
  function rankOf(name) {
    var m = /^\s*(\d+)/.exec(String(name || ''));
    return m ? parseInt(m[1], 10) : 999;
  }

  function budgetRows() {
    var d = S.budget.d;
    var out = [];
    if (!d) return out;
    var c = budgetCols(d);
    for (var r = 0; r < d.labels.rows.length; r++) {
      if (PF.isTotalLabel(d.labels.rows[r])) continue;
      var name = PF.labelText(d.labels.rows[r]);
      if (!name) continue;
      var price = PF.num(PF.cellAt(d, c.price, r));
      var cost = PF.num(PF.cellAt(d, c.cost, r));
      var margin = PF.num(PF.cellAt(d, c.margin, r));
      if (price === null && cost === null) continue;
      out.push({
        name: name, rank: rankOf(name),
        price: price || 0, cost: cost || 0,
        margin: margin,
        share: PF.num(PF.cellAt(d, c.share, r))
      });
    }
    out.sort(function (a, b) { return a.rank - b.rank || a.name.localeCompare(b.name); });
    return out;
  }

  function budgetHtml() {
    var g = guard(S.budget, 'No budget for this version — versions start empty.');
    if (g) return g;
    var rows = budgetRows();
    if (!rows.length) return PF.stateEmpty('No priced departments for this version.');

    var totP = 0, totC = 0, maxP = 0, i;
    for (i = 0; i < rows.length; i++) {
      totP += rows[i].price; totC += rows[i].cost;
      if (rows[i].price > maxP) maxP = rows[i].price;
    }
    var totM = totP - totC;

    var h = '<table class="pf-tbl ck-budget"><thead><tr>' +
      '<th style="width:38%">Department</th><th class="pf-num">Budget</th>' +
      '<th class="pf-num">Cost</th><th class="pf-num">Margin</th><th style="width:26%">Mix</th>' +
      '</tr></thead><tbody>';

    h += '<tr class="ck-total"><td><b>Total</b></td>' +
      '<td class="pf-num"><b>' + PF.fmtMoney(totP) + '</b></td>' +
      '<td class="pf-num">' + PF.fmtMoney(totC) + '</td>' +
      '<td class="pf-num">' + (totP ? PF.fmtPct(totM / totP) : '–') + '</td>' +
      '<td></td></tr>';

    for (i = 0; i < rows.length; i++) {
      var rw = rows[i];
      var outer = maxP > 0 ? (rw.price / maxP) * 100 : 0;
      var inner = rw.price > 0 ? Math.min(100, (rw.cost / rw.price) * 100) : 0;
      var mpct = rw.price > 0 ? (rw.price - rw.cost) / rw.price : null;
      h += '<tr data-bud="' + i + '">' +
        '<td>' + PF.esc(rw.name) + approverGap(rw.name) + '</td>' +
        '<td class="pf-num">' + PF.fmtMoney(rw.price) + '</td>' +
        '<td class="pf-num">' + PF.fmtMoney(rw.cost) + '</td>' +
        '<td class="pf-num">' + (mpct === null ? '–' : PF.fmtPct(mpct)) + '</td>' +
        '<td><div class="pf-bar" style="width:' + Math.max(6, outer) + '%">' +
          '<div class="pf-bar-outer" style="width:100%"></div>' +
          '<div class="pf-bar-inner" style="width:' + inner + '%"></div>' +
        '</div></td></tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  /* A department with no approver is a real gap in the model (ranks 10 and 11
     today). Driven off the approvals data, not hard-coded ranks, so it stays
     true if someone assigns one. */
  function approverGap(name) {
    var d = S.approvals.d;
    if (!d) return '';
    var r = PF.rowIndexByLabel(d, name);
    if (r < 0) return '';
    var ac = pick(d, ['approver'], 1);
    if (PF.text(PF.cellAt(d, ac, r))) return '';
    return ' <span class="pf-tag">no approver assigned</span>';
  }

  /* 4. Approval status ----------------------------------------------------- */
  function approvalsHtml() {
    var g = guard(S.approvals, 'No approval rows for this version.');
    if (g) return g;
    var d = S.approvals.d;
    var cs = pick(d, ['status'], 0),
        ca = pick(d, ['approver'], 1),
        cd = pick(d, ['date'], 2),
        cc = pick(d, ['comment'], 3);

    var items = [];
    for (var r = 0; r < d.labels.rows.length; r++) {
      if (PF.isTotalLabel(d.labels.rows[r])) continue;
      var nm = PF.labelText(d.labels.rows[r]);
      if (!nm) continue;
      items.push({
        name: nm, rank: rankOf(nm),
        status: PF.text(PF.cellAt(d, cs, r)),
        approver: PF.text(PF.cellAt(d, ca, r)),
        date: PF.cellAt(d, cd, r),
        comment: PF.text(PF.cellAt(d, cc, r))
      });
    }
    items.sort(function (a, b) { return a.rank - b.rank || a.name.localeCompare(b.name); });
    if (!items.length) return PF.stateEmpty('No approval rows for this version.');

    var h = '<table class="pf-tbl"><thead><tr><th>Department</th><th>Status</th><th>Approver</th>' +
      '<th>Approved</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      h += '<tr>' +
        '<td>' + PF.esc(it.name) + '</td>' +
        '<td>' + (it.status
          ? '<span class="pf-pill" style="background:' + PF.statusColor(it.status) + '">' + PF.esc(it.status) + '</span>'
          : '<span class="pf-tag">not set</span>') + '</td>' +
        '<td>' + (it.approver ? PF.esc(it.approver) : '<span class="pf-tag">none</span>') + '</td>' +
        '<td style="white-space:nowrap">' + PF.fmtDate(it.date) + '</td>' +
        '</tr>';
      if (it.comment) {
        h += '<tr class="ck-cmt"><td colspan="4"><span class="ck-cmt-txt" data-full="' +
          PF.esc(it.comment) + '">' + PF.esc(truncate(it.comment, 140)) + '</span>' +
          (it.comment.length > 140 ? ' <a class="pf-link ck-more" data-more="' + i + '">more</a>' : '') +
          '</td></tr>';
      }
    }
    h += '</tbody></table>';
    h += '<div style="margin-top:10px" class="pf-noprint">' +
      '<span style="font-size:12px;color:' + T.muted + '">Approvals are recorded on the native board — ' +
      'this panel is read-only.</span></div>';
    return h;
  }
  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /* 6. Cashflow ------------------------------------------------------------ */
  /* [FRM] Cash Summary has metrics on Rows and Month on Columns, so
     cells[month][metric]. Cumulation and the net position are done here, not
     in the view, so the underlying numbers stay inspectable. */
  function cashSeries() {
    var d = S.cashSummary.d;
    if (!d) return null;
    var rr = PF.rowIndexByLabel(d, 'receipt');
    var rc = PF.rowIndexByLabel(d, 'cost');
    var re = PF.rowIndexByLabel(d, 'revenue');
    if (rr < 0) rr = 0;
    if (rc < 0) rc = 1;
    if (re < 0) re = 2;

    var months = [], rec = [], cost = [], rev = [];
    for (var c = 0; c < d.labels.columns.length; c++) {
      if (PF.isTotalLabel(d.labels.columns[c])) continue;
      var a = PF.num(PF.cellAt(d, c, rr));
      var b = PF.num(PF.cellAt(d, c, rc));
      var e = PF.num(PF.cellAt(d, c, re));
      months.push(PF.labelText(d.labels.columns[c]));
      rec.push(a); cost.push(b); rev.push(e);
    }
    /* Clip to the live window - first to last month with any value - rather
       than filtering on Month_Filter_Cashflow, so the view stays reusable. */
    var lo = -1, hi = -1;
    for (var i = 0; i < months.length; i++) {
      if (rec[i] !== null || cost[i] !== null || rev[i] !== null) { if (lo < 0) lo = i; hi = i; }
    }
    if (lo < 0) return { months: [], rec: [], cost: [], rev: [], pos: [] };
    months = months.slice(lo, hi + 1);
    rec = rec.slice(lo, hi + 1); cost = cost.slice(lo, hi + 1); rev = rev.slice(lo, hi + 1);

    var pos = [], run = 0;
    for (var j = 0; j < months.length; j++) {
      run += (rec[j] || 0) - (cost[j] || 0);
      pos.push(run);
    }
    return { months: months, rec: rec, cost: cost, rev: rev, pos: pos };
  }

  function cashHtml() {
    var g = guard(S.cashSummary, 'No cashflow for this version.');
    if (g) return g;
    var s = cashSeries();
    if (!s || !s.months.length) return PF.stateEmpty('No cashflow months for this version.');

    var peak = S.peak.d ? PF.num(PF.cellAt(S.peak.d, 0, 0)) : null;
    var totRec = 0, totRev = 0, totCost = 0, i;
    for (i = 0; i < s.months.length; i++) {
      totRec += s.rec[i] || 0; totRev += s.rev[i] || 0; totCost += s.cost[i] || 0;
    }

    var h = '<div class="ck-kpis">' +
      kpi('Earnt revenue', PF.fmtCompact(totRev), T.earntRevenue) +
      kpi('Cash payments', PF.fmtCompact(totCost), T.cashPayments) +
      kpi('Peak drawdown', peak === null ? '–' : PF.fmtCompact(peak), T.cashPosition) +
      '</div>';
    h += '<div id="ck-cash" class="ck-canvas ck-canvas-sm"></div>';
    h += '<div class="ck-legend">' +
      lg(T.accent, 'Receipts (cum.)') + lg(T.cashPayments, 'Payments (cum.)') +
      lg(T.cashPosition, 'Net position') + lg(T.earntRevenue, 'Earnt revenue (monthly)') +
      '</div>';
    return h;
  }
  function kpi(label, value, colour) {
    return '<div class="ck-kpi"><div class="pf-tile-label">' + PF.esc(label) + '</div>' +
      '<div class="pf-tile-value" style="color:' + colour + '">' + PF.esc(value) + '</div></div>';
  }
  function lg(c, t) {
    return '<span class="ck-lg"><i style="background:' + c + '"></i>' + PF.esc(t) + '</span>';
  }

  /* 5. Timeline + 6. chart drawing ----------------------------------------- */
  function drawGantt() {
    var host = elBody.querySelector('#ck-gantt');
    if (host) {
      var g = guard(S.period, 'No timeline for this version.');
      if (g) host.innerHTML = g;
      else drawPhaseBars(host, S.period.d);
    }
    var ch = elBody.querySelector('#ck-cash');
    if (ch) drawCash(ch, cashSeries());
  }

  /* Phase bars from [FRM] Phase Grid: rows are Task Stage, columns Month,
     values the PRORATA fraction of the month each stage occupies. A stage's
     bar runs from its first to its last non-blank month; fractional end
     months are drawn as a soft edge rather than a hard cut. */
  function drawPhaseBars(host, d) {
    var stages = [];
    for (var r = 0; r < d.labels.rows.length; r++) {
      if (PF.isTotalLabel(d.labels.rows[r])) continue;
      var lo = -1, hi = -1, loF = 1, hiF = 1;
      for (var c = 0; c < d.labels.columns.length; c++) {
        if (PF.isTotalLabel(d.labels.columns[c])) continue;
        var val = PF.num(PF.cellAt(d, c, r));
        if (val !== null && val > 0) {
          if (lo < 0) { lo = c; loF = val; }
          hi = c; hiF = val;
        }
      }
      if (lo < 0) continue;
      stages.push({ name: PF.labelText(d.labels.rows[r]), lo: lo, hi: hi, loF: loF, hiF: hiF });
    }
    if (!stages.length) { host.innerHTML = PF.stateEmpty('No phases land in a month for this version.'); return; }

    /* Work in real column indices but never let a Total column become the
       axis padding. */
    var cols = d.labels.columns.length;
    var lastReal = cols - 1;
    while (lastReal > 0 && PF.isTotalLabel(d.labels.columns[lastReal])) lastReal--;
    var minC = cols, maxC = 0, i;
    for (i = 0; i < stages.length; i++) {
      if (stages[i].lo < minC) minC = stages[i].lo;
      if (stages[i].hi > maxC) maxC = stages[i].hi;
    }
    minC = Math.max(0, minC - 1); maxC = Math.min(lastReal, maxC + 1);
    var span = Math.max(1, maxC - minC + 1);

    var rowH = 22, gap = 6, padL = 210, padR = 16, padT = 22, padB = 24;
    var cssW = Math.max(320, host.clientWidth || 640);
    var cssH = padT + padB + stages.length * (rowH + gap);
    host.innerHTML = '<canvas></canvas>';
    var cv = host.firstChild;
    var ctx = PF.fitCanvas(cv, cssW, cssH);
    var plotW = cssW - padL - padR;
    var colW = plotW / span;

    ctx.font = '11px ' + T.font;
    /* year gridlines */
    ctx.strokeStyle = T.border; ctx.lineWidth = 1;
    ctx.fillStyle = T.faint;
    for (i = minC; i <= maxC; i++) {
      var lab = PF.labelText(d.labels.columns[i]);
      if (i === minC || /(^|\s)(Jan)/i.test(lab)) {
        var x = padL + (i - minC) * colW;
        ctx.beginPath(); ctx.moveTo(x, padT - 6); ctx.lineTo(x, cssH - padB + 2); ctx.stroke();
        ctx.fillText(lab, x + 3, padT - 9);
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
      var col = palette[i % palette.length];

      ctx.fillStyle = T.muted;
      ctx.textAlign = 'right';
      ctx.fillText(clip(ctx, s.name, padL - 12), padL - 10, y + rowH / 2 + 4);
      ctx.textAlign = 'left';

      ctx.fillStyle = col;
      roundRect(ctx, x0, y, w, rowH, 4);
      ctx.fill();
      boxes.push({ x: x0, y: y, w: w, h: rowH, s: s, col: col,
                   from: PF.labelText(d.labels.columns[s.lo]),
                   to: PF.labelText(d.labels.columns[s.hi]) });
    }
    /* Attached directly, not through the lifecycle: the canvas is replaced on
       every repaint, so these handlers die with it. Registering them would
       grow the teardown list without bound. */
    cv.addEventListener('mousemove', function (ev) {
      var rect = cv.getBoundingClientRect();
      var mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
      var hit = null;
      for (var k = 0; k < boxes.length; k++) {
        var b = boxes[k];
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) { hit = b; break; }
      }
      if (hit) {
        tip.show('<b>' + PF.esc(hit.s.name) + '</b><br>' + PF.esc(hit.from) + ' → ' + PF.esc(hit.to) +
                 '<br>' + (hit.s.hi - hit.s.lo + 1) + ' months', ev.clientX, ev.clientY);
      } else tip.hide();
    });
    cv.addEventListener('mouseleave', function () { tip.hide(); });
  }

  function drawCash(host, s) {
    if (!s || !s.months.length) return;
    var padL = 54, padR = 10, padT = 10, padB = 26;
    var cssW = Math.max(280, host.clientWidth || 420);
    var cssH = 180;
    host.innerHTML = '<canvas></canvas>';
    var cv = host.firstChild;
    var ctx = PF.fitCanvas(cv, cssW, cssH);
    var plotW = cssW - padL - padR, plotH = cssH - padT - padB;
    var n = s.months.length;

    var cumRec = [], cumCost = [], rr = 0, cc = 0, i;
    for (i = 0; i < n; i++) { rr += s.rec[i] || 0; cc += s.cost[i] || 0; cumRec.push(rr); cumCost.push(cc); }

    var hi = 0, lo = 0;
    function track(v) { if (v > hi) hi = v; if (v < lo) lo = v; }
    for (i = 0; i < n; i++) { track(cumRec[i]); track(cumCost[i]); track(s.pos[i]); track(s.rev[i] || 0); }
    if (hi === lo) hi = lo + 1;
    var pad = (hi - lo) * 0.08;
    hi += pad; lo -= pad;

    function X(i2) { return padL + (n === 1 ? plotW / 2 : (i2 / (n - 1)) * plotW); }
    function Y(v) { return padT + plotH - ((v - lo) / (hi - lo)) * plotH; }

    /* zero line and axis */
    ctx.strokeStyle = T.border; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(cssW - padR, Y(0)); ctx.stroke();

    ctx.font = '10px ' + T.font; ctx.fillStyle = T.faint;
    ctx.textAlign = 'right';
    ctx.fillText(PF.fmtCompact(hi), padL - 6, Y(hi) + 8);
    ctx.fillText(PF.fmtCompact(lo), padL - 6, Y(lo));
    ctx.textAlign = 'left';
    ctx.fillText(s.months[0], padL, cssH - 8);
    if (n > 1) { ctx.textAlign = 'right'; ctx.fillText(s.months[n - 1], cssW - padR, cssH - 8); ctx.textAlign = 'left'; }

    /* monthly earnt revenue as bars behind the lines */
    var bw = Math.max(1, plotW / Math.max(1, n) * 0.55);
    ctx.fillStyle = T.earntRevenue; ctx.globalAlpha = 0.20;
    for (i = 0; i < n; i++) {
      var rv = s.rev[i] || 0;
      if (!rv) continue;
      var y0 = Y(Math.max(0, rv)), y1 = Y(Math.min(0, rv));
      ctx.fillRect(X(i) - bw / 2, y0, bw, Math.max(1, y1 - y0));
    }
    ctx.globalAlpha = 1;

    line(ctx, cumRec, X, Y, T.accent, 1.8);
    line(ctx, cumCost, X, Y, T.cashPayments, 1.8);
    line(ctx, s.pos, X, Y, T.cashPosition, 2.4);

    var pts = { X: X, Y: Y, n: n };
    cv.addEventListener('mousemove', function (ev) {
      var rect = cv.getBoundingClientRect();
      var mx = ev.clientX - rect.left;
      if (mx < padL - 4 || mx > cssW - padR + 4) { tip.hide(); return; }
      var idx = pts.n === 1 ? 0 : Math.round(((mx - padL) / plotW) * (pts.n - 1));
      idx = Math.max(0, Math.min(pts.n - 1, idx));
      tip.show('<b>' + PF.esc(s.months[idx]) + '</b><br>' +
        'Receipts (cum.) ' + PF.fmtMoney(cumRec[idx]) + '<br>' +
        'Payments (cum.) ' + PF.fmtMoney(cumCost[idx]) + '<br>' +
        'Net position ' + PF.fmtMoney(s.pos[idx]) + '<br>' +
        'Earnt revenue ' + PF.fmtMoney(s.rev[idx]), ev.clientX, ev.clientY);
    });
    cv.addEventListener('mouseleave', function () { tip.hide(); });
  }

  function line(ctx, arr, X, Y, colour, w) {
    ctx.strokeStyle = colour; ctx.lineWidth = w;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    var started = false;
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      if (v === null || v === undefined) continue;
      if (!started) { ctx.moveTo(X(i), Y(v)); started = true; }
      else ctx.lineTo(X(i), Y(v));
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
  function clip(ctx, s, maxW) {
    if (ctx.measureText(s).width <= maxW) return s;
    var t = s;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  /* 7. Preparer notes ------------------------------------------------------ */
  function currentNote() {
    if (!S.notesRead.d) return null;
    return PF.text(PF.cellAt(S.notesRead.d, 0, 0));
  }
  function notesHtml() {
    if (S.notesRead.err) return PF.stateError(S.notesRead.err);
    var val = currentNote();
    var shown = noteDirty && lastPaintedNote !== null ? lastPaintedNote : (val === null ? '' : val);
    lastPaintedNote = shown;
    return '<textarea class="pf-ta" id="ck-note" placeholder="Notes for the reviewer…"' +
      (S.notesRead.d ? '' : ' disabled') + '>' + PF.esc(shown) + '</textarea>' +
      '<div style="display:flex;align-items:center;gap:12px;margin-top:8px">' +
        '<button class="pf-btn pf-primary" id="ck-note-save" type="button" disabled>Save note</button>' +
        '<button class="pf-btn" id="ck-note-reset" type="button" disabled>Revert</button>' +
        '<span class="pf-wstate" id="ck-note-state"></span>' +
      '</div>';
  }

  function attach() {
    var ta = elBody.querySelector('#ck-note');
    var save = elBody.querySelector('#ck-note-save');
    var reset = elBody.querySelector('#ck-note-reset');
    var state = elBody.querySelector('#ck-note-state');

    if (ta && save && reset) {
      var baseline = currentNote() === null ? '' : currentNote();
      var sync = function () {
        var changed = ta.value !== baseline;
        noteDirty = changed;
        lastPaintedNote = ta.value;
        save.disabled = !changed;
        reset.disabled = !changed;
        if (!changed) { state.className = 'pf-wstate'; state.textContent = ''; }
      };
      L.on(ta, 'input', sync);
      L.on(reset, 'click', function () { ta.value = baseline; sync(); });
      L.on(save, 'click', function () {
        var version = switcher.selected();
        if (!version) { state.className = 'pf-wstate pf-bad'; state.textContent = 'Pick a version first.'; return; }
        var value = ta.value;
        save.disabled = true; reset.disabled = true;
        state.className = 'pf-wstate'; state.textContent = 'Saving…';
        /* Write, then let the notesRead subscription redraw the result. No
           optimistic update: the stored value is the truth. */
        Promise.resolve(SDK.editValue('notes', { 'versions': version }, value)).then(function () {
          state.className = 'pf-wstate pf-ok';
          state.textContent = 'Saved. Waiting for Pigment to recalculate…';
          noteDirty = false;
        })['catch'](function (err) {
          state.className = 'pf-wstate pf-bad';
          state.textContent = 'Not saved: ' + ((err && err.message) ? err.message : 'the write was rejected.');
          save.disabled = false; reset.disabled = false;
        });
      });
    }

    var mores = elBody.querySelectorAll('.ck-more');
    for (var i = 0; i < mores.length; i++) {
      L.on(mores[i], 'click', function (ev) {
        var a = ev.currentTarget;
        var span = a.parentNode.querySelector('.ck-cmt-txt');
        if (!span) return;
        var full = span.getAttribute('data-full') || '';
        if (a.textContent === 'more') { span.textContent = full; a.textContent = 'less'; }
        else { span.textContent = truncate(full, 140); a.textContent = 'more'; }
      });
    }
  }

  /* -- resize --------------------------------------------------------------- */
  /* Only the canvases depend on width, so redraw those rather than repainting
     the whole page and losing an in-progress note. */
  var onResize = PF.debounce(function () { drawGantt(); }, 140);
  L.on(window, 'resize', onResize);
  if (window.ResizeObserver) {
    var ro = L.observer(new ResizeObserver(onResize));
    ro.observe(document.documentElement);
  }

  function extraCss() {
    return '' +
    '.ck-tiles{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}' +
    '@media (max-width:1023px){.ck-tiles{grid-template-columns:repeat(3,1fr)}}' +
    '.ck-tile{min-width:0}' +
    '.ck-chips{margin-top:16px;padding-top:16px;border-top:1px solid ' + T.border + '}' +
    '.ck-canvas{width:100%;overflow:hidden}' +
    '.ck-canvas canvas{display:block}' +
    '.ck-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}' +
    '.ck-kpi{min-width:0}' +
    '.ck-legend{margin-top:8px;display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:' + T.muted + '}' +
    '.ck-lg{display:inline-flex;align-items:center;gap:5px}' +
    '.ck-lg i{width:9px;height:9px;border-radius:2px;display:inline-block}' +
    '.ck-total td{background:' + T.bg + ';border-bottom:1px solid ' + T.borderStrong + '}' +
    '.ck-cmt td{padding-top:0;border-bottom:1px solid ' + T.border + ';color:' + T.muted + ';font-size:12px}' +
    '.ck-budget td:first-child{line-height:1.3}';
  }

  /* -- cleanup -------------------------------------------------------------- */
  root.__cleanup = function () {
    repaint.cancel();
    onResize.cancel();
    L.destroy();
    tip.destroy();
    S = null;
    subs = null;
    root.innerHTML = '';
    root.__cleanup = null;
  };

  paint();
})();
