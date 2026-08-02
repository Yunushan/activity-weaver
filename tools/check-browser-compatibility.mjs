import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const manifest = JSON.parse(readFileSync(join(root, "apps", "extension", "dist", "manifest.json"), "utf8"));
const backgroundSource = readFileSync(join(root, "apps", "extension", "src", "background.ts"), "utf8");
const background = manifest.background ?? {};
const checks = [
  ["Manifest V3 is enabled", manifest.manifest_version === 3],
  ["Chromium service worker is present", background.service_worker === "background.js"],
  ["Firefox/Safari background script fallback is present", Array.isArray(background.scripts) && background.scripts.includes("background.js")],
  ["Background module mode is declared", background.type === "module"],
  ["Firefox metadata is present", manifest.browser_specific_settings?.gecko?.strict_min_version === "121.0" && typeof manifest.browser_specific_settings?.gecko?.id === "string"],
  ["All browser entrypoints were built", ["background.js", "content.js", "options.html", "options.js"].every((file) => existsSync(join(root, "apps", "extension", "dist", file)))],
  ["Authenticated mobile endpoint support is built", backgroundSource.includes("wss:") && backgroundSource.includes("authToken")],
  ["Remote clients have installation-scoped source IDs", backgroundSource.includes("clientInstanceId") && backgroundSource.includes("crypto.randomUUID")],
  ["Firefox artifact preparation exists", existsSync(join(root, "tools", "package-firefox.mjs"))],
  ["Firefox for Android artifact preparation exists", existsSync(join(root, "tools", "package-firefox-android.mjs"))],
  ["Safari artifact preparation exists", existsSync(join(root, "tools", "package-safari.mjs"))]
];
for (const [name, pass] of checks) console.log((pass ? "PASS" : "FAIL") + " " + name);
if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
