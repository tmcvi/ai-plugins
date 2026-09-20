#!/usr/bin/env python3
"""Render each built Frame in headless Chromium against the mock SDK.

Pigment itself is unreachable from this container and sits behind SSO, so the
live board cannot be screenshotted. This is the next best check: the real
bundle, the real data-source contract, synthetic rows - which catches syntax
errors, boot failures, bad readers and dead layouts before a deploy.

Usage:  python3 frames/harness/run.py [page ...]
"""
import pathlib
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
<script src="mock_sdk.js"></script>
<script src="fixtures.js"></script>
<script src="../dist/%(page)s.js"></script>
<script>
// Some screens only show a section once something is clicked (the Admin tabs,
// the Deal editor). Drive that here so the harness covers them too.
(function () {
  var want = %(click)s;
  if (!want) return;
  setTimeout(function () {
    var el = document.querySelector(want);
    if (el) el.click(); else document.getElementById('__errors').textContent += ' | no element for ' + want;
  }, 600);
})();
</script>
</body></html>
"""

# page -> extra passes, each a CSS selector to click once the Frame has booted.
VARIANTS = {
    "admin": {
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
                            "click": ("'%s'" % click) if click else "null"})
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
