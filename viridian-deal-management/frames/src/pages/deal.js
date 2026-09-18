// Frame 2 - Deal editor (brief section 7.4), as its own page. Frames cannot
// receive parameters, so the page carries a searchable deal picker; the editor
// body itself is the same shared component the Pipeline slide-over renders.

var SCREEN = 'Deals';

var state = {
  grid: null, idx: {},
  items: [], pigment: [],
  lists: { salesPerson: [], stage: [], useCase: [], salesMotion: [], dealSize: [], pigmentAE: [] },
  scalars: null, importSummary: null,
  search: '', partial: false, error: null
};

function dsValue(d, name) {
  if (!d) return null;
  var r = rowByName(d, name);
  if (r !== -1) return cell(d, 0, r);
  var idx = columnIndex(d);
  if (idx[name] !== undefined) return cell(d, idx[name], 0);
  return null;
}

function loadDate() { return dsValue(state.importSummary, 'PIG Latest Load Date'); }

function scalar(name) { return dsValue(state.scalars, name); }

function pigmentByName() {
  var m = {};
  for (var i = 0; i < state.pigment.length; i++) {
    m[state.pigment[i]['Pigment Opportunity Name']] = state.pigment[i];
  }
  return m;
}

function derivedAccount(name) {
  if (!name) return '';
  var i = name.indexOf('-');
  return (i === -1 ? name : name.slice(0, i)).trim();
}

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
    var s = scoreMatch(deal, {
      name: pigName, account: derivedAccount(pigName),
      partnerContact: pr['Partner Sales Contact'], closeDate: pr['Close Date'],
      pigmentAE: pr['Pigment AE'], matched: !!matchedNames[pigName]
    });
    var band = matchBand(s.score);
    if (band) out.push({ name: pigName, score: s.score, reasons: s.reasons, band: band });
  }
  out.sort(function (a, b) { return b.score - a.score; });
  return out;
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

function pickerHtml() {
  var q = state.search.toLowerCase();
  var matches = [];
  for (var i = 0; i < state.items.length; i++) {
    var n = state.items[i]['Opportunity Name'];
    if (!n) continue;
    if (!q || n.toLowerCase().indexOf(q) !== -1) matches.push(state.items[i]);
  }
  matches.sort(function (a, b) {
    return String(a['Opportunity Name']).localeCompare(String(b['Opportunity Name']));
  });

  var h = '<div style="' + cardStyle() + 'margin-bottom:16px;">';
  h += '<label style="' + LABEL_CSS + '">Choose a deal</label>';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
  h += '<input id="dp-search" value="' + esc(state.search) + '" placeholder="Search deals" style="' +
    INPUT_CSS + 'width:auto;min-width:220px;">';
  h += '<select id="dp-select" style="' + INPUT_CSS + 'width:auto;min-width:280px;">';
  h += '<option value="">Select a deal...</option>';
  for (var m = 0; m < matches.length; m++) {
    var name = matches[m]['Opportunity Name'];
    h += '<option value="' + esc(name) + '"' + (name === DE.dealName ? ' selected' : '') + '>' +
      esc(name) + ' — ' + esc(matches[m].Stage || '') + '</option>';
  }
  h += '</select>';
  h += '<span style="font:12px ' + FONT.body + ';color:' + T.secondary + ';align-self:center;">' +
    matches.length + ' deal' + (matches.length === 1 ? '' : 's') + '</span>';
  h += '</div></div>';
  return h;
}

function render() {
  if (state.error) { root.innerHTML = shellHtml(SCREEN, null, errorBlock(state.error)); return; }
  if (!state.grid) { root.innerHTML = shellHtml(SCREEN, loadDate(), loadingBlock()); return; }

  var body = '';
  if (state.partial) body += partialBanner();
  body += pickerHtml();

  if (DE.dealName) {
    body += '<div style="' + cardStyle(20) + 'max-width:900px;">' +
      dealEditorHtml(editorCtx(), false) + '</div>';
  } else {
    body += stateBlock('No deal selected', 'Pick a deal above to edit its economics, delivery profile and Pigment match.');
  }

  root.innerHTML = shellHtml(SCREEN, loadDate(),
    pageTitle('Deal editor', 'Every derived number sits beside the driver that produced it.') + body);
  attach();
}

function attach() {
  var search = document.getElementById('dp-search');
  if (search) {
    on(search, 'input', debounce(function () {
      var e = document.getElementById('dp-search');
      if (!e) return;
      state.search = e.value;
      render();
      var again = document.getElementById('dp-search');
      if (again) { again.focus(); again.selectionStart = again.value.length; }
    }, 220));
  }

  var sel = document.getElementById('dp-select');
  if (sel) {
    on(sel, 'change', function (e) {
      var v = e.currentTarget.value;
      if (!v) { closeDealEditor(render); return; }
      openDealEditor(v, render);
    });
  }

  if (DE.dealName) attachDealEditor(editorCtx(), render);
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
