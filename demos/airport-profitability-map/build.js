// Builds the Frame body and the clickable mockup.
//   dist/frame-body.js            readable Frame body (3D module + basemap inlined)
//   dist/frame-body.min.js        minified Frame body, the one to paste into Pigment
//   dist/airport-profit-map.html  artifact page (mock SDK + Frame)
//   dist/standalone.html          the same page as a complete HTML file
// Usage: node build.js   (minifying needs the 'terser' package; skipped if missing)
const fs = require('fs');
const path = require('path');
const src = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const basemap = JSON.parse(src('basemap-man.json'));
// Compact basemap encoding: rings as delta-coded points, one character per coordinate
// step in -32..31 (alphabet below); larger steps are escaped as ~dx,dy~.
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function encodePath(d) {
  return d.split('Z').filter(Boolean).map((ring) => {
    const pts = ring.replace(/^M/, '').split(' L').map((p) => p.split(',').map(Number));
    let out = pts[0][0] + ',' + pts[0][1] + ':';
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
      out += (dx >= -32 && dx < 32 && dy >= -32 && dy < 32) ? ALPHA[dx + 32] + ALPHA[dy + 32] : '~' + dx + ',' + dy + '~';
    }
    return out;
  }).join('|');
}
const BASE_ENC = basemap.paths.map((p) => p.type + '=' + encodePath(p.d)).join('\n');
const frame = src('frame.js')
  .replace('  /*@BASEMAP@*/', () => '  var APM_BASEMAP_ENC = ' + JSON.stringify(BASE_ENC) + ';')
  .replace('  /*@MAP3D@*/', () => src('map3d.js'));
const mock = src('mock-sdk.js');
const dist = path.join(__dirname, 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'frame-body.js'), frame);
const head = [
  '<title>Aurora Airport Profit Map</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<style>:root{color-scheme:dark}html,body{height:100%;margin:0;background:#0b0f14;color:#eef1f4}#app{height:100%}</style>'
].join('\n');
function page(body) {
  const html = ['<div id="app"></div>', '<script>', mock, '</script>', '<script>', body, '</script>'].join('\n');
  fs.writeFileSync(path.join(dist, 'airport-profit-map.html'), head + '\n' + html + '\n');
  fs.writeFileSync(path.join(dist, 'standalone.html'),
    '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + head + '\n</head><body>\n' + html + '\n</body></html>\n');
}
let terser = null;
try { terser = require(process.env.TERSER_PATH || 'terser'); } catch (e) { /* optional */ }
if (terser) {
  terser.minify(frame, { compress: { passes: 2 }, mangle: true, format: { ascii_only: false } }).then((r) => {
    fs.writeFileSync(path.join(dist, 'frame-body.min.js'), r.code);
    page(r.code);
    console.log('Built (minified Frame body ' + Math.round(r.code.length / 1024) + ' KB)');
  });
} else { page(frame); console.log('Built (terser not found, page uses the readable body)'); }
