# Trackly Publication Pipeline

## Status

Completed

This directory contains the curated source for **Trackly Technical
Documentation: Architecture, Development, Features, and Operations**. Markdown
under `docs/` remains the source of truth. The publication pipeline creates PDF
and DOCX derivatives without starting Trackly, connecting to PostgreSQL, or
regenerating screenshots.

## Outputs

`pnpm docs:publish` creates:

```text
deliverables/
├── Trackly Technical Documentation.pdf
├── Trackly Technical Documentation.docx
├── Trackly API Documentation.pdf
├── publication-report.md
└── checksums.txt
```

Controlled intermediates, generated Markdown, SVG figures, the DOCX reference
file, HTML, validation data, and raster previews are written under
`.build/docs/`. The build directory is ignored by Git and may be removed
without affecting canonical documentation.

## Required Dependencies

| Dependency             | Supported version                 | Validation                              |
| ---------------------- | --------------------------------- | --------------------------------------- |
| Node.js                | 24.x                              | `node --version`                        |
| pnpm                   | 10.13.1 via Corepack              | `corepack pnpm --version`               |
| Pandoc                 | 3.9.0.2                           | `pandoc --version`                      |
| Python                 | 3.11 or newer                     | `python --version`                      |
| `python-docx`, `pypdf` | compatible with Python above      | `python -c "import docx,pypdf"`         |
| Poppler                | 24.x or newer                     | `pdfinfo -v` and `pdftoppm -v`          |
| Playwright Chromium    | version installed by the lockfile | `pnpm exec playwright install chromium` |

JavaScript publication dependencies are exact-version pinned in the root
`package.json` and lockfile. Install them with:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm exec playwright install chromium
```

### Windows Installation

Install Pandoc 3.9.0.2 from the official Windows MSI or ZIP release and add
`pandoc.exe` to `PATH`. A portable executable can instead be selected with:

```powershell
$env:PANDOC_PATH = 'C:\Tools\pandoc-3.9.0.2\pandoc.exe'
```

Install Poppler and add its `Library\bin` directory to `PATH`, or set
`PDFTOPPM_PATH` and `PDFINFO_PATH`. Set `DOCS_PYTHON` when the required Python
interpreter is not the default `python` command.

The prerequisite stage fails with an actionable message when a required tool
or the supported Pandoc version is unavailable.

## Commands

| Command                       | Purpose                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| `pnpm docs:publish`           | Run the complete clean, build, validate, report, and checksum pipeline |
| `pnpm docs:publish:validate`  | Revalidate existing sources and deliverables and refresh previews      |
| `pnpm docs:publish:clean`     | Remove controlled intermediates and publication deliverables           |
| `pnpm docs:render-diagrams`   | Render the eight selected Mermaid figures                              |
| `pnpm docs:build:pdf`         | Rebuild the technical documentation PDF                                |
| `pnpm docs:build:docx`        | Rebuild the technical documentation DOCX                               |
| `pnpm docs:build:api-pdf`     | Rebuild the standalone API reference PDF                               |
| `pnpm docs:publish:lint`      | Lint the TypeScript publication tooling                                |
| `pnpm docs:publish:typecheck` | Type-check the TypeScript publication tooling                          |

Screenshot regeneration remains separate:

```powershell
pnpm docs:screenshots
```

## Pipeline Stages

1. Validate Pandoc, Python, Poppler, Mermaid CLI, and Chromium.
2. Clean the controlled publication output paths.
3. Validate the manuscript, manifests, links, anchors, fences, and assets.
4. Render exactly eight manifest-selected Mermaid blocks to SVG.
5. Copy selected screenshots and prepare generated publication Markdown.
6. Replace visible Mermaid sources with traced SVG figure references.
7. Generate a clickable, bookmarked A4 technical PDF through Pandoc HTML and
   Chromium.
8. Generate the DOCX with Pandoc and a deterministic reference DOCX.
9. Generate the independent API-reference PDF.
10. Validate file signatures, metadata, structure, embedded media, headings,
    captions, links, bookmarks, and forbidden content.
11. Rasterize representative PDF pages to `.build/docs/preview/`.
12. Write the publication report and SHA-256 checksums.

Every stage is mandatory. Missing source blocks, images, malformed SVG,
conversion failures, or invalid artifacts stop the command.

## Mermaid Behavior

`figure-manifest.yaml` is authoritative. Each entry identifies a canonical
source document and zero-based Mermaid block index. Mermaid CLI renders exactly
those eight blocks with the neutral theme, print-safe typography, a transparent
background, deterministic filenames, and no network dependency. Canonical
Mermaid source files are never overwritten.

## PDF Engine

Pandoc produces standalone HTML with an automatic table of contents and
numbered sections. Playwright Chromium prints that HTML to A4 with tagged
content, PDF outlines, clickable links, headers, footers, and page numbers.
The existing publication and syntax CSS files control the restrained purple
design, cover, tables, code, callouts, captions, figures, and page breaks.

## DOCX Reference Styling

The build generates `.build/docs/reference.docx` using the
`compact_reference_guide` preset with an `editorial_cover` treatment. A4 page
geometry is an explicit publication override. The reference defines title,
subtitle, author treatment, Heading 1–4, body, source code, captions, tables,
callouts, hyperlinks, figure spacing, running header, footer, and page number
field. Pandoc uses it while preserving screenshots, SVG diagrams, hierarchy,
numbering, and a generated table of contents.

LibreOffice is not required to build the DOCX. When installed, use the
repository’s documented DOCX render process to perform an additional
Word-layout raster review. Word may request a table-of-contents field refresh
after manual edits change pagination.

## Validation and Troubleshooting

- **Pandoc version error:** install exactly 3.9.0.2 or point `PANDOC_PATH` to
  that executable.
- **Chromium unavailable:** run `corepack pnpm exec playwright install
chromium`.
- **Mermaid failure:** confirm the source block index and diagram type in
  `figure-manifest.yaml`; diagrams are never silently skipped.
- **Python import failure:** install `python-docx` and `pypdf`, or select a
  prepared interpreter with `DOCS_PYTHON`.
- **Poppler failure:** install Poppler and set `PDFTOPPM_PATH` and
  `PDFINFO_PATH` when its executables are not on `PATH`.
- **Missing screenshot:** regenerate documentation screenshots separately,
  review them, and rerun the publication command.

The pipeline is deterministic for identical inputs, pinned JavaScript
dependencies, supported system-tool versions, and the same rendering platform.
PDF byte-for-byte identity is not guaranteed across operating systems because
font substitution and Chromium builds can differ; SHA-256 checksums describe
the exact generated release artifacts.
