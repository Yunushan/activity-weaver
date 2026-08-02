# Architecture

## Components

### Extension content script

The content script runs in the active page and performs two jobs:

1. choose the most specific matching catalog rule;
2. extract a small PresenceActivity object from visible metadata.

The universal extractor is always available. Catalog rules override only the
fields they know how to improve. This prevents a broken selector from making
an otherwise useful page disappear from Discord.

### Extension service worker

The service worker maintains a single WebSocket connection to the local bridge.
Content scripts never receive the bridge's port or Discord credentials. The
worker queues a small number of updates while reconnecting and drops stale
updates when a newer update for the same tab arrives.

### Local bridge

The bridge is a small Node.js process. It validates incoming messages, tracks
the latest activity from each tab, selects the freshest non-empty activity,
and sends it to Discord. It is intentionally independent from the catalog so
catalog changes cannot change the Discord transport.

### Discord IPC

The first transport uses Discord's local IPC framing: an 8-byte little-endian
header followed by a JSON payload. The bridge discovers platform-specific IPC
pipes, performs the handshake, and sends SET_ACTIVITY. It reconnects after a
Discord restart.

## Update flow

~~~mermaid
sequenceDiagram
  participant Page as Page
  participant Ext as Extension
  participant Bridge as Local bridge
  participant Discord as Discord IPC

  Page->>Ext: DOM, URL, title, media events
  Ext->>Bridge: set_activity(source, activity)
  Bridge->>Bridge: validate and arbitrate tabs
  Bridge->>Discord: SET_ACTIVITY
  Discord-->>Bridge: command response
~~~

## Design rules

- Catalog code must not own transport or persistence.
- The bridge must not scrape pages or interpret site selectors.
- Presence updates are replaceable and idempotent for a source tab.
- URLs are treated as untrusted input and validated before use.
- A catalog adapter may improve a generic field, but it cannot require a
  remote service to produce a basic presence.
