from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SKIP_SUFFIXES = {
    ".db",
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".pyc",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".zip",
    ".xlsx",
    ".xls",
    ".mp4",
    ".mp3",
}
SUSPICIOUS_TOKENS = (
    "Ã",
    "Â",
    "â€”",
    "â†’",
    "âœ",
    "ï»¿",
    "\u00ad",
    "\ufffd",
)


def tracked_files() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    files: list[Path] = []
    for raw_path in result.stdout.splitlines():
        path = ROOT / raw_path
        if not path.is_file():
            continue
        if path.suffix.lower() in SKIP_SUFFIXES:
            continue
        if "__pycache__" in path.parts or "node_modules" in path.parts or "dist" in path.parts:
            continue
        files.append(path)
    return files


def main() -> int:
    findings: list[tuple[str, int, str]] = []

    for path in tracked_files():
        try:
            text = path.read_text(encoding="utf-8-sig")
        except UnicodeDecodeError:
            continue

        for line_number, line in enumerate(text.splitlines(), start=1):
            if any(token in line for token in SUSPICIOUS_TOKENS):
                findings.append((str(path.relative_to(ROOT)), line_number, line.strip()))

    if not findings:
        print("No suspicious mojibake sequences found.")
        return 0

    print("Suspicious mojibake sequences found:")
    for rel_path, line_number, line in findings:
        print(f"{rel_path}:{line_number}: {line}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
