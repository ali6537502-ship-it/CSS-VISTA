import argparse
import json
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


def public_url(path: Path) -> str:
    return "/" + path.relative_to(PUBLIC).as_posix()


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate every public CSS Vista PDF and record page counts.")
    parser.add_argument("--write", action="store_true", help="Write public/pdf-page-counts.json after a clean audit.")
    args = parser.parse_args()

    records: dict[str, dict[str, int | bool]] = {}
    failures: list[str] = []
    pdfs = sorted(PUBLIC.rglob("*.pdf"), key=lambda item: public_url(item).lower())

    for index, path in enumerate(pdfs, start=1):
        url = public_url(path)
        try:
            size = path.stat().st_size
            if size <= 5:
                raise ValueError("file is empty or truncated")
            with path.open("rb") as handle:
                if handle.read(5) != b"%PDF-":
                    raise ValueError("missing %PDF- signature")
            reader = PdfReader(path, strict=False)
            if reader.is_encrypted:
                raise ValueError("document is encrypted")
            pages = len(reader.pages)
            if pages < 1:
                raise ValueError("document contains no readable pages")
            records[url] = {"pages": pages, "sizeBytes": size, "encrypted": False}
        except Exception as error:  # report every invalid public document together
            failures.append(f"{url}: {error}")

        if index % 100 == 0:
            print(f"Validated {index}/{len(pdfs)} PDFs...")

    if failures:
        print(f"PDF integrity audit failed with {len(failures)} error(s):")
        for failure in failures:
            print(f"  {failure}")
        return 1

    if args.write:
        target = PUBLIC / "pdf-page-counts.json"
        target.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    total_pages = sum(int(record["pages"]) for record in records.values())
    print(f"PDF integrity audit passed: {len(records)} documents and {total_pages} readable pages.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
