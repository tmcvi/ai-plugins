// Builds the Frame bodies and the clickable mockups, one per airport.
//   dist/frame-body.js / .min.js            Manchester (MAN) Frame body
//   dist/frame-body-lgw.js / .min.js        London Gatwick (LGW) Frame body
//   dist/airport-profit-map.html, standalone.html            MAN page (mock SDK + Frame)
//   dist/airport-profit-map-lgw.html, standalone-lgw.html    LGW page
// Usage: node build.js   (minifying needs the 'terser' package; skipped if missing)
const fs = require('fs');
const path = require('path');
const src = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
// Compact basemap encoding: rings as delta-coded points, one character per coordinate
// step in -32..31 (alphabet below); larger steps are escaped as ~dx,dy~.
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function encodePath(d) {
  return d.split('Z').filter(Boolean).map((ring) => {
    const pts = ring.replace(/^M/, '').split(/ ?L/).map((p) => p.split(',').map(Number));
    let out = pts[0][0] + ',' + pts[0][1] + ':';
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
      out += (dx >= -32 && dx < 32 && dy >= -32 && dy < 32) ? ALPHA[dx + 32] + ALPHA[dy + 32] : '~' + dx + ',' + dy + '~';
    }
    return out;
  }).join('|');
}
const AIRPORTS = {
  MAN: { suffix: '', title: 'Aurora Airport Profit Map', basemap: () => JSON.parse(src('basemap-man.json')).paths, mock: () => src('mock-sdk.js') },
  LGW: { suffix: '-lgw', title: 'Gatwick Commercial Map', basemap: () => JSON.parse(src('geo-lgw.json')).basemap,
    // the mock reads the geometry from window.__LGW_GEO
    mock: () => 'window.__LGW_GEO = ' + src('geo-lgw.json') + ';\n' + src('mock-lgw.js') }
};
let terser = null;
try { terser = require(process.env.TERSER_PATH || 'terser'); } catch (e) { /* optional */ }
const dist = path.join(__dirname, 'dist');
fs.mkdirSync(dist, { recursive: true });
const only = process.argv[2];
Object.keys(AIRPORTS).filter((k) => !only || k === only).forEach((code) => {
  const A = AIRPORTS[code];
  const BASE_ENC = A.basemap().map((p) => p.type + '=' + encodePath(p.d)).join('\n');
  const frame = src('frame.js')
    .replace('  /*@AIRPORT@*/', () => '  var APM_AIRPORT = ' + JSON.stringify(code) + ';')
    .replace('  /*@BASEMAP@*/', () => '  var APM_BASEMAP_ENC = ' + JSON.stringify(BASE_ENC) + ';')
    .replace('  /*@MAP3D@*/', () => src('map3d.js'));
  fs.writeFileSync(path.join(dist, 'frame-body' + A.suffix + '.js'), frame);
  const mock = A.mock();
  const head = [
    '<title>' + A.title + '</title>',
    '<meta name="claude:viewport-fit-sides" content="cover">',
    '<style>:root{color-scheme:dark}html,body{height:100%;margin:0;background:#0b0f14;color:#eef1f4}#app{height:100%}</style>'
  ].join('\n');
  const page = (body) => {
    const html = ['<div id="app"></div>', '<script>', mock, '</script>', '<script>', body, '</script>'].join('\n');
    fs.writeFileSync(path.join(dist, 'airport-profit-map' + A.suffix + '.html'), head + '\n' + html + '\n');
    fs.writeFileSync(path.join(dist, 'standalone' + A.suffix + '.html'),
      '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + head + '\n</head><body>\n' + html + '\n</body></html>\n');
  };
  if (terser) {
    terser.minify(frame, { compress: { passes: 2 }, mangle: true, format: { ascii_only: false } }).then((r) => {
      fs.writeFileSync(path.join(dist, 'frame-body' + A.suffix + '.min.js'), r.code);
      page(r.code);
      console.log(code + ': built (minified Frame body ' + Math.round(r.code.length / 1024) + ' KB, ' + r.code.length + ' chars)');
    });
  } else { page(frame); console.log(code + ': built (terser not found, page uses the readable body)'); }
});
