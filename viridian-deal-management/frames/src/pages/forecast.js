// Frame 5 - Forecast (brief section 7.4). Measure toggle, Weighted switch,
// stacked monthly bars on canvas, and a deals-by-period table with Copy table.

var SCREEN = 'Forecast';

var MEASURES = [
  { key: 'Services revenue £', un: 'PH Services Revenue £', w: 'PH Weighted Services Revenue £', fmt: 'money' },
  { key: 'Commission £',       un: 'PH Commission £',       w: 'PH Weighted Commission £',       fmt: 'money' },
  { key: 'Total revenue £',    un: 'PH Total Revenue £',    w: 'PH Weighted Total Revenue £',    fmt: 'money' },
  { key: 'Days',                    un: 'PH Days',                    w: 'PH Weighted Days',                    fmt: 'days' },
  { key: 'Hours',                   un: 'PH Hours',                   w: 'PH Weighted Hours',                   fmt: 'hours' },
  { key: 'Licence £',          un: 'PH Licence Value £',    w: 'PH Licence Value £',             fmt: 'money' }
];

var STACKS = ['Stage group', 'Sales person', 'Use case', 'Sales motion'];

var state = {
  fc: null, fcIdx: {}, grid: null, idx: {},
  items: [], stages: [], importSummary: null,
  measure: MEASURES[0].key, weighted: false, stackBy: 'Stage group',
  granularity: 'Month',
  fPerson: '', fGroup: 'Open', fUseCase: '', fMotion: '', fSize: '',
  fromIdx: 0, toIdx: 0, rangeInit: false,
  partial: false, error: null,
  canvas: null
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

function measureDef() {
  for (var i = 0; i < MEASURES.length; i++) if (MEASURES[i].key === state.measure) return MEASURES[i];
  return MEASURES[0];
}

function fmtMeasure(v) {
  var f = measureDef().fmt;
  if (f === 'days') return days(v);
  if (f === 'hours') return hours(v);
  return money(v);
}

// Month is a property of Week, not a dimension of the PH metrics, so Pigment
// refuses it as a data-source label (D17). One weekly source arrives instead,
// a row per (deal, week), and the months are rolled up here.
function weekStart(weekLabel) {
  return parseDate(String(weekLabel).replace('WC ', ''));
}

function periodOf(weekLabel) {
  if (state.granularity === 'Week') return weekLabel;
  var d = weekStart(weekLabel);
  if (!d) return weekLabel;
  return MONTHS[d.getUTCMonth()] + ' ' + String(d.getUTCFullYear()).slice(2);
}

// Sorting periods by name would put Apr before Jan, so order on the week each
// period starts in.
function periodSort(weekLabel) {
  var d = weekStart(weekLabel);
  return d ? d.getTime() : 0;
}

// Every period present in the data, chronological, ignoring the deal filters
// so the from/to selectors do not jump around as filters change.
function periods() {
  var g = state.fc;
  if (!g) return [];
  var seen = {}, out = [];
  for (var r = 0; r < g.labels.rows.length; r++) {
    var week = labelAt(g.labels.rows[r], 1);
    if (!week) continue;
    var key = periodOf(week);
    if (seen[key] === undefined) {
      seen[key] = periodSort(week);
      out.push(key);
    }
  }
  out.sort(function (a, b) { return seen[a] - seen[b]; });
  return out;
}

function itemByName(n) {
  for (var i = 0; i < state.items.length; i++) {
    if (state.items[i]['Opportunity Name'] === n) return state.items[i];
  }
  return null;
}

function gridVal(name, key) {
  var g = state.grid, idx = state.idx;
  if (!g || idx[key] === undefined) return null;
  for (var r = 0; r < g.labels.rows.length; r++) {
    if (labelName(g.labels.rows[r]) === name) return cell(g, idx[key], r);
  }
  return null;
}

function stageGroupOf(stageName) {
  for (var i = 0; i < state.stages.length; i++) {
    if (state.stages[i].Name === stageName) return state.stages[i]['Pipeline Group'] || 'Other';
  }
  return 'Other';
}

function dealPasses(name) {
  var it = itemByName(name);
  if (!it) return false;
  if (state.fPerson && it['Sales Person'] !== state.fPerson) return false;
  if (state.fUseCase && it['Use Case'] !== state.fUseCase) return false;
  if (state.fMotion && it['Sales Motion'] !== state.fMotion) return false;
  if (state.fSize && it['Deal Size'] !== state.fSize) return false;
  var open = gridVal(name, 'OPP Is Open') === true;
  var won = gridVal(name, 'OPP Is Won') === true;
  if (state.fGroup === 'Open' && !open) return false;
  if (state.fGroup === 'Won' && !won) return false;
  if (state.fGroup === 'Both' && !(open || won)) return false;
  return true;
}

function seriesKeyFor(name) {
  var it = itemByName(name);
  if (!it) return 'Other';
  if (state.stackBy === 'Stage group') return stageGroupOf(it.Stage);
  if (state.stackBy === 'Sales person') return it['Sales Person'] || 'Unassigned';
  if (state.stackBy === 'Use case') return it['Use Case'] || 'Other';
  return it['Sales Motion'] || 'Other';
}

// Walks the weekly rows once, adding each into its period bucket.
// cb(deal, periodIndex, value) is called for every value inside the range.
function eachValue(metricName, cb) {
  var g = state.fc;
  if (!g) return;
  var col = state.fcIdx[metricName];
  if (col === undefined) return;
  var cols = periods();
  var at = {};
  for (var p = 0; p < cols.length; p++) at[cols[p]] = p;

  for (var r = 0; r < g.labels.rows.length; r++) {
    var path = g.labels.rows[r];
    var deal = labelAt(path, 0), week = labelAt(path, 1);
    if (!deal || !week) continue;
    if (!dealPasses(deal)) continue;
    var idx = at[periodOf(week)];
    if (idx === undefined || idx < state.fromIdx || idx > state.toIdx) continue;
    var v = cell(g, col, r);
    if (!isNum(v) || v === 0) continue;
    cb(deal, idx - state.fromIdx, v);
  }
}

// Returns {periods, series:[{key, values[]}], dealRows:[{name, values[], total}]}
function buildData() {
  if (!state.fc) return null;
  var def = measureDef();
  var metricName = state.weighted ? def.w : def.un;
  var cols = periods().slice(state.fromIdx, state.toIdx + 1);
  var width = cols.length;

  var byDeal = {}, dealOrder = [];
  var seriesMap = {}, seriesOrder = [];

  function blank() {
    var a = [];
    for (var i = 0; i < width; i++) a.push(0);
    return a;
  }

  eachValue(metricName, function (deal, i, v) {
    if (!byDeal[deal]) { byDeal[deal] = { name: deal, values: blank(), total: 0 }; dealOrder.push(deal); }
    byDeal[deal].values[i] += v;
    byDeal[deal].total += v;

    var key = seriesKeyFor(deal);
    if (!seriesMap[key]) { seriesMap[key] = { key: key, values: blank() }; seriesOrder.push(key); }
    seriesMap[key].values[i] += v;
  });

  var dealRows = [];
  for (var d = 0; d < dealOrder.length; d++) dealRows.push(byDeal[dealOrder[d]]);
  dealRows.sort(function (a, b) {
    var ia = itemByName(a.name), ib = itemByName(b.name);
    var da = ia ? ia['Expected Close Date'] || '' : '';
    var db = ib ? ib['Expected Close Date'] || '' : '';
    return String(da).localeCompare(String(db));
  });

  var series = [];
  seriesOrder.sort();
  for (var s = 0; s < seriesOrder.length; s++) series.push(seriesMap[seriesOrder[s]]);

  return { periods: cols, series: series, dealRows: dealRows };
}

function unweightedTotal() {
  var t = 0;
  eachValue(measureDef().un, function (deal, i, v) { t += v; });
  return t;
}

function palette(n) {
  // Violet to gold to copper, the brief's series ramp.
  var stops = ['#2D1B4E', '#4A3168', '#6B4A82', '#8E6A8C', '#B08A6A', '#C8962E', '#D4764E', '#A0731F'];
  var out = [];
  for (var i = 0; i < n; i++) out.push(stops[i % stops.length]);
  return out;
}

function render() {
  if (state.error) { root.innerHTML = shellHtml(SCREEN, null, errorBlock(state.error)); return; }
  if (!state.fc || !state.grid) { root.innerHTML = shellHtml(SCREEN, loadDate(), loadingBlock()); return; }

  initRange();
  var data = buildData();

  var body = '';
  if (state.partial) body += partialBanner();
  body += controls();
  body += summaryCards(data);
  body += '<div style="' + cardStyle(12) + 'margin-bottom:12px;">' +
    '<canvas id="fc-chart" style="width:100%;height:300px;display:block;"></canvas>' +
    legend(data) + '</div>';
  body += tableSection(data);

  root.innerHTML = shellHtml(SCREEN, loadDate(),
    pageTitle('Forecast', 'Services revenue and commission, unweighted beside weighted.') + body);
  attach();
  drawChart(data);
}

function initRange() {
  if (state.rangeInit) return;
  var cols = periods();
  if (!cols.length) return;
  // Default: this month plus 12 (or the next 16 weeks at week granularity).
  var span = state.granularity === 'Month' ? 12 : 15;
  var start = 0;
  var now = new Date();
  var target = MONTHS[now.getUTCMonth()] + ' ' + String(now.getUTCFullYear()).slice(2);
  for (var i = 0; i < cols.length; i++) {
    if (cols[i] === target) { start = i; break; }
  }
  state.fromIdx = start;
  state.toIdx = Math.min(cols.length - 1, start + span);
  state.rangeInit = true;
}

function controls() {
  var cols = periods();
  var h = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">';

  h += '<select id="fc-measure" style="' + INPUT_CSS + 'width:auto;">';
  for (var m = 0; m < MEASURES.length; m++) {
    h += '<option value="' + esc(MEASURES[m].key) + '"' +
      (state.measure === MEASURES[m].key ? ' selected' : '') + '>' + esc(MEASURES[m].key) + '</option>';
  }
  h += '</select>';

  h += '<label style="font:13px ' + FONT.body + ';color:' + T.bodyInk + ';cursor:pointer;' +
    'background:' + (state.weighted ? T.violet : 'transparent') + ';color:' +
    (state.weighted ? T.cream : T.bodyInk) + ';border:1px solid ' + T.hairline +
    ';border-radius:' + RADIUS.input + ';padding:7px 12px;">' +
    '<input type="checkbox" id="fc-weighted"' + (state.weighted ? ' checked' : '') + '> Weighted</label>';

  h += '<select id="fc-stack" style="' + INPUT_CSS + 'width:auto;">';
  for (var s = 0; s < STACKS.length; s++) {
    h += '<option value="' + esc(STACKS[s]) + '"' + (state.stackBy === STACKS[s] ? ' selected' : '') +
      '>Stack by ' + esc(STACKS[s].toLowerCase()) + '</option>';
  }
  h += '</select>';

  h += '<select id="fc-gran" style="' + INPUT_CSS + 'width:auto;">' +
    '<option value="Month"' + (state.granularity === 'Month' ? ' selected' : '') + '>Monthly</option>' +
    '<option value="Week"' + (state.granularity === 'Week' ? ' selected' : '') + '>Weekly</option></select>';

  h += '<select id="fc-person" style="' + INPUT_CSS + 'width:auto;"><option value="">All people</option>';
  var people = {}, pl = [];
  for (var i = 0; i < state.items.length; i++) {
    var p = state.items[i]['Sales Person'];
    if (p && !people[p]) { people[p] = 1; pl.push(p); }
  }
  pl.sort();
  for (var k = 0; k < pl.length; k++) {
    h += '<option value="' + esc(pl[k]) + '"' + (state.fPerson === pl[k] ? ' selected' : '') + '>' +
      esc(pl[k]) + '</option>';
  }
  h += '</select>';

  h += '<select id="fc-group" style="' + INPUT_CSS + 'width:auto;">';
  var groups = ['Open', 'Won', 'Both'];
  for (var g = 0; g < groups.length; g++) {
    h += '<option value="' + groups[g] + '"' + (state.fGroup === groups[g] ? ' selected' : '') + '>' +
      groups[g] + '</option>';
  }
  h += '</select>';

  h += '<span style="font:12px ' + FONT.body + ';color:' + T.secondary + ';">from</span>';
  h += rangeSelect('fc-from', cols, state.fromIdx);
  h += '<span style="font:12px ' + FONT.body + ';color:' + T.secondary + ';">to</span>';
  h += rangeSelect('fc-to', cols, state.toIdx);

  h += '<button id="fc-copy" style="' + BTN_SECONDARY + 'margin-left:auto;">Copy table</button>';
  return h + '</div>';
}

function rangeSelect(id, cols, current) {
  var h = '<select id="' + id + '" style="' + INPUT_CSS + 'width:auto;">';
  for (var i = 0; i < cols.length; i++) {
    h += '<option value="' + i + '"' + (i === current ? ' selected' : '') + '>' + esc(cols[i]) + '</option>';
  }
  return h + '</select>';
}

function summaryCards(data) {
  var total = 0, i, j;
  if (data) {
    for (i = 0; i < data.series.length; i++) {
      for (j = 0; j < data.series[i].values.length; j++) total += data.series[i].values[j];
    }
  }
  var un = state.weighted ? unweightedTotal() : total;
  var ratio = un > 0 ? total / un : null;

  var h = '<div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;">';
  h += summaryCard(state.weighted ? 'Weighted total' : 'Unweighted total', fmtMeasure(total));
  if (state.weighted) {
    h += summaryCard('Unweighted total', fmtMeasure(un));
    h += summaryCard('Weighted ratio', ratio === null ? '-' : pct(ratio, 0));
  } else {
    h += summaryCard('Deals in range', String(data ? data.dealRows.length : 0));
  }
  return h + '</div>';
}

function summaryCard(label, value) {
  return '<div style="' + cardStyle(12) + 'flex:0 1 200px;">' +
    '<div style="' + LABEL_CSS + '">' + esc(label) + '</div>' +
    '<div style="font:700 24px ' + FONT.display + ';color:' + T.ink + ';">' + esc(value) + '</div></div>';
}

function legend(data) {
  if (!data) return '';
  var cols = palette(data.series.length);
  var h = '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;">';
  for (var i = 0; i < data.series.length; i++) {
    h += '<span style="font:12px ' + FONT.body + ';color:' + T.bodyInk + ';display:flex;align-items:center;gap:5px;">' +
      '<span style="width:10px;height:10px;border-radius:2px;background:' + cols[i] + ';display:inline-block;"></span>' +
      esc(data.series[i].key) + '</span>';
  }
  return h + '</div>';
}

function drawChart(data) {
  var canvas = document.getElementById('fc-chart');
  if (!canvas || !data) return;
  state.canvas = canvas;

  var dpr = window.devicePixelRatio || 1;
  var w = canvas.offsetWidth, hgt = canvas.offsetHeight;
  canvas.width = w * dpr; canvas.height = hgt * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = hgt + 'px';
  var ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, hgt);

  var padL = 64, padR = 8, padT = 10, padB = 34;
  var plotW = w - padL - padR, plotH = hgt - padT - padB;
  var n = data.periods.length;
  if (!n) return;

  var totals = [];
  for (var i = 0; i < n; i++) {
    var t = 0;
    for (var s = 0; s < data.series.length; s++) t += data.series[s].values[i] || 0;
    totals.push(t);
  }
  var max = 0;
  for (i = 0; i < totals.length; i++) if (totals[i] > max) max = totals[i];
  if (max <= 0) max = 1;
  var niceMax = niceCeil(max);

  // grid lines
  ctx.strokeStyle = T.creamMid; ctx.lineWidth = 1;
  ctx.font = '11px ' + FONT.mono.split(',')[0].replace(/'/g, '');
  ctx.fillStyle = T.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (var g = 0; g <= 4; g++) {
    var y = padT + plotH - (g / 4) * plotH;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
    ctx.fillText(shortAxis(niceMax * g / 4), padL - 8, y);
  }

  var cols = palette(data.series.length);
  var slot = plotW / n, bw = Math.min(46, slot * 0.66);

  for (i = 0; i < n; i++) {
    var x = padL + slot * i + (slot - bw) / 2;
    var yBase = padT + plotH;
    for (var sIdx = 0; sIdx < data.series.length; sIdx++) {
      var v = data.series[sIdx].values[i] || 0;
      if (v <= 0) continue;
      var bh = (v / niceMax) * plotH;
      ctx.fillStyle = cols[sIdx];
      ctx.fillRect(x, yBase - bh, bw, bh);
      yBase -= bh;
    }
    ctx.fillStyle = T.secondary;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = '10px ' + FONT.mono.split(',')[0].replace(/'/g, '');
    var lbl = String(data.periods[i]).replace('WC ', '');
    ctx.save();
    if (n > 14) {
      ctx.translate(padL + slot * i + slot / 2, padT + plotH + 6);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = 'right';
      ctx.fillText(lbl, 0, 0);
    } else {
      ctx.fillText(lbl, padL + slot * i + slot / 2, padT + plotH + 6);
    }
    ctx.restore();
  }

  // hover tooltip
  var tip = document.getElementById('fc-tip');
  if (!tip) {
    tip = el('div', { id: 'fc-tip', style:
      'position:fixed;pointer-events:none;z-index:9500;background:' + T.violet + ';color:' + T.cream +
      ';border-radius:' + RADIUS.input + ';padding:7px 10px;font:12px ' + FONT.body +
      ';opacity:0;transition:opacity .1s;white-space:pre;' });
    document.body.appendChild(tip);
    trackBodyNode(tip);
  }

  on(canvas, 'mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var i2 = Math.floor((mx - padL) / slot);
    if (i2 < 0 || i2 >= n) { tip.style.opacity = '0'; return; }
    var lines = [data.periods[i2]];
    for (var s2 = 0; s2 < data.series.length; s2++) {
      var vv = data.series[s2].values[i2] || 0;
      if (vv > 0) lines.push(data.series[s2].key + '  ' + fmtMeasure(vv));
    }
    lines.push('Total  ' + fmtMeasure(totals[i2]));
    tip.textContent = lines.join('\n');
    tip.style.left = (e.clientX + 14) + 'px';
    tip.style.top = (e.clientY + 14) + 'px';
    tip.style.opacity = '1';
  });
  on(canvas, 'mouseleave', function () { tip.style.opacity = '0'; });
}

function niceCeil(v) {
  var mag = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
  var r = v / mag;
  var step = r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10;
  return step * mag;
}

function shortAxis(v) {
  var f = measureDef().fmt;
  if (f === 'money') return moneyShort(v);
  if (f === 'days') return num(v, 0);
  return num(Math.round(v), 0);
}

function tableSection(data) {
  if (!data || !data.dealRows.length) {
    return '<div style="' + cardStyle(24) + 'text-align:center;font:13px ' + FONT.body +
      ';color:' + T.secondary + ';">Nothing in this range for these filters.</div>';
  }
  var h = '<div style="' + cardStyle(0) + 'overflow:auto;max-height:44vh;">';
  h += '<table id="fc-table" style="width:100%;border-collapse:collapse;font:12px ' + FONT.body + ';">';
  h += '<thead><tr>';
  h += th('Deal', 'left');
  h += th('Size', 'left');
  h += th('Stage', 'left');
  for (var p = 0; p < data.periods.length; p++) h += th(data.periods[p], 'right');
  h += th('Total', 'right');
  h += '</tr></thead><tbody>';

  var colTotals = [], i;
  for (i = 0; i < data.periods.length; i++) colTotals.push(0);
  var grand = 0;

  for (var r = 0; r < data.dealRows.length; r++) {
    var row = data.dealRows[r];
    var it = itemByName(row.name);
    h += '<tr style="border-bottom:1px solid ' + T.creamMid + ';">';
    h += '<td style="padding:6px 10px;color:' + T.ink + ';font-weight:600;white-space:nowrap;">' +
      esc(row.name) + '</td>';
    h += '<td style="padding:6px 10px;">' + badge(it ? (it['Deal Size'] || '') : '', 'neutral') + '</td>';
    h += '<td style="padding:6px 10px;color:' + T.bodyInk + ';white-space:nowrap;">' +
      esc(it ? it.Stage || '' : '') + ' <span style="color:' + T.muted + ';">' +
      pct(gridVal(row.name, 'OPP Win Rate %'), 0) + '</span></td>';
    for (i = 0; i < row.values.length; i++) {
      colTotals[i] += row.values[i];
      h += '<td style="padding:6px 10px;text-align:right;color:' + T.bodyInk + ';">' +
        (row.values[i] ? fmtMeasure(row.values[i]) : '<span style="color:' + T.muted + ';">—</span>') + '</td>';
    }
    grand += row.total;
    h += '<td style="padding:6px 10px;text-align:right;font-weight:600;color:' + T.ink + ';">' +
      fmtMeasure(row.total) + '</td></tr>';
  }

  h += '<tr style="background:' + T.violet + ';">';
  h += '<td colspan="3" style="padding:8px 10px;color:' + T.cream + ';font-weight:600;">Total</td>';
  for (i = 0; i < colTotals.length; i++) {
    h += '<td style="padding:8px 10px;text-align:right;color:' + T.gold + ';font-weight:600;">' +
      fmtMeasure(colTotals[i]) + '</td>';
  }
  h += '<td style="padding:8px 10px;text-align:right;color:' + T.gold + ';font-weight:700;">' +
    fmtMeasure(grand) + '</td></tr>';
  return h + '</tbody></table></div>';
}

function th(label, align) {
  return '<th style="position:sticky;top:0;background:' + T.violet + ';color:' + T.cream +
    ';font:600 11px ' + FONT.body + ';letter-spacing:.04em;text-transform:uppercase;text-align:' +
    align + ';padding:8px 10px;white-space:nowrap;">' + esc(label) + '</th>';
}

function copyTable(data) {
  if (!data) return;
  var lines = [];
  var head = ['Deal', 'Size', 'Stage'].concat(data.periods).concat(['Total']);
  lines.push(head.join('\t'));
  for (var r = 0; r < data.dealRows.length; r++) {
    var row = data.dealRows[r];
    var it = itemByName(row.name);
    var cells = [row.name, it ? it['Deal Size'] || '' : '', it ? it.Stage || '' : ''];
    for (var i = 0; i < row.values.length; i++) cells.push(row.values[i]);
    cells.push(row.total);
    lines.push(cells.join('\t'));
  }
  var text = lines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(function () { toast('Table copied'); })
      .catch(function () { toast('Could not copy', true); });
  } else {
    toast('Clipboard not available', true);
  }
}

function attach() {
  function bind(id, ev, fn) { var e = document.getElementById(id); if (e) on(e, ev, fn); }
  bind('fc-measure', 'change', function (e) { state.measure = e.currentTarget.value; render(); });
  bind('fc-weighted', 'change', function (e) { state.weighted = e.currentTarget.checked; render(); });
  bind('fc-stack', 'change', function (e) { state.stackBy = e.currentTarget.value; render(); });
  bind('fc-gran', 'change', function (e) {
    state.granularity = e.currentTarget.value; state.rangeInit = false; render();
  });
  bind('fc-person', 'change', function (e) { state.fPerson = e.currentTarget.value; render(); });
  bind('fc-group', 'change', function (e) { state.fGroup = e.currentTarget.value; render(); });
  bind('fc-from', 'change', function (e) {
    state.fromIdx = parseInt(e.currentTarget.value, 10);
    if (state.toIdx < state.fromIdx) state.toIdx = state.fromIdx;
    render();
  });
  bind('fc-to', 'change', function (e) {
    state.toIdx = parseInt(e.currentTarget.value, 10);
    if (state.fromIdx > state.toIdx) state.fromIdx = state.toIdx;
    render();
  });
  bind('fc-copy', 'click', function () { copyTable(buildData()); });
}

function boot() {
  installBaseStyles();
  root.innerHTML = shellHtml(SCREEN, null, loadingBlock());
  var redraw = debounce(render, 16);
  function fail(e) { state.error = (e && e.message) ? e.message : 'Subscription failed'; render(); }

  subscribeView('vwForecast', function (d) {
    state.fc = d;
    state.fcIdx = columnIndex(d);
    state.partial = state.partial || !!d.truncated;
    redraw();
  }, fail);
  subscribeView('vwPipelineGrid', function (d) {
    state.grid = d;
    state.idx = columnIndex(d);
    state.items = rowsAsItems(d, 'Opportunity Name');
    redraw();
  }, fail);
  subscribeView('vwImportSummary', function (d) { state.importSummary = d; redraw(); }, fail);
  subscribeView('vwStageProps', function (d) {
    state.stages = sortByOrder(listFromProps(d)); redraw();
  }, fail);

  onViewportResize(render);
}
