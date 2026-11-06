#!/usr/bin/env python3
"""Create an isolated website study folder without overwriting previous runs."""

import argparse
from datetime import datetime
import itertools
import json
from pathlib import Path
import re
import unicodedata
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def create_study(name, parent, now):
    label = re.sub(r"[^\w-]+", "-", unicodedata.normalize("NFKC", name))
    label = label.strip("-_")[:80] or "website"
    parent = Path(parent).expanduser().resolve()
    parent.mkdir(parents=True, exist_ok=True)
    stem = "{}_DESIGN_{}".format(label, now.strftime("%Y%m%d%H%M"))
    for number in itertools.count(1):
        suffix = "" if number == 1 else "_{:02d}".format(number)
        root = parent / (stem + suffix)
        try:
            root.mkdir()
        except FileExistsError:
            continue
        break
    metadata = {
        "siteName": label,
        "createdAt": now.isoformat(),
        "timezone": str(now.tzinfo),
    }
    with (root / "study.json").open("x", encoding="utf-8") as handle:
        json.dump(metadata, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    return root


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("name", help="Site name, such as studio")
    parser.add_argument("--parent", type=Path, default=Path("output"))
    parser.add_argument("--timezone", help="User timezone, e.g. Asia/Shanghai; defaults to local time")
    args = parser.parse_args()
    try:
        now = datetime.now(ZoneInfo(args.timezone)) if args.timezone else datetime.now().astimezone()
    except ZoneInfoNotFoundError:
        parser.error("Unknown timezone: {}".format(args.timezone))
    root = create_study(args.name, args.parent, now)
    print(json.dumps({"taskRoot": str(root)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
