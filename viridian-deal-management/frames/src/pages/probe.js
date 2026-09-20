// ZZ SDK Probe - a throwaway diagnostic Frame, not part of the application.
// It reports what this workspace's PigmentSDK actually offers and what the new
// data-source subscription hands back, so the six real Frames can be written
// against the live contract instead of the (stale) skill documentation.
// Delete this Frame once the readers are fixed.
(function () {
'use strict';
var root = document.getElementById('app');
if (root.__cleanup) root.__cleanup();
root.innerHTML = '';
root.style.cssText = 'position:fixed;inset:0;overflow:auto;background:#FDFBF5;';

var bar = document.createElement('div');
bar.style.cssText = 'padding:12px 16px;background:#2D1B4E;color:#F6F1E7;font:600 13px sans-serif;';
bar.textContent = 'Pigment SDK probe - click Copy report, then paste it back to Claude';
var btn = document.createElement('button');
btn.textContent = 'Copy report';
btn.style.cssText = 'margin-left:16px;padding:6px 12px;font:600 12px sans-serif;cursor:pointer;';
bar.appendChild(btn);

var out = document.createElement('pre');
out.style.cssText = 'font:12px ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;' +
  'padding:16px;margin:0;color:#1E1E24;';
root.appendChild(bar);
root.appendChild(out);

var lines = [];
function log(s) { lines.push(s); out.textContent = lines.join('\n'); }
btn.onclick = function () {
  try { navigator.clipboard.writeText(out.textContent); btn.textContent = 'Copied'; }
  catch (e) { btn.textContent = 'Select the text manually'; }
};

function show(v, n) {
  var s;
  try { s = JSON.stringify(v); } catch (e) { s = null; }
  if (s === undefined || s === null) s = String(v);
  return s.length > n ? s.slice(0, n) + ' ...(' + s.length + ' chars total)' : s;
}

var SDK = window.PigmentSDK;

log('== SDK inventory ==');
if (!SDK) {
  log('window.PigmentSDK is missing');
} else {
  var names = {}, k, i;
  for (k in SDK) names[k] = 1;
  var own = Object.getOwnPropertyNames(SDK);
  for (i = 0; i < own.length; i++) names[own[i]] = 1;
  var keys = Object.keys(names).sort();
  for (i = 0; i < keys.length; i++) {
    var v = SDK[keys[i]];
    var line = '  ' + keys[i] + ' : ' + typeof v;
    if (typeof v === 'function') {
      line += ' (arity ' + v.length + ')  ' + String(v).replace(/\s+/g, ' ').slice(0, 160);
    }
    log(line);
  }
}

function firstFn(list) {
  for (var i = 0; i < list.length; i++) {
    if (SDK && typeof SDK[list[i]] === 'function') return list[i];
  }
  return null;
}

var subName = firstFn(['useSubscribeToDataSource', 'subscribeToDataSource', 'subscribeToVizualization']);
var itemsName = firstFn(['useSubscribeToItems', 'subscribeToItems', 'useSubscribeToList', 'subscribeToList']);

log('\n== data-source subscription resolved to: ' + subName + ' ==');

var timers = [];
function probeDs(alias) {
  if (!subName) return;
  var fired = false;
  try {
    var sub = SDK[subName](alias, {
      onData: function (d) {
        if (fired) return;
        fired = true;
        log('\n[' + alias + '] onData: typeof ' + (typeof d));
        if (d && typeof d === 'object') {
          log('  top-level keys: ' + Object.keys(d).join(', '));
          if (d.labels && typeof d.labels === 'object') {
            log('  labels keys: ' + Object.keys(d.labels).join(', '));
            log('  labels.rows[0]: ' + show(d.labels.rows && d.labels.rows[0], 200));
            log('  labels.columns[0]: ' + show(d.labels.columns && d.labels.columns[0], 200));
            log('  rows/cols: ' + ((d.labels.rows || []).length) + ' / ' + ((d.labels.columns || []).length));
          }
          if (d.cells) log('  cells[0]: ' + show(d.cells[0], 200));
        }
        log('  payload: ' + show(d, 900));
      },
      onError: function (e) {
        log('\n[' + alias + '] onError: ' + ((e && e.message) ? e.message : show(e, 300)));
      },
      pageDefinitions: []
    });
    log('[' + alias + '] call returned ' + typeof sub +
      (sub && typeof sub === 'object' ? ' keys: ' + Object.keys(sub).join(',') : ''));
  } catch (e) {
    log('[' + alias + '] threw: ' + ((e && e.message) ? e.message : String(e)));
  }
  timers.push(setTimeout(function () {
    if (!fired) log('[' + alias + '] no onData within 6s');
  }, 6000));
}

probeDs('dsScalar');
probeDs('dsOpp');
probeDs('dsOppWeek');
probeDs('dsOppMonth');

log('\n== item subscription resolved to: ' + itemsName + ' ==');

function probeItems(alias) {
  if (!itemsName) return;
  var fired = false;
  try {
    var sub = SDK[itemsName](alias, {
      onData: function (d) {
        if (fired) return;
        fired = true;
        log('\n[items ' + alias + '] onData: typeof ' + (typeof d) +
          (d && typeof d === 'object' && !Array.isArray(d) ? ' keys: ' + Object.keys(d).join(', ') : ''));
        log('  payload: ' + show(d, 700));
      },
      onError: function (e) {
        log('\n[items ' + alias + '] onError: ' + ((e && e.message) ? e.message : show(e, 300)));
      }
    });
    log('[items ' + alias + '] call returned ' + typeof sub +
      (sub && typeof sub === 'object' ? ' keys: ' + Object.keys(sub).join(',') : ''));
  } catch (e) {
    log('[items ' + alias + '] threw: ' + ((e && e.message) ? e.message : String(e)));
  }
  timers.push(setTimeout(function () {
    if (!fired) log('[items ' + alias + '] no onData within 6s');
  }, 6000));
}

probeItems('salesPerson');
probeItems('opportunity');

root.__cleanup = function () {
  for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
  root.innerHTML = '';
};
})();
