# Troubleshooting

## Discord shows nothing

- Confirm the desktop Discord client is running.
- Confirm ACTIVITYWEAVER_DISCORD_CLIENT_ID is set in the same terminal that
  starts the bridge.
- Check the bridge log for a discovered IPC pipe.
- Restart Discord and then restart the bridge if Discord was updated.
- Make sure Discord's activity privacy settings allow Rich Presence.

## Mobile browser cannot connect

- Confirm the desktop bridge has all remote variables set, including a trusted
  TLS certificate/key pair and a token of at least 32 characters.
- Use the `wss://` endpoint and the same token in the extension settings.
- Confirm the mobile device trusts the certificate and can reach the configured
  remote port; do not use the local `ws://127.0.0.1` endpoint on mobile.
- The Discord desktop client must remain running on the bridge host.

## The extension cannot connect

- Confirm the bridge says it is listening on 127.0.0.1:32164.
- Reload the unpacked extension after rebuilding it.
- Check the browser extension service-worker console for WebSocket errors.
- If the port was changed, update it in the extension settings once the
  settings page is available, or set the matching source constant during this
  alpha phase.

## A site shows generic text

That is expected for an unsupported or changed site. Add a small JSON adapter,
run pnpm validate, rebuild, and reload the extension. Do not modify the
universal extractor for a site-specific selector.

## Presence is stale

The extension coalesces rapid updates and the bridge chooses the freshest
active tab. Reloading the page or switching tabs should produce a new update.
If it does not, inspect the content-script console and the bridge log.
