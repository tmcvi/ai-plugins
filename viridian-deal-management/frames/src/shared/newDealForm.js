// Shared New deal form (brief section 7.4 Frame 3). Used full-page by the
// New deal Frame and as a modal by the Matching Frame's "Create from Pigment".

var NDF = { prefill: null, busy: false, error: null };

var ND_FIELDS = [
  { id: 'nd-name',       label: 'Opportunity name', type: 'text' },
  { id: 'nd-person',     label: 'Sales person',     type: 'list', list: 'salesPerson' },
  { id: 'nd-stage',      label: 'Stage',            type: 'list', list: 'stage' },
  { id: 'nd-close',      label: 'Expected close date', type: 'date' },
  { id: 'nd-useCase',    label: 'Use case',         type: 'list', list: 'useCase' },
  { id: 'nd-motion',     label: 'Sales motion',     type: 'list', list: 'salesMotion' },
  { id: 'nd-size',       label: 'Expected deal size', type: 'list', list: 'dealSize' },
  { id: 'nd-ae',         label: 'Pigment AE',       type: 'list', list: 'pigmentAE', optional: true },
  { id: 'nd-notes',      label: 'Notes',            type: 'textarea', optional: true }
];

function newDealFormHtml(lists, prefill) {
  prefill = prefill || {};
  var h = '<div style="display:flex;flex-direction:column;gap:12px;">';
  for (var i = 0; i < ND_FIELDS.length; i++) {
    var f = ND_FIELDS[i];
    var val = prefill[f.id] || '';
    h += '<div><label style="' + LABEL_CSS + '">' + esc(f.label) +
      (f.optional ? ' <span style="color:' + T.muted + ';text-transform:none;font-weight:400;">optional</span>' : '') +
      '</label>';
    if (f.type === 'text') {
      h += '<input id="' + f.id + '" value="' + esc(val) + '" autofocus style="' + INPUT_CSS + '">';
    } else if (f.type === 'date') {
      h += '<input id="' + f.id + '" type="date" value="' + esc(val || defaultCloseDate()) +
        '" style="' + INPUT_CSS + '">';
    } else if (f.type === 'textarea') {
      h += '<textarea id="' + f.id + '" rows="3" style="' + INPUT_CSS + 'resize:vertical;">' +
        esc(val) + '</textarea>';
    } else {
      var items = lists[f.list] || [];
      var def = val || ndDefault(f.list, items);
      h += '<select id="' + f.id + '" style="' + INPUT_CSS + '">';
      if (f.optional) h += '<option value="">(none)</option>';
      for (var j = 0; j < items.length; j++) {
        var n = items[j].Name;
        h += '<option value="' + esc(n) + '"' + (n === def ? ' selected' : '') + '>' + esc(n) + '</option>';
      }
      h += '</select>';
    }
    h += '</div>';
  }
  h += '<div id="nd-error" style="font:13px ' + FONT.body + ';color:' + T.red + ';min-height:18px;"></div>';
  h += '<div style="display:flex;gap:8px;">';
  h += '<button id="nd-create" style="' + BTN_PRIMARY + '">Create deal</button>';
  h += '<button id="nd-reset" style="' + BTN_SECONDARY + '">Clear</button>';
  h += '</div></div>';
  return h;
}

function ndDefault(list, items) {
  if (list === 'stage') return 'Holding pool';
  return items.length ? items[0].Name : '';
}

function ndRead() {
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  return {
    name: val('nd-name'),
    person: val('nd-person'),
    stage: val('nd-stage'),
    close: val('nd-close'),
    useCase: val('nd-useCase'),
    motion: val('nd-motion'),
    size: val('nd-size'),
    ae: val('nd-ae'),
    notes: val('nd-notes')
  };
}

// Validates, checks the name is unique client-side, then writes one item.
// existingNames: array of current Opportunity Names.
function ndSubmit(existingNames, onSuccess) {
  var v = ndRead();
  var errEl = document.getElementById('nd-error');
  function fail(msg) { if (errEl) errEl.textContent = msg; }

  if (!v.name) return fail('Give the deal a name.');
  for (var i = 0; i < existingNames.length; i++) {
    if (existingNames[i].toLowerCase() === v.name.toLowerCase()) {
      return fail('A deal called "' + v.name + '" already exists.');
    }
  }
  if (!v.close) return fail('Pick an expected close date.');
  if (!v.person || !v.stage || !v.useCase || !v.motion || !v.size) {
    return fail('Sales person, stage, use case, sales motion and deal size are all required.');
  }
  fail('');

  var today = todayIso();
  var values = {
    'Opportunity Name': v.name,
    'Sales Person': v.person,
    'Stage': v.stage,
    'Expected Close Date': v.close,
    'Use Case': v.useCase,
    'Sales Motion': v.motion,
    'Deal Size': v.size,
    'Created On': today,
    'Last Updated On': today
  };
  if (v.ae) values['Pigment AE'] = v.ae;
  if (v.notes) values.Notes = v.notes;

  var btn = document.getElementById('nd-create');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

  createItem('opportunity', values).then(function (res) {
    if (btn) { btn.disabled = false; btn.textContent = 'Create deal'; }
    if (!res.ok) return fail(res.message);
    toast('Deal created');
    if (onSuccess) onSuccess(v.name);
  });
}

// Live economics preview from the assumptions View (brief section 7.4 Frame 3).
function ndPreviewHtml(assumptions, rates, size, stage, motion, closeDate, standardRate, fx) {
  if (!assumptions) return loadingBlock();
  var idx = columnIndex(assumptions);
  var row = null;
  for (var r = 0; r < assumptions.labels.rows.length; r++) {
    if (labelName(assumptions.labels.rows[r]) === size) row = r;
  }
  if (row === null) return '<div style="font:13px ' + FONT.body + ';color:' + T.muted + ';">Pick a deal size.</div>';

  function a(k) { return idx[k] === undefined ? null : cell(assumptions, idx[k], row); }
  var arr = a('ASM Licence ARR $');
  var std = a('ASM Standard Days');
  var dur = a('ASM Project Duration Weeks');
  var lag = a('ASM Start Lag Weeks');
  var services = isNum(std) && isNum(standardRate) ? std * standardRate : null;
  var licGbp = isNum(arr) && isNum(fx) ? arr * fx : null;
  var commRate = rates ? rates[motion] : null;
  var comm = isNum(licGbp) && isNum(commRate) ? licGbp * commRate : null;

  var h = '<div style="' + cardStyle() + '">';
  h += '<div style="font:700 15px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:10px;">Economics preview</div>';
  h += prevRow('Licence ARR', moneyUsd(arr) + (isNum(licGbp) ? '  (' + money(licGbp) + ')' : ''));
  h += prevRow('Commission', money(comm) + (isNum(commRate) ? '  at ' + pct(commRate, 1) : ''));
  h += prevRow('Standard days', days(std));
  h += prevRow('Day rate', money(standardRate));
  h += '<div style="border-top:1px solid ' + T.hairline + ';margin:8px 0;padding-top:8px;">';
  h += '<div style="font:700 22px ' + FONT.display + ';color:' + T.ink + ';">' + money(services) + '</div>';
  h += '<div style="font:12px ' + FONT.body + ';color:' + T.secondary + ';">services value</div></div>';
  h += prevRow('Duration', isNum(dur) ? dur + ' weeks' : '-');
  h += prevRow('Starts', isNum(lag) && closeDate ? fmtDate(addWeeks(closeDate, lag)) : '-');

  if (isNum(dur) && dur >= 1) {
    h += '<div style="margin-top:10px;">' + barsSvg(sCurve(dur, 6, dur), 260, 56) + '</div>';
    h += '<div style="' + MONO_CSS + 'margin-top:4px;">standard S-curve, ' + dur + ' weeks</div>';
  }
  return h + '</div>';
}

function prevRow(k, v) {
  return '<div style="display:flex;justify-content:space-between;padding:3px 0;">' +
    '<span style="font:13px ' + FONT.body + ';color:' + T.secondary + ';">' + esc(k) + '</span>' +
    '<span style="font:600 13px ' + FONT.mono + ';color:' + T.ink + ';">' + esc(v) + '</span></div>';
}

function addWeeks(iso, weeks) {
  var d = parseDate(iso);
  if (!d || !isNum(weeks)) return null;
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return isoDate(d);
}
