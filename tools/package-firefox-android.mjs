import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { archiveDirectory } from "./archive-directory.mjs";

const root = resolve(".");
const source = join(root, "apps", "extension", "dist");
const output = join(root, "artifacts", "activityweaver-firefox-android");
const extension = join(output, "extension");

await rm(output, { recursive: true, force: true });
await mkdir(extension, { recursive: true });
await cp(source, extension, { recursive: true });

const manifestPath = join(extension, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.manifest_version = 2;
manifest.permissions = [...new Set([
  ...(Array.isArray(manifest.permissions) ? manifest.permissions : []),
  ...(Array.isArray(manifest.host_permissions) ? manifest.host_permissions : [])
])];
delete manifest.host_permissions;
if (manifest.action) {
  manifest.browser_action = manifest.action;
  delete manifest.action;
}
manifest.background = { scripts: ["background.js"] };
if (manifest.browser_specific_settings?.gecko) {
  manifest.browser_specific_settings.gecko.strict_min_version = "109.0";
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
await writeFile(join(output, "README.txt"), [
  "ActivityWeaver Firefox for Android extension",
  "",
  "This package uses the Firefox-for-Android-compatible Manifest V2 background",
  "script format. Submit it to Mozilla for signing and Android distribution.",
  "Configure the extension with a wss:// endpoint and token for a desktop bridge.",
  ""
].join("\n"), "utf8");
await archiveDirectory(extension, join(root, "artifacts", "activityweaver-firefox-android.zip"));
console.log("Prepared " + output);
