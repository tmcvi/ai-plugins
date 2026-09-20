// Frame 3 - New deal (brief section 7.4). A single 640px card with the nine
// fields, and a live economics preview on the right that updates as you type.

var SCREEN = 'New deal';

var state = {
  lists: { salesPerson: [], stage: [], useCase: [], salesMotion: [], dealSize: [], pigmentAE: [] },
  grid: null,
  assumptions: null,
  scalars: null,
  commission: null,
  importSummary: null,
  existingNames: [],
  created: null,
  error: null
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

function commissionRates() {
  var d = state.commission, out = {};
  if (!d) return out;
  for (var r = 0; r < d.labels.rows.length; r++) out[labelName(d.labels.rows[r])] = cell(d, 0, r);
  return out;
}

function currentSelection() {
  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
  return {
    size: val('nd-size'), stage: val('nd-stage'),
    motion: val('nd-motion'), close: val('nd-close')
  };
}

function render(keepValues) {
  if (state.error) { root.innerHTML = shellHtml(SCREEN, null, errorBlock(state.error)); return; }

  var sel = keepValues ? currentSelection() : { size: '', stage: '', motion: '', close: '' };

  var body = '';
  if (state.created) {
    body += '<div style="' + cardStyle() + 'border-color:' + T.green + ';margin-bottom:16px;">' +
      '<div style="font:700 15px ' + FONT.display + ';color:' + T.green + ';">Deal created</div>' +
      '<div style="font:13px ' + FONT.body + ';color:' + T.bodyInk + ';margin-top:4px;">' +
      esc(state.created) + ' is now in the pipeline. Open it from the Pipeline screen to add overrides.</div>' +
      '<button id="nd-another" style="' + BTN_SECONDARY + 'margin-top:10px;">Add another</button></div>';
  }

  body += '<div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">';
  body += '<div style="' + cardStyle(20) + 'width:640px;max-width:100%;flex:0 1 640px;">' +
    newDealFormHtml(state.lists, null) + '</div>';
  body += '<div style="width:320px;flex:0 1 320px;" id="nd-preview">' +
    ndPreviewHtml(state.assumptions, commissionRates(), sel.size, sel.stage, sel.motion,
                  sel.close, scalar('ASM Standard Day Rate £'), scalar('ASM FX Rate USD to GBP')) +
    '</div>';
  body += '</div>';

  root.innerHTML = shellHtml(SCREEN, loadDate(),
    pageTitle('New deal', 'Nine fields. Everything else is derived and can be overridden later.') + body);
  attach();
  if (keepValues) restore(sel);
  // The selects carry their defaults on first paint, so read them back rather
  // than leaving the preview on "Pick a deal size".
  refreshPreview();
}

function restore(sel) {
  function set(id, v) { var e = document.getElementById(id); if (e && v) e.value = v; }
  set('nd-size', sel.size); set('nd-stage', sel.stage);
  set('nd-motion', sel.motion); set('nd-close', sel.close);
}

function refreshPreview() {
  var sel = currentSelection();
  var box = document.getElementById('nd-preview');
  if (!box) return;
  box.innerHTML = ndPreviewHtml(state.assumptions, commissionRates(), sel.size, sel.stage,
    sel.motion, sel.close, scalar('ASM Standard Day Rate £'), scalar('ASM FX Rate USD to GBP'));
}

function attach() {
  var content = document.getElementById('content');
  if (!content) return;

  var watched = ['nd-size', 'nd-stage', 'nd-motion', 'nd-close'];
  for (var i = 0; i < watched.length; i++) {
    var e = document.getElementById(watched[i]);
    if (e) on(e, 'change', refreshPreview);
  }

  var create = document.getElementById('nd-create');
  if (create) {
    on(create, 'click', function () {
      ndSubmit(state.existingNames, function (name) {
        state.created = name;
        render(false);
      });
    });
  }

  var reset = document.getElementById('nd-reset');
  if (reset) on(reset, 'click', function () { state.created = null; render(false); });

  var another = document.getElementById('nd-another');
  if (another) on(another, 'click', function () { state.created = null; render(false); });

  var nameEl = document.getElementById('nd-name');
  if (nameEl) nameEl.focus();
}

function boot() {
  installBaseStyles();
  root.innerHTML = shellHtml(SCREEN, null, loadingBlock());
  var redraw = debounce(function () { render(true); }, 16);
  function fail(e) { state.error = (e && e.message) ? e.message : 'Subscription failed'; render(false); }

  // Stage and Deal Size need their Order property to sort, so they come
  // through their property data sources; the rest only need names (D17).
  subscribeRefLists(state.lists, [
    { alias: 'stage', ds: 'vwStageProps' },
    { alias: 'dealSize', ds: 'vwDealSizeProps' },
    { alias: 'salesPerson' }, { alias: 'useCase' },
    { alias: 'salesMotion' }, { alias: 'pigmentAE' }
  ], redraw, fail);

  // Only the names matter here: they are what the duplicate check compares.
  subscribeList('opportunity', function (items) {
    var names = [];
    for (var j = 0; j < items.length; j++) names.push(items[j].Name);
    state.existingNames = names;
  }, fail);

  subscribeView('vwAssumptions', function (d) { state.assumptions = d; redraw(); }, fail);
  subscribeView('vwScalarAssumptions', function (d) { state.scalars = d; redraw(); }, fail);
  subscribeView('vwCommissionRates', function (d) { state.commission = d; redraw(); }, fail);
  subscribeView('vwImportSummary', function (d) { state.importSummary = d; redraw(); }, fail);

  on(window, 'resize', debounce(function () { render(true); }, 120));
}
