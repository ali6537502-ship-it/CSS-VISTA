#!/usr/bin/env python3
"""Parse owner-provided book summaries and fetch matching cover thumbnails."""

from __future__ import annotations

import argparse
import json
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import date
from difflib import SequenceMatcher
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps


USER_AGENT = "CSSVista/1.0 (educational book-cover metadata importer)"
BOOK_HEADER = re.compile(
    r"^##\s+(\d+)\.\s+\*([^*]+)\*\s+[\u2014\u2013-]\s+(.+?)\s*$",
    re.MULTILINE,
)
COVER_OVERRIDES = {
    "The Rule of Law": {
        "imageUrl": "https://cdn.penguin.co.uk/dam-assets/books/9780141034539/9780141034539-jacket-large.jpg",
        "provider": "Penguin Books",
        "recordUrl": "https://www.penguin.co.uk/books/56375/the-rule-of-law-by-tom-bingham/9780141034539",
        "matchTitle": "The Rule of Law",
        "matchScore": "1.000",
    },
}


@dataclass(frozen=True)
class Source:
    path: Path
    slug: str
    name: str
    description: str


def clean_text(value: str) -> str:
    value = value.replace("\u2014", "-")
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = re.sub(r"[ \t]+\n", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def plain_text(value: str) -> str:
    value = re.sub(r"^#{1,6}\s+", "", value.strip())
    value = re.sub(r"^\d+\.\s+", "", value)
    value = re.sub(r"^[*+-]\s+", "", value)
    value = value.replace("**", "").replace("*", "")
    return re.sub(r"\s+", " ", value).strip()


def normalized(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).casefold()
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def slugify(value: str) -> str:
    return normalized(value).replace(" ", "-")


def excerpt_from(body: str) -> str:
    for block in re.split(r"\n\s*\n", body):
        candidate = plain_text(block)
        if (
            len(candidate) >= 80
            and not block.lstrip().startswith(("#", "* ", "- "))
            and not re.match(r"^\d+\.", block.lstrip())
        ):
            return candidate[:340].rstrip() + ("..." if len(candidate) > 340 else "")
    return plain_text(body)[:340].rstrip()


def parse_source(source: Source) -> list[dict[str, object]]:
    text = source.path.read_text(encoding="utf-8")
    matches = list(BOOK_HEADER.finditer(text))
    records: list[dict[str, object]] = []
    for index, match in enumerate(matches):
        body_start = match.end()
        body_end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = clean_text(text[body_start:body_end])
        body = re.sub(r"(?:\n|^)\s*---\s*(?=\n|$)", "\n", body).strip()
        title = clean_text(match.group(2))
        author = clean_text(match.group(3))
        records.append(
            {
                "slug": slugify(title),
                "category": source.slug,
                "order": int(match.group(1)),
                "title": title,
                "author": author,
                "excerpt": excerpt_from(body),
                "body": body,
                "wordCount": len(re.findall(r"\b[\w'-]+\b", plain_text(body))),
                "priority": source.slug == "priority-all-round",
            }
        )
    return records


def request_json(url: str) -> dict[str, object]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=25) as response:
        return json.load(response)


def candidate_score(title: str, author: str, candidate_title: str, candidate_authors: list[str]) -> float:
    wanted_title = normalized(title)
    found_title = normalized(candidate_title)
    title_score = SequenceMatcher(None, wanted_title, found_title).ratio()
    if wanted_title in found_title or found_title in wanted_title:
        title_score = max(title_score, 0.92)
    wanted_author = set(normalized(author).split())
    found_author = set(normalized(" ".join(candidate_authors)).split())
    author_score = len(wanted_author & found_author) / max(1, len(wanted_author))
    return title_score * 0.78 + author_score * 0.22


def open_library_cover(title: str, author: str) -> dict[str, str] | None:
    candidates = []
    for query in (
        {"q": f"{title} {author}", "limit": 10},
        {"title": title, "limit": 20},
    ):
        params = urllib.parse.urlencode(query)
        payload = request_json(f"https://openlibrary.org/search.json?{params}")
        for item in payload.get("docs", []):
            if not isinstance(item, dict) or not item.get("cover_i"):
                continue
            candidate_authors = [str(value) for value in item.get("author_name", [])]
            wanted_author = set(normalized(author).split())
            found_author = set(normalized(" ".join(candidate_authors)).split())
            if not wanted_author.intersection(found_author):
                continue
            score = candidate_score(
                title,
                author,
                str(item.get("title", "")),
                candidate_authors,
            )
            candidates.append((score, item))
        if candidates:
            break
    if not candidates:
        return None
    score, item = max(candidates, key=lambda value: value[0])
    if score < 0.46:
        return None
    cover_id = str(item["cover_i"])
    work_key = str(item.get("key", ""))
    return {
        "imageUrl": f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg?default=false",
        "provider": "Open Library",
        "recordUrl": f"https://openlibrary.org{work_key}" if work_key else "https://openlibrary.org/",
        "matchTitle": str(item.get("title", "")),
        "matchScore": f"{score:.3f}",
    }


def google_books_cover(title: str, author: str) -> dict[str, str] | None:
    query = urllib.parse.urlencode(
        {"q": f'intitle:"{title}" inauthor:"{author}"', "maxResults": 10, "printType": "books"}
    )
    payload = request_json(f"https://www.googleapis.com/books/v1/volumes?{query}")
    candidates = []
    for item in payload.get("items", []):
        if not isinstance(item, dict):
            continue
        info = item.get("volumeInfo", {})
        images = info.get("imageLinks", {}) if isinstance(info, dict) else {}
        image_url = images.get("thumbnail") or images.get("smallThumbnail")
        if not image_url:
            continue
        score = candidate_score(
            title,
            author,
            str(info.get("title", "")),
            [str(value) for value in info.get("authors", [])],
        )
        candidates.append((score, item, info, str(image_url)))
    if not candidates:
        return None
    score, item, info, image_url = max(candidates, key=lambda value: value[0])
    if score < 0.46:
        return None
    return {
        "imageUrl": image_url.replace("http://", "https://").replace("&zoom=1", "&zoom=2"),
        "provider": "Google Books",
        "recordUrl": str(info.get("infoLink") or f"https://books.google.com/books?id={item.get('id', '')}"),
        "matchTitle": str(info.get("title", "")),
        "matchScore": f"{score:.3f}",
    }


def download_cover(url: str, destination: Path) -> tuple[int, int]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read()
    with Image.open(BytesIO(data)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        if image.width < 70 or image.height < 100:
            raise ValueError(f"Cover is too small: {image.width}x{image.height}")
        image.thumbnail((720, 1080), Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, "WEBP", quality=86, method=6)
        return image.width, image.height


def placeholder_cover(title: str, author: str, destination: Path) -> None:
    safe_title = title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    safe_author = author.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1080" viewBox="0 0 720 1080">
<rect width="720" height="1080" fill="#06452f"/>
<rect x="36" y="36" width="648" height="1008" rx="18" fill="none" stroke="#d89a18" stroke-width="4"/>
<path d="M220 245h280v300H220z" fill="none" stroke="#d8eee4" stroke-width="18"/>
<path d="M235 265c80-38 145-20 185 20v300c-40-40-105-58-185-20zM485 265c-80-38-145-20-185 20v300c40-40 105-58 185-20z" fill="none" stroke="#d8eee4" stroke-width="14"/>
<text x="360" y="690" text-anchor="middle" font-family="Georgia,serif" font-size="40" font-weight="700" fill="#fff">{safe_title[:42]}</text>
<text x="360" y="758" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" fill="#d8eee4">{safe_author[:52]}</text>
<text x="360" y="940" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" letter-spacing="5" fill="#d89a18">CSS VISTA</text>
</svg>"""
    destination.with_suffix(".svg").write_text(svg, encoding="utf-8")


def import_summaries(sources: list[Source], output_dir: Path, covers_dir: Path, fetch_covers: bool) -> None:
    books = [record for source in sources for record in parse_source(source)]
    slugs = [str(book["slug"]) for book in books]
    if len(slugs) != len(set(slugs)):
        duplicates = sorted({slug for slug in slugs if slugs.count(slug) > 1})
        raise ValueError(f"Duplicate titles: {duplicates}")

    cover_cache_path = Path(__file__).with_name("book_summary_cover_cache.json")
    if cover_cache_path.exists():
        cover_cache = json.loads(cover_cache_path.read_text(encoding="utf-8"))
    else:
        cover_cache = {}

    cover_counts = {"Open Library": 0, "Google Books": 0, "CSS Vista fallback": 0}
    for index, book in enumerate(books, 1):
        slug = str(book["slug"])
        webp_path = covers_dir / f"{slug}.webp"
        cached = cover_cache.get(slug)
        cover_info = cached if isinstance(cached, dict) else None

        if fetch_covers and not webp_path.exists():
            override = COVER_OVERRIDES.get(str(book["title"]))
            if override:
                try:
                    cover_info = dict(override)
                    width, height = download_cover(cover_info["imageUrl"], webp_path)
                    cover_info["width"] = width
                    cover_info["height"] = height
                    cover_cache[slug] = cover_info
                except (OSError, ValueError, urllib.error.URLError, json.JSONDecodeError):
                    cover_info = None
            if not cover_info:
                for finder in (open_library_cover, google_books_cover):
                    try:
                        cover_info = finder(str(book["title"]), str(book["author"]))
                        if cover_info:
                            width, height = download_cover(cover_info["imageUrl"], webp_path)
                            cover_info["width"] = width
                            cover_info["height"] = height
                            cover_cache[slug] = cover_info
                            break
                    except (OSError, ValueError, urllib.error.URLError, json.JSONDecodeError):
                        cover_info = None
            time.sleep(0.08)

        if webp_path.exists() and cover_info:
            book["cover"] = f"/book-summaries/covers/{slug}.webp"
            book["coverProvider"] = cover_info.get("provider", "Open Library")
            book["coverSource"] = cover_info.get("recordUrl", "https://openlibrary.org/")
            provider = str(book["coverProvider"])
            cover_counts[provider] = cover_counts.get(provider, 0) + 1
        else:
            fallback_path = covers_dir / f"{slug}.svg"
            if not fallback_path.exists():
                placeholder_cover(str(book["title"]), str(book["author"]), fallback_path)
            book["cover"] = f"/book-summaries/covers/{slug}.svg"
            book["coverProvider"] = "CSS Vista fallback"
            book["coverSource"] = ""
            cover_counts["CSS Vista fallback"] += 1

        print(f"[{index:03d}/{len(books)}] {book['title']} - {book['coverProvider']}")

    cover_cache_path.parent.mkdir(parents=True, exist_ok=True)
    cover_cache_path.write_text(
        json.dumps(cover_cache, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    categories = []
    for source in sources:
        categories.append(
            {
                "slug": source.slug,
                "name": source.name,
                "description": source.description,
                "total": sum(book["category"] == source.slug for book in books),
            }
        )
    payload = {
        "generatedAt": date.today().isoformat(),
        "total": len(books),
        "categories": categories,
        "books": books,
        "coverSources": cover_counts,
    }
    (output_dir / "index.json").write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Imported {len(books)} unique book summaries")
    print(json.dumps(cover_counts, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--attachments", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--fetch-covers", action="store_true")
    args = parser.parse_args()

    specs = (
        (
            "c03ea976-2a69-426a-a04a-2e1d50980f5f",
            "priority-all-round",
            "Top 20 All-Round",
            "Highest-priority books for broad essay, governance and analytical preparation.",
        ),
        (
            "1205c19a-83d5-4c43-9b06-b0bfb8bea8b9",
            "political-philosophy",
            "Political Philosophy, Democracy, Power & Justice",
            "Foundational thinking on states, liberty, justice, democracy and political power.",
        ),
        (
            "1d1bcfe5-1ac2-4ad7-be74-b77daa5d03f2",
            "international-relations",
            "International Relations, War & Geopolitics",
            "Diplomacy, strategy, conflict, global order and modern world history.",
        ),
        (
            "b4d5a416-7095-4779-843f-df3362c2cc6c",
            "economics-development",
            "Economics, Development & Inequality",
            "Markets, institutions, development, poverty, inequality and globalisation.",
        ),
        (
            "c7212811-adab-49e1-810d-47e725695d24",
            "society-psychology",
            "Society, Psychology, Gender, Media & Technology",
            "Human behaviour, social change, gender, media systems and emerging technology.",
        ),
        (
            "5f3d8f94-9008-436c-ab2f-9ca7138c3567",
            "pakistan-south-asia",
            "Pakistan & South Asia",
            "History, politics, security and society in Pakistan and the wider region.",
        ),
        (
            "f4eb48f9-8dfb-4e43-a02d-a901bf64ce67",
            "literature-memoirs",
            "Literature & Memoirs for Essay Thinking",
            "Literary works and memoirs that sharpen argument, examples and moral imagination.",
        ),
    )
    sources = [
        Source(
            args.attachments / folder / "pasted-text.txt",
            slug,
            name,
            description,
        )
        for folder, slug, name, description in specs
    ]
    missing = [str(source.path) for source in sources if not source.path.exists()]
    if missing:
        raise SystemExit("Missing source files:\n" + "\n".join(missing))

    output_dir = args.output
    output_dir.mkdir(parents=True, exist_ok=True)
    import_summaries(
        sources,
        output_dir,
        output_dir / "covers",
        args.fetch_covers,
    )


if __name__ == "__main__":
    main()
