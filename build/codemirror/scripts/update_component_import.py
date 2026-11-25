#!/usr/bin/env python3
"""Update the CodeMirror bundle import in the geometry editor component."""

import argparse
import re
from pathlib import Path


def update_import(bundle_name: str, component: Path) -> None:
    """Point the component's CodeMirror import at the selected bundle."""
    if not re.fullmatch(r"[a-zA-Z0-9._-]+", bundle_name):
        raise ValueError(f"Invalid bundle name: {bundle_name!r}")

    source = component.read_text(encoding="utf-8")
    pattern = re.compile(
        r'(?P<prefix>\bfrom\s*)(?P<quote>["\'])'
        r'/vendor/codemirror/[^"\']+\.js(?P=quote)'
    )
    matches = list(pattern.finditer(source))

    if len(matches) != 1:
        raise ValueError(
            f"Expected exactly one CodeMirror bundle import in {component}; "
            f"found {len(matches)}."
        )

    match = matches[0]
    quote = match.group("quote")
    replacement = (
        f'{match.group("prefix")}{quote}'
        f'/vendor/codemirror/{bundle_name}.js{quote}'
    )
    updated = source[: match.start()] + replacement + source[match.end() :]
    component.write_text(updated, encoding="utf-8")
    print(f"Updated CodeMirror bundle import in {component}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Update the geometry editor's CodeMirror bundle import."
    )
    parser.add_argument("bundle_name", help="Bundle name, without the .js suffix")
    parser.add_argument(
        "--component",
        type=Path,
        default=Path("lib/modules/components/geometry-editor.js"),
        help="Component file to update",
    )
    args = parser.parse_args()

    try:
        update_import(args.bundle_name, args.component)
    except (OSError, ValueError) as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
