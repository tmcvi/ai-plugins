#!/usr/bin/env python3
"""Render each built Frame in headless Chromium against the mock SDK.

Pigment itself is unreachable from this container and sits behind SSO, so the
live board cannot be screenshotted. This is the next best check: the real
bundle, the real data-source contract, synthetic rows - which catches syntax
errors, boot failures, bad readers and dead layouts before a deploy.

Usage:  python3 frames/harness/run.py [page ...]
"""
import json
import pathlib
import html as htmlmod
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
DIST = HERE.parent / "dist"
OUT = HERE / "out"
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
PAGES = ["pipeline", "deal", "newDeal", "matching", "forecast", "admin"]

PAGE = """<!doctype html>
<html><head><meta charset="utf-8"><title>%(page)s</title></head>
<body style="margin:0">
<div id="app"></div>
<pre id="__errors" style="display:none"></pre>
<pre id="__copied" style="display:none"></pre>
<script>
// The export copies to the clipboard (D37). Under --dump-dom there is no
// clipboard to read back, so execCommand is stubbed to record what was
// selected at the moment of the copy. Everything up to that point is real:
// the export still has to build the TSV, put it in a textarea, attach it and
// select it for this to fire, which is the part a screenshot cannot show.
// That the sandbox really permits the copy is proven separately, against a
// real clipboard, by frames/harness/sandbox_export.mjs.
(function () {
  var real = document.execCommand;
  document.execCommand = function (cmd) {
    if (String(cmd).toLowerCase() === 'copy') {
      var a = document.activeElement;
      var text = a && typeof a.value === 'string' ? a.value : String(window.getSelection());
      document.getElementById('__copied').textContent = text;
      return true;
    }
    return real.apply(document, arguments);
  };
})();
</script>
<script src="mock_sdk.js"></script>
<script src="fixtures.js"></script>
<script src="../dist/%(page)s.js"></script>
<script>
// Some screens only show a section once something is clicked (the Admin tabs,
// the Deal editor). Drive that here so the harness covers them too.
(function () {
  var steps = %(click)s;
  if (!steps) return;
  if (typeof steps === 'string') steps = [steps];
  // Some paths need more than one action - open the Admin tab that holds the
  // mapping selects, then change one - so run them in order.
  steps.forEach(function (want, i) {
    setTimeout(function () {
      // "set:#f-stage=Qualified" picks a value and fires change; "change:sel"
      // fires change as-is; anything else is a click.
      var change = want.indexOf('change:') === 0, set = want.indexOf('set:') === 0;
      var value = null, sel = want;
      if (change) sel = want.slice(7);
      if (set) {
        var eq = want.indexOf('=');
        sel = want.slice(4, eq);
        value = want.slice(eq + 1);
      }
      var el = document.querySelector(sel);
      if (!el) { document.getElementById('__errors').textContent += ' | no element for ' + sel; return; }
      if (set) {
        el.value = value;
        if (el.value !== value) {
          document.getElementById('__errors').textContent += ' | ' + sel + ' has no option ' + value;
          return;
        }
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (change) el.dispatchEvent(new Event('change', { bubbles: true }));
      else el.click();
    }, 600 * (i + 1));
  });
})();
</script>
</body></html>
"""

# page -> extra passes, each a CSS selector to click once the Frame has booted.
VARIANTS = {
    # A write is the one path a render cannot exercise, and it is where the
    # friendly-name rule bites (D21), so fire one on each screen that writes.
    "pipeline": {
        "write": 'change:select[data-stagefor]',
        # The stage filter: one chip toggled off, and the All / None / Default
        # buttons that sit beside the chips.
        "filter-stage": '[data-stage="Demo"]',
        "filter-stage-all": '#s-all',
        # The export button: a click must build the TSV and reach the copy
        # without throwing, which is the only part a screenshot cannot show.
        "export": '#f-export',
        # The inline Licence $ override on the face of the table.
        "override": 'set:input[data-ovr]=150000',
    },
    "forecast": {"filter-stage": '[data-stage="Demo"]'},
    # One chip row drives both panes on Matching, so one pass covers both.
    "matching": {"filter-stage": '[data-stage="Demo"]'},
    "admin": {
        "write": ['[data-tab="Reference lists"]', 'change:select[data-mapStage]'],
        "scurve": '[data-tab="S-curve profiles"]',
        "reference": '[data-tab="Reference lists"]',
        "import": '[data-tab="Import"]',
    },
}


def chrome(args):
    return subprocess.run([CHROME, "--headless", "--no-sandbox", "--disable-gpu",
                           "--hide-scrollbars", "--virtual-time-budget=4000"] + args,
                          capture_output=True, text=True, timeout=120)


def check(page, label=None, click=None):
    OUT.mkdir(parents=True, exist_ok=True)
    label = label or page
    html = HERE / ("%s.harness.html" % label)
    html.write_text(PAGE % {"page": page,
                            "click": json.dumps(click) if click else "null"})
    url = "file://" + str(html)

    shot = OUT / ("%s.png" % label)
    chrome(["--screenshot=" + str(shot), "--window-size=1440,1000", url])
    dom = chrome(["--dump-dom", "--window-size=1440,1000", url]).stdout

    problems = []
    m = re.search(r'<pre id="__errors"[^>]*>(.*?)</pre>', dom, re.S)
    if m and m.group(1).strip():
        for line in m.group(1).strip().split("\n"):
            problems.append(line.strip())
    if "Something went wrong" in dom:
        d = re.search(r'Something went wrong</div><div[^>]*>([^<]*)', dom)
        problems.append("error screen: " + (d.group(1) if d else "(no detail)"))
    if "Fetching data from Pigment" in dom:
        problems.append("stuck on the loading block")
    if len(dom) < 2000:
        problems.append("rendered almost nothing (%d bytes of DOM)" % len(dom))

    # The export pass has to prove it actually reached the clipboard with the
    # grid in it - a header row, a tab-separated body, and one line per deal.
    if label.endswith("-export"):
        d = re.search(r'<pre id="__copied"[^>]*>(.*?)</pre>', dom, re.S)
        got = htmlmod.unescape(d.group(1)) if d else ""
        lines = [ln for ln in got.replace("\r\n", "\n").split("\n") if ln]
        if len(lines) < 2:
            problems.append("export did not reach the clipboard (%d lines)" % len(lines))
        elif not lines[0].startswith("Opportunity name\t"):
            problems.append("export header looks wrong: %r" % lines[0][:60])
        else:
            cols = len(lines[0].split("\t"))
            odd = [i for i, ln in enumerate(lines) if len(ln.split("\t")) != cols]
            if odd:
                problems.append("export line %d has a ragged column count" % odd[0])

    return problems, shot, len(dom)


def main():
    wanted = sys.argv[1:] or PAGES
    bad, total = 0, [0]
    for page in wanted:
        if not (DIST / (page + ".js")).exists():
            print("  - %-9s no build output" % page)
            continue
        passes = [(page, None)] + [("%s-%s" % (page, k), v)
                                   for k, v in sorted(VARIANTS.get(page, {}).items())]
        for label, click in passes:
            total[0] += 1
            problems, shot, size = check(page, label, click)
            if problems:
                bad += 1
                print("  x %-16s %d problem(s), DOM %d bytes" % (label, len(problems), size))
                for p in problems[:6]:
                    print("      " + p[:160])
            else:
                print("  + %-16s renders clean, DOM %d bytes -> %s"
                      % (label, size, shot.relative_to(HERE.parent.parent)))
    print("\n%d of %d passes clean." % (total[0] - bad, total[0]))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
