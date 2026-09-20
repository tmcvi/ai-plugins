// Frame 6 - Admin (brief section 7.4). Tabs: Assumptions, S-curve profiles,
// Reference lists, Import. Every assumption in the app is edited here and
// nowhere else.

var SCREEN = 'Admin';
var TABS = ['Assumptions', 'S-curve profiles', 'Reference lists', 'Import'];

var state = {
  tab: 'Assumptions',
  assumptions: null,     // VW Assumptions (rows = Deal Size)
  scalars: null,         // VW Scalar Assumptions
  commission: null,      // VW Commission Rates (rows = Sales Motion)
  winRates: null,        // VW Win Rates (rows = Stage)
  profiles: null,        // VW Standard Profiles (rows = Project Week, cols = Deal Size)
  importSummary: null,
  pigmentStages: [],
  attachTypes: [],
  useCases: [],
  people: [],
  aes: [],
  stages: [],
  partial: false,
  error: null,
  curveSteepness: 6
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

function summaryValue(name) { return dsValue(state.importSummary, name); }

function tabBar() {
  var h = '<div style="display:flex;gap:4px;border-bottom:1px solid ' + T.hairline + ';margin-bottom:18px;">';
  for (var i = 0; i < TABS.length; i++) {
    var on = TABS[i] === state.tab;
    h += '<div data-tab="' + esc(TABS[i]) + '" tabindex="0" style="cursor:pointer;padding:9px 14px;' +
      'font:' + (on ? '600 ' : '') + '13px ' + FONT.body + ';color:' + (on ? T.violet : T.secondary) + ';' +
      'border-bottom:2px solid ' + (on ? T.gold : 'transparent') + ';">' + esc(TABS[i]) + '</div>';
  }
  return h + '</div>';
}

// A numeric cell that writes through editValue on blur.
function inputCell(metricAlias, coordsJson, value, fmt, width) {
  var shown = value === null || value === undefined ? '' :
    (fmt === 'pct' ? (Math.round(value * 1000) / 10) : value);
  return '<input data-metric="' + esc(metricAlias) + '" data-coords="' + esc(coordsJson) +
    '" data-fmt="' + esc(fmt || 'num') + '" data-prev="' + esc(shown) + '" value="' + esc(shown) +
    '" style="' + INPUT_CSS + 'width:' + (width || 110) + 'px;text-align:right;' +
    (fmt === 'pct' ? 'padding-right:20px;' : '') + '">' +
    (fmt === 'pct' ? '<span style="margin-left:-16px;color:' + T.muted + ';font:12px ' + FONT.body + ';">%</span>' : '');
}

function rowsOf(data) {
  var out = [];
  if (!data) return out;
  for (var r = 0; r < data.labels.rows.length; r++) out.push(labelName(data.labels.rows[r]));
  return out;
}

function renderAssumptions() {
  var d = state.assumptions;
  if (!d) return loadingBlock();
  var idx = columnIndex(d);
  var sizes = rowsOf(d);

  var cols = [
    { key: 'ASM Licence ARR $', label: 'Licence ARR $', alias: 'asmLicence', fmt: 'num' },
    { key: 'ASM Standard Days', label: 'Standard days', alias: 'asmDays', fmt: 'num' },
    { key: 'ASM Project Duration Weeks', label: 'Duration weeks', alias: 'asmDuration', fmt: 'num' },
    { key: 'ASM Start Lag Weeks', label: 'Start lag weeks', alias: 'asmLag', fmt: 'num' }
  ];

  var h = '<div style="' + cardStyle() + 'margin-bottom:16px;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:12px;">By deal size</div>';
  h += '<table style="border-collapse:collapse;font:13px ' + FONT.body + ';">';
  h += '<tr><th style="text-align:left;padding:6px 12px 6px 0;' + TH_LABEL_CSS + '">Deal size</th>';
  for (var c = 0; c < cols.length; c++) {
    h += '<th style="text-align:right;padding:6px 12px;' + TH_LABEL_CSS + '">' + esc(cols[c].label) + '</th>';
  }
  h += '<th style="text-align:left;padding:6px 12px;' + TH_LABEL_CSS + '">Profile check</th></tr>';

  for (var r = 0; r < sizes.length; r++) {
    h += '<tr><td style="padding:5px 12px 5px 0;font-weight:600;color:' + T.ink + ';">' + esc(sizes[r]) + '</td>';
    for (var k = 0; k < cols.length; k++) {
      var v = idx[cols[k].key] === undefined ? null : cell(d, idx[cols[k].key], r);
      var coords = JSON.stringify({ dealSize: sizes[r] });
      h += '<td style="padding:5px 12px;text-align:right;">' +
        inputCell(cols[k].alias, coords, v, cols[k].fmt) + '</td>';
    }
    var sums = idx['TST Profile Sums'] === undefined ? null : cell(d, idx['TST Profile Sums'], r);
    var zero = idx['TST Profile Zero Beyond Duration'] === undefined ? null : cell(d, idx['TST Profile Zero Beyond Duration'], r);
    var ok = sums === true && zero === true;
    h += '<td style="padding:5px 12px;">' + badge(ok ? 'Valid' : 'Check', ok ? 'good' : 'bad') + '</td></tr>';
  }
  h += '</table></div>';

  // Scalars
  var sc = state.scalars;
  h += '<div style="' + cardStyle() + 'margin-bottom:16px;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:12px;">Scalar assumptions</div>';
  h += '<div style="display:flex;gap:28px;flex-wrap:wrap;">';
  var scalarDefs = [
    { key: 'ASM Standard Day Rate £', label: 'Standard day rate £', alias: 'asmRate' },
    { key: 'ASM Hours per Day', label: 'Hours per day', alias: 'asmHours' },
    { key: 'ASM FX Rate USD to GBP', label: 'FX rate USD to GBP', alias: 'asmFx' }
  ];
  for (var s = 0; s < scalarDefs.length; s++) {
    // One row, one column per metric (D18), so read it the way every other
    // scalar reader does rather than scanning the row labels.
    var val = dsValue(sc, scalarDefs[s].key);
    h += '<div><label style="' + LABEL_CSS + '">' + esc(scalarDefs[s].label) + '</label>' +
      inputCell(scalarDefs[s].alias, '{}', val, 'num', 130) +
      '<div style="' + MONO_CSS + 'margin-top:4px;">applies to every deal</div></div>';
  }
  h += '</div></div>';

  // Commission by Sales Motion
  h += '<div style="display:flex;gap:16px;flex-wrap:wrap;">';
  h += '<div style="' + cardStyle() + 'flex:1 1 300px;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:12px;">Commission rate by sales motion</div>';
  h += gridOfRates(state.commission, 'asmCommission', 'salesMotion');
  h += '</div>';

  h += '<div style="' + cardStyle() + 'flex:1 1 300px;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:12px;">Win rate by stage</div>';
  h += gridOfRates(state.winRates, 'asmWin', 'stage', true);
  h += '</div></div>';

  return h;
}

function gridOfRates(d, alias, coordKey, lockClosed) {
  if (!d) return loadingBlock();
  var h = '<table style="border-collapse:collapse;font:13px ' + FONT.body + ';width:100%;">';
  for (var r = 0; r < d.labels.rows.length; r++) {
    var name = labelName(d.labels.rows[r]);
    var v = cell(d, 0, r);
    var locked = lockClosed && (name === 'Closed Won' || name === 'Closed Lost');
    h += '<tr><td style="padding:5px 0;color:' + T.bodyInk + ';">' + esc(name) + '</td>' +
      '<td style="padding:5px 0;text-align:right;">';
    if (locked) {
      h += '<span style="font:600 13px ' + FONT.mono + ';color:' + T.muted + ';">' +
        (name === 'Closed Won' ? '100%' : '0%') + ' <span style="font-size:11px;">locked</span></span>';
    } else {
      h += inputCell(alias, JSON.stringify(makeCoord(coordKey, name)), v, 'pct', 90);
    }
    h += '</td></tr>';
  }
  return h + '</table>';
}

function makeCoord(key, value) { var o = {}; o[key] = value; return o; }

function renderProfiles() {
  var d = state.profiles;
  if (!d) return loadingBlock();
  var sizes = [];
  for (var c = 0; c < d.labels.columns.length; c++) sizes.push(labelName(d.labels.columns[c]));

  var h = '<div style="' + cardStyle() + 'margin-bottom:16px;">';
  h += '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';">Regenerate from curve</div>';
  h += '<label style="' + LABEL_CSS + 'margin:0;">Steepness</label>';
  h += '<input id="steep" value="' + esc(state.curveSteepness) + '" style="' + INPUT_CSS + 'width:70px;text-align:right;">';
  for (var s = 0; s < sizes.length; s++) {
    h += '<button data-regen="' + esc(sizes[s]) + '" style="' + BTN_SECONDARY + '">Regenerate ' + esc(sizes[s]) + '</button>';
  }
  h += '</div>';
  h += '<div style="font:12px ' + FONT.body + ';color:' + T.secondary + ';margin-top:8px;">' +
    'Recomputes the S-curve for the chosen size from its duration, rounds to 0.1% and writes every week. ' +
    'The residue lands on the final week so the row totals exactly 100%.</div>';
  h += '</div>';

  // One chart + editable column per size
  h += '<div style="display:flex;gap:16px;flex-wrap:wrap;">';
  for (var si = 0; si < sizes.length; si++) {
    var vals = [], tot = 0;
    for (var r = 0; r < d.labels.rows.length; r++) {
      var v = cell(d, si, r);
      vals.push(isNum(v) ? v : 0);
      tot += isNum(v) ? v : 0;
    }
    h += '<div style="' + cardStyle() + 'flex:1 1 320px;min-width:300px;">';
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">';
    h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';">' + esc(sizes[si]) + '</div>';
    h += '<div style="font:600 13px ' + FONT.mono + ';color:' + (Math.abs(tot - 1) < 0.005 ? T.green : T.red) + ';">' +
      pct(tot, 1) + '</div></div>';
    h += barsSvg(vals, 300, 70);
    h += '<div style="max-height:190px;overflow:auto;margin-top:10px;">';
    h += '<table style="width:100%;border-collapse:collapse;font:12px ' + FONT.body + ';">';
    for (var w = 0; w < d.labels.rows.length; w++) {
      var wn = labelName(d.labels.rows[w]);
      var cv = cell(d, si, w);
      if (!isNum(cv) || cv === 0) {
        // keep the grid short: only show weeks in play plus one trailing blank
        if (w > 0 && !isNum(cell(d, si, w - 1))) continue;
        if (w > 0 && cell(d, si, w - 1) === 0) continue;
      }
      h += '<tr><td style="padding:2px 6px 2px 0;color:' + T.muted + ';font-family:' + FONT.mono + ';">' +
        esc(wn) + '</td><td style="padding:2px 0;text-align:right;">' +
        inputCell('asmProfile', JSON.stringify({ dealSize: sizes[si], projectWeek: wn }), cv, 'pct', 80) +
        '</td></tr>';
    }
    h += '</table></div></div>';
  }
  h += '</div>';
  return h;
}

function renderReference() {
  var h = '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">';

  // Pigment Stage mapping - editable via editItem on the Pigment Stage list
  h += '<div style="' + cardStyle() + 'flex:1 1 420px;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:4px;">Pigment stage mapping</div>';
  h += '<div style="font:12px ' + FONT.body + ';color:' + T.secondary + ';margin-bottom:12px;">' +
    'Unmapped stages show as a to-do on the Import tab and leave the stage gap blank.</div>';
  h += '<table style="width:100%;border-collapse:collapse;font:13px ' + FONT.body + ';">';
  for (var i = 0; i < state.pigmentStages.length; i++) {
    var ps = state.pigmentStages[i];
    var mapped = ps['Maps To Stage'];
    h += '<tr><td style="padding:5px 8px 5px 0;color:' + T.bodyInk + ';white-space:nowrap;">' + esc(ps.Name) +
      '</td><td style="padding:5px 8px;color:' + T.muted + ';font:11px ' + FONT.mono + ';">' + esc(ps.Track || '') + '</td>' +
      '<td style="padding:5px 0;">' + stageSelect('mapStage', ps.Name, mapped) + '</td></tr>';
  }
  h += '</table></div>';

  // Partner attach type mapping (read-only reference)
  h += '<div style="' + cardStyle() + 'flex:1 1 300px;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:12px;">Partner attach type</div>';
  h += '<table style="width:100%;border-collapse:collapse;font:13px ' + FONT.body + ';">';
  for (var a = 0; a < state.attachTypes.length; a++) {
    var at = state.attachTypes[a];
    h += '<tr><td style="padding:5px 8px 5px 0;color:' + T.bodyInk + ';">' + esc(at.Name) + '</td>' +
      '<td style="padding:5px 0;text-align:right;">' + badge(at['Maps To Sales Motion'] || 'unmapped',
        at['Maps To Sales Motion'] ? 'gold' : 'bad') + '</td></tr>';
  }
  h += '</table></div>';

  // Use case codes
  h += '<div style="' + cardStyle() + 'flex:1 1 280px;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:12px;">Use case CRM codes</div>';
  h += '<table style="width:100%;border-collapse:collapse;font:13px ' + FONT.body + ';">';
  for (var u = 0; u < state.useCases.length; u++) {
    h += '<tr><td style="padding:5px 8px 5px 0;color:' + T.bodyInk + ';">' + esc(state.useCases[u].Name) + '</td>' +
      '<td style="padding:5px 0;text-align:right;font:12px ' + FONT.mono + ';color:' + T.muted + ';">' +
      esc(state.useCases[u]['CRM Codes'] || '') + '</td></tr>';
  }
  h += '</table></div>';

  // Sales people - email is what resolves "My deals"
  h += '<div style="' + cardStyle() + 'flex:1 1 380px;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:4px;">Sales people</div>';
  h += '<div style="font:12px ' + FONT.body + ';color:' + T.secondary + ';margin-bottom:12px;">' +
    'Email maps the person to their Pigment login. CRM name is the spelling Pigment uses in its export.</div>';
  h += '<table style="width:100%;border-collapse:collapse;font:13px ' + FONT.body + ';">';
  h += '<tr><th style="' + TH_LABEL_CSS + 'text-align:left;">Name</th><th style="' + TH_LABEL_CSS + 'text-align:left;">Email</th>' +
    '<th style="' + TH_LABEL_CSS + 'text-align:left;">CRM name</th></tr>';
  for (var p = 0; p < state.people.length; p++) {
    var pr = state.people[p];
    h += '<tr><td style="padding:4px 8px 4px 0;color:' + T.bodyInk + ';">' + esc(pr.Name) + '</td>' +
      '<td style="padding:4px 8px 4px 0;"><input data-person="' + esc(pr.Name) + '" data-prop="Email" value="' +
      esc(pr.Email || '') + '" data-prev="' + esc(pr.Email || '') + '" style="' + INPUT_CSS + 'width:200px;"></td>' +
      '<td style="padding:4px 0;"><input data-person="' + esc(pr.Name) + '" data-prop="CRM Name" value="' +
      esc(pr['CRM Name'] || '') + '" data-prev="' + esc(pr['CRM Name'] || '') + '" style="' + INPUT_CSS + 'width:170px;"></td></tr>';
  }
  h += '</table></div>';

  // Pigment AEs
  h += '<div style="' + cardStyle() + 'flex:1 1 300px;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:12px;">Pigment AEs (' +
    state.aes.length + ')</div>';
  h += '<div style="max-height:320px;overflow:auto;"><table style="width:100%;border-collapse:collapse;font:13px ' + FONT.body + ';">';
  for (var ae = 0; ae < state.aes.length; ae++) {
    var a2 = state.aes[ae];
    h += '<tr><td style="padding:4px 0;color:' + T.bodyInk + ';">' + esc(a2.Name) + '</td>' +
      '<td style="padding:4px 0;text-align:right;"><input type="checkbox" data-ae="' + esc(a2.Name) + '"' +
      (a2.Active === true || a2.Active === 'true' ? ' checked' : '') + '></td></tr>';
  }
  h += '</table></div></div>';

  return h + '</div>';
}

function stageSelect(kind, key, current) {
  var h = '<select data-' + kind + '="' + esc(key) + '" style="' + INPUT_CSS + 'width:160px;">';
  h += '<option value="">(unmapped)</option>';
  for (var i = 0; i < state.stages.length; i++) {
    var n = state.stages[i].Name;
    h += '<option value="' + esc(n) + '"' + (n === current ? ' selected' : '') + '>' + esc(n) + '</option>';
  }
  return h + '</select>';
}

function renderImport() {
  var rows = state.pigmentStages.filter(function (s) { return !s['Maps To Stage']; });

  var h = '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">';

  h += '<div style="' + cardStyle() + 'flex:1 1 320px;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:12px;">Last load</div>';
  h += kv('Load date', fmtDate(loadDate()));
  h += kv('Rows held', summaryValue('PIG Rows Total'));
  h += kv('In latest load', summaryValue('PIG Rows In Latest Load'));
  h += kv('Dropped from Pigment', summaryValue('PIG Rows Dropped'));
  h += kv('Unmapped stages', summaryValue('PIG Unmapped Stages'));
  var rec = summaryValue('TST Phasing Reconciles All');
  h += '<div style="display:flex;justify-content:space-between;padding:5px 0;">' +
    '<span style="color:' + T.secondary + ';font:13px ' + FONT.body + ';">Phasing reconciles</span>' +
    badge(rec === true ? 'Yes' : 'No', rec === true ? 'good' : 'bad') + '</div>';
  h += '</div>';

  h += '<div style="' + cardStyle() + 'flex:1 1 340px;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:8px;">Unmapped stages</div>';
  if (!rows.length) {
    h += '<div style="font:13px ' + FONT.body + ';color:' + T.green + ';">Every Pigment stage is mapped.</div>';
  } else {
    h += '<div style="font:12px ' + FONT.body + ';color:' + T.secondary + ';margin-bottom:8px;">' +
      'Map these on the Reference lists tab. Until then their deals show no stage gap.</div>';
    for (var i = 0; i < rows.length; i++) {
      h += '<div style="padding:3px 0;">' + badge(rows[i].Name, 'bad') + '</div>';
    }
  }
  h += '</div>';

  h += '<div style="' + cardStyle() + 'flex:2 1 460px;">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:8px;">Weekly load checklist</div>';
  h += '<ol style="margin:0;padding-left:18px;font:13px ' + FONT.body + ';color:' + T.bodyInk + ';line-height:1.7;">';
  h += '<li>Open the weekly partner report from Pigment and save the sheet as CSV.</li>';
  h += '<li>Rename the first column to <span style="font-family:' + FONT.mono + ';">Pigment Opportunity Name</span>.</li>';
  h += '<li>Delete every grouping row: any row whose <span style="font-family:' + FONT.mono + ';">Stage</span> cell is blank ' +
    '(the quarter and attach-group subtotals).</li>';
  h += '<li>Add a <span style="font-family:' + FONT.mono + ';">Load Date</span> column and set every row to the date you are loading.</li>';
  h += '<li>Run the saved import <span style="font-family:' + FONT.mono + ';">Pigment Pipeline weekly</span> in ' +
    'update-or-create mode keyed on the name, with "create missing items" on.</li>';
  h += '<li>Come back to this tab: check the row counts, then clear any unmapped stages.</li>';
  h += '</ol>';
  h += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid ' + T.hairline + ';font:12px ' + FONT.body +
    ';color:' + T.secondary + ';">Rows that disappear from a later export are never deleted. They stay, flagged as ' +
    'dropped, so existing matches survive a rename.</div>';
  h += '</div>';

  return h + '</div>';
}

function kv(label, value) {
  return '<div style="display:flex;justify-content:space-between;padding:5px 0;">' +
    '<span style="color:' + T.secondary + ';font:13px ' + FONT.body + ';">' + esc(label) + '</span>' +
    '<span style="color:' + T.ink + ';font:600 13px ' + FONT.mono + ';">' +
    esc(value === null || value === undefined ? '-' : value) + '</span></div>';
}

function render() {
  if (state.error) { root.innerHTML = shellHtml(SCREEN, null, errorBlock(state.error)); return; }
  var body = tabBar();
  if (state.partial) body += partialBanner();
  if (state.tab === 'Assumptions') body += renderAssumptions();
  else if (state.tab === 'S-curve profiles') body += renderProfiles();
  else if (state.tab === 'Reference lists') body += renderReference();
  else body += renderImport();

  root.innerHTML = shellHtml(SCREEN, loadDate(),
    pageTitle('Admin', 'Every assumption in the app lives here. Nothing is hard-coded in a formula.') + body);
  attach();
}

function attach() {
  var content = document.getElementById('content');
  if (!content) return;

  var tabs = content.querySelectorAll('[data-tab]');
  for (var i = 0; i < tabs.length; i++) {
    on(tabs[i], 'click', function (e) {
      state.tab = e.currentTarget.getAttribute('data-tab');
      render();
    });
  }

  var inputs = content.querySelectorAll('input[data-metric]');
  for (var j = 0; j < inputs.length; j++) {
    on(inputs[j], 'blur', onMetricBlur);
    on(inputs[j], 'keydown', function (e) { if (e.key === 'Enter') e.currentTarget.blur(); });
  }

  var sels = content.querySelectorAll('select[data-mapStage]');
  for (var k = 0; k < sels.length; k++) {
    on(sels[k], 'change', function (e) {
      var item = e.currentTarget.getAttribute('data-mapStage');
      var val = e.currentTarget.value;
      writeItem('pigmentStage', item, { 'Maps To Stage': val === '' ? null : val });
    });
  }

  var people = content.querySelectorAll('input[data-person]');
  for (var p = 0; p < people.length; p++) {
    on(people[p], 'blur', function (e) {
      var t = e.currentTarget;
      var prev = t.getAttribute('data-prev');
      if (t.value === prev) return;
      var props = {};
      props[t.getAttribute('data-prop')] = t.value === '' ? null : t.value;
      writeItem('salesPerson', t.getAttribute('data-person'), props).then(function (res) {
        if (!res.ok) t.value = prev; else t.setAttribute('data-prev', t.value);
      });
    });
  }

  var aes = content.querySelectorAll('input[data-ae]');
  for (var a = 0; a < aes.length; a++) {
    on(aes[a], 'change', function (e) {
      var t = e.currentTarget;
      writeItem('pigmentAE', t.getAttribute('data-ae'), { Active: t.checked });
    });
  }

  var regen = content.querySelectorAll('[data-regen]');
  for (var g = 0; g < regen.length; g++) {
    on(regen[g], 'click', function (e) { regenerate(e.currentTarget.getAttribute('data-regen')); });
  }
}

function onMetricBlur(e) {
  var t = e.currentTarget;
  var prev = t.getAttribute('data-prev');
  if (t.value === prev) return;

  var raw = t.value.trim();
  var fmt = t.getAttribute('data-fmt');
  var value;

  if (raw === '') {
    value = null;
  } else {
    var n = parseNumberInput(raw);
    if (n === null || isNaN(n)) { toast('Enter a number', true); t.value = prev; return; }
    if (n < 0) { toast('Value cannot be negative', true); t.value = prev; return; }
    value = fmt === 'pct' ? n / 100 : n;
  }

  var coords = JSON.parse(t.getAttribute('data-coords'));
  writeValue(t.getAttribute('data-metric'), coords, value).then(function (res) {
    if (!res.ok) t.value = prev; else t.setAttribute('data-prev', t.value);
  });
}

function regenerate(size) {
  var steepEl = document.getElementById('steep');
  var k = parseNumberInput(steepEl ? steepEl.value : '6');
  if (k === null || isNaN(k) || k <= 0) { toast('Steepness must be a positive number', true); return; }
  state.curveSteepness = k;

  // Duration comes from the assumption grid, so the curve always matches it.
  var d = state.assumptions;
  var idx = columnIndex(d);
  var dur = null;
  for (var r = 0; r < d.labels.rows.length; r++) {
    if (labelName(d.labels.rows[r]) === size) dur = cell(d, idx['ASM Project Duration Weeks'], r);
  }
  if (!isNum(dur) || dur < 1) { toast('Set a duration for ' + size + ' first', true); return; }

  var vals = sCurve(dur, k, 52);
  var writes = [];
  for (var w = 0; w < vals.length; w++) {
    writes.push(SDK.editValue('asmProfile',
      { dealSize: size, projectWeek: 'W' + (w + 1 < 10 ? '0' : '') + (w + 1) }, vals[w]));
  }
  toast('Writing ' + vals.length + ' weeks for ' + size);
  Promise.all(writes).then(function () {
    toast(size + ' profile regenerated');
  }).catch(function (err) {
    toast((err && err.message) ? err.message : 'Regenerate failed', true);
  });
}

function boot() {
  installBaseStyles();
  root.innerHTML = shellHtml(SCREEN, null, loadingBlock());

  var redraw = debounce(render, 16);
  function fail(e) { state.error = (e && e.message) ? e.message : 'Subscription failed'; render(); }

  subscribeView('vwAssumptions', function (d) { state.assumptions = d; redraw(); }, fail);
  subscribeView('vwScalarAssumptions', function (d) { state.scalars = d; redraw(); }, fail);
  subscribeView('vwCommissionRates', function (d) { state.commission = d; redraw(); }, fail);
  subscribeView('vwWinRates', function (d) { state.winRates = d; redraw(); }, fail);
  subscribeView('vwStandardProfiles', function (d) { state.profiles = d; redraw(); }, fail);
  subscribeView('vwImportSummary', function (d) { state.importSummary = d; redraw(); }, fail);

  // The mapping tabs read Order, Track, Maps To Stage and Maps To Sales
  // Motion, so those lists arrive through their property data sources; item
  // subscriptions carry names only (D17).
  subscribeView('vwPigmentStageProps', function (d) {
    state.pigmentStages = sortByOrder(listFromProps(d));
    state.partial = state.partial || !!d.truncated;
    redraw();
  }, fail);
  subscribeView('vwAttachProps', function (d) {
    state.attachTypes = listFromProps(d); redraw();
  }, fail);
  subscribeView('vwStageProps', function (d) {
    state.stages = sortByOrder(listFromProps(d)); redraw();
  }, fail);
  subscribeView('vwUseCaseProps', function (d) {
    state.useCases = listFromProps(d); redraw();
  }, fail);
  subscribeView('vwSalesPersonProps', function (d) {
    state.people = listFromProps(d); redraw();
  }, fail);
  subscribeView('vwPigmentAEProps', function (d) {
    state.aes = listFromProps(d); redraw();
  }, fail);

  onViewportResize(render);
}
