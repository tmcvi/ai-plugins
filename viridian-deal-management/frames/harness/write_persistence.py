#!/usr/bin/env python3
"""Does a saved edit stay on screen while Pigment is still recalculating?

A Frame writes, toasts "Saved", then re-reads its sources a moment later.
Pigment recalculates asynchronously, so that re-read can still carry the value
from before the write - and a page that keeps no record of what it just wrote
renders the stale value straight back over the edit. That is the "it says saved
then reverts" bug, and it is invisible to the screenshot harness because the
mock SDK's reads never reflect its writes at all.

Here the mock becomes a little server with a settable lag, so the three things
that matter can be checked directly:

  1. an edit holds while the server is still behind;
  2. the override cells, which show an *effective* figure rather than the value
     written, hold too;
  3. once the server has caught up the page lets go again - the overlay must
     not pin a value on screen for ever, or a later change by someone else
     would be invisible.

Usage:  python3 frames/harness/write_persistence.py
"""
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

DEAL = "Calderwood - Consolidation"
OTHER = "Bellhaven - Supply Chain"
STAGE = "Scoping"
LATER = "Demo"          # what "someone else" moves it to afterwards
NEVER = 999999
SOON = 300

# Stage sits at column 1 of vwPipelineGrid__DimensionP (see DS_COLUMNS).
PAGE = """<!doctype html>
<html><head><meta charset="utf-8"><title>wp</title></head>
<body style="margin:0">
<div id="app"></div>
<pre id="__errors" style="display:none"></pre>
<pre id="__download" style="display:none"></pre>
<script src="mock_sdk.js"></script>
<script src="fixtures.js"></script>
<script>
// A server that accepts writes but only reflects them after LAG ms, which is
// what Pigment's recalculation looks like from inside the Frame.
var SERVER = (function () {
  var LAG = %(lag)d;
  var real = window.PigmentSDK;
  var committed = {};
  window.PigmentSDK = {
    subscribeToItems: real.subscribeToItems,
    addItem: real.addItem,
    editValue: real.editValue,
    editItem: function (alias, item, values) {
      return real.editItem(alias, item, values).then(function (r) {
        setTimeout(function () {
          if (values && values.oppStage) committed[item] = values.oppStage;
        }, LAG);
        return r;
      });
    },
    subscribeToDataSource: function (name, opts) {
      if (name !== 'vwPipelineGrid__DimensionP') return real.subscribeToDataSource(name, opts);
      var w = {};
      for (var k in opts) w[k] = opts[k];
      w.onData = function (payload) {
        (payload.rows || []).forEach(function (row) {
          var deal = Array.isArray(row.labels) ? row.labels[0] : row.labels;
          if (committed[deal]) row.values[1] = committed[deal];
        });
        if (opts.onData) opts.onData(payload);
      };
      return real.subscribeToDataSource(name, w);
    }
  };
  return { set: function (deal, stage) { committed[deal] = stage; } };
})();
function fail(m) { document.getElementById('__errors').textContent += ' | ' + m; }
function setStage(deal, stage) {
  var s = document.querySelector('select[data-stagefor="' + deal + '"]');
  if (!s) { fail('no stage select for ' + deal); return; }
  s.value = stage;
  s.dispatchEvent(new Event('change', { bubbles: true }));
}
</script>
<script src="../dist/pipeline.js"></script>
<script>
%(drive)s
</script>
</body></html>
"""


def dump(lag, drive):
    html = HERE / "write_persistence.harness.html"
    html.write_text(PAGE % {"lag": lag, "drive": drive})
    return subprocess.run(
        [CHROME, "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
         "--virtual-time-budget=4000", "--dump-dom", "--window-size=1440,1000",
         "file://" + str(html)],
        capture_output=True, text=True, timeout=120).stdout


def stage_of(out, deal):
    m = re.search(r'<select data-stagefor="%s"(.*?)</select>' % re.escape(deal), out, re.S)
    if not m:
        return None
    c = re.search(r'<option value="([^"]*)" selected', m.group(1))
    return c.group(1) if c else "(nothing selected)"


def days_of(out, deal):
    m = re.search(r'<input data-ovr="days" data-for="%s" value="([^"]*)"' % re.escape(deal), out)
    return m.group(1) if m else None


def main():
    results = []

    # 1. An edit must hold while the server is still serving the old value.
    out = dump(NEVER, "setTimeout(function () { setStage('%s', '%s'); }, 600);" % (DEAL, STAGE))
    got = stage_of(out, DEAL)
    results.append(("stage edit holds against a stale re-read", got == STAGE, got))

    # 2. The override cell shows the effective figure, so that must hold too.
    out = dump(NEVER, """setTimeout(function () {
      var i = document.querySelector('input[data-ovr="days"][data-for="%s"]');
      if (!i) { fail('no days cell'); return; }
      i.value = '7';
      i.dispatchEvent(new Event('blur', { bubbles: true }));
    }, 600);""" % DEAL)
    got = days_of(out, DEAL)
    results.append(("days override holds its effective value", got == "7", got))

    # 3. Once the server has caught up the page must let go: a later change by
    #    someone else has to be able to come through on the next read.
    out = dump(SOON, """
      setTimeout(function () { setStage('%s', '%s'); }, 600);
      setTimeout(function () { SERVER.set('%s', '%s'); }, 1800);
      setTimeout(function () { setStage('%s', 'Qualified'); }, 2000);
    """ % (DEAL, STAGE, DEAL, LATER, OTHER))
    got = stage_of(out, DEAL)
    results.append(("page lets go once the server agrees", got == LATER, got))

    bad = 0
    for label, ok, got in results:
        print("  %s %s (DOM: %s)" % ("+" if ok else "x", label, got))
        bad += 0 if ok else 1
    print("\n%d of %d checks clean." % (len(results) - bad, len(results)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
