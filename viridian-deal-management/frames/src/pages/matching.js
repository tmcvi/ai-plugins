// Frame 4 - Matching (brief section 7.4). Two panes; selecting a row on either
// side re-sorts the opposite pane by suggestion score. Scoring is section 6.5,
// computed client-side in suggest.js.

var SCREEN = 'Matching';

var state = {
  grid: null, idx: {},
  items: [], pigment: [],
  lists: { salesPerson: [], stage: [], useCase: [], salesMotion: [], dealSize: [], pigmentAE: [] },
  importSummary: null, assumptions: null,
  selDeal: null, selPig: null,
  showAllDeals: false, showAllPig: false,
  fPerson: '', fContact: '', fTrack: '', fSegment: '',
  showPairs: true,
  partial: false, error: null
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

function derivedAccount(name) {
  if (!name) return '';
  var i = name.indexOf('-');
  return (i === -1 ? name : name.slice(0, i)).trim();
}

function trackOf(stageName) {
  if (!stageName) return '';
  var c = stageName.charAt(0);
  if (c === 'S') return 'New';
  if (c === 'U') return 'Upsell';
  if (c === 'R') return 'Renewal';
  return '';
}

function gridVal(name, key) {
  var g = state.grid, idx = state.idx;
  if (!g || idx[key] === undefined) return null;
  for (var r = 0; r < g.labels.rows.length; r++) {
    if (labelName(g.labels.rows[r]) === name) return cell(g, idx[key], r);
  }
  return null;
}

function matchedPigNames() {
  var m = {};
  for (var i = 0; i < state.items.length; i++) {
    var v = state.items[i]['Matched Pigment Opportunity'];
    if (v) m[v] = state.items[i]['Opportunity Name'];
  }
  return m;
}

function dealRecords() {
  var out = [];
  for (var i = 0; i < state.items.length; i++) {
    var it = state.items[i];
    if (!it['Opportunity Name']) continue;
    out.push({
      name: it['Opportunity Name'],
      salesPerson: it['Sales Person'] || '',
      stage: it.Stage || '',
      closeDate: it['Expected Close Date'] || '',
      pigmentAE: it['Pigment AE'] || '',
      matched: !!it['Matched Pigment Opportunity'],
      matchedTo: it['Matched Pigment Opportunity'] || '',
      isOpen: gridVal(it['Opportunity Name'], 'OPP Is Open') === true
    });
  }
  return out;
}

function pigRecords() {
  var mp = matchedPigNames();
  var out = [];
  for (var i = 0; i < state.pigment.length; i++) {
    var pr = state.pigment[i];
    var n = pr['Pigment Opportunity Name'];
    if (!n) continue;
    out.push({
      name: n, account: derivedAccount(n),
      partnerContact: pr['Partner Sales Contact'] || '',
      closeDate: pr['Close Date'] || '',
      pigmentAE: pr['Pigment AE'] || '',
      stage: pr['Pigment Stage'] || '',
      track: trackOf(pr['Pigment Stage']),
      segment: pr.Segment || '',
      attach: pr['Partner Attach Type'] || '',
      acv: pr['ACV USD'],
      matched: !!mp[n], matchedTo: mp[n] || ''
    });
  }
  return out;
}

function scoreAgainst(deal, pig) { return scoreMatch(deal, pig); }

function render() {
  if (state.error) { root.innerHTML = shellHtml(SCREEN, null, errorBlock(state.error)); return; }
  if (!state.grid) { root.innerHTML = shellHtml(SCREEN, loadDate(), loadingBlock()); return; }

  var allDeals = dealRecords();
  var allPig = pigRecords();

  var matchedCount = 0, i;
  for (i = 0; i < allPig.length; i++) if (allPig[i].matched) matchedCount++;
  var viridianOnly = 0;
  for (i = 0; i < allDeals.length; i++) if (!allDeals[i].matched) viridianOnly++;

  var body = '';
  if (state.partial) body += partialBanner();

  body += '<div style="font:13px ' + FONT.body + ';color:' + T.bodyInk + ';margin-bottom:12px;">' +
    '<strong>' + allPig.length + '</strong> Pigment rows · <strong>' + matchedCount + '</strong> matched · <strong>' +
    (allPig.length - matchedCount) + '</strong> Pigment only · <strong>' + viridianOnly +
    '</strong> Viridian only</div>';

  body += '<div style="display:flex;gap:12px;align-items:flex-start;">';
  body += leftPane(allDeals, allPig);
  body += centrePane();
  body += rightPane(allPig, allDeals);
  body += '</div>';

  body += pairsStrip(allDeals);

  root.innerHTML = shellHtml(SCREEN, loadDate(),
    pageTitle('Matching', 'Link a Viridian deal to the Pigment pipeline row it belongs to.') + body);
  attach();
}

function leftPane(allDeals, allPig) {
  var rows = [];
  for (var i = 0; i < allDeals.length; i++) {
    var d = allDeals[i];
    if (!state.showAllDeals && (d.matched || !d.isOpen)) continue;
    if (state.fPerson && d.salesPerson !== state.fPerson) continue;
    rows.push(d);
  }

  // If a Pigment row is selected, rank deals against it.
  var sel = state.selPig ? findPig(allPig, state.selPig) : null;
  if (sel) {
    for (var r = 0; r < rows.length; r++) {
      var s = scoreAgainst(rows[r], sel);
      rows[r]._score = s.score; rows[r]._reasons = s.reasons;
    }
    rows.sort(function (a, b) { return (b._score || 0) - (a._score || 0); });
  } else {
    rows.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  }

  var h = '<div style="' + cardStyle(12) + 'flex:1 1 0;min-width:0;">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';">Viridian deals</div>';
  h += '<label style="font:12px ' + FONT.body + ';color:' + T.secondary + ';cursor:pointer;">' +
    '<input type="checkbox" id="m-allDeals"' + (state.showAllDeals ? ' checked' : '') + '> show all</label>';
  h += '</div>';
  h += '<select id="m-person" style="' + INPUT_CSS + 'margin-bottom:8px;">';
  h += '<option value="">All sales people</option>';
  for (var p = 0; p < state.lists.salesPerson.length; p++) {
    var n = state.lists.salesPerson[p].Name;
    h += '<option value="' + esc(n) + '"' + (n === state.fPerson ? ' selected' : '') + '>' + esc(n) + '</option>';
  }
  h += '</select>';
  h += '<div style="max-height:46vh;overflow:auto;">';
  if (!rows.length) {
    h += '<div style="font:13px ' + FONT.body + ';color:' + T.muted + ';padding:8px 0;">Nothing to match.</div>';
  }
  for (var k = 0; k < rows.length; k++) h += paneRow(rows[k], 'deal', state.selDeal === rows[k].name);
  return h + '</div></div>';
}

function rightPane(allPig, allDeals) {
  var rows = [];
  for (var i = 0; i < allPig.length; i++) {
    var p = allPig[i];
    if (!state.showAllPig && p.matched) continue;
    if (state.fContact && p.partnerContact !== state.fContact) continue;
    if (state.fTrack && p.track !== state.fTrack) continue;
    if (state.fSegment && p.segment !== state.fSegment) continue;
    rows.push(p);
  }

  var sel = state.selDeal ? findDeal(allDeals, state.selDeal) : null;
  if (sel) {
    for (var r = 0; r < rows.length; r++) {
      var s = scoreAgainst(sel, rows[r]);
      rows[r]._score = s.score; rows[r]._reasons = s.reasons;
    }
    rows.sort(function (a, b) { return (b._score || 0) - (a._score || 0); });
  } else {
    rows.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  }

  var segs = {}, segList = [];
  for (var q = 0; q < allPig.length; q++) {
    if (allPig[q].segment && !segs[allPig[q].segment]) { segs[allPig[q].segment] = 1; segList.push(allPig[q].segment); }
  }
  segList.sort();

  var h = '<div style="' + cardStyle(12) + 'flex:1 1 0;min-width:0;">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';">Pigment pipeline rows</div>';
  h += '<label style="font:12px ' + FONT.body + ';color:' + T.secondary + ';cursor:pointer;">' +
    '<input type="checkbox" id="m-allPig"' + (state.showAllPig ? ' checked' : '') + '> show all</label>';
  h += '</div>';
  h += '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">';
  h += '<select id="m-track" style="' + INPUT_CSS + 'width:auto;"><option value="">All tracks</option>';
  var tracks = ['New', 'Upsell', 'Renewal'];
  for (var t = 0; t < tracks.length; t++) {
    h += '<option value="' + tracks[t] + '"' + (state.fTrack === tracks[t] ? ' selected' : '') + '>' +
      tracks[t] + '</option>';
  }
  h += '</select>';
  h += '<select id="m-segment" style="' + INPUT_CSS + 'width:auto;"><option value="">All segments</option>';
  for (var sg = 0; sg < segList.length; sg++) {
    h += '<option value="' + esc(segList[sg]) + '"' + (state.fSegment === segList[sg] ? ' selected' : '') +
      '>' + esc(segList[sg]) + '</option>';
  }
  h += '</select></div>';
  h += '<div style="max-height:46vh;overflow:auto;">';
  if (!rows.length) {
    h += '<div style="font:13px ' + FONT.body + ';color:' + T.muted + ';padding:8px 0;">No rows.</div>';
  }
  for (var k = 0; k < rows.length; k++) h += paneRow(rows[k], 'pig', state.selPig === rows[k].name);
  return h + '</div></div>';
}

function paneRow(r, kind, selected) {
  var band = r._score !== undefined ? matchBand(r._score) : null;
  var h = '<div data-' + kind + '="' + esc(r.name) + '" tabindex="0" title="' +
    esc((r._reasons || []).join(' · ')) + '" style="padding:7px 8px;cursor:pointer;border-radius:' +
    RADIUS.input + ';margin-bottom:3px;background:' + (selected ? T.violetTint : 'transparent') +
    ';border:1px solid ' + (selected ? T.violet : 'transparent') + ';">';
  h += '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;">';
  h += '<span style="font:600 13px ' + FONT.body + ';color:' + T.ink + ';overflow:hidden;' +
    'text-overflow:ellipsis;white-space:nowrap;">' + esc(r.name) + '</span>';
  if (band) h += badge(band, band === 'Likely' ? 'gold' : 'warn');
  else if (r.matched) h += badge('matched', 'good');
  h += '</div>';
  h += '<div style="' + MONO_CSS + 'font-size:11px;">' +
    esc(kind === 'deal' ? (r.salesPerson + ' · ' + r.stage) : (r.stage + ' · ' + (r.partnerContact || 'no contact'))) +
    ' · ' + fmtDate(r.closeDate) + '</div>';
  if (r._reasons && r._reasons.length) {
    h += '<div style="font:11px ' + FONT.body + ';color:' + T.copperText + ';">' +
      esc(r._reasons.join(' · ')) + '</div>';
  }
  return h + '</div>';
}

function centrePane() {
  var canMatch = state.selDeal && state.selPig;
  var h = '<div style="flex:0 0 170px;display:flex;flex-direction:column;gap:8px;padding-top:60px;">';
  h += '<button id="m-match"' + (canMatch ? '' : ' disabled') + ' style="' + BTN_PRIMARY +
    (canMatch ? '' : 'opacity:.4;cursor:default;') + '">Match →</button>';
  if (state.selPig && !state.selDeal) {
    h += '<button id="m-create" style="' + BTN_SECONDARY + 'font-size:12px;">Create Viridian deal from this Pigment row</button>';
  }
  if (state.selDeal || state.selPig) {
    h += '<button id="m-clear" style="' + BTN_SECONDARY + '">Clear selection</button>';
  }
  h += '<div style="font:11px ' + FONT.body + ';color:' + T.secondary + ';line-height:1.5;">' +
    'Select one row on each side, then Match. Scores: account match 50, name overlap 35, ' +
    'same contact 20, close within 45 days 15, same AE 10.</div>';
  return h + '</div>';
}

function pairsStrip(allDeals) {
  var pairs = [];
  for (var i = 0; i < allDeals.length; i++) if (allDeals[i].matched) pairs.push(allDeals[i]);

  var h = '<div style="' + cardStyle(12) + 'margin-top:12px;">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" id="m-togglePairs">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';">Matched pairs (' + pairs.length + ')</div>';
  h += '<span style="color:' + T.secondary + ';">' + (state.showPairs ? '▲' : '▼') + '</span></div>';
  if (!state.showPairs) return h + '</div>';

  h += '<div style="max-height:26vh;overflow:auto;margin-top:8px;">';
  h += '<table style="width:100%;border-collapse:collapse;font:12px ' + FONT.body + ';">';
  h += '<tr><th style="' + LABEL_CSS + 'text-align:left;">Viridian</th><th style="' + LABEL_CSS + 'text-align:left;">Pigment</th>' +
    '<th style="' + LABEL_CSS + 'text-align:left;">Stage gap</th><th style="' + LABEL_CSS + 'text-align:left;">Close gap</th>' +
    '<th style="' + LABEL_CSS + 'text-align:left;">Motion</th><th></th></tr>';
  for (var p = 0; p < pairs.length; p++) {
    var d = pairs[p];
    var align = gridVal(d.name, 'ALN Stage Alignment');
    var gap = gridVal(d.name, 'ALN Close Date Gap Days');
    var mo = gridVal(d.name, 'ALN Motion Consistent');
    h += '<tr style="border-bottom:1px solid ' + T.creamMid + ';">';
    h += '<td style="padding:5px 8px 5px 0;color:' + T.ink + ';">' + esc(d.name) + '</td>';
    h += '<td style="padding:5px 8px 5px 0;color:' + T.bodyInk + ';">' + esc(d.matchedTo) + '</td>';
    h += '<td style="padding:5px 8px 5px 0;">' + (align ? badge(align, align === 'Aligned' ? 'good' : 'warn') : '—') + '</td>';
    h += '<td style="padding:5px 8px 5px 0;font-family:' + FONT.mono + ';">' +
      (isNum(gap) ? (gap > 0 ? '+' : '') + gap + 'd' : '—') + '</td>';
    h += '<td style="padding:5px 8px 5px 0;">' + (mo === true ? badge('ok', 'good') :
      (mo === false ? badge('differs', 'warn') : '—')) + '</td>';
    h += '<td style="padding:5px 0;text-align:right;"><button data-unmatch="' + esc(d.name) +
      '" style="' + BTN_SECONDARY + 'padding:4px 9px;font-size:12px;">Unmatch</button></td></tr>';
  }
  return h + '</table></div></div>';
}

function findDeal(list, name) {
  for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
  return null;
}
function findPig(list, name) {
  for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
  return null;
}

function attach() {
  var content = document.getElementById('content');
  if (!content) return;
  function bind(id, ev, fn) { var e = document.getElementById(id); if (e) on(e, ev, fn); }

  bind('m-allDeals', 'change', function (e) { state.showAllDeals = e.currentTarget.checked; render(); });
  bind('m-allPig', 'change', function (e) { state.showAllPig = e.currentTarget.checked; render(); });
  bind('m-person', 'change', function (e) { state.fPerson = e.currentTarget.value; render(); });
  bind('m-track', 'change', function (e) { state.fTrack = e.currentTarget.value; render(); });
  bind('m-segment', 'change', function (e) { state.fSegment = e.currentTarget.value; render(); });
  bind('m-clear', 'click', function () { state.selDeal = null; state.selPig = null; render(); });
  bind('m-togglePairs', 'click', function () { state.showPairs = !state.showPairs; render(); });

  var dealRows = content.querySelectorAll('[data-deal]');
  for (var i = 0; i < dealRows.length; i++) {
    on(dealRows[i], 'click', function (e) {
      var n = e.currentTarget.getAttribute('data-deal');
      state.selDeal = state.selDeal === n ? null : n;
      render();
    });
  }
  var pigRows = content.querySelectorAll('[data-pig]');
  for (var j = 0; j < pigRows.length; j++) {
    on(pigRows[j], 'click', function (e) {
      var n = e.currentTarget.getAttribute('data-pig');
      state.selPig = state.selPig === n ? null : n;
      render();
    });
  }

  bind('m-match', 'click', function () {
    if (!state.selDeal || !state.selPig) return;
    writeItem('opportunity', state.selDeal, {
      'Matched Pigment Opportunity': state.selPig,
      'Last Updated On': todayIso()
    }).then(function (res) {
      if (res.ok) { state.selDeal = null; state.selPig = null; render(); }
    });
  });

  var unmatchBtns = content.querySelectorAll('[data-unmatch]');
  for (var u = 0; u < unmatchBtns.length; u++) {
    on(unmatchBtns[u], 'click', function (e) {
      writeItem('opportunity', e.currentTarget.getAttribute('data-unmatch'), {
        'Matched Pigment Opportunity': null, 'Last Updated On': todayIso()
      });
    });
  }

  bind('m-create', 'click', openCreateFromPigment);
}

// "Create from Pigment": pre-fills the shared New deal form, then writes the
// match in the same action so the pair is linked on save.
function openCreateFromPigment() {
  var pig = findPig(pigRecords(), state.selPig);
  if (!pig) return;

  var suggestedUseCase = suggestUseCase(pig.name);
  var motion = suggestMotion(pig);
  var stage = suggestStage(pig.stage);
  var person = pig.partnerContact || (state.lists.salesPerson[0] ? state.lists.salesPerson[0].Name : '');

  var prefill = {
    'nd-name': pig.account + (suggestedUseCase ? ' – ' + suggestedUseCase : ''),
    'nd-person': person,
    'nd-stage': stage,
    'nd-close': pig.closeDate,
    'nd-useCase': suggestedUseCase,
    'nd-motion': motion,
    'nd-size': '',
    'nd-ae': pig.pigmentAE,
    'nd-notes': 'Created from Pigment row: ' + pig.name
  };

  var mod = openModal(560,
    '<div style="font:700 18px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:2px;">Create Viridian deal</div>' +
    '<div style="' + MONO_CSS + 'margin-bottom:14px;">from ' + esc(pig.name) + '</div>' +
    newDealFormHtml(state.lists, prefill) +
    '<div style="font:12px ' + FONT.body + ';color:' + T.secondary + ';margin-top:10px;">' +
    'Deal size is deliberately blank: pick the band before saving. The match is written with the deal.</div>');

  // Deal size must be chosen explicitly, so clear whatever defaulted in.
  var sizeEl = document.getElementById('nd-size');
  if (sizeEl) {
    var opt = document.createElement('option');
    opt.value = ''; opt.textContent = 'Choose a size...';
    sizeEl.insertBefore(opt, sizeEl.firstChild);
    sizeEl.value = '';
  }

  var names = [];
  for (var i = 0; i < state.items.length; i++) names.push(state.items[i]['Opportunity Name']);

  on(document.getElementById('nd-create'), 'click', function () {
    var sizeNow = document.getElementById('nd-size');
    if (sizeNow && !sizeNow.value) {
      var err = document.getElementById('nd-error');
      if (err) err.textContent = 'Choose a deal size.';
      return;
    }
    ndSubmit(names, function (created) {
      writeItem('opportunity', created, {
        'Matched Pigment Opportunity': pig.name, 'Last Updated On': todayIso()
      }).then(function () {
        closeModal(mod.back);
        state.selPig = null;
        render();
      });
    });
  });
  on(document.getElementById('nd-reset'), 'click', function () { closeModal(mod.back); });
}

function suggestUseCase(pigName) {
  var m = /\[([^\]]*)\]/.exec(pigName || '');
  var codes = m ? m[1] : '';
  if (!codes) {
    // The current export writes codes inline rather than in brackets.
    codes = pigName || '';
  }
  var priority = ['FP&A', 'Consolidation', 'Supply Chain', 'SPM'];
  var byCode = {};
  for (var i = 0; i < state.lists.useCase.length; i++) {
    var uc = state.lists.useCase[i];
    var list = String(uc['CRM Codes'] || '').split(',');
    for (var j = 0; j < list.length; j++) {
      var c = list[j].trim().toUpperCase();
      if (c) byCode[c] = uc.Name;
    }
  }
  var found = {};
  var tokens = codes.toUpperCase().split(/[^A-Z&]+/);
  for (var t = 0; t < tokens.length; t++) {
    if (byCode[tokens[t]]) found[byCode[tokens[t]]] = true;
  }
  for (var p = 0; p < priority.length; p++) if (found[priority[p]]) return priority[p];
  for (var k in found) return k;
  return 'Other';
}

function suggestMotion(pig) {
  var name = String(pig.name || '');
  if (/Amendment|Early Renewal/i.test(name)) return 'Services Only';
  var attach = String(pig.attach || '');
  if (/Sourced/i.test(attach)) return 'Sourced';
  if (/^Deployed$/i.test(attach)) return 'Services Only';
  return 'Influenced';
}

function suggestStage(pigStage) {
  // Mirrors the Pigment Stage -> Stage defaults in section 10.11; Admin can
  // change the mapping, which the alignment metrics then use.
  var map = {
    'S0 - SQO': 'Holding pool', 'S1 - Discover': 'First meeting', 'S2 - Build value': 'Qualified',
    'S3 - Win the analyst': 'Demo', 'S4 - Validate': 'Scoping', 'S5 - Contracting': 'Contracting',
    'U1 - Connect': 'Qualified', 'U2 - Validate': 'Scoping', 'U3 - Contracting': 'Contracting',
    'R3 - Contracting': 'Contracting', 'Closed Won': 'Closed Won', 'Closed Lost': 'Closed Lost'
  };
  return map[pigStage] || 'Holding pool';
}

function boot() {
  installBaseStyles();
  root.innerHTML = shellHtml(SCREEN, null, loadingBlock());
  var redraw = debounce(render, 16);
  function fail(e) { state.error = (e && e.message) ? e.message : 'Subscription failed'; render(); }

  subscribeView('vwPipelineGrid', function (d) {
    state.grid = d; state.idx = columnIndex(d); redraw();
  }, fail);
  subscribeView('vwImportSummary', function (d) { state.importSummary = d; redraw(); }, fail);
  subscribeView('vwAssumptions', function (d) { state.assumptions = d; redraw(); }, fail);

  subscribeList('opportunity', function (items, partial) {
    state.items = items; state.partial = state.partial || partial; redraw();
  }, fail);
  subscribeList('pigmentPipeline', function (items, partial) {
    state.pigment = items; state.partial = state.partial || partial; redraw();
  }, fail);

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
