// Does the Copy for Excel button actually put the deals on the clipboard when
// it runs where Pigment runs it?
//
// The screenshot harness renders the Frame at the top level of a file:// page,
// which is more permissive than reality. A Frame is served inside
// sandbox="allow-scripts" on an opaque origin, and that sandbox silently
// refuses downloads - the first version of this button reported success and
// produced nothing (D37). So this loads the real built bundle into a real
// sandboxed iframe, clicks the real button with a real mouse event, and reads
// the clipboard back to see what, if anything, arrived.
//
// Usage:  node frames/harness/sandbox_export.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 9340;
const PROFILE = '/tmp/claude-0/-home-user-ai-plugins/806edf42-308f-5726-9497-ead9d7745aee/scratchpad/dl/sbprof';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const read = (f) => fs.readFileSync(path.join(HERE, f), 'utf8');
const inner = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">
<div id="app"></div>
<script>${read('mock_sdk.js')}</script>
<script>${read('fixtures.js')}</script>
<script>${read('../dist/pipeline.js')}</script>
<script>
// Report where the button is, so the test can click it for real.
window.addEventListener('message', function () {
  var b = document.getElementById('f-export');
  var r = b ? b.getBoundingClientRect() : null;
  parent.postMessage(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 }, '*');
});
</script>
</body></html>`;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;');

const parent = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">
<iframe id="f" sandbox="allow-scripts" style="position:absolute;left:0;top:0;width:1440px;height:1000px;border:0"
 srcdoc="${esc(inner)}"></iframe>
<script>
window.__rect = null;
window.addEventListener('message', function (e) { window.__rect = e.data; });
</script>
</body></html>`;

const file = path.join(HERE, 'sandbox_export.harness.html');
fs.writeFileSync(file, parent);

const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu',
  '--window-size=1440,1000', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore' });
await sleep(1400);

const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?file://${file}`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const waiters = []; const downloads = [];
await new Promise((r) => ws.addEventListener('open', r));
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); waiters.forEach((w) => w(m)); });
const send = (method, params = {}) => new Promise((res) => {
  const my = ++id;
  const h = (m) => { if (m.id === my) { waiters.splice(waiters.indexOf(h), 1); res(m); } };
  waiters.push(h); ws.send(JSON.stringify({ id: my, method, params }));
});
waiters.push((m) => { if (m.method && m.method.endsWith('downloadWillBegin')) downloads.push(1); });

const evalIn = async (expression) => (await send('Runtime.evaluate',
  { expression, returnByValue: true, awaitPromise: true, userGesture: true })).result?.result?.value;

await send('Page.enable');
await send('Browser.grantPermissions', { permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: PROFILE + '/dl', eventsEnabled: true });
await sleep(2500);                       // let the Frame boot and render

await evalIn(`document.getElementById('f').contentWindow.postMessage('rect','*')`);
await sleep(400);
const rect = await evalIn('JSON.stringify(window.__rect)');
const pos = rect ? JSON.parse(rect) : null;
if (!pos || !pos.x) { console.log('  x the Copy for Excel button never rendered inside the sandbox'); process.exit(1); }

await evalIn(`navigator.clipboard.writeText('SENTINEL')`);   // so a no-op is visible
for (const type of ['mousePressed', 'mouseReleased']) {
  await send('Input.dispatchMouseEvent', { type, x: Math.round(pos.x), y: Math.round(pos.y), button: 'left', clickCount: 1 });
}

await sleep(1500);

const clip = await evalIn('navigator.clipboard.readText()');
ws.close(); chrome.kill();

// Chrome normalises line endings on the clipboard, so split on either.
const lines = (clip || '').replace(/\r\n/g, '\n').split('\n');
const header = lines[0] || '';
const cols = header.split('\t');
const problems = [];
if (clip === 'SENTINEL' || !clip) problems.push('nothing reached the clipboard');
if (!/^Opportunity name\tSales person\tStage\t/.test(header)) problems.push('header is not the deal columns: ' + header.slice(0, 60));
if (cols.length !== 28) problems.push('expected 28 columns, got ' + cols.length);
if (lines.length < 2) problems.push('no data rows');
for (let i = 1; i < lines.length; i++) {
  if (lines[i].split('\t').length !== cols.length) { problems.push('row ' + i + ' has the wrong column count'); break; }
}
if (downloads.length) problems.push('a download fired, which this sandbox cannot deliver');

console.log('  button position inside sandbox: %d,%d', Math.round(pos.x), Math.round(pos.y));
console.log('  clipboard: %d chars, %d lines, %d columns', (clip || '').length, lines.length, cols.length);
if (problems.length) {
  problems.forEach((p) => console.log('  x ' + p));
  process.exit(1);
}
console.log('  + the real button, in a real allow-scripts sandbox, put %d deals on the clipboard', lines.length - 1);
process.exit(0);
