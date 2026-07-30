# Publication Plan

## Status

Completed

## Editorial Intent

The book is an engineering narrative, not a concatenation of source files.
Each chapter introduces intent, explains the implemented design, identifies
important rules, and points readers to the canonical reference when exhaustive
contracts would interrupt the narrative.

Repeated setup, ownership, validation, and response-envelope explanations are
centralized. Endpoint-by-endpoint and column-by-column detail remains in the
reference chapters.

## Audience

- Engineers onboarding to Trackly.
- Reviewers evaluating architecture and engineering quality.
- QA contributors translating rules into validation scenarios.
- Operators planning a supported deployment.
- Product stakeholders who need implementation-backed feature boundaries.

## Reading Paths

| Reader            | Suggested path                                                                      |
| ----------------- | ----------------------------------------------------------------------------------- |
| New engineer      | Parts I, II, IV, then relevant feature chapters                                     |
| Frontend engineer | Chapters 5, 7, 9–15, 18                                                             |
| Backend engineer  | Chapters 6–9, 10–15, 18, 26–27                                                      |
| Operator          | Part V, Troubleshooting, Useful Commands                                            |
| Reviewer          | Preface, System Architecture, Security and Operational Readiness, Known Limitations |

## Visual Strategy

- Desktop screenshots use 85–95% content width.
- Mobile screenshots use 35–45% width.
- Component crops are used for reminders and heatmap detail.
- Figures remain with their explanatory paragraphs and captions.
- High-priority Mermaid diagrams are rendered to SVG before final output.
- Purple is reserved for structural accents; green remains visible in product
  screenshots as the current application accent.

## Pagination Strategy

- Cover, each Part, and API/database reference chapters begin on new pages.
- Figures, tables, code blocks, and callouts avoid page splitting where
  practical.
- Long API/database tables may repeat headers and split only between rows.
- Mobile figures may share a page when captions remain legible.
- Final page breaks are adjusted only after PDF proofing.

## Figure Workflow

`book.md` contains selected Mermaid source while the book remains Markdown.
Before final publication, render only the entries in `figure-manifest.yaml` to
the stated SVG targets and replace the corresponding source blocks. Mermaid
code must not appear as literal code in the delivered PDF or DOCX.

## Quality Gates Before Export

- Canonical links and internal anchors pass.
- Screenshot and figure manifests match book references.
- All images exist and have non-zero dimensions.
- Mermaid source parses and rendered SVGs are visually checked.
- No duplicate chapter IDs or captions exist.
- No placeholder instructions or draft statuses remain.
- A4 PDF and DOCX receive separate visual QA.
- PDF bookmarks, TOC links, external links, page numbers, headers, and footers
  are verified.
