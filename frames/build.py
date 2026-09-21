#!/usr/bin/env python3
"""Assemble a Pigment Frame body from _shared.js plus one frame file.

The Frames sandbox blocks all network access, so there is no module system and
no CDN: every Frame body must be one self-contained script. This prepends the
shared module verbatim, then lints for the things the sandbox forbids or that
do not survive the trip through a JSON tool argument.

    python3 frames/build.py cockpit          -> frames/build/cockpit.frame.js
    python3 frames/build.py --all
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'build')
SHARED = os.path.join(HERE, '_shared.js')

# (pattern, why it is banned). Checked against the assembled body.
BANNED = [
    (r'`',                      'template literal - Frame bodies travel as JSON tool arguments'),
    (r'\bfetch\s*\(',           'network is blocked in the sandbox'),
    (r'\bXMLHttpRequest\b',     'network is blocked in the sandbox'),
    (r'\bWebSocket\b',          'network is blocked in the sandbox'),
    (r'\blocalStorage\b',       'storage is blocked in the sandbox'),
    (r'\bsessionStorage\b',     'storage is blocked in the sandbox'),
    (r'\bindexedDB\b',          'storage is blocked in the sandbox'),
    (r'\b(?:window\.)?alert\s*\(',   'alert is blocked in the sandbox'),
    (r'\b(?:window\.)?confirm\s*\(', 'confirm is blocked in the sandbox'),
    (r'\b(?:window\.)?prompt\s*\(',  'prompt is blocked in the sandbox'),
    (r'\bnew\s+Worker\b',       'Workers are blocked in the sandbox'),
    (r'\bwindow\.parent\b',     'parent is unreachable from the sandbox'),
    (r'\bwindow\.top\b',        'top is unreachable from the sandbox'),
    (r'@import',                'stylesheet imports are blocked in the sandbox'),
    (r'<script',                'the body is pure JS, not HTML'),
]

# A deployable Frame body travels as a JSON tool argument, so hand-escaping it
# is a silent-corruption risk. Keeping these two characters out of the source
# means the only escape needed is the newline. Checked against the RAW source,
# comments included - a backslash in a comment is still a backslash.
DEPLOY_SAFE = [
    ('"',  'double quote'),
    ('\\', 'backslash'),
]

# Things the body must contain, so a refactor cannot quietly drop them.
REQUIRED = [
    (r"getElementById\('app'\)", 'the body must populate #app'),
    (r'root\.__cleanup',         'the body must set root.__cleanup for hot reload'),
    (r"'use strict'",            'strict mode'),
]


def strip_comments(src):
    """Blank out comments, keeping byte offsets so line numbers stay true.

    A regex cannot do this: a '// not a comment' inside a string literal must
    survive, and so must a block-comment opener inside one. Regex literals
    matter too - .replace(/'/g, x) holds a lone quote that would otherwise
    look like the start of a string and swallow the rest of the file. So walk
    the source once tracking string and regex state, and replace comment
    characters with spaces rather than deleting them.
    """
    out = list(src)
    i, n = 0, len(src)
    quote = None          # the quote character we are inside, or None
    prev = ''             # last significant character, for regex detection
    # A '/' starts a regex only where a value may start, never after one.
    regex_ok_after = set('(,=:[!&|?{};+-*~^%<>') | {''}
    while i < n:
        ch = src[i]
        if quote:
            if ch == '\\':
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in ('"', "'", '`'):
            quote = ch
            prev = ch
            i += 1
            continue
        # Regex literal: skip it whole, so quotes inside cannot open a string.
        if (ch == '/' and i + 1 < n and src[i + 1] not in ('/', '*')
                and (prev in regex_ok_after or re.search(r'\breturn$', src[:i]))):
            j = i + 1
            in_class = False
            while j < n:
                cj = src[j]
                if cj == '\\':
                    j += 2
                    continue
                if cj == '\n':
                    break                     # unterminated: not a regex after all
                if cj == '[':
                    in_class = True
                elif cj == ']':
                    in_class = False
                elif cj == '/' and not in_class:
                    j += 1
                    while j < n and src[j].isalpha():
                        j += 1               # flags
                    i = j
                    prev = '/'
                    break
                j += 1
            else:
                break
            if i == j:
                continue
            if j >= n or src[j] == '\n':
                prev = ch
                i += 1
            continue
        if ch == '/' and i + 1 < n and src[i + 1] == '/':
            while i < n and src[i] != '\n':
                out[i] = ' '
                i += 1
            continue
        if ch == '/' and i + 1 < n and src[i + 1] == '*':
            while i < n and not (src[i] == '*' and i + 1 < n and src[i + 1] == '/'):
                if src[i] != '\n':
                    out[i] = ' '
                i += 1
            for _ in range(2):
                if i < n:
                    out[i] = ' '
                    i += 1
            continue
        if not ch.isspace():
            prev = ch
        i += 1
    return ''.join(out)


# Frames built without the shared module prepended: self-contained diagnostics.
BARE = {'apiprobe2', 'apiprobe3', 'cockpit1', 'timeline1'}


def frames():
    out = []
    for name in sorted(os.listdir(HERE)):
        if name.endswith('.js') and not name.startswith('_'):
            out.append(name[:-3])
    return out


def build(name):
    src = os.path.join(HERE, name + '.js')
    if not os.path.exists(src):
        sys.exit('no such frame: %s (have: %s)' % (name, ', '.join(frames())))

    with open(src, encoding='utf-8') as fh:
        body = fh.read()

    if name in BARE:
        assembled = body
    else:
        with open(SHARED, encoding='utf-8') as fh:
            shared = fh.read()
        assembled = shared.rstrip() + '\n\n' + body.lstrip()

    # Lint the code, not the prose: a comment mentioning fetch or holding a
    # backtick is not a sandbox violation.
    code = strip_comments(assembled)

    problems = []
    for pattern, why in BANNED:
        for m in re.finditer(pattern, code):
            line = assembled.count('\n', 0, m.start()) + 1
            problems.append('line %d: %s (%s)' % (line, m.group(0).strip(), why))
    for pattern, why in REQUIRED:
        if not re.search(pattern, code):
            problems.append('missing: %s' % why)

    for ch, what in DEPLOY_SAFE:
        at = assembled.find(ch)
        if at >= 0:
            line = assembled.count('\n', 0, at) + 1
            problems.append('line %d: %s - not deploy-safe, see DEPLOY_SAFE' % (line, what))

    if problems:
        print('%s: FAILED' % name)
        for p in problems[:40]:
            print('  ' + p)
        if len(problems) > 40:
            print('  ... and %d more' % (len(problems) - 40))
        return None

    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, name + '.frame.js')
    with open(dest, 'w', encoding='utf-8') as fh:
        fh.write(assembled)

    # A comment-free twin, and the one to transcribe when pushing a whole body
    # through create_frame / update_frame.
    #
    # Pushing a body means retyping it into a JSON tool argument, and the
    # failure mode is consistent rather than random: comment blocks get
    # dropped. It happened on the first push of both cockpit1 (819 bytes) and
    # timeline1 (861 bytes), each time comments only, each time caught by
    # comparing bodySizeBytes against the local build. Transcribing a source
    # with no comments removes the entire failure class - there is nothing
    # left to drop - while the rationale stays here in the repo.
    #
    # update_frame_body does not need this: it validates every anchor against
    # the live body first, so a comment added that way is safe.
    stripped = strip_comments(assembled)
    keep = [ln.rstrip() for ln in stripped.split('\n')]
    deploy = '\n'.join([ln for ln in keep if ln.strip()]) + '\n'
    ddest = os.path.join(OUT, name + '.deploy.js')
    with open(ddest, 'w', encoding='utf-8') as fh:
        fh.write(deploy)

    print('%s: ok  %d lines, %d bytes  (deploy twin: %d bytes)'
          % (name, assembled.count('\n') + 1, len(assembled.encode('utf-8')),
             len(deploy.encode('utf-8'))))
    return dest


if __name__ == '__main__':
    args = sys.argv[1:]
    targets = frames() if (not args or args[0] == '--all') else args
    failed = 0
    for t in targets:
        if build(t) is None:
            failed += 1
    sys.exit(1 if failed else 0)
