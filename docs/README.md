# Trackly Documentation

## Purpose

Provide the publication-ready index for Trackly's maintained technical and
product documentation.

## Status

Completed

Markdown in this repository is the documentation source of truth. PDF and DOCX
editions may be generated from these documents, but generated editions must
remain derived artifacts rather than independently edited sources.

## Documentation Structure

| Area                                | Purpose                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| [00 Overview](./00-overview/)       | Project context, system summary, technology choices, repository layout, and workflow.               |
| [01 Design](./01-design/)           | Detailed frontend, backend, database, Docker, authentication, and API design.                       |
| [02 Features](./02-features/)       | Implemented product behavior organized by phase, plus the consolidated feature index.               |
| [03 Development](./03-development/) | Local setup, environment, Docker, migrations, testing, and debugging.                               |
| [04 Deployment](./04-deployment/)   | Current production artifacts and the external operational capabilities still required.              |
| [05 Reference](./05-reference/)     | Complete API/schema references, shared terminology, decisions, sequences, FAQ, and troubleshooting. |

## Start Here

| Audience or task         | Document                                                         |
| ------------------------ | ---------------------------------------------------------------- |
| Product orientation      | [Project overview](./00-overview/01-project-overview.md)         |
| New engineer orientation | [System architecture](./00-overview/02-system-architecture.md)   |
| Repository navigation    | [Repository structure](./00-overview/04-repository-structure.md) |
| Local setup              | [Local development](./03-development/local-development.md)       |
| Contribution standards   | [Contributing guide](../CONTRIBUTING.md)                         |
| Feature behavior         | [Feature summary](./02-features/feature-summary.md)              |
| API integration          | [API reference](./05-reference/api-reference.md)                 |
| Database model           | [Database schema](./05-reference/database-schema.md)             |
| Production planning      | [Production deployment](./04-deployment/production.md)           |
| Operational diagnosis    | [Troubleshooting](./05-reference/troubleshooting.md)             |
| Common questions         | [FAQ](./05-reference/faq.md)                                     |

## Reference Index

- [API reference](./05-reference/api-reference.md)
- [Database schema](./05-reference/database-schema.md)
- [Sequence diagrams](./05-reference/sequence-diagrams.md)
- [Engineering decision log](./05-reference/decision-log.md)
- [Glossary](./05-reference/glossary.md)
- [Troubleshooting](./05-reference/troubleshooting.md)
- [Frequently asked questions](./05-reference/faq.md)

## Authoring and Publication

Documentation changes follow [CONTRIBUTING.md](../CONTRIBUTING.md). Authors
should:

1. Verify implementation before changing technical claims.
2. Update the smallest authoritative document.
3. Cross-link detailed references instead of duplicating contracts.
4. Use the glossary's terminology and GitHub-compatible Mermaid syntax.
5. Run formatting, link, heading, and placeholder checks.
6. Generate PDF/DOCX only from the reviewed Markdown source.

The repository does not currently contain an automated PDF/DOCX generation or
documentation publishing pipeline. That limitation should remain explicit
until such tooling is implemented.
