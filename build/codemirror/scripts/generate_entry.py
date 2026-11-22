#!/usr/bin/env python3
"""Generate the CodeMirror bundle entry point from selected base packages."""

import argparse
import re
from pathlib import Path


# Public exports exposed by the OBM CodeMirror bundle.
# Keys are package suffixes used in the workflow's "base" input.
PACKAGE_EXPORTS = {
    "autocomplete": ["autocompletion"],
    "language": ["syntaxTree"],
}

# Dependencies that are always installed by the workflow.
FIXED_EXPORTS = [
    ("codemirror", ["EditorView", "basicSetup"]),
    ("@codemirror/lang-yaml", ["yaml"]),
]


def parse_packages(value: str) -> list[str]:
    """Parse and validate comma-separated package:version pairs."""
    packages = []

    for item in value.split(","):
        item = item.strip()
        if not item or ":" not in item:
            raise ValueError(f"Invalid package specification: {item!r}")

        package, version = (part.strip() for part in item.split(":", 1))

        if not re.fullmatch(r"[a-z0-9-]+", package):
            raise ValueError(f"Invalid package name: {package!r}")
        if not version:
            raise ValueError(f"Missing version for package: {package}")
        if package in packages:
            raise ValueError(f"Duplicate package: {package}")
        if package not in PACKAGE_EXPORTS:
            supported = ", ".join(PACKAGE_EXPORTS)
            raise ValueError(
                f"Unsupported package: {package!r}. Supported packages: {supported}"
            )

        packages.append(package)

    if not packages:
        raise ValueError("At least one base package must be specified.")

    return packages


def generate_entry(packages: list[str]) -> str:
    """Build the ES module entry point."""
    lines = [
        "// Generated automatically by scripts/generate_entry.py.",
        "// Do not edit manually.",
        "",
    ]

    for module, exports in FIXED_EXPORTS:
        lines.append(f'export {{ {", ".join(exports)} }} from "{module}";')

    for package in packages:
        exports = PACKAGE_EXPORTS[package]
        module = f"@codemirror/{package}"
        if exports:
            lines.append(f'export {{ {", ".join(exports)} }} from "{module}";')

    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate src/index.js from the workflow base package input."
    )
    parser.add_argument(
        "base",
        help="Comma-separated package:version pairs (without @codemirror/)",
    )
    parser.add_argument(
        "--output",
        default="src/index.js",
        help="Output JavaScript entry point (default: src/index.js)",
    )
    args = parser.parse_args()

    try:
        packages = parse_packages(args.base)
    except ValueError as exc:
        parser.error(str(exc))

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(generate_entry(packages), encoding="utf-8")
    print(f"Generated {output}")


if __name__ == "__main__":
    main()
