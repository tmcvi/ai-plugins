// Pull the export helpers out of the built bundle and exercise them directly.
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');

function grab(name, open) {
  open = open || '{';
  const close = open === '{' ? '}' : ']';
  const start = src.indexOf('\n' + name);
  if (start === -1) throw new Error('not found: ' + name);
  let i = src.indexOf(open, start), depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === open) depth++;
    else if (src[j] === close) { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unbalanced: ' + name);
}

const prelude = `
function isNum(v) { return typeof v === 'number' && isFinite(v); }
function quarterOf(v){ if(!v) return ''; var m=/^(\\d{4})-(\\d{2})/.exec(v); if(!m) return '';
  return 'Q' + (Math.floor((+m[2]-1)/3)+1) + ' ' + m[1].slice(2); }
`;
const code = prelude
  + grab('var EXPORT_COLS = [', '[') + ';'
  + '\n' + grab('function pctNum(')
  + '\n' + grab('function csvCell(')
  + '\n' + grab('function dealsCsv(')
  + '\n module.exports = { dealsCsv, csvCell, EXPORT_COLS };';

const mod = { exports: {} };
new Function('module', code)(mod);
const { dealsCsv, csvCell, EXPORT_COLS } = mod.exports;

// quoting rules
const cases = [
  ['plain', 'plain'], ['a,b', '"a,b"'], ['say "hi"', '"say ""hi"""'],
  ['two\nlines', '"two\nlines"'], [null, ''], [undefined, ''],
  [1234.5, '1234.5'], [NaN, ''], [0, '0'],
];
let bad = 0;
for (const [input, want] of cases) {
  const got = csvCell(input);
  if (got !== want) { console.log('FAIL csvCell', JSON.stringify(input), '->', JSON.stringify(got), 'want', JSON.stringify(want)); bad++; }
}

const rows = [
  { name: 'Acme, Inc - Phase 1', person: 'Tom', stage: 'Demo', winRate: 0.3,
    closeDate: '2026-03-31', useCase: 'FP&A', motion: 'Partner-led', size: 'Medium',
    licenceUsd: 120000, licenceStd: 100000, licenceOvr: 120000,
    services: 54000, wServices: 16200, commission: 9000, wCommission: 2700,
    days: 45, daysStd: 40, daysOvr: 45, ae: 'Dana', matchStatus: 'Matched',
    matchedTo: 'Acme - New', stageAlign: 'Aligned', closeGap: -4,
    dropped: false, pigClosed: false, profileOk: true,
    item: { Notes: 'He said "yes"\nnext week' } },
  { name: 'Beta Ltd', person: 'Sam', stage: 'Holding pool', winRate: null,
    closeDate: '', useCase: '', motion: '', size: 'Small',
    licenceUsd: null, licenceStd: null, licenceOvr: null,
    services: null, wServices: null, commission: null, wCommission: null,
    days: null, daysStd: null, daysOvr: null, ae: '', matchStatus: 'Viridian only',
    matchedTo: '', stageAlign: null, closeGap: null,
    dropped: true, pigClosed: false, profileOk: false, item: {} },
];

const csv = dealsCsv(rows);
const lines = csv.split('\r\n');
if (lines.length !== 3) { console.log('FAIL row count', lines.length); bad++; }

// A correct CSV must parse back to the same field count on every line.
function parse(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i+1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
}
// the embedded newline means line 1 of row 1 continues; rejoin on quote parity
const recs = []; let buf = '';
for (const l of lines) {
  buf = buf ? buf + '\n' + l : l;
  if ((buf.match(/"/g) || []).length % 2 === 0) { recs.push(parse(buf)); buf = ''; }
}
if (recs.length !== 3) { console.log('FAIL record count', recs.length); bad++; }
for (const r of recs) {
  if (r.length !== EXPORT_COLS.length) { console.log('FAIL field count', r.length, 'want', EXPORT_COLS.length); bad++; }
}
if (recs[1] && recs[1][0] !== 'Acme, Inc - Phase 1') { console.log('FAIL name roundtrip', recs[1][0]); bad++; }
if (recs[1] && recs[1][3] !== '30') { console.log('FAIL win% ->', recs[1][3]); bad++; }
if (recs[1] && recs[1][recs[1].length-1] !== 'He said "yes"\nnext week') { console.log('FAIL notes roundtrip', JSON.stringify(recs[1][recs[1].length-1])); bad++; }
if (recs[2] && recs[2][9] !== '') { console.log('FAIL blank licence ->', JSON.stringify(recs[2][9])); bad++; }

console.log(bad ? bad + ' FAILURES' : 'csv export ok: ' + EXPORT_COLS.length + ' columns, ' + (recs.length-1) + ' rows, quoting and round-trip clean');
process.exit(bad ? 1 : 0);
