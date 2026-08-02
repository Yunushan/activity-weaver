# Security Policy

## Reporting a vulnerability

Please do not publish exploitable details in a public issue. Until a dedicated
security contact is configured, open a private GitHub security advisory for
the repository owner, or contact the maintainer through the address listed in
the repository profile.

Include:

- affected component and version;
- reproduction steps or a minimal proof of concept;
- impact and any required permissions;
- a suggested mitigation, if known.

## Security model

The browser extension sends activity metadata to a bridge on loopback only.
The bridge does not need to receive page cookies, form fields, DOM snapshots,
or page source. New adapters must preserve that boundary.
