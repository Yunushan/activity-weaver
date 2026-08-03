# Repository governance

The repository is intended to ship only from reviewed, green changes.

## Required GitHub settings

Configure these settings on the `main` branch and the `release` environment:

- require pull requests and the `CI / validate (ubuntu-latest)`,
  `CI / validate (windows-latest)`, `CI / validate (macos-latest)`,
  `CodeQL / analyze`, and `Dependency Review / dependency-review` checks;
- require the `CODEOWNERS` review, dismiss stale approvals, and require the
  branch to be up to date before merge;
- enable branch protection for administrators or document the exception;
- enable Dependabot security updates, secret scanning push protection, and
  CodeQL default setup;
- require the `release` environment approval before a tag can publish assets;
- keep GitHub Actions restricted to approved immutable commit SHAs.

These settings cannot be represented completely in source control. Verify them
with the repository settings audit before calling a release production-ready.
