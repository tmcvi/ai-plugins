#!/usr/bin/env python3
"""Prepare Frame deploy payloads for the Pigment MCP connector.

The Pigment API is reached through the MCP connector rather than a REST key, so
this script does not call Pigment itself. It validates that dist/ is current and
emits one ready-to-send payload per Frame into dist/payloads/, which the agent
(or a human in the Pigment UI) sends with:

    mcp__Pigment__create_frame   - first time, records the id in frame-ids.json
    mcp__Pigment__update_frame   - every time after that
    mcp__Pigment__publish_frame  - once Tom has reviewed it

Usage:
    python3 frames/deploy.py            # all frames
    python3 frames/deploy.py pipeline   # one frame
"""
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
DIST = HERE / "dist"
IDS = HERE / "frame-ids.json"
APP_ID = "f9996e24-0282-4938-9485-93e613ac91d5"

# Frame name in Pigment's left navigation -> page module.
FRAME_NAMES = {
    "pipeline": "Pipeline",
    "deal": "Deals",
    "newDeal": "New deal",
    "matching": "Matching",
    "forecast": "Forecast",
    "admin": "Admin",
}

ORDER = ["admin", "newDeal", "pipeline", "deal", "matching", "forecast"]


def main():
    pages = sys.argv[1:] or ORDER

    # Always rebuild so dist/ can never lag behind src/.
    r = subprocess.run([sys.executable, str(HERE / "build.py")] + pages)
    if r.returncode != 0:
        print("Build failed - nothing to deploy.")
        return 1

    ids = json.loads(IDS.read_text()) if IDS.exists() else {}
    out_dir = DIST / "payloads"
    out_dir.mkdir(parents=True, exist_ok=True)

    for page in pages:
        body_path = DIST / (page + ".js")
        bind_path = DIST / (page + ".bindings.json")
        ds_path = DIST / (page + ".datasources.json")
        if not body_path.exists():
            print("  - %-9s no build output, skipped" % page)
            continue

        payload = {
            "applicationId": APP_ID,
            "request": {
                "name": FRAME_NAMES[page],
                "body": body_path.read_text(),
                "bindings": json.loads(bind_path.read_text()) if bind_path.exists() else [],
                "dataSources": json.loads(ds_path.read_text()) if ds_path.exists() else [],
            },
        }
        existing = ids.get(page)
        if existing:
            payload["frameId"] = existing
            verb = "update_frame"
        else:
            verb = "create_frame"

        target = out_dir / (page + ".payload.json")
        target.write_text(json.dumps(payload, indent=2))
        print("  + %-9s %-14s %7d bytes -> %s"
              % (page, verb, len(payload["request"]["body"]), target.relative_to(HERE.parent)))

    print("\nPayloads ready. Send each through the Pigment MCP connector, then record")
    print("any new Frame id in frames/frame-ids.json so later runs update in place.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
