/* ---------------------------------------------------------------------------
 * Throwaway diagnostic. Prints the in-iframe SDK surface so the real Frames
 * API for this tenant can be written against fact rather than documentation.
 *
 * Needed because this tenant rejects Frame bindings of type View, so the
 * documented subscribeToVizualization-on-a-View model does not apply here,
 * and the Frame editor placeholder is too minimal to show what does.
 *
 * Built bare (no shared module) - see BARE in build.py. Delete the Frame once
 * its output has been captured.
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var root = document.getElementById('app');
  if (root.__cleanup) root.__cleanup();

  var lines = [];
  var subs = [];
  var pending = 0;

  root.style.cssText = 'position:fixed;inset:0;overflow:auto;padding:16px;background:#fff;' +
    'font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#111827';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function render() {
    root.innerHTML = '<div style="font:600 14px system-ui;margin-bottom:10px">' +
      'Pigment Frames API probe &mdash; screenshot or copy all of this' +
      '</div><pre style="white-space:pre-wrap;margin:0">' + esc(lines.join('\n')) + '</pre>';
  }
  function w(s) { lines.push(s == null ? '' : String(s)); render(); }
  function safe(v, cap) {
    var lim = cap || 900;
    try {
      var s = JSON.stringify(v);
      if (s === undefined) return String(v);
      return s.length > lim ? s.slice(0, lim) + ' ...(truncated, ' + s.length + ' chars)' : s;
    } catch (e) {
      return '<unstringifiable ' + (typeof v) + '>';
    }
  }
  function sig(fn) {
    var s = String(fn).replace(/\s+/g, ' ');
    return s.length > 180 ? s.slice(0, 180) + ' ...' : s;
  }

  /* -- 1. where is the SDK ------------------------------------------------- */
  w('=== 1. GLOBALS ===');
  var hits = [];
  for (var gk in window) {
    try { if (/pigment|frame|sdk/i.test(gk)) hits.push(gk); } catch (e) {}
  }
  w('window keys matching /pigment|frame|sdk/i: ' + (hits.length ? hits.join(', ') : '(none)'));
  w('typeof window.PigmentSDK: ' + (typeof window.PigmentSDK));

  var sdk = window.PigmentSDK;
  if (!sdk) { w(''); w('!! No window.PigmentSDK. Nothing further can be probed.'); return; }

  /* -- 2. the surface ------------------------------------------------------ */
  w('');
  w('=== 2. SDK SURFACE ===');
  var forIn = [];
  for (var k in sdk) forIn.push(k);
  w('for-in:              ' + forIn.join(', '));
  var own = Object.getOwnPropertyNames(sdk);
  w('ownPropertyNames:    ' + own.join(', '));
  var proto = Object.getPrototypeOf(sdk);
  if (proto && proto !== Object.prototype) {
    w('prototype own:       ' + Object.getOwnPropertyNames(proto).join(', '));
  }
  w('frozen:              ' + Object.isFrozen(sdk));

  var all = own.slice();
  for (var f = 0; f < forIn.length; f++) if (all.indexOf(forIn[f]) < 0) all.push(forIn[f]);
  if (proto && proto !== Object.prototype) {
    var pn = Object.getOwnPropertyNames(proto);
    for (var p = 0; p < pn.length; p++) if (all.indexOf(pn[p]) < 0) all.push(pn[p]);
  }

  var subscribeLike = [];
  w('');
  for (var i = 0; i < all.length; i++) {
    var name = all[i], val;
    try { val = sdk[name]; } catch (e) { w('  ' + name + ' -> threw on access'); continue; }
    if (typeof val === 'function') {
      w('  fn  ' + name + '  arity=' + val.length);
      w('        ' + sig(val));
      if (/subscribe|watch|listen|observe|read|query|data/i.test(name)) subscribeLike.push(name);
    } else {
      w('  val ' + name + ' = ' + safe(val, 300));
    }
  }
  w('');
  w('candidate read methods: ' + (subscribeLike.length ? subscribeLike.join(', ') : '(none matched)'));

  /* -- 3. what the manifest gave us --------------------------------------- */
  /* The manifest declares one dataSource named "src" over a List binding
     "versions" (labels) and a Metric binding "peak" (values), plus a second
     dataSource "grid" with two label dimensions, to see how a real pivot
     comes back. Try every candidate method against every name, so whichever
     combination this tenant wants shows up. */
  w('');
  w('=== 3. READ ATTEMPTS ===');
  var targets = ['src', 'grid', 'versions', 'peak', 'stages'];

  function attempt(method, target) {
    var label = method + '(\'' + target + '\')';
    var handle;
    pending++;
    try {
      handle = sdk[method](target, {
        pageDefinitions: [],
        onData: function (d) {
          w('');
          w('--> ' + label + ' onData');
          w('    top-level keys: ' + (d && typeof d === 'object' ? Object.keys(d).join(', ') : typeof d));
          w('    payload: ' + safe(d, 1400));
          done();
        },
        onError: function (e) {
          w('--> ' + label + ' onError: ' + (e && e.message ? e.message : safe(e, 200)));
          done();
        }
      });
      var hk = (handle && typeof handle === 'object') ? Object.keys(handle) : [];
      var hp = [];
      if (handle) {
        for (var q in handle) if (typeof handle[q] === 'function') hp.push(q + '/' + handle[q].length);
      }
      w('  ok  ' + label + '  handle keys: [' + hk.join(', ') + ']  methods: [' + hp.join(', ') + ']');
      if (handle && typeof handle.unsubscribe === 'function') subs.push(handle);
    } catch (err) {
      pending--;
      w('  ERR ' + label + ': ' + (err && err.message ? err.message : String(err)));
    }
  }
  function done() { pending--; if (pending <= 0) w('\n=== all callbacks settled ==='); }

  for (var m = 0; m < subscribeLike.length; m++) {
    for (var t = 0; t < targets.length; t++) attempt(subscribeLike[m], targets[t]);
  }
  if (!subscribeLike.length) {
    w('No candidate method names matched. Every function above is listed with its');
    w('source, so the right one can be identified by hand.');
  }

  /* -- 4. write path ------------------------------------------------------- */
  w('');
  w('=== 4. WRITE PATH (inspected, not called) ===');
  var writeLike = ['editValue', 'editItem', 'addItem', 'setValue', 'write', 'writeValue', 'submit'];
  for (var x = 0; x < writeLike.length; x++) {
    var wn = writeLike[x], wv;
    try { wv = sdk[wn]; } catch (e2) { wv = null; }
    w('  ' + wn + ': ' + (typeof wv === 'function' ? 'present, arity=' + wv.length : 'absent'));
  }
  w('');
  w('(No write is attempted - this probe never changes data.)');

  root.__cleanup = function () {
    for (var s = 0; s < subs.length; s++) { try { subs[s].unsubscribe(); } catch (e) {} }
    subs = [];
    root.innerHTML = '';
    root.__cleanup = null;
  };
})();
