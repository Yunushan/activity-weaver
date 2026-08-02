# Discord setup

1. Visit the Discord Developer Portal and create an application.
2. Copy the Application ID from the General Information page.
3. Put it in ACTIVITYWEAVER_DISCORD_CLIENT_ID before starting the bridge.
4. If you want a custom image, add an asset in the application's Rich
   Presence asset section and set its key in an adapter or future settings UI.

The application ID is not a bot token and does not grant access to your
Discord account. Never put a bot token, user token, or OAuth client secret in
the extension or in a public activity file.

ActivityWeaver uses the desktop Discord IPC endpoint. The browser version of
Discord does not expose that local IPC endpoint, so use the desktop client.
