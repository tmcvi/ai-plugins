// Runs a mock engine headless and writes the Pigment load payloads.
//   node tools/export_pigment.js        Manchester -> dist/pigment-load.json
//   node tools/export_pigment.js LGW    Gatwick    -> dist/pigment-load-lgw.json
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const code = (process.argv[2] || 'MAN').toUpperCase();
const ctx = { window: {}, console, setTimeout, clearTimeout, Promise, Math, JSON, Object };
let file = 'mock-sdk.js';
if (code === 'LGW') { ctx.window.__LGW_GEO = JSON.parse(fs.readFileSync(path.join(root, 'src', 'geo-lgw.json'), 'utf8')); file = 'mock-lgw.js'; }
else ctx.window.__MAN_BASEMAP = { paths: [], width: 3711, height: 3579 };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'src', file), 'utf8'), ctx);
const X = ctx.window.__APM_EXPORT();
const tot = { profit: 0, budget: 0, sales: 0 };
X.sources.unitMonthly.forEach(r => { const m = r.labels[1]; if (['Nov 26', 'Dec 26'].includes(m)) return; tot.sales += r.values[0]; tot.profit += r.values[5]; tot.budget += r.values[6]; });
console.log(code, 'YTD Oct profit', (tot.profit / 1e6).toFixed(1) + 'M', 'budget', (tot.budget / 1e6).toFixed(1) + 'M', 'sales', (tot.sales / 1e6).toFixed(1) + 'M');
console.log('units', X.units.length, 'gates', X.gates.length, 'assets', X.assets.length, 'objects', X.objects.length, 'objects JSON bytes', X.objects.reduce((s, o) => s + o.meta.length + o.name.length, 0));
console.log('asset annual cells', Object.values(X.assetAnnual).reduce((s, o) => s + Object.keys(o).length, 0));
if (X.layoutIssues && X.layoutIssues.length) console.log('LAYOUT ISSUES:\n  ' + X.layoutIssues.join('\n  '));
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', code === 'LGW' ? 'pigment-load-lgw.json' : 'pigment-load.json'), JSON.stringify(X));
