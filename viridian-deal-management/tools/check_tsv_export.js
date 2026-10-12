// Pull the export helpers out of the built bundle and exercise them directly.
//
// The Pipeline Frame cannot download a file - it runs in sandbox="allow-scripts"
// with no allow-downloads - so the export puts tab-separated text on the
// clipboard instead (D37). Excel pastes that straight into cells, which means
// the one thing that must never happen is a stray tab or newline inside a
// value: it would silently shift every later column of that row.
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
  + '\n' + grab('function tsvCell(')
  + '\n' + grab('function dealsTsv(')
  + '\n module.exports = { dealsTsv, tsvCell, EXPORT_COLS };';

const mod = { exports: {} };
new Function('module', code)(mod);
const { dealsTsv, tsvCell, EXPORT_COLS } = mod.exports;

let bad = 0;
function fail() { console.log.apply(console, ['FAIL'].concat([].slice.call(arguments))); bad++; }

// Cell rules: no tab, no newline, nothing that reads as empty rendered as a word.
const cases = [
  ['plain', 'plain'],
  ['a,b', 'a,b'],                       // commas are safe in TSV, left alone
  ['say "hi"', 'say "hi"'],             // so are quotes, and they must NOT be doubled
  ['two\nlines', 'two lines'],
  ['tab\there', 'tab here'],
  ['  padded  ', 'padded'],
  ['a\r\n\tb', 'a b'],
  [null, ''], [undefined, ''],
  [1234.5, '1234.5'], [NaN, ''], [Infinity, ''], [0, '0'],
];
for (const [input, want] of cases) {
  const got = tsvCell(input);
  if (got !== want) fail('tsvCell', JSON.stringify(input), '->', JSON.stringify(got), 'want', JSON.stringify(want));
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

const tsv = dealsTsv(rows);
const lines = tsv.split('\r\n');
if (lines.length !== rows.length + 1) fail('row count', lines.length, 'want', rows.length + 1);
if (/\n/.test(tsv.replace(/\r\n/g, ''))) fail('a bare newline survived into the payload');

const recs = lines.map((l) => l.split('\t'));
for (const r of recs) {
  if (r.length !== EXPORT_COLS.length) fail('field count', r.length, 'want', EXPORT_COLS.length);
}
if (recs[0] && recs[0][0] !== 'Opportunity name') fail('header', JSON.stringify(recs[0] && recs[0][0]));
if (recs[1] && recs[1][0] !== 'Acme, Inc - Phase 1') fail('name roundtrip', recs[1][0]);
if (recs[1] && recs[1][3] !== '30') fail('win% ->', recs[1][3]);
if (recs[1] && recs[1][5] !== 'Q1 26') fail('quarter ->', recs[1][5]);
// The embedded newline in Notes is the one that would wreck the paste.
if (recs[1] && recs[1][recs[1].length - 1] !== 'He said "yes" next week') {
  fail('notes flattening', JSON.stringify(recs[1][recs[1].length - 1]));
}
if (recs[2] && recs[2][9] !== '') fail('blank licence ->', JSON.stringify(recs[2][9]));
if (recs[2] && recs[2][24] !== 'Yes') fail('dropped flag ->', JSON.stringify(recs[2][24]));

console.log(bad
  ? bad + ' FAILURES'
  : 'tsv export ok: ' + EXPORT_COLS.length + ' columns, ' + (recs.length - 1) +
    ' rows, no stray tabs or newlines');
process.exit(bad ? 1 : 0);
