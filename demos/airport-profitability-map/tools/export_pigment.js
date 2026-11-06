// Runs the mock engine headless and writes the Pigment load payloads to dist/pigment-load.json
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { window: {}, console, setTimeout, clearTimeout, Promise, Math, JSON, Object };
ctx.window.__MAN_BASEMAP = { paths: [], width: 3711, height: 3579 };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'src', 'mock-sdk.js'), 'utf8'), ctx);
const X = ctx.window.__APM_EXPORT();
const tot = { profit: 0, budget: 0, sales: 0 };
X.sources.unitMonthly.forEach(r => { const m = r.labels[1]; if (['Nov 26', 'Dec 26'].includes(m)) return; tot.sales += r.values[0]; tot.profit += r.values[5]; tot.budget += r.values[6]; });
console.log('YTD Oct profit', (tot.profit / 1e6).toFixed(1) + 'M', 'budget', (tot.budget / 1e6).toFixed(1) + 'M', 'sales', (tot.sales / 1e6).toFixed(1) + 'M');
console.log('units', X.units.length, 'gates', X.gates.length, 'objects', X.objects.length, 'objects JSON bytes', X.objects.reduce((s, o) => s + o.meta.length + o.name.length, 0));
console.log('asset annual cells', Object.values(X.assetAnnual).reduce((s, o) => s + Object.keys(o).length, 0));
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'pigment-load.json'), JSON.stringify(X));
