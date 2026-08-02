# Privacy model

ActivityWeaver intentionally has no cloud backend in its reference
implementation.

## Data that may leave a page

Only the following normalized values can be sent to the local bridge:

- hostname and a privacy-filtered URL;
- page title or an adapter-selected public title;
- short state, description, and author text;
- media elapsed time and duration when a public media element is visible;
- explicitly configured Discord presence buttons.

## Data that must not leave a page

Adapters must not send cookies, authentication headers, local-storage values,
form fields, full page HTML, full DOM snapshots, private API responses, or
passwords. If a selector might match a personal identifier, choose a safer
fallback or use urlMode: origin.

## Local transport

The WebSocket bridge binds to 127.0.0.1, not all interfaces. The first
transport is intended for a single desktop user. Do not expose it through a
reverse proxy or firewall rule without adding authentication.
