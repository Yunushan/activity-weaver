import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const checks = [];
const check = (name, pass) => checks.push([name, Boolean(pass)]);
const read = (path) => readFileSync(join(root, path));

check("built extension manifest exists", existsSync(join(root, "apps/extension/dist/manifest.json")));
check("built extension background exists", existsSync(join(root, "apps/extension/dist/background.js")));
check("built extension content script exists", existsSync(join(root, "apps/extension/dist/content.js")));
check("Chromium extension archive is a ZIP", isZip("artifacts/activityweaver-extension.zip"));
check("Firefox desktop archive is a ZIP", isZip("artifacts/activityweaver-firefox.zip"));
check("Firefox Android archive is a ZIP", isZip("artifacts/activityweaver-firefox-android.zip"));
check("bridge archive is a ZIP", isZip("artifacts/activityweaver-bridge.zip"));

const extensionManifest = existsSync(join(root, "apps/extension/dist/manifest.json"))
  ? JSON.parse(read("apps/extension/dist/manifest.json"))
  : undefined;
check("Chromium manifest is MV3", extensionManifest?.manifest_version === 3);
check("Chromium service worker is included", extensionManifest?.background?.service_worker === "background.js");

const androidManifestPath = join(root, "artifacts/activityweaver-firefox-android/extension/manifest.json");
const androidManifest = existsSync(androidManifestPath)
  ? JSON.parse(read("artifacts/activityweaver-firefox-android/extension/manifest.json"))
  : undefined;
check("Firefox Android manifest is MV2", androidManifest?.manifest_version === 2);
check("Firefox Android background script is included", androidManifest?.background?.scripts?.includes("background.js"));
check("release manifest contains checksums when present", !existsSync(join(root, "artifacts/release-manifest.json"))
  || JSON.parse(read("artifacts/release-manifest.json")).assets?.every((asset) => /^[a-f0-9]{64}$/.test(asset.sha256)));

for (const [name, pass] of checks) console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
if (checks.some(([, pass]) => !pass)) process.exitCode = 1;

function isZip(relativePath) {
  const path = join(root, relativePath);
  return existsSync(path) && readFileSync(path).subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
}
