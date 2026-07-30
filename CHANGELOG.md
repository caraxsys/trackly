# Changelog

## Purpose

Provide the release-note format for notable Trackly changes without
reconstructing releases that are not established by repository evidence.

## Status

Completed

Trackly follows the structure of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The repository does not currently declare an adopted semantic-versioning or
release/tag policy, so versions and dates must be added only when an actual
release is approved.

## Unreleased

No release entries have been recorded.

Use only the relevant categories below when preparing an approved release:

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## Release Entry Template

Copy this section beneath **Unreleased** only for a confirmed release:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- User-visible capability or supported developer feature.

### Changed

- Meaningful behavior or compatibility change.

### Deprecated

- Supported behavior scheduled for removal.

### Removed

- Removed behavior or interface.

### Fixed

- Corrected defect and its observable impact.

### Security

- Security improvement stated without exposing exploitable secret details.
```

## Authoring Rules

- Record user-visible, API, schema, operational, security, and significant
  developer-experience changes.
- Do not list routine formatting, generated artifacts, or internal cleanup with
  no observable impact.
- Use factual past-tense entries after a change is complete.
- Link migrations, API compatibility notes, and upgrade steps when applicable.
- Do not include secrets, vulnerability reproduction details that create
  unnecessary risk, or unverified release dates.
- Move entries from **Unreleased** only when the version and release date are
  confirmed.
