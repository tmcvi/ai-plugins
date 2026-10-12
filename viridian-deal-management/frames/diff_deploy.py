#!/usr/bin/env python3
"""Work out the smallest set of update_frame_body edits between two bundles.

Re-sending a whole body costs seven chunks and seven chances to drop a line.
When only the body changed - no binding, data source or sink moved - the deploy
can be a handful of find-and-replace edits instead. Each edit is anchored with
enough context to be unique *against the text as it will be when that edit
runs*, and the whole set is proved to reproduce the new bundle byte for byte
before anything is sent.

Usage:  python3 frames/diff_deploy.py <old.js> <new.js> [--json out.json]
"""
import difflib
import json
import pathlib
import sys

COALESCE = 10      # hunks closer than this are merged into one edit
LIMIT = 19000      # update_frame_body caps a string at 20,000 characters


def stored(text):
    """As Pigment holds it: the server decodes \\uXXXX a second time (D22/D33)."""
    return text.replace("\\u00a3", "£")


def edits_between(old, new):
    o, n = old.split("\n"), new.split("\n")
    ops = [x for x in difflib.SequenceMatcher(None, o, n, autojunk=False).get_opcodes()
           if x[0] != "equal"]
    merged = []
    for op in ops:
        if merged and op[1] - merged[-1][2] <= COALESCE:
            p = merged[-1]
            merged[-1] = ("replace", p[1], op[2], p[3], op[4])
        else:
            merged.append(("replace", op[1], op[2], op[3], op[4]))

    out, applied = [], old
    for _, i1, i2, j1, j2 in merged:
        ctx = 2
        while True:
            a, b = max(0, i1 - ctx), min(len(o), i2 + ctx)
            c, d = max(0, j1 - ctx), min(len(n), j2 + ctx)
            oldstr, newstr = "\n".join(o[a:b]), "\n".join(n[c:d])
            if applied.count(oldstr) == 1 and len(oldstr) < LIMIT and len(newstr) < LIMIT:
                break
            ctx += 2
            if ctx > 600:
                raise SystemExit("could not anchor the hunk at line %d" % i1)
        out.append({"oldString": oldstr, "newString": newstr})
        applied = applied.replace(oldstr, newstr, 1)

    if applied != new:
        raise SystemExit("the edits do not reproduce the new bundle")
    return out


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    old = stored(pathlib.Path(argv[0]).read_text(encoding="utf-8"))
    new = stored(pathlib.Path(argv[1]).read_text(encoding="utf-8"))
    eds = edits_between(old, new)
    chars = sum(len(e["oldString"]) + len(e["newString"]) for e in eds)
    print("%s -> %s: %d edits, %d chars (a full body would be %d), final bodySizeBytes %d"
          % (pathlib.Path(argv[0]).name, pathlib.Path(argv[1]).name,
             len(eds), chars, len(new), len(new.encode("utf-8"))))
    if "--json" in argv:
        pathlib.Path(argv[argv.index("--json") + 1]).write_text(
            json.dumps(eds, ensure_ascii=False), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
