# Production readiness

ActivityWeaver uses an evidence-based repository gate rather than an
unverifiable marketing claim. Run:

~~~bash
pnpm verify
~~~

`pnpm verify` includes the high-severity dependency audit. The GitHub Actions
workflow also runs that audit as a separate visible check.

The final `check:production` step reports a score out of 100 across runtime
pinning, reproducible installation, CI coverage, tests, protocol validation,
bridge transport hardening, runtime resilience, release artifact preparation,
documentation, dependency automation, and source-control hygiene.

The documented production scope now includes current Chromium desktop browsers,
Firefox 121+ desktop packaging, Firefox-for-Android MV2 packaging, Safari macOS
and iOS/iPadOS project packaging, and Windows/macOS/Linux bridge builds. Mobile
browser presence uses the optional authenticated `wss://` desktop bridge;
Discord Rich Presence still requires the desktop Discord client. Chrome Android
remains outside the extension target because Chrome mobile does not install
extensions. See docs/platform-support.md for the complete matrix.

The bridge is loopback-only by default. Its optional remote endpoint requires
TLS, a strong token, and explicit configuration; never expose the local port or
an unauthenticated remote endpoint.
