// Builds the clickable mockup: inlines the mock SDK and the Frame body into one HTML page.
// Usage: node build.js
const fs = require('fs');
const path = require('path');
const src = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const basemap = 'window.__MAN_BASEMAP = ' + src('basemap-man.json').trim() + ';';
const mock = basemap + '\n' + src('mock-sdk.js');
const frame = src('frame.js');
const head = [
  '<title>Aurora Airport Profit Map</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<style>:root{color-scheme:dark}html,body{height:100%;margin:0;background:#0b0f14;color:#eef1f4}#app{height:100%}</style>'
].join('\n');
const body = ['<div id="app"></div>', '<script>', mock, '</script>', '<script>', frame, '</script>'].join('\n');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
// Page fragment (the artifact host wraps it in a document skeleton)
fs.writeFileSync(path.join(__dirname, 'dist', 'airport-profit-map.html'), head + '\n' + body + '\n');
// Standalone file for opening locally in a browser
fs.writeFileSync(path.join(__dirname, 'dist', 'standalone.html'),
  '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + head + '\n</head><body>\n' + body + '\n</body></html>\n');
console.log('Built dist/airport-profit-map.html and dist/standalone.html');
