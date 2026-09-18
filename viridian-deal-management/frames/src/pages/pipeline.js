// Frame 1 - Pipeline (brief section 7.4). KPI strip, client-side filters, a
// sortable table with an inline stage dropdown, and the shared Deal editor as a
// 480px right-hand slide-over.

var SCREEN = 'Pipeline';

var state = {
  grid: null, idx: {},
  items: [], pigment: [],
  lists: { salesPerson: [], stage: [], useCase: [], salesMotion: [], dealSize: [], pigmentAE: [] },
  scalars: null, importSummary: null,
  filters: { people: [], group: 'Open', useCase: '', motion: '', size: '', quarter: '', q: '' },
  sortCol: 4, sortAsc: true,
  partial: false, error: null
};

function loadDate() {
  var d = state.importSummary;
  if (!d) return null;
  for (var r = 0; r < d.labels.rows.length; r++) {
    if (labelName(d.labels.rows[r]) === 'PIG Latest Load Date') return cell(d, 0, r);
  }
  return null;
}

function scalar(name) {
  var d = state.scalars;
  if (!d) return null;
  for (var r = 0; r < d.labels.rows.length; r++) {
    if (labelName(d.labels.rows[r]) === name) return cell(d, 0, r);
  }
  return null;
}

function itemByName(n) {
  for (var i = 0; i < state.items.length; i++) {
    if (state.items[i]['Opportunity Name'] === n) return state.items[i];
  }
  return null;
}

function pigmentByName() {
  var m = {};
  for (var i = 0; i < state.pigment.length; i++) {
    m[state.pigment[i]['Pigment Opportunity Name']] = state.pigment[i];
  }
  return m;
}

// Build one flat record per deal from the grid plus the list item.
function deals() {
  var out = [];
  if (!state.grid) return out;
  var g = state.grid, idx = state.idx;
  for (var r = 0; r < g.labels.rows.length; r++) {
    var name = labelName(g.labels.rows[r]);
    var item = itemByName(name);
    if (!item) continue;
    function v(k) { return idx[k] === undefined ? null : cell(g, idx[k], r); }
    out.push({
      name: name, item: item,
      person: item['Sales Person'] || '', stage: item.Stage || '',
      closeDate: item['Expected Close Date'] || '',
      useCase: item['Use Case'] || '', motion: item['Sales Motion'] || '',
      size: item['Deal Size'] || '', ae: item['Pigment AE'] || '',
      matchedTo: item['Matched Pigment Opportunity'] || '',
      winRate: v('OPP Win Rate %'),
      licenceUsd: v('OPP Licence Value $'),
      services: v('OPP Services Value £'),
      wServices: v('OPP Weighted Services Value £'),
      commission: v('OPP Commission £'),
      wCommission: v('OPP Weighted Commission £'),
      days: v('OPP Effective Days'),
      isOpen: v('OPP Is Open') === true,
      isWon: v('OPP Is Won') === true,
      isLost: v('OPP Is Lost') === true,
      matchStatus: v('ALN Match Status'),
      stageAlign: v('ALN Stage Alignment'),
      closeGap: v('ALN Close Date Gap Days'),
      motionOk: v('ALN Motion Consistent'),
      dropped: v('ALN Matched Row Dropped') === true,
      pigClosed: v('ALN Pigment Closed') === true,
      profileOk: v('PH Profile Is Valid') === true
    });
  }
  return out;
}

function stageGroupOf(stageName) {
  for (var i = 0; i < state.lists.stage.length; i++) {
    if (state.lists.stage[i].Name === stageName) return state.lists.stage[i]['Pipeline Group'] || '';
  }
  return '';
}

function applyFilters(rows) {
  var f = state.filters;
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var d = rows[i];
    if (f.group === 'Open' && !d.isOpen) continue;
    if (f.group === 'Won' && !d.isWon) continue;
    if (f.group === 'Lost' && !d.isLost) continue;
    if (f.people.length && f.people.indexOf(d.person) === -1) continue;
    if (f.useCase && d.useCase !== f.useCase) continue;
    if (f.motion && d.motion !== f.motion) continue;
    if (f.size && d.size !== f.size) continue;
    if (f.quarter && quarterOf(d.closeDate) !== f.quarter) continue;
    if (f.q && d.name.toLowerCase().indexOf(f.q.toLowerCase()) === -1) continue;
    out.push(d);
  }
  return out;
}

function currentQuarter() { return quarterOf(todayIso()); }

function kpis(all) {
  var open = [], i;
  for (i = 0; i < all.length; i++) if (all[i].isOpen) open.push(all[i]);

  function sum(arr, k) {
    var t = 0;
    for (var j = 0; j < arr.length; j++) if (isNum(arr[j][k])) t += arr[j][k];
    return t;
  }

  var thisQ = [], q = currentQuarter();
  for (i = 0; i < all.length; i++) {
    if ((all[i].isOpen || all[i].isWon) && quarterOf(all[i].closeDate) === q) thisQ.push(all[i]);
  }
  var unmatched = 0;
  for (i = 0; i < all.length; i++) {
    if (all[i].isOpen && all[i].matchStatus !== 'Matched') unmatched++;
  }

  return [
    { label: 'Open services value', main: moneyShort(sum(open, 'services')),
      sub: 'weighted ' + moneyShort(sum(open, 'wServices')) },
    { label: 'Open commission', main: moneyShort(sum(open, 'commission')),
      sub: 'weighted ' + moneyShort(sum(open, 'wCommission')) },
    { label: 'Open days', main: days(sum(open, 'days')),
      sub: open.length + ' open deals' },
    { label: 'Closing ' + q, main: String(thisQ.length),
      sub: moneyShort(sum(thisQ, 'services')) },
    { label: 'Licence ARR in pipeline', main: '$' + num(Math.round(sum(open, 'licenceUsd') / 1000), 0) + 'k',
      sub: 'open deals only' },
    { label: 'Unmatched deals', main: String(unmatched),
      sub: unmatched ? 'link them on Matching' : 'all matched' }
  ];
}

function kpiStrip(all) {
  var cards = kpis(all);
  var h = '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;">';
  for (var i = 0; i < cards.length; i++) {
    h += '<div style="flex:1 1 150px;min-width:140px;background:' + T.violet +
      ';border-radius:' + RADIUS.card + ';padding:12px 14px;">' +
      '<div style="font:700 28px ' + FONT.display + ';color:' + T.gold + ';line-height:1.1;">' +
      esc(cards[i].main) + '</div>' +
      '<div style="font:12px ' + FONT.body + ';color:' + T.cream + ';margin-top:4px;">' +
      esc(cards[i].label) + '</div>' +
      '<div style="font:11px ' + FONT.body + ';color:' + T.cream + ';opacity:.66;margin-top:2px;">' +
      esc(cards[i].sub) + '</div></div>';
  }
  return h + '</div>';
}

function selectHtml(id, items, current, blankLabel) {
  var h = '<select id="' + id + '" style="' + INPUT_CSS + 'width:auto;min-width:120px;">';
  h += '<option value="">' + esc(blankLabel) + '</option>';
  for (var i = 0; i < items.length; i++) {
    var n = items[i].Name !== undefined ? items[i].Name : items[i];
    h += '<option value="' + esc(n) + '"' + (n === current ? ' selected' : '') + '>' + esc(n) + '</option>';
  }
  return h + '</select>';
}

function filterBar(all) {
  var f = state.filters;
  var quarters = [], seen = {};
  for (var i = 0; i < all.length; i++) {
    var q = quarterOf(all[i].closeDate);
    if (q && !seen[q]) { seen[q] = 1; quarters.push(q); }
  }
  quarters.sort();

  var h = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">';
  h += '<select id="f-person" style="' + INPUT_CSS + 'width:auto;min-width:140px;">';
  h += '<option value="">All sales people</option>';
  for (var p = 0; p < state.lists.salesPerson.length; p++) {
    var n = state.lists.salesPerson[p].Name;
    h += '<option value="' + esc(n) + '"' + (f.people.length === 1 && f.people[0] === n ? ' selected' : '') +
      '>' + esc(n) + '</option>';
  }
  h += '</select>';

  h += '<select id="f-group" style="' + INPUT_CSS + 'width:auto;">';
  var groups = ['Open', 'Won', 'Lost', 'All'];
  for (var g = 0; g < groups.length; g++) {
    h += '<option value="' + groups[g] + '"' + (f.group === groups[g] ? ' selected' : '') + '>' +
      groups[g] + '</option>';
  }
  h += '</select>';

  h += selectHtml('f-useCase', state.lists.useCase, f.useCase, 'All use cases');
  h += selectHtml('f-motion', state.lists.salesMotion, f.motion, 'All motions');
  h += selectHtml('f-size', state.lists.dealSize, f.size, 'All sizes');
  h += selectHtml('f-quarter', quarters, f.quarter, 'All quarters');
  h += '<input id="f-q" value="' + esc(f.q) + '" placeholder="Search name" style="' +
    INPUT_CSS + 'width:auto;min-width:160px;">';
  h += '<button id="f-clear" style="' + BTN_SECONDARY + '">Clear</button>';
  h += '<button id="f-mine" style="' + BTN_SECONDARY + '">My deals</button>';
  return h + '</div>';
}

var COLS = [
  { label: 'Name' }, { label: 'Sales person' }, { label: 'Stage' },
  { label: 'Win %', align: 'right' }, { label: 'Close date', mono: true },
  { label: 'Use case' }, { label: 'Motion' }, { label: 'Size' },
  { label: 'Licence $', align: 'right' }, { label: 'Services £', align: 'right' },
  { label: 'Commission £', align: 'right' }, { label: 'Days', align: 'right' },
  { label: 'Match' }, { label: 'Flags' }
];

function sortRows(rows) {
  var c = state.sortCol, asc = state.sortAsc ? 1 : -1;
  var keys = ['name','person','stage','winRate','closeDate','useCase','motion','size',
              'licenceUsd','services','commission','days','matchStatus','name'];
  var k = keys[c] || 'name';
  rows.sort(function (a, b) {
    var x = a[k], y = b[k];
    if (x === null || x === undefined) x = '';
    if (y === null || y === undefined) y = '';
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * asc;
    return String(x).localeCompare(String(y)) * asc;
  });
  return rows;
}

function flagsFor(d) {
  var h = '';
  if (d.dropped) h += badge('dropped', 'bad') + ' ';
  if (d.pigClosed) h += badge('closed in Pigment', 'bad') + ' ';
  if (d.motionOk === false) h += badge('motion', 'warn') + ' ';
  if (isNum(d.closeGap) && Math.abs(d.closeGap) > 90) h += badge('close ' + d.closeGap + 'd', 'bad') + ' ';
  else if (isNum(d.closeGap) && Math.abs(d.closeGap) > 30) h += badge('close ' + d.closeGap + 'd', 'warn') + ' ';
  if (!d.profileOk) h += badge('profile', 'bad') + ' ';
  return h || '<span style="color:' + T.muted + ';">—</span>';
}

function stageDropdown(d) {
  var h = '<select data-stagefor="' + esc(d.name) + '" style="' + INPUT_CSS +
    'padding:3px 4px;font-size:12px;width:auto;min-width:112px;">';
  for (var i = 0; i < state.lists.stage.length; i++) {
    var n = state.lists.stage[i].Name;
    h += '<option value="' + esc(n) + '"' + (n === d.stage ? ' selected' : '') + '>' + esc(n) + '</option>';
  }
  return h + '</select>';
}

function tableFor(rows) {
  if (!rows.length) {
    return '<div style="' + cardStyle(28) + 'text-align:center;">' +
      '<div style="font:700 17px ' + FONT.display + ';color:' + T.ink + ';">No deals match these filters</div>' +
      '<div style="font:13px ' + FONT.body + ';color:' + T.secondary + ';margin:6px 0 12px;">' +
      'Clear a filter, or add a deal from the New deal screen.</div>' +
      '<button id="empty-clear" style="' + BTN_PRIMARY + '">Clear filters</button></div>';
  }
  var trows = [];
  for (var i = 0; i < rows.length; i++) {
    var d = rows[i];
    trows.push({
      key: d.name, muted: d.isLost,
      cells: [
        '<span style="font-weight:600;color:' + T.ink + ';">' + esc(d.name) + '</span>',
        esc(d.person), stageDropdown(d), pct(d.winRate, 0), fmtDate(d.closeDate),
        esc(d.useCase), esc(d.motion), badge(d.size, 'neutral'),
        moneyUsd(d.licenceUsd), money(d.services), money(d.commission), days(d.days),
        badge(d.matchStatus === 'Matched' ? 'matched' : 'Viridian only',
              d.matchStatus === 'Matched' ? 'good' : 'neutral'),
        flagsFor(d)
      ]
    });
  }
  return '<div style="' + cardStyle(0) + 'overflow:auto;max-height:calc(100vh - 340px);">' +
    tableHtml(COLS, trows, { sortCol: state.sortCol, sortAsc: state.sortAsc }) + '</div>';
}

function slideOver() {
  if (!DE.open) return '';
  var ctx = editorCtx();
  return '<div id="slide" style="position:fixed;top:56px;right:0;bottom:0;width:480px;max-width:100%;' +
    'background:' + T.cream + ';border-left:1px solid ' + T.hairline + ';overflow:auto;padding:16px 20px;' +
    'z-index:500;">' + dealEditorHtml(ctx, true) + '</div>';
}

function editorCtx() {
  return {
    grid: state.grid, idx: state.idx, items: state.items, lists: state.lists,
    pigmentByName: pigmentByName(),
    standardRate: scalar('ASM Standard Day Rate £'),
    fx: scalar('ASM FX Rate USD to GBP'),
    suggestFor: suggestForDeal
  };
}

// Top suggestions for one deal, used inside the editor's Pigment section.
function suggestForDeal(item) {
  var matchedNames = {};
  for (var i = 0; i < state.items.length; i++) {
    var mv = state.items[i]['Matched Pigment Opportunity'];
    if (mv) matchedNames[mv] = true;
  }
  var deal = {
    name: item['Opportunity Name'], salesPerson: item['Sales Person'],
    closeDate: item['Expected Close Date'], pigmentAE: item['Pigment AE'],
    matched: !!item['Matched Pigment Opportunity']
  };
  var out = [];
  for (var p = 0; p < state.pigment.length; p++) {
    var pr = state.pigment[p];
    var pigName = pr['Pigment Opportunity Name'];
    var row = {
      name: pigName, account: derivedAccount(pigName),
      partnerContact: pr['Partner Sales Contact'], closeDate: pr['Close Date'],
      pigmentAE: pr['Pigment AE'], matched: !!matchedNames[pigName]
    };
    var s = scoreMatch(deal, row);
    var band = matchBand(s.score);
    if (band) out.push({ name: pigName, score: s.score, reasons: s.reasons, band: band });
  }
  out.sort(function (a, b) { return b.score - a.score; });
  return out;
}

// Mirror of PIG Derived Account so suggestions work without another View.
function derivedAccount(name) {
  if (!name) return '';
  var i = name.indexOf('-');
  return (i === -1 ? name : name.slice(0, i)).trim();
}

function render() {
  if (state.error) { root.innerHTML = shellHtml(SCREEN, null, errorBlock(state.error)); return; }
  if (!state.grid) { root.innerHTML = shellHtml(SCREEN, loadDate(), loadingBlock()); return; }

  var all = deals();
  var rows = sortRows(applyFilters(all));

  var body = '';
  if (state.partial) body += partialBanner();
  body += kpiStrip(all);
  body += filterBar(all);
  body += '<div style="font:12px ' + FONT.body + ';color:' + T.secondary + ';margin-bottom:6px;">' +
    rows.length + ' of ' + all.length + ' deals</div>';
  body += tableFor(rows);

  root.innerHTML = shellHtml(SCREEN, loadDate(), body) + slideOver();
  attach();
}

function attach() {
  var content = document.getElementById('content');
  if (!content) return;
  var f = state.filters;

  function bind(id, ev, fn) { var e = document.getElementById(id); if (e) on(e, ev, fn); }

  bind('f-person', 'change', function (e) {
    f.people = e.currentTarget.value ? [e.currentTarget.value] : []; render();
  });
  bind('f-group', 'change', function (e) { f.group = e.currentTarget.value; render(); });
  bind('f-useCase', 'change', function (e) { f.useCase = e.currentTarget.value; render(); });
  bind('f-motion', 'change', function (e) { f.motion = e.currentTarget.value; render(); });
  bind('f-size', 'change', function (e) { f.size = e.currentTarget.value; render(); });
  bind('f-quarter', 'change', function (e) { f.quarter = e.currentTarget.value; render(); });
  bind('f-q', 'input', debounce(function () {
    var e = document.getElementById('f-q');
    if (e) { f.q = e.value; render(); var n = document.getElementById('f-q'); if (n) { n.focus(); n.selectionStart = n.value.length; } }
  }, 220));
  bind('f-clear', 'click', function () {
    state.filters = { people: [], group: 'Open', useCase: '', motion: '', size: '', quarter: '', q: '' };
    render();
  });
  bind('f-mine', 'click', function () {
    // "My deals" without a current-user formula: default to the first active person.
    if (state.lists.salesPerson.length) {
      f.people = [state.lists.salesPerson[0].Name];
      toast('Filtered to ' + f.people[0]);
      render();
    }
  });
  bind('empty-clear', 'click', function () {
    state.filters = { people: [], group: 'Open', useCase: '', motion: '', size: '', quarter: '', q: '' };
    render();
  });

  var heads = content.querySelectorAll('th[data-sort]');
  for (var i = 0; i < heads.length; i++) {
    on(heads[i], 'click', function (e) {
      var c = parseInt(e.currentTarget.getAttribute('data-sort'), 10);
      if (state.sortCol === c) state.sortAsc = !state.sortAsc;
      else { state.sortCol = c; state.sortAsc = true; }
      render();
    });
  }

  // Inline stage change writes straight through.
  var stageSels = content.querySelectorAll('select[data-stagefor]');
  for (var s = 0; s < stageSels.length; s++) {
    on(stageSels[s], 'click', function (e) { e.stopPropagation(); });
    on(stageSels[s], 'change', function (e) {
      e.stopPropagation();
      var name = e.currentTarget.getAttribute('data-stagefor');
      var stage = e.currentTarget.value;
      var vals = { Stage: stage, 'Last Updated On': todayIso() };
      if (stage === 'Closed Won' || stage === 'Closed Lost') vals['Closed On'] = todayIso();
      else vals['Closed On'] = null;
      writeItem('opportunity', name, vals);
    });
  }

  var trs = content.querySelectorAll('tr[data-row]');
  for (var r = 0; r < trs.length; r++) {
    on(trs[r], 'click', function (e) {
      openDealEditor(e.currentTarget.getAttribute('data-row'), render);
    });
  }

  if (DE.open) attachDealEditor(editorCtx(), render);
}

function boot() {
  installBaseStyles();
  root.innerHTML = shellHtml(SCREEN, null, loadingBlock());
  var redraw = debounce(render, 16);
  function fail(e) { state.error = (e && e.message) ? e.message : 'Subscription failed'; render(); }

  subscribeView('vwPipelineGrid', function (d) {
    state.grid = d; state.idx = columnIndex(d); redraw();
  }, fail);
  subscribeView('vwScalarAssumptions', function (d) { state.scalars = d; redraw(); }, fail);
  subscribeView('vwImportSummary', function (d) { state.importSummary = d; redraw(); }, fail);

  subscribeList('opportunity', function (items, partial) {
    state.items = items; state.partial = state.partial || partial; redraw();
  }, fail);
  subscribeList('pigmentPipeline', function (items) { state.pigment = items; redraw(); }, fail);

  var listAliases = ['salesPerson', 'stage', 'useCase', 'salesMotion', 'dealSize', 'pigmentAE'];
  for (var i = 0; i < listAliases.length; i++) {
    (function (alias) {
      subscribeList(alias, function (items) {
        if (alias === 'stage' || alias === 'dealSize') {
          items.sort(function (a, b) { return (a.Order || 0) - (b.Order || 0); });
        }
        state.lists[alias] = items;
        redraw();
      }, fail);
    })(listAliases[i]);
  }

  on(window, 'resize', debounce(render, 120));
}
