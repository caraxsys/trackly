from __future__ import annotations

import json
import posixpath
import re
import sys
import zipfile
from pathlib import Path

from pypdf import PdfReader


def flatten_outlines(items) -> int:
    count = 0
    for item in items:
        if isinstance(item, list):
            count += flatten_outlines(item)
        else:
            count += 1
    return count


def validate_pdf(path: Path, expected_title: str, required_terms: list[str]) -> dict:
    if not path.exists() or path.stat().st_size == 0:
        raise ValueError(f"PDF does not exist or is empty: {path}")
    if path.read_bytes()[:5] != b"%PDF-":
        raise ValueError(f"Invalid PDF signature: {path}")

    reader = PdfReader(path)
    if not reader.pages:
        raise ValueError(f"PDF has no pages: {path}")
    metadata_title = str((reader.metadata or {}).get("/Title", ""))
    if expected_title.lower() not in metadata_title.lower():
        raise ValueError(
            f"PDF title metadata mismatch for {path.name}: expected {expected_title!r}, "
            f"found {metadata_title!r}"
        )

    page_text = [(page.extract_text() or "") for page in reader.pages]
    text = "\n".join(page_text)
    forbidden = ["```mermaid", "D:\\Projects\\", "file:///D:/Projects/"]
    for marker in forbidden:
        if marker.lower() in text.lower():
            raise ValueError(f"Forbidden publication text {marker!r} found in {path.name}")
    for term in required_terms:
        if term.lower() not in text.lower():
            raise ValueError(f"Expected term {term!r} not found in {path.name}")

    links = 0
    images = 0
    for page in reader.pages:
        annotations = page.get("/Annots") or []
        for annotation in annotations:
            resolved = annotation.get_object()
            if resolved.get("/Subtype") == "/Link":
                links += 1
        resources = page.get("/Resources") or {}
        xobjects = resources.get("/XObject") or {}
        for value in xobjects.values():
            if value.get_object().get("/Subtype") == "/Image":
                images += 1

    outlines = flatten_outlines(reader.outline)
    if outlines == 0:
        raise ValueError(f"PDF contains no bookmarks/outlines: {path.name}")
    if links == 0:
        raise ValueError(f"PDF contains no link annotations: {path.name}")

    term_pages: dict[str, int] = {}
    for term in required_terms:
        for index, content in enumerate(page_text[2:], start=3):
            if term.lower() in content.lower():
                term_pages[term] = index
                break

    return {
        "path": path.name,
        "size": path.stat().st_size,
        "pages": len(reader.pages),
        "title": metadata_title,
        "bookmarks": outlines,
        "links": links,
        "images": images,
        "termPages": term_pages,
    }


def validate_docx(path: Path) -> dict:
    if not path.exists() or path.stat().st_size == 0:
        raise ValueError(f"DOCX does not exist or is empty: {path}")
    if path.read_bytes()[:2] != b"PK":
        raise ValueError(f"Invalid DOCX ZIP signature: {path}")

    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        required = {
            "[Content_Types].xml",
            "_rels/.rels",
            "word/document.xml",
            "word/styles.xml",
            "word/_rels/document.xml.rels",
        }
        missing = required - names
        if missing:
            raise ValueError(f"DOCX is missing required parts: {sorted(missing)}")

        document_xml = archive.read("word/document.xml").decode("utf-8", errors="replace")
        if "```mermaid" in document_xml or "D:\\Projects\\" in document_xml:
            raise ValueError("DOCX contains raw Mermaid or an absolute repository path")
        headings = len(re.findall(r'w:val="Heading[1-4]"', document_xml))
        captions = document_xml.count('w:val="Caption"') + document_xml.count(
            'w:val="ImageCaption"'
        )
        media = [name for name in names if name.startswith("word/media/")]
        if headings == 0:
            raise ValueError("DOCX contains no styled headings")
        if captions == 0:
            raise ValueError("DOCX contains no captions")
        if len(media) < 22:
            raise ValueError(f"DOCX contains too few embedded media items: {len(media)}")

        relationships = archive.read("word/_rels/document.xml.rels").decode(
            "utf-8", errors="replace"
        )
        internal_targets = re.findall(r'Target="([^"]+)"', relationships)
        missing_targets = []
        for target in internal_targets:
            if target.startswith(("http:", "https:", "mailto:")):
                continue
            normalized = posixpath.normpath(posixpath.join("word", target))
            if normalized not in names:
                missing_targets.append(target)
        if missing_targets:
            raise ValueError(f"DOCX has missing relationship targets: {missing_targets}")

    return {
        "path": path.name,
        "size": path.stat().st_size,
        "headings": headings,
        "captions": captions,
        "media": len(media),
    }


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(
            "Usage: validate_artifacts.py <technical.pdf> <technical.docx> <api.pdf>"
        )
    technical_pdf = Path(sys.argv[1]).resolve()
    technical_docx = Path(sys.argv[2]).resolve()
    api_pdf = Path(sys.argv[3]).resolve()
    result = {
        "technicalPdf": validate_pdf(
            technical_pdf,
            "Trackly Technical Documentation",
            [
                "System Architecture",
                "Today Dashboard",
                "Reminders and Web Push",
                "API Reference",
                "Glossary",
                "Trackly System Context",
                "Authenticated Request Lifecycle",
                "Email and Password Authentication Sequence",
                "Trackly Entity Relationships",
                "Absolute Habit Check-In Flow",
                "Reminder Scheduling and Notification Delivery",
                "Supported Deployment Topology and External Boundaries",
                "Container Startup Dependencies",
                "Trackly Sign-In Experience",
                "Account Registration",
                "Today Dashboard with Daily Progress",
                "Habit Collection and URL-Based Controls",
                "Habit Creation Form",
                "Habit Detail, Check-In, and Streak",
                "Goal Dashboard and Derived Progress",
                "Reminder Management on Habit Detail",
                "Analytics Summary and Daily Trends",
                "Contribution Heatmap",
                "Preferences and Device Notification Settings",
                "Today Dashboard on Mobile",
                "Habit Collection on Mobile",
                "Mobile Primary Navigation",
            ],
        ),
        "technicalDocx": validate_docx(technical_docx),
        "apiPdf": validate_pdf(
            api_pdf,
            "Trackly API Documentation",
            ["Authentication", "Habits", "Analytics", "Health"],
        ),
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
