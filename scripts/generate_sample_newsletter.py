#!/usr/bin/env python3
"""Generate an offline sample newsletter from fixture data."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.generator.newsletter import NewsletterGenerator

DEFAULT_FIXTURE_PATH = REPO_ROOT / "tests" / "fixtures" / "sample_clusters.json"
DEFAULT_OUTPUT_PATH = REPO_ROOT / "docs" / "sample_newsletter.html"


def generate_sample_newsletter(
    fixture_path: Path = DEFAULT_FIXTURE_PATH,
    output_path: Path = DEFAULT_OUTPUT_PATH,
) -> Path:
    payload = json.loads(fixture_path.read_text(encoding="utf-8"))
    clusters = payload.get("clusters", payload)

    html = NewsletterGenerator().generate(
        clusters,
        date=payload.get("date"),
        generated_at=payload.get("generated_at"),
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(normalize_html(html), encoding="utf-8")
    return output_path


def normalize_html(html: str) -> str:
    return "\n".join(line.rstrip() for line in html.splitlines()).strip() + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate docs/sample_newsletter.html without scraping X.com."
    )
    parser.add_argument(
        "--fixture",
        type=Path,
        default=DEFAULT_FIXTURE_PATH,
        help="Path to a fixture JSON file with newsletter clusters.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help="Destination HTML path.",
    )
    args = parser.parse_args(argv)

    output_path = generate_sample_newsletter(
        fixture_path=args.fixture,
        output_path=args.output,
    )
    print(f"Generated sample newsletter: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
