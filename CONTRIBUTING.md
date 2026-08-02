# Contributing to ActivityWeaver

Thank you for helping make browser presence more reliable and more open.

## Before opening a pull request

1. Read the adapter authoring guide in docs/adapter-authoring.md.
2. Keep site-specific logic in the activity catalog; do not add selectors to
   the universal extractor unless the behavior is genuinely site-independent.
3. Run pnpm validate, pnpm typecheck, and pnpm build locally.
4. Do not include credentials, private URLs, session tokens, or personal data
   in fixtures, screenshots, logs, or pull requests.
5. Use a clear commit subject such as feat(catalog): add example.org or
   fix(bridge): reconnect after Discord restart.

## Activity contributions

Activities must use public page information available to the browser tab. They
must not bypass authentication, defeat paywalls, scrape private APIs, or send
more data than is needed to render a presence. Prefer a small, resilient set
of selectors and document any privacy-sensitive field.

## License

Contributions to this repository are released under the 0BSD license unless a
file explicitly states otherwise.
