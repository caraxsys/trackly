# Trackly Publication Report

## Generation

- **Timestamp:** 2026-07-30T05:34:26.452Z
- **Input manuscript:** `docs/publication/book.md`
- **Reproducibility command:** `pnpm docs:publish`
- **Checksum algorithm:** SHA-256

## Tool Versions

- **Node:** v24.18.0
- **pnpm:** 10.13.1
- **Pandoc:** pandoc 3.9.0.2
- **Mermaid:** 11.16.0
- **Chromium:** chromium
- **Python:** Python 3.12.13
- **Poppler:** pdfinfo version 26.05.0

## Deliverables

| Artifact                             |      Size | Pages |
| ------------------------------------ | --------: | ----: |
| Trackly Technical Documentation.pdf  |   1.2 MiB |    57 |
| Trackly Technical Documentation.docx | 816.1 KiB |   n/a |
| Trackly API Documentation.pdf        |   1.2 MiB |    26 |

## Publication Assets

- **Screenshots embedded:** 14
- **Mermaid diagrams rendered:** 8
- **DOCX embedded media:** 22
- **Technical PDF bookmarks:** 57
- **Technical PDF links:** 108
- **API PDF bookmarks:** 80
- **API PDF links:** 127

## Validation Results

- Source and manifest validation: passed
- Eight selected Mermaid sources rendered to non-empty SVG: passed
- PDF signature, metadata, page count, content, links, and bookmarks: passed
- DOCX ZIP structure, relationships, headings, captions, and media: passed
- Raw Mermaid and absolute repository path checks: passed
- Representative PDF raster previews: generated under `.build/docs/preview/`

## Warnings and Known Limitations

- DOCX structural validation passed, but page rasterization requires LibreOffice/soffice and is not part of the portable baseline.
- Word may prompt to update the generated table of contents after pagination changes.

## Reproducibility

Install the pinned JavaScript dependencies with `corepack pnpm install --frozen-lockfile`,
install Pandoc 3.9.0.2, Python 3.11+ with `python-docx` and `pypdf`,
Poppler, and the Playwright Chromium browser. Then run `pnpm docs:publish`.
The command does not start Trackly services, connect to PostgreSQL, or regenerate screenshots.
