// Display formatting (brief section 7.2): money with no decimals, days to one
// decimal, hours whole, percentages to one decimal, dates as d MMM yyyy.
var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function isNum(v) { return typeof v === 'number' && isFinite(v); }

function num(v, dp) {
  if (!isNum(v)) return '-';
  return v.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function money(v) { return isNum(v) ? '£' + num(Math.round(v), 0) : '-'; }
function moneyUsd(v) { return isNum(v) ? '$' + num(Math.round(v), 0) : '-'; }
function days(v) { return isNum(v) ? num(v, 1) : '-'; }
function hours(v) { return isNum(v) ? num(Math.round(v), 0) : '-'; }
function pct(v, dp) { return isNum(v) ? num(v * 100, dp === undefined ? 1 : dp) + '%' : '-'; }

// Compact money for KPI cards: 412000 -> "GBP 412k"
function moneyShort(v) {
  if (!isNum(v)) return '-';
  var a = Math.abs(v);
  if (a >= 1000000) return '£' + num(v / 1000000, 1) + 'm';
  if (a >= 1000) return '£' + num(Math.round(v / 1000), 0) + 'k';
  return '£' + num(Math.round(v), 0);
}

// Pigment hands dates back as ISO strings.
function parseDate(v) {
  if (!v || typeof v !== 'string') return null;
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

function fmtDate(v) {
  var d = parseDate(v);
  if (!d) return '-';
  return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}

function isoDate(d) {
  function p(n) { return (n < 10 ? '0' : '') + n; }
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
}

function todayIso() { return isoDate(new Date()); }

function quarterOf(v) {
  var d = parseDate(v);
  if (!d) return '';
  return 'Q' + (Math.floor(d.getUTCMonth() / 3) + 1) + ' ' + String(d.getUTCFullYear()).slice(2);
}

function daysBetween(a, b) {
  var x = parseDate(a), y = parseDate(b);
  if (!x || !y) return null;
  return Math.round((x - y) / 86400000);
}

// Last day of the quarter after the current one - the New deal date default.
function defaultCloseDate() {
  var n = new Date();
  var q = Math.floor(n.getUTCMonth() / 3) + 1;
  var y = n.getUTCFullYear();
  if (q === 4) { q = 1; y += 1; } else { q += 1; }
  var endMonth = q * 3;
  return isoDate(new Date(Date.UTC(y, endMonth, 0)));
}

function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Strip currency symbols, separators and spaces before writing a number back.
function parseNumberInput(raw) {
  if (raw === null || raw === undefined) return null;
  var s = String(raw).replace(/[£$,\s]/g, '').trim();
  if (s === '') return null;
  if (!/^-?\d*\.?\d+$/.test(s)) return NaN;
  return parseFloat(s);
}
