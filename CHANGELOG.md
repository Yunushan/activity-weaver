# Changelog

All notable changes to ActivityWeaver will be documented in this file.

The project is currently in the 0.x phase. Interfaces may change before the
first stable release.

## [Unreleased]

- Added immutable GitHub Action pins, CodeQL, dependency review, concurrency,
  timeouts, CODEOWNERS, and release-environment checks.
- Added deterministic ZIP archives, SHA-256 release manifests, artifact smoke
  validation, and a live bridge WebSocket integration test.
- Fixed presence recovery after BFCache page restoration and prevented an
  initial settings race from assigning stale extension source identities.
