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

## Local and remote transport

The WebSocket bridge binds to 127.0.0.1 by default. Mobile browser support can
opt into a separate TLS endpoint with a strong token, but that endpoint must be
explicitly configured and must not be replaced with an unauthenticated LAN
listener or reverse proxy. The token is sent only inside the TLS connection.
