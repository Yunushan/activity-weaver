# Platform support matrix

This matrix distinguishes a built extension package from a working Discord
Rich Presence path. A browser package can observe a page, but the current
presence transport still requires a desktop Discord client.

| Target | Extension/package status | Presence status | Evidence or required toolchain |
| --- | --- | --- | --- |
| Chrome 121+ desktop | Supported | Supported with desktop bridge | Chromium MV3 service worker |
| Edge 121+ desktop | Supported | Supported with desktop bridge | Chromium MV3 service worker |
| Brave 121+ desktop | Supported | Supported with desktop bridge | Chromium MV3 service worker |
| Vivaldi 121+ desktop | Supported | Supported with desktop bridge | Chromium MV3 service worker |
| Opera 121+ desktop | Supported | Supported with desktop bridge | Chromium MV3 service worker |
| Firefox 121+ desktop | Package-ready | Supported by transport; browser/signing validation pending | MV3 background-script fallback; Mozilla signing still required for public distribution |
| Safari macOS | Packager-ready | Supported by transport; Xcode validation pending | Xcode `safari-web-extension-packager` and Apple signing |
| Windows | Bridge-ready | Supported with Discord desktop | Node.js 26 and Windows Discord IPC named pipes |
| macOS | Bridge-ready | Supported with Discord desktop | Node.js 26 and macOS Discord IPC paths |
| Linux | Bridge-ready | Supported with Discord desktop | Node.js 26 and Linux Discord IPC paths |
| Safari iOS/iPadOS | Packager-ready | Supported by remote transport; device validation pending | Xcode/App Store Connect Safari Web Extension app; configure `wss://` endpoint and token |
| Firefox for Android | Package-ready with Android MV2 manifest | Supported by remote transport; device validation pending | Mozilla signing and a `wss://` bridge endpoint are required |
| Chrome Android | No extension target | Not available through Chrome mobile | Google does not support installing extensions on mobile; a native browser companion is required |
| Discord mobile clients | Not applicable | Not supported by the current RPC transport | Discord direct RPC requires a running desktop client |

## Mobile boundary

The repository can package the web extension for Safari iOS/iPadOS and Firefox
for Android. In mobile mode, the extension connects over `wss://` to an
explicitly configured desktop bridge authenticated by a strong token. Discord
RPC still runs on the desktop bridge; mobile Discord clients do not provide
that desktop IPC endpoint. The default loopback bridge remains unchanged, and
remote mode must never be enabled without TLS and authentication.

## Build commands

~~~bash
pnpm build
pnpm check:browsers
pnpm package:firefox
pnpm package:firefox:android
pnpm package:safari # macOS + Xcode only, defaults to macOS
SAFARI_PLATFORM=ios pnpm package:safari # iOS/iPadOS Xcode project
~~~

The desktop CI matrix runs the common build and test gate on Ubuntu, Windows,
and macOS. Safari packaging is separately exercised on macOS because Xcode is
not available on the other runners.

The shared Manifest V3 package targets current Chromium releases (121+),
because older Chromium versions reject the Firefox/Safari background-script
fallback key. Firefox desktop uses the corresponding 121+ floor; Firefox for
Android uses the separate MV2 package.

This workspace does not contain installed browser binaries, Android `adb`,
Xcode, or `web-ext`; the CI and release jobs are the authoritative execution
points for browser/package smoke validation, and real mobile devices still
require signing and installation checks.
