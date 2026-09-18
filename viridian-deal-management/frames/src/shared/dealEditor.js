// Shared Deal editor (brief section 7.4 Frame 2). Rendered full-page by the
// Deal Frame and as a 480px right-hand slide-over by the Pipeline Frame, so the
// behaviour is identical in both places.

var DE = {
  open: false,
  dealName: null,
  profile: null,     // VW Profile by Deal, paged to this deal
  profileSub: null,
  showCustom: false,
  weighted: false
};

function deRow(grid, name) {
  if (!grid) return null;
  for (var r = 0; r < grid.labels.rows.length; r++) {
    if (labelName(grid.labels.rows[r]) === name) return r;
  }
  return null;
}

function deVal(grid, idx, name, key) {
  var r = deRow(grid, name);
  if (r === null || idx[key] === undefined) return null;
  return cell(grid, idx[key], r);
}

// Opens the editor for a deal and pages the profile View to it.
function openDealEditor(dealName, onChange) {
  DE.open = true;
  DE.dealName = dealName;
  DE.showCustom = false;
  if (!DE.profileSub) {
    DE.profileSub = subscribeView('vwProfileByDeal', function (d) {
      DE.profile = d;
      if (onChange) onChange();
    }, function () {}, [{ alias: 'opportunity', selection: [dealName] }]);
  } else if (typeof DE.profileSub.updatePageDefinitions === 'function') {
    DE.profile = null;
    DE.profileSub.updatePageDefinitions([{ alias: 'opportunity', selection: [dealName] }]);
  } else {
    // No repaging on this subscription: drop it and take a fresh one.
    DE.profile = null;
    stopSub(DE.profileSub);
    DE.profileSub = subscribeView('vwProfileByDeal', function (d) {
      DE.profile = d;
      if (onChange) onChange();
    }, function () {}, [{ alias: 'opportunity', selection: [dealName] }]);
  }
  if (onChange) onChange();
}

function closeDealEditor(onChange) {
  DE.open = false;
  DE.dealName = null;
  if (onChange) onChange();
}

// ctx: {grid, idx, items (Opportunity list rows), lists:{...}, monthly}
function dealEditorHtml(ctx, embedded) {
  var name = DE.dealName;
  if (!name) return '';
  var grid = ctx.grid, idx = ctx.idx;
  var item = null;
  for (var i = 0; i < ctx.items.length; i++) {
    if (ctx.items[i]['Opportunity Name'] === name) item = ctx.items[i];
  }
  if (!item) return stateBlock('Deal not found', name);

  function v(key) { return deVal(grid, idx, name, key); }

  var h = '';

  // ---- header ----------------------------------------------------------
  h += '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:4px;">';
  h += '<input id="de-name" value="' + esc(name) + '" data-prev="' + esc(name) + '" style="' +
    INPUT_CSS + 'font:700 20px ' + FONT.display + ';border:1px solid transparent;background:transparent;' +
    'padding:2px 4px;flex:1 1 auto;">';
  if (embedded) {
    h += '<button id="de-close" style="' + BTN_SECONDARY + 'padding:5px 10px;">Close</button>';
  }
  h += '</div>';

  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">';
  h += badge(v('ALN Match Status') || 'Viridian only', v('ALN Match Status') === 'Matched' ? 'good' : 'neutral');
  var align = v('ALN Stage Alignment');
  if (align) h += badge(align, align === 'Aligned' ? 'good' : 'warn');
  var gap = v('ALN Close Date Gap Days');
  if (isNum(gap)) {
    var k = Math.abs(gap) > 90 ? 'bad' : (Math.abs(gap) > 30 ? 'warn' : 'good');
    h += badge('Close gap ' + (gap > 0 ? '+' : '') + gap + 'd', k);
  }
  if (v('ALN Motion Consistent') === false) h += badge('Motion differs', 'warn');
  if (v('ALN Matched Row Dropped') === true) h += badge('Pigment row dropped', 'bad');
  if (v('ALN Pigment Closed') === true) h += badge('Closed in Pigment', 'bad');
  h += badge(v('PH Profile Is Valid') === true ? 'Profile 100%' : 'Profile ' + pct(v('PH Profile Total %'), 1),
             v('PH Profile Is Valid') === true ? 'good' : 'bad');
  h += '</div>';

  // ---- Deal section ----------------------------------------------------
  h += sectionTitle('Deal');
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 16px;margin-bottom:18px;">';
  h += field('Sales person', pickSelect('de-salesPerson', ctx.lists.salesPerson, item['Sales Person']));
  h += field('Stage', pickSelect('de-stage', ctx.lists.stage, item.Stage) +
    '<div style="' + MONO_CSS + 'margin-top:4px;">win rate ' + pct(v('OPP Win Rate %'), 0) + '</div>');
  h += field('Expected close date', '<input id="de-closeDate" type="date" value="' +
    esc(item['Expected Close Date'] || '') + '" data-prev="' + esc(item['Expected Close Date'] || '') +
    '" style="' + INPUT_CSS + '">');
  h += field('Use case', pickSelect('de-useCase', ctx.lists.useCase, item['Use Case']));
  h += field('Sales motion', pickSelect('de-salesMotion', ctx.lists.salesMotion, item['Sales Motion']));
  h += field('Deal size', pickSelect('de-dealSize', ctx.lists.dealSize, item['Deal Size']));
  h += field('Pigment AE', pickSelect('de-pigmentAE', ctx.lists.pigmentAE, item['Pigment AE'], true));
  h += field('Notes', '<textarea id="de-notes" rows="4" data-prev="' + esc(item.Notes || '') +
    '" style="' + INPUT_CSS + 'resize:vertical;">' + esc(item.Notes || '') + '</textarea>');
  h += '</div>';

  // ---- Economics -------------------------------------------------------
  h += sectionTitle('Economics');
  h += '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">';

  h += econCard('Licence', '<div style="font:700 22px ' + FONT.display + ';color:' + T.ink + ';">' +
    moneyUsd(v('OPP Licence Value $')) + '</div>' +
    '<div style="' + MONO_CSS + 'margin-top:2px;">' + money(v('OPP Licence Value £')) +
    ' @ ' + (isNum(ctx.fx) ? ctx.fx : '-') + '</div>' +
    '<div style="font:11px ' + FONT.body + ';color:' + T.muted + ';margin-top:4px;">from deal size</div>');

  h += econCard('Commission', '<div style="font:700 22px ' + FONT.display + ';color:' + T.ink + ';">' +
    money(v('OPP Commission £')) + '</div>' +
    '<div style="' + MONO_CSS + 'margin-top:2px;">' + pct(v('OPP Commission Rate %'), 1) + ' of licence £</div>' +
    '<div style="font:11px ' + FONT.body + ';color:' + T.muted + ';margin-top:4px;">from sales motion</div>');

  h += econCard('Days', overrideField('de-days', v('OPP Override Days'), v('OPP Standard Days'),
    days, 'standard ' + days(v('OPP Standard Days'))) +
    '<div style="font:700 18px ' + FONT.display + ';color:' + T.ink + ';margin-top:6px;">' +
    days(v('OPP Effective Days')) + ' days</div>');

  h += econCard('Day rate', overrideField('de-rate', v('OPP Override Day Rate £'),
    ctx.standardRate, money, 'standard ' + money(ctx.standardRate)) +
    '<div style="font:700 18px ' + FONT.display + ';color:' + T.ink + ';margin-top:6px;">' +
    money(v('OPP Effective Day Rate £')) + '</div>');

  h += '</div>';

  var overridden = v('OPP Is Days Overridden') === true || v('OPP Is Rate Overridden') === true;
  h += '<div style="margin-bottom:6px;">';
  h += '<span style="font:700 24px ' + FONT.display + ';color:' + T.ink + ';">' +
    money(v('OPP Services Value £')) + '</span>';
  h += '<span style="font:13px ' + FONT.body + ';color:' + T.secondary + ';margin-left:10px;">services value</span>';
  if (overridden) {
    h += '<span style="font:13px ' + FONT.body + ';color:' + T.copperText + ';margin-left:10px;">vs standard ' +
      money(v('OPP Standard Services Value £')) + '</span>';
  }
  h += '</div>';
  h += '<div style="font:13px ' + FONT.body + ';color:' + T.secondary + ';margin-bottom:18px;">' +
    'Weighted at ' + pct(v('OPP Win Rate %'), 0) + ': services ' + money(v('OPP Weighted Services Value £')) +
    ' · commission ' + money(v('OPP Weighted Commission £')) + '</div>';

  // ---- Delivery profile ------------------------------------------------
  h += sectionTitle('Delivery profile');
  h += profileSection(v);

  // ---- Pigment pipeline ------------------------------------------------
  h += sectionTitle('Pigment pipeline');
  h += pigmentSection(ctx, item, v);

  // ---- footer ----------------------------------------------------------
  h += '<div style="display:flex;justify-content:space-between;align-items:center;' +
    'border-top:1px solid ' + T.hairline + ';margin-top:20px;padding-top:12px;">';
  h += '<div style="' + MONO_CSS + '">created ' + fmtDate(item['Created On']) +
    ' · updated ' + fmtDate(item['Last Updated On']) +
    (item['Closed On'] ? ' · closed ' + fmtDate(item['Closed On']) : '') + '</div>';
  h += '<button id="de-close-deal" style="' + BTN_PRIMARY + '">Close deal</button>';
  h += '</div>';

  return h;
}

function sectionTitle(t) {
  return '<div style="font:600 11px ' + FONT.body + ';letter-spacing:.08em;text-transform:uppercase;color:' +
    T.goldText + ';margin:18px 0 10px;border-bottom:1px solid ' + T.hairline + ';padding-bottom:5px;">' +
    esc(t) + '</div>';
}

function field(label, control) {
  return '<div><label style="' + LABEL_CSS + '">' + esc(label) + '</label>' + control + '</div>';
}

function econCard(title, inner) {
  return '<div style="' + cardStyle(12) + 'flex:1 1 160px;min-width:150px;">' +
    '<div style="' + LABEL_CSS + '">' + esc(title) + '</div>' + inner + '</div>';
}

// An override input with a clear (x) that writes null, never 0.
function overrideField(id, overrideVal, standardVal, fmt, hint) {
  var shown = isNum(overrideVal) ? overrideVal : '';
  return '<div style="display:flex;align-items:center;gap:4px;">' +
    '<input id="' + id + '" value="' + esc(shown) + '" data-prev="' + esc(shown) +
    '" placeholder="' + esc(hint) + '" style="' + INPUT_CSS + 'text-align:right;">' +
    '<button id="' + id + '-clear" title="Use the standard" style="' + BTN_SECONDARY +
    'padding:6px 9px;line-height:1;">×</button></div>';
}

function pickSelect(id, items, current, allowBlank) {
  var h = '<select id="' + id + '" data-prev="' + esc(current || '') + '" style="' + INPUT_CSS + '">';
  if (allowBlank) h += '<option value="">(none)</option>';
  for (var i = 0; i < items.length; i++) {
    var n = items[i].Name;
    h += '<option value="' + esc(n) + '"' + (n === current ? ' selected' : '') + '>' + esc(n) + '</option>';
  }
  return h + '</select>';
}

function profileSection(v) {
  var d = DE.profile;
  if (!d) return '<div style="font:13px ' + FONT.body + ';color:' + T.secondary + ';">Loading profile...</div>';
  var idx = columnIndex(d);
  var effCol = idx['PH Effective Profile %'];
  var ovrCol = idx['PH Override Profile %'];
  var wkCol = idx['PH Calendar Week'];

  var vals = [], weeks = [], overrides = [], names = [], lastNonZero = 0;
  for (var r = 0; r < d.labels.rows.length; r++) {
    var val = effCol === undefined ? null : cell(d, effCol, r);
    vals.push(isNum(val) ? val : 0);
    overrides.push(ovrCol === undefined ? null : cell(d, ovrCol, r));
    weeks.push(wkCol === undefined ? null : cell(d, wkCol, r));
    names.push(labelName(d.labels.rows[r]));
    if (isNum(val) && val > 0) lastNonZero = r + 1;
  }
  var show = Math.max(lastNonZero, 1);

  var total = 0;
  for (var t = 0; t < vals.length; t++) total += vals[t];
  var valid = Math.abs(total - 1) < 0.005;

  var h = '<div style="' + cardStyle() + 'margin-bottom:12px;">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
  h += '<label style="font:13px ' + FONT.body + ';color:' + T.bodyInk + ';cursor:pointer;">' +
    '<input type="checkbox" id="de-custom"' + (DE.showCustom ? ' checked' : '') +
    '> Use custom profile</label>';
  h += '<span style="font:600 14px ' + FONT.mono + ';color:' + (valid ? T.green : T.red) + ';">' +
    pct(total, 1) + '</span>';
  h += '</div>';

  h += barsSvgLabelled(vals.slice(0, show), weeks.slice(0, show));

  if (DE.showCustom) {
    h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">';
    for (var w = 0; w < show; w++) {
      var ov = overrides[w];
      h += '<div style="width:68px;">' +
        '<div style="' + MONO_CSS + 'font-size:10px;">' + esc(names[w]) + '</div>' +
        '<input data-profweek="' + esc(names[w]) + '" value="' +
        (isNum(ov) ? Math.round(ov * 1000) / 10 : '') + '" data-prev="' +
        (isNum(ov) ? Math.round(ov * 1000) / 10 : '') + '" style="' + INPUT_CSS +
        'padding:4px 5px;font-size:12px;text-align:right;"></div>';
    }
    h += '</div>';
    h += '<button id="de-reset-profile" style="' + BTN_SECONDARY + 'margin-top:10px;">Reset to standard</button>';
    h += '<div style="font:12px ' + FONT.body + ';color:' + T.secondary + ';margin-top:6px;">' +
      'Any value entered here replaces the standard S-curve entirely. Clearing every cell restores it.</div>';
  }
  h += '</div>';
  return h;
}

function barsSvgLabelled(vals, weeks) {
  var w = 640, hgt = 96, i, max = 0;
  for (i = 0; i < vals.length; i++) if (vals[i] > max) max = vals[i];
  if (max <= 0) max = 1;
  var n = Math.max(vals.length, 1);
  var bw = w / n;
  var s = '<svg width="100%" viewBox="0 0 ' + w + ' ' + (hgt + 18) + '" style="display:block;">';
  for (i = 0; i < n; i++) {
    var bh = (vals[i] / max) * hgt;
    s += '<rect x="' + (i * bw + 1) + '" y="' + (hgt - bh) + '" width="' + Math.max(1, bw - 2) +
      '" height="' + bh + '" fill="' + T.violet + '"></rect>';
    if (n <= 20 || i % 2 === 0) {
      var lbl = weeks[i] ? String(weeks[i]).replace('WC ', '') : '';
      s += '<text x="' + (i * bw + bw / 2) + '" y="' + (hgt + 13) + '" text-anchor="middle" ' +
        'font-family="' + FONT.mono + '" font-size="8" fill="' + T.muted + '">' + esc(lbl.slice(5)) + '</text>';
    }
  }
  s += '</svg>';
  return s;
}

function pigmentSection(ctx, item, v) {
  var matched = item['Matched Pigment Opportunity'];
  var h = '<div style="' + cardStyle() + '">';
  if (matched) {
    var pr = ctx.pigmentByName ? ctx.pigmentByName[matched] : null;
    h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">';
    h += '<div><div style="font:600 14px ' + FONT.body + ';color:' + T.ink + ';">' + esc(matched) + '</div>';
    if (pr) {
      h += '<div style="' + MONO_CSS + 'margin-top:4px;">' +
        esc(pr['Pigment Stage'] || '-') + ' · closes ' + fmtDate(pr['Close Date']) +
        ' · ' + esc(pr['Pigment AE'] || 'no AE') + '</div>';
      h += '<div style="' + MONO_CSS + '">' + esc(pr['Partner Attach Type'] || '-') +
        ' · ' + esc(pr.Segment || '-') + ' · ' + esc(pr.Industry || '-') + '</div>';
      if (pr['ACV USD']) {
        h += '<div style="font:13px ' + FONT.body + ';color:' + T.bodyInk + ';margin-top:6px;">' +
          'Pigment ACV ' + moneyUsd(pr['ACV USD']) + '</div>';
      }
    }
    h += '</div>';
    h += '<button id="de-unmatch" style="' + BTN_SECONDARY + '">Unmatch</button>';
    h += '</div>';
  } else {
    h += '<div style="font:13px ' + FONT.body + ';color:' + T.secondary + ';margin-bottom:8px;">' +
      'Not matched to a Pigment pipeline row. Top suggestions:</div>';
    var sugg = ctx.suggestFor ? ctx.suggestFor(item) : [];
    if (!sugg.length) {
      h += '<div style="font:13px ' + FONT.body + ';color:' + T.muted + ';">No likely matches. ' +
        'Use the Matching screen to search the full pipeline.</div>';
    }
    for (var i = 0; i < Math.min(3, sugg.length); i++) {
      var s = sugg[i];
      h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;' +
        'padding:6px 0;border-bottom:1px solid ' + T.creamMid + ';">';
      h += '<div><span style="font:13px ' + FONT.body + ';color:' + T.ink + ';">' + esc(s.name) + '</span> ' +
        badge(s.band, s.band === 'Likely' ? 'gold' : 'warn') +
        '<div style="' + MONO_CSS + '">' + esc(s.reasons.join(' · ')) + '</div></div>';
      h += '<button data-de-match="' + esc(s.name) + '" style="' + BTN_SECONDARY + '">Match</button>';
      h += '</div>';
    }
  }
  return h + '</div>';
}

// Wires every control in the editor. Shared by the Deal Frame and the
// Pipeline slide-over so both behave identically.
// ctx needs: items, rerender, onMatchChange (optional).
function attachDealEditor(ctx, rerender) {
  var name = DE.dealName;
  if (!name) return;
  var scope = document.getElementById('content');
  if (!scope) return;

  function byId(id) { return document.getElementById(id); }
  var today = todayIso();

  // Save a property on the Opportunity and stamp Last Updated On.
  function saveProp(prop, value, revertEl, prevVal) {
    var vals = {};
    vals[prop] = value;
    vals['Last Updated On'] = today;
    return writeItem('opportunity', name, vals).then(function (res) {
      if (!res.ok && revertEl) revertEl.value = prevVal;
      else if (rerender) rerender();
      return res;
    });
  }

  // --- rename (on blur) ---
  var nameEl = byId('de-name');
  if (nameEl) {
    on(nameEl, 'blur', function () {
      var prev = nameEl.getAttribute('data-prev');
      var next = nameEl.value.trim();
      if (!next || next === prev) { nameEl.value = prev; return; }
      for (var i = 0; i < ctx.items.length; i++) {
        if (ctx.items[i]['Opportunity Name'] &&
            ctx.items[i]['Opportunity Name'].toLowerCase() === next.toLowerCase()) {
          toast('A deal with that name already exists', true);
          nameEl.value = prev;
          return;
        }
      }
      writeItem('opportunity', prev, { 'Opportunity Name': next, 'Last Updated On': today })
        .then(function (res) {
          if (res.ok) { DE.dealName = next; if (rerender) rerender(); }
          else nameEl.value = prev;
        });
    });
  }

  // --- dropdowns: save on change ---
  var picks = [
    ['de-salesPerson', 'Sales Person'], ['de-stage', 'Stage'], ['de-useCase', 'Use Case'],
    ['de-salesMotion', 'Sales Motion'], ['de-dealSize', 'Deal Size'], ['de-pigmentAE', 'Pigment AE']
  ];
  for (var p = 0; p < picks.length; p++) {
    (function (id, prop) {
      var e = byId(id);
      if (!e) return;
      on(e, 'change', function () {
        var vals = {};
        vals[prop] = e.value === '' ? null : e.value;
        vals['Last Updated On'] = today;
        // Closing the deal from the stage dropdown stamps Closed On too.
        if (prop === 'Stage') {
          if (e.value === 'Closed Won' || e.value === 'Closed Lost') vals['Closed On'] = today;
          else vals['Closed On'] = null;
        }
        writeItem('opportunity', name, vals).then(function () { if (rerender) rerender(); });
      });
    })(picks[p][0], picks[p][1]);
  }

  // --- close date, notes ---
  var cd = byId('de-closeDate');
  if (cd) on(cd, 'change', function () {
    saveProp('Expected Close Date', cd.value || null, cd, cd.getAttribute('data-prev'));
  });
  var notes = byId('de-notes');
  if (notes) on(notes, 'blur', function () {
    if (notes.value === notes.getAttribute('data-prev')) return;
    saveProp('Notes', notes.value === '' ? null : notes.value, notes, notes.getAttribute('data-prev'));
  });

  // --- overrides: blank writes null, never 0 ---
  wireOverride('de-days', 'oppOverrideDays');
  wireOverride('de-rate', 'oppOverrideRate');

  function wireOverride(id, metricAlias) {
    var inp = byId(id), clear = byId(id + '-clear');
    if (inp) {
      on(inp, 'blur', function () {
        var prev = inp.getAttribute('data-prev');
        if (inp.value === prev) return;
        var raw = inp.value.trim();
        var value;
        if (raw === '') value = null;
        else {
          var n = parseNumberInput(raw);
          if (n === null || isNaN(n)) { toast('Enter a number', true); inp.value = prev; return; }
          if (n < 0) { toast('Value cannot be negative', true); inp.value = prev; return; }
          value = n;
        }
        writeValue(metricAlias, { opportunity: name }, value).then(function (res) {
          if (!res.ok) inp.value = prev; else if (rerender) rerender();
        });
      });
      on(inp, 'keydown', function (e) { if (e.key === 'Enter') inp.blur(); });
    }
    if (clear) {
      on(clear, 'click', function () {
        writeValue(metricAlias, { opportunity: name }, null).then(function (res) {
          if (res.ok && rerender) rerender();
        });
      });
    }
  }

  // --- custom profile ---
  var custom = byId('de-custom');
  if (custom) on(custom, 'change', function () { DE.showCustom = custom.checked; if (rerender) rerender(); });

  var weekInputs = scope.querySelectorAll('input[data-profweek]');
  for (var w = 0; w < weekInputs.length; w++) {
    on(weekInputs[w], 'blur', function (e) {
      var t = e.currentTarget;
      var prev = t.getAttribute('data-prev');
      if (t.value === prev) return;
      var raw = t.value.trim();
      var value;
      if (raw === '') value = null;
      else {
        var n = parseNumberInput(raw);
        if (n === null || isNaN(n)) { toast('Enter a percentage', true); t.value = prev; return; }
        if (n < 0) { toast('Value cannot be negative', true); t.value = prev; return; }
        value = n / 100;
      }
      writeValue('phOverrideProfile',
        { opportunity: name, projectWeek: t.getAttribute('data-profweek') }, value)
        .then(function (res) { if (!res.ok) t.value = prev; else t.setAttribute('data-prev', t.value); });
    });
  }

  var resetBtn = byId('de-reset-profile');
  if (resetBtn) {
    on(resetBtn, 'click', function () {
      var writes = [];
      for (var i = 1; i <= 52; i++) {
        writes.push(SDK.editValue('phOverrideProfile',
          { opportunity: name, projectWeek: 'W' + (i < 10 ? '0' : '') + i }, null));
      }
      toast('Clearing the custom profile');
      Promise.all(writes).then(function () {
        toast('Back to the standard S-curve');
        if (rerender) rerender();
      }).catch(function (err) {
        toast((err && err.message) ? err.message : 'Reset failed', true);
      });
    });
  }

  // --- match / unmatch ---
  var unmatch = byId('de-unmatch');
  if (unmatch) on(unmatch, 'click', function () {
    saveProp('Matched Pigment Opportunity', null);
  });

  var matchBtns = scope.querySelectorAll('[data-de-match]');
  for (var m = 0; m < matchBtns.length; m++) {
    on(matchBtns[m], 'click', function (e) {
      saveProp('Matched Pigment Opportunity', e.currentTarget.getAttribute('data-de-match'));
    });
  }

  // --- close deal ---
  var closeDeal = byId('de-close-deal');
  if (closeDeal) {
    on(closeDeal, 'click', function () {
      var mod = openModal(360,
        '<div style="font:700 17px ' + FONT.display + ';color:' + T.ink + ';margin-bottom:6px;">Close this deal</div>' +
        '<div style="font:13px ' + FONT.body + ';color:' + T.secondary + ';margin-bottom:14px;">' +
        esc(name) + '</div>' +
        '<div style="display:flex;gap:8px;">' +
        '<button id="cd-won" style="' + BTN_PRIMARY + '">Closed Won</button>' +
        '<button id="cd-lost" style="' + BTN_SECONDARY + '">Closed Lost</button>' +
        '<button id="cd-cancel" style="' + BTN_SECONDARY + 'margin-left:auto;">Cancel</button></div>');
      function finish(stage) {
        writeItem('opportunity', name,
          { Stage: stage, 'Closed On': today, 'Last Updated On': today }).then(function () {
            closeModal(mod.back);
            if (rerender) rerender();
          });
      }
      on(document.getElementById('cd-won'), 'click', function () { finish('Closed Won'); });
      on(document.getElementById('cd-lost'), 'click', function () { finish('Closed Lost'); });
      on(document.getElementById('cd-cancel'), 'click', function () { closeModal(mod.back); });
    });
  }

  var closeBtn = byId('de-close');
  if (closeBtn) on(closeBtn, 'click', function () { closeDealEditor(rerender); });
}
