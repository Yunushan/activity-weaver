# Adapter authoring guide

Adapters are JSON definitions. They should be boring, small, and resilient.
The runtime does the observation; the adapter supplies site knowledge.

## Matching

match.hostnames accepts exact hostnames and one-level or multi-level
wildcards such as *.example.com. match.pathPrefixes is optional. If it is
omitted, every path on a matching host is eligible.

Prefer the narrowest host pattern that covers the public site. Do not use
*.com or a broad pattern to capture unrelated properties.

## Extraction

Each extractor has a list of CSS selectors. The first non-empty match wins.
The default value is text content. Use attribute for metadata, links, image
URLs, or other attributes:

~~~json
{
  "title": { "selectors": ["h1", "[data-title]"], "attribute": "data-title" },
  "image": { "selectors": ["meta[property='og:image']"], "attribute": "content" }
}
~~~

Available fields are title, state, description, image, and author. The
generic extractor still supplies missing values.

## Display templates

The display object can use {title}, {state}, {site}, {author}, and
{description}. Empty values are removed cleanly. Keep details and state short
enough to be readable in Discord clients.

## Privacy modes

privacy.urlMode controls the normalized URL included in the source metadata:

- path: keep the origin and path, remove query and fragment;
- origin: keep only scheme and host;
- none: omit the URL from the bridge payload.

Use origin for pages where a path could reveal a private search, document, or
account identifier. Do not add query strings to presence buttons.

## Media

The universal extractor detects visible HTML audio/video elements. A catalog
does not need to know how a player works to get elapsed time and playback
state. Use media.enabled true only when a site-specific player needs a custom
selector.

## Review checklist

- Does the rule pass pnpm validate?
- Is each selector stable and no more specific than necessary?
- Does the universal fallback remain useful if every selector fails?
- Does the adapter avoid cookies, local storage, private APIs, and credentials?
- Is any URL or button safe to show publicly in Discord?
- Does it behave reasonably on a logged-out page?
