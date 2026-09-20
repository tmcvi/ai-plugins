#!/usr/bin/env python3
"""Build one self-contained Frame body per page.

Concatenates the shared modules and a page module into a single IIFE, inlines
the Viridian logo as a base64 data URI, and refuses to emit a body that breaks
the sandbox rules in the building-pigment-frames skill.

Usage:  python3 frames/build.py [page ...]
"""
import base64
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import zlib
import struct

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "src"
DIST = HERE / "dist"
ASSET_LOGO = HERE.parent / "assets" / "Viridian_-_Logo_-_White.png"

# Order matters: later modules use earlier ones.
SHARED = [
    "tokens.js",
    "format.js",
    "sdk.js",
    "components.js",
    "header.js",
    "scurve.js",
    "suggest.js",
    "dealEditor.js",
    "newDealForm.js",
]

PAGES = ["admin", "newDeal", "pipeline", "deal", "matching", "forecast"]

# Patterns that must never reach a Frame body.
FORBIDDEN = [
    (re.compile(r"`[^`]*\n[^`]*`", re.S), "multiline template literal"),
    (re.compile(r"\bfetch\s*\("), "fetch("),
    (re.compile(r"(?<![.\w])import\s*\("), "import("),
    (re.compile(r"\blocalStorage\b"), "localStorage"),
    (re.compile(r"\bsessionStorage\b"), "sessionStorage"),
    (re.compile(r"\bindexedDB\b"), "indexedDB"),
    (re.compile(r"\bXMLHttpRequest\b"), "XMLHttpRequest"),
    (re.compile(r"\bWorker\s*\("), "Worker("),
    (re.compile(r"<script", re.I), "<script tag"),
    (re.compile(r"https?://"), "network URL"),
]


def valid_png(path):
    """True only for a structurally sound PNG with every chunk CRC intact."""
    try:
        d = path.read_bytes()
    except OSError:
        return False
    if len(d) < 45 or d[:8] != b"\x89PNG\r\n\x1a\n":
        return False
    off = 8
    while off + 12 <= len(d):
        ln = struct.unpack(">I", d[off:off + 4])[0]
        typ = d[off + 4:off + 8]
        end = off + 8 + ln
        if end + 4 > len(d):
            return False
        crc = struct.unpack(">I", d[end:end + 4])[0]
        if zlib.crc32(typ + d[off + 8:end]) & 0xFFFFFFFF != crc:
            return False
        if typ == b"IEND":
            return True
        off = end + 4
    return False


def logo_literal():
    """A JS string literal for the logo data URI, or `null` for the SVG fallback."""
    if valid_png(ASSET_LOGO):
        b64 = base64.b64encode(ASSET_LOGO.read_bytes()).decode("ascii")
        return '"data:image/png;base64,' + b64 + '"'
    print("  ! assets/Viridian_-_Logo_-_White.png missing or not a valid PNG"
          " - falling back to the inline SVG wordmark")
    return "null"


def syntax_check(body, page):
    """Parse the bundle with node when it is available, so a typo never ships."""
    node = shutil.which("node")
    if not node:
        return []
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as fh:
        fh.write(body)
        tmp = fh.name
    try:
        r = subprocess.run([node, "--check", tmp], capture_output=True, text=True)
        if r.returncode != 0:
            first = (r.stderr or "").strip().splitlines()
            detail = first[0] if first else "syntax error"
            return ["%s: %s" % (page, detail)]
        return []
    finally:
        os.unlink(tmp)


def check(body, page):
    problems = []
    for pattern, label in FORBIDDEN:
        m = pattern.search(body)
        if m:
            line = body[:m.start()].count("\n") + 1
            problems.append("%s: %s at line %d" % (page, label, line))
    problems.extend(syntax_check(body, page))
    return problems


def col_alias_map(page):
    """Binding alias -> metric display name, for every metric the page binds."""
    ds_path = SRC / "datasources.json"
    b_path = SRC / "bindings.json"
    ids_path = HERE.parent / "docs" / "metric-ids.json"
    if not (ds_path.exists() and b_path.exists() and ids_path.exists()):
        return {}
    binds = json.loads(b_path.read_text()).get(page, [])
    metric_ids = json.loads(ids_path.read_text())
    by_id = {v: k for k, v in metric_ids.items()}
    out = {}
    for b in binds:
        if b.get("type") == "Metric" and b.get("metricId") in by_id:
            out[b["name"]] = by_id[b["metricId"]]
    return out


def ds_columns_map(page):
    """Data source -> the column names its values arrive in, for this page.

    The new payload is row-major and carries no column labels, so the Frame
    cannot name its own columns without this (decision D17).
    """
    cols_path = SRC / "dscolumns.json"
    ds_path = SRC / "datasources.json"
    if not (cols_path.exists() and ds_path.exists()):
        return {}
    all_cols = json.loads(cols_path.read_text())
    mine = json.loads(ds_path.read_text()).get(page, [])
    return {ds["name"]: all_cols.get(ds["name"], []) for ds in mine}


def ds_parts_map(page):
    """Logical data source -> its per-type parts, for this page (D18)."""
    parts_path = SRC / "dsparts.json"
    ds_path = SRC / "datasources.json"
    if not (parts_path.exists() and ds_path.exists()):
        return {}
    all_parts = json.loads(parts_path.read_text())
    mine = set(ds["name"] for ds in json.loads(ds_path.read_text()).get(page, []))
    return {logical: parts for logical, parts in all_parts.items()
            if parts and set(parts) <= mine}


def build(page, logo):
    parts = [
        "(function () {",
        "'use strict';",
        "var root = document.getElementById('app');",
        "if (root.__cleanup) root.__cleanup();",
        "root.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;overflow:hidden;';",
        "var VIRIDIAN_LOGO = " + logo + ";",
        "var COL_ALIAS = " + json.dumps(col_alias_map(page)) + ";",
        "var DS_COLUMNS = " + json.dumps(ds_columns_map(page)) + ";",
        "var DS_PARTS = " + json.dumps(ds_parts_map(page)) + ";",
    ]
    for name in SHARED:
        f = SRC / "shared" / name
        if not f.exists():
            continue
        parts.append("/* --- shared/" + name + " --- */")
        parts.append(f.read_text())
    pf = SRC / "pages" / (page + ".js")
    parts.append("/* --- pages/" + page + ".js --- */")
    parts.append(pf.read_text())
    parts.append("root.__cleanup = function () { disposeAll(); root.innerHTML = ''; };")
    parts.append("boot();")
    parts.append("})();")
    return "\n".join(parts)


def main():
    wanted = sys.argv[1:] or PAGES
    DIST.mkdir(parents=True, exist_ok=True)
    logo = logo_literal()

    bindings_path = SRC / "bindings.json"
    all_bindings = json.loads(bindings_path.read_text()) if bindings_path.exists() else {}
    ds_path = SRC / "datasources.json"
    all_ds = json.loads(ds_path.read_text()) if ds_path.exists() else {}

    failures = []
    for page in wanted:
        if not (SRC / "pages" / (page + ".js")).exists():
            print("  - %-9s skipped (no source yet)" % page)
            continue
        body = build(page, logo)
        problems = check(body, page)
        if problems:
            failures.extend(problems)
            print("  x %-9s REJECTED" % page)
            for p in problems:
                print("      " + p)
            continue
        (DIST / (page + ".js")).write_text(body)
        if page in all_bindings:
            (DIST / (page + ".bindings.json")).write_text(
                json.dumps(all_bindings[page], indent=2))
        if page in all_ds:
            (DIST / (page + ".datasources.json")).write_text(
                json.dumps(all_ds[page], indent=2))
        print("  + %-9s %6d bytes, %2d bindings, %d data sources"
              % (page, len(body), len(all_bindings.get(page, [])),
                 len(all_ds.get(page, []))))

    if failures:
        print("\nBuild failed: %d problem(s)." % len(failures))
        return 1
    print("\nBuild clean.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
