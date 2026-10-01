#!/usr/bin/env python3
"""Plan and checksum a Frame body deploy.

The Frame body cannot be POSTed from the file - Pigment is unreachable from
the build environment, so the body is carried across inside an MCP tool call,
by hand. That makes a deploy a transcription, and transcriptions lose things:
the first one lost a blank line and the closing `})();` of the IIFE (D22).

So this prints the body in chunks small enough for update_frame_body, each
wrapped in sentinels (a leading blank line inside a chunk would otherwise be
trimmed out of the terminal output and silently dropped), together with the
UTF-8 byte total the Frame should report after each chunk lands.

Two quirks of the deploy API are folded into the expected sizes (D22):
  * the server decodes `\\uXXXX` a second time, so `\\u00a3` is stored as `£`
  * bodySizeBytes counts UTF-8 bytes, so every `£` counts twice

Usage:  python3 frames/deploy_plan.py <page> [--sizes-only] [--chunk N]
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
LIMIT = 17000           # update_frame_body caps a string at 20,000 characters
MARKER = "/*__NEXT__*/"


def stored(text):
    """The body as Pigment will hold it, and its size as Pigment will report it."""
    t = text.replace("\\u00a3", "£")
    return t, len(t.encode("utf-8"))


def chunks(lines):
    out, start, size = [], 1, 0
    for i, line in enumerate(lines, start=1):
        n = len(line) + 1
        if size + n > LIMIT and size:
            out.append((start, i - 1))
            start, size = i, 0
        size += n
    out.append((start, len(lines)))
    return out


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    page = argv[0]
    only = "--sizes-only" in argv
    one = None
    if "--chunk" in argv:
        one = int(argv[argv.index("--chunk") + 1])

    body = (HERE / "dist" / (page + ".js")).read_text(encoding="utf-8")
    # split("\n") would invent a trailing empty line; the file's last line is
    # `})();` with no newline after it, and losing that is a syntax error.
    lines = body.split("\n")
    if lines and lines[-1] == "":
        lines = lines[:-1]
        tail = "\n"
    else:
        tail = ""
    plan = chunks(lines)

    _full, total = stored(body)
    running = 0
    print("%s: %d lines, %d chunks, final bodySizeBytes should be %d"
          % (page, len(lines), len(plan), total))
    for n, (a, b) in enumerate(plan, start=1):
        text = "\n".join(lines[a - 1:b]) + ("\n" if b < len(lines) else tail)
        _s, size = stored(text)
        running += size
        print("  chunk %d  lines %d-%d  %d bytes  -> running %d"
              % (n, a, b, size, running))
    if running != total:
        print("  ! chunks sum to %d, body is %d - the plan does not tile the file"
              % (running, total))
        return 1
    if only:
        return 0

    for n, (a, b) in enumerate(plan, start=1):
        if one and n != one:
            continue
        text = "\n".join(lines[a - 1:b]) + ("\n" if b < len(lines) else tail)
        print("\n<<<CHUNK %d lines %d-%d>>>" % (n, a, b))
        print(text + (MARKER if b < len(lines) else ""))
        print("<<<END CHUNK %d>>>" % n)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
