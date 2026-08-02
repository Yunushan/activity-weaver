# ActivityWeaver

ActivityWeaver is an original, privacy-first browser activity platform that
turns the page you are viewing into a Discord Rich Presence. It is designed
for dependable maintenance: a small local bridge, a declarative adapter
catalog, a universal fallback for unknown sites, and clear validation rules.

It is released under the BSD Zero Clause License (LICENSE) (0BSD).

> Status: early alpha. The architecture is usable for development, but the
> extension and bridge still need platform-specific packaging and broader
> compatibility testing before a 1.0 release.

## Why ActivityWeaver exists

Browser-presence projects often become difficult to maintain when the runtime,
desktop bridge, and hundreds of site-specific activities are tightly coupled.
ActivityWeaver keeps those concerns separate:

- the extension observes the active tab and normalizes page metadata;
- the catalog describes site-specific extraction rules as data;
- the local bridge arbitrates multiple tabs and owns the Discord IPC socket;
- the universal extractor gives every other site a useful baseline presence;
- contributors can add an adapter without editing the bridge or extension.

This project is inspired by the general idea of browser activity adapters. It
does not copy PreMiD source code, files, naming, metadata, or implementation.

## Highlights

- Works on arbitrary sites through title, domain, URL, Open Graph, and media
  metadata fallback extraction.
- Declarative adapters for resilient, reviewable site support.
- SPA-aware updates using history events, DOM changes, and media events.
- Discord IPC implemented in the bridge without a copied activity runtime.
- Multiple-tab arbitration with deterministic “most recently updated” logic.
- Loopback-only bridge by default; no hosted telemetry service is required.
- Chromium Manifest V3 foundation, with Firefox packaging planned.
- 0BSD licensing for the repository and first-party code.
- Activity validator and contributor documentation from the first commit.

## Architecture

~~~mermaid
flowchart LR
  Page[Active web page] --> Content[Extension content script]
  Content --> Worker[Extension service worker]
  Worker --> Bridge[Local ActivityWeaver bridge]
  Bridge --> Router[Tab and activity router]
  Router --> Discord[Discord IPC]
  Catalog[Declarative activity catalog] --> Content
~~~

The page is observed locally. The extension sends only the normalized
presence payload needed by the bridge. The bridge then sends a Discord
SET_ACTIVITY command through Discord's local IPC connection.

## Quick start

### 1. Create a Discord application

Create an application in the Discord Developer Portal and copy its
Application ID. Rich Presence image keys are optional; the bridge can start
with text-only details and state.

### 2. Install and build

Requirements: Node.js 20+, pnpm 11.7+, a desktop Discord client, and a Chromium
browser for the current extension build.

~~~bash
git clone https://github.com/Yunushan/activity-weaver.git
cd activity-weaver
pnpm install
pnpm validate
pnpm build
~~~

### 3. Start the bridge

Linux/macOS:

~~~bash
export ACTIVITYWEAVER_DISCORD_CLIENT_ID="your-discord-application-id"
pnpm dev:bridge
~~~

PowerShell:

~~~powershell
$env:ACTIVITYWEAVER_DISCORD_CLIENT_ID = "your-discord-application-id"
pnpm dev:bridge
~~~

The bridge listens on 127.0.0.1:32164 by default. It will try the Discord
IPC pipes used by the desktop client and reconnect when Discord is restarted.

### 4. Load the extension

Open chrome://extensions, enable Developer mode, choose Load unpacked, and
select:

~~~text
apps/extension/dist
~~~

Open a page, wait a few seconds, and inspect your Discord profile. For an
unsupported site the generic presence uses the page title and hostname. For a
catalog site, the adapter can add cleaner details, state, media progress, or
privacy-aware URL handling.

## Supported behavior

“Every site” cannot mean that every website has a hand-maintained custom
adapter. Websites change frequently and many require authentication or render
content in ways that cannot be identified reliably. ActivityWeaver handles
this honestly in two layers:

1. Universal fallback: any normal web page can produce a safe, generic
   presence from public browser-visible metadata.
2. Adapters: popular or structurally distinctive sites can receive a
   reviewed, custom presentation without changing the runtime.

Browser-controlled pages such as chrome:// pages, extension pages, and some
browser-store pages cannot be instrumented by a normal extension. That is a
browser security restriction, not a missing catalog adapter.

The initial catalog contains examples for GitHub, YouTube, Twitch, Spotify
Web, Netflix, and generic HTML media. It is intentionally small so the
catalog format can stabilize before community expansion.

## Add an activity

Create a JSON file in packages/activity-catalog/src/catalog/:

~~~json
{
  "id": "example-site",
  "name": "Example Site",
  "version": 1,
  "description": "A minimal public-page adapter.",
  "match": {
    "hostnames": ["example.com", "*.example.com"],
    "pathPrefixes": ["/"]
  },
  "extract": {
    "title": { "selectors": ["h1", "title"] },
    "state": { "selectors": [".category"] },
    "image": { "selectors": ["meta[property='og:image']"], "attribute": "content" }
  },
  "display": {
    "details": "{title}",
    "state": "Example Site"
  },
  "privacy": {
    "urlMode": "origin"
  }
}
~~~

Then run:

~~~bash
pnpm validate
pnpm build
~~~

See docs/adapter-authoring.md for selectors, privacy modes, SPA behavior, and
review expectations.

## Repository layout

~~~text
apps/bridge/                 Local WebSocket server and Discord IPC client
apps/extension/              Chromium MV3 extension and generic extractor
packages/protocol/           Versioned bridge messages and activity types
packages/activity-catalog/   Declarative adapter definitions
packages/activity-sdk/       Helpers for third-party and future dynamic adapters
packages/activity-validator/ Catalog validation primitives
tools/                       Repository validation scripts
docs/                        Architecture, privacy, setup, and troubleshooting
~~~

## Privacy model

ActivityWeaver is local-first:

- the bridge binds to loopback by default;
- no analytics, remote account, or hosted relay is required;
- page cookies, form values, full DOM, and page source are not sent;
- adapters should extract only what is needed for a presence;
- URL paths can be disabled per adapter with urlMode: "origin" or "none";
- buttons and external links must be declared explicitly by an adapter.

The bridge is not a security boundary against a malicious local process. If a
different local application can connect to the configured port, it may submit
presence updates. A future release will support an authenticated native
messaging transport for users who need stronger local isolation.

## Roadmap

- [x] Versioned extension-to-bridge protocol
- [x] Universal fallback extraction
- [x] Declarative catalog and validator
- [x] Discord IPC reconnect foundation
- [ ] Firefox build and signed packaging
- [ ] Native messaging transport
- [ ] Settings UI for bridge port, privacy, and adapter toggles
- [ ] Activity test fixtures with recorded, sanitized DOM snippets
- [ ] Optional asset registry and per-site Discord applications
- [ ] Community catalog governance and automated selector health checks

## Relationship to PreMiD

PreMiD and its activity catalog are useful prior art for the problem space.
ActivityWeaver is an independent implementation. It has its own code,
protocol, schema, naming, documentation, and 0BSD license. Do not copy code,
activity metadata, artwork, or site-specific implementations from another
project into this repository.

## License

ActivityWeaver is released under 0BSD. See LICENSE.
