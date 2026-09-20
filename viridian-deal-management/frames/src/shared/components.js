// Shared UI primitives. Flat design: no shadows, no gradients, 4px radius on
// inputs and chips, 6px on cards (brief section 7.2).

function el(tag, attrs, html) {
  var n = document.createElement(tag);
  if (attrs) {
    for (var k in attrs) {
      if (k === 'style') n.style.cssText = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
  }
  if (html !== undefined) n.innerHTML = html;
  return n;
}

function cardStyle(pad) {
  return 'background:' + T.paper + ';border:1px solid ' + T.hairline +
         ';border-radius:' + RADIUS.card + ';padding:' + (pad || 16) + 'px;';
}

function chip(label, bg, fg) {
  return '<span style="display:inline-block;padding:2px 8px;border-radius:' + RADIUS.input +
         ';background:' + bg + ';color:' + fg + ';font:600 11px ' + FONT.body +
         ';white-space:nowrap;">' + esc(label) + '</span>';
}

function badge(label, kind) {
  if (kind === 'good') return chip(label, '#E6EFE9', T.green);
  if (kind === 'warn') return chip(label, '#F7E7DE', T.copperText);
  if (kind === 'bad') return chip(label, '#F3E1E1', T.red);
  if (kind === 'gold') return chip(label, '#F6EDD9', T.goldText);
  return chip(label, T.creamMid, T.secondary);
}

var INPUT_CSS = 'font:14px ' + FONT.body + ';color:' + T.ink + ';background:' + T.paper +
  ';border:1px solid ' + T.hairline + ';border-radius:' + RADIUS.input +
  ';padding:7px 9px;box-sizing:border-box;width:100%;outline:none;';

var LABEL_CSS = 'display:block;font:600 11px ' + FONT.body + ';letter-spacing:.06em' +
  ';text-transform:uppercase;color:' + T.goldText + ';margin:0 0 5px;';

// LABEL_CSS is display:block, which takes a <th> out of the row and stacks the
// headers vertically, so table headers get the same look with table-cell back.
var TH_LABEL_CSS = LABEL_CSS + 'display:table-cell;';

var BTN_PRIMARY = 'font:600 13px ' + FONT.body + ';color:' + T.cream + ';background:' + T.violet +
  ';border:1px solid ' + T.violet + ';border-radius:' + RADIUS.input +
  ';padding:8px 16px;cursor:pointer;outline:none;';

var BTN_SECONDARY = 'font:600 13px ' + FONT.body + ';color:' + T.violet + ';background:transparent' +
  ';border:1px solid ' + T.hairline + ';border-radius:' + RADIUS.input +
  ';padding:8px 16px;cursor:pointer;outline:none;';

var MONO_CSS = 'font:12px ' + FONT.mono + ';color:' + T.muted + ';';

// A 2px gold focus ring on every control, for WCAG AA keyboard use.
function focusRingCss() {
  return '#app input:focus,#app select:focus,#app textarea:focus,#app button:focus,' +
         '#app [tabindex]:focus{box-shadow:0 0 0 2px ' + T.gold + ';border-color:' + T.gold + ';}' +
         '#app ::placeholder{color:' + T.muted + ';}' +
         '#app *{scrollbar-color:' + T.hairline + ' transparent;}';
}

function installBaseStyles() {
  var s = el('style', null, focusRingCss());
  document.head.appendChild(s);
  trackBodyNode(s);
}

// ---- toast --------------------------------------------------------------
var _toastEl = null, _toastTimer = null;

function toast(msg, isError) {
  if (!_toastEl) {
    _toastEl = el('div', { style:
      'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999;' +
      'padding:8px 16px;border-radius:' + RADIUS.input + ';font:600 13px ' + FONT.body + ';' +
      'pointer-events:none;opacity:0;transition:opacity .15s;' });
    document.body.appendChild(_toastEl);
    trackBodyNode(_toastEl);
  }
  _toastEl.textContent = msg;
  _toastEl.style.background = isError ? T.red : T.violet;
  _toastEl.style.color = T.cream;
  _toastEl.style.opacity = '1';
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () {
    if (_toastEl) _toastEl.style.opacity = '0';
  }, isError ? 4000 : 1500);
  _timers.push(_toastTimer);
}

// ---- page-level states --------------------------------------------------

function stateBlock(title, detail, accent) {
  return '<div style="display:flex;align-items:center;justify-content:center;height:60vh;">' +
    '<div style="text-align:center;max-width:420px;">' +
    '<div style="font:700 20px ' + FONT.display + ';color:' + (accent || T.ink) + ';">' + esc(title) + '</div>' +
    '<div style="font:14px ' + FONT.body + ';color:' + T.secondary + ';margin-top:8px;">' + esc(detail || '') + '</div>' +
    '</div></div>';
}

function loadingBlock() { return stateBlock('Loading', 'Fetching data from Pigment.'); }
function errorBlock(msg) { return stateBlock('Something went wrong', msg, T.red); }

function partialBanner() {
  return '<div style="background:#F7E7DE;color:' + T.copperText + ';border:1px solid ' + T.copper +
    ';border-radius:' + RADIUS.input + ';padding:8px 12px;margin-bottom:12px;font:600 12px ' +
    FONT.body + ';">Showing a partial result. Some rows were truncated by Pigment.</div>';
}

// ---- modal --------------------------------------------------------------

function openModal(width, innerHtml) {
  var back = el('div', { style:
    'position:fixed;inset:0;background:rgba(30,30,36,.45);z-index:9000;' +
    'display:flex;align-items:flex-start;justify-content:center;padding:48px 16px;overflow:auto;' });
  var box = el('div', { style: cardStyle(20) + 'width:' + width + 'px;max-width:100%;' }, innerHtml);
  back.appendChild(box);
  document.body.appendChild(back);
  trackBodyNode(back);
  on(back, 'mousedown', function (e) { if (e.target === back) closeModal(back); });
  return { back: back, box: box };
}

function closeModal(back) {
  if (back && back.parentNode) back.parentNode.removeChild(back);
}

// ---- sortable table -----------------------------------------------------

function tableHtml(cols, rows, opts) {
  opts = opts || {};
  var h = '<table style="width:100%;border-collapse:collapse;font:13px ' + FONT.body + ';">';
  h += '<thead><tr>';
  for (var c = 0; c < cols.length; c++) {
    var col = cols[c];
    var align = col.align || 'left';
    h += '<th data-sort="' + c + '" style="position:sticky;top:0;z-index:1;background:' + T.violet +
      ';color:' + T.cream + ';font:600 11px ' + FONT.body + ';letter-spacing:.05em;text-transform:uppercase;' +
      'text-align:' + align + ';padding:9px 10px;cursor:pointer;white-space:nowrap;">' +
      esc(col.label) + (opts.sortCol === c ? (opts.sortAsc ? ' ▲' : ' ▼') : '') + '</th>';
  }
  h += '</tr></thead><tbody>';
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var bg = row.muted ? T.creamMid : T.paper;
    h += '<tr data-row="' + esc(row.key) + '" style="background:' + bg +
      ';border-bottom:1px solid ' + T.creamMid + ';cursor:pointer;' +
      (row.muted ? 'opacity:.62;' : '') + '">';
    for (var i = 0; i < row.cells.length; i++) {
      var cc = cols[i] || {};
      h += '<td style="padding:8px 10px;text-align:' + (cc.align || 'left') +
        ';color:' + T.bodyInk + ';' + (cc.mono ? 'font-family:' + FONT.mono + ';' : '') +
        '">' + row.cells[i] + '</td>';
    }
    h += '</tr>';
  }
  h += '</tbody></table>';
  return h;
}
