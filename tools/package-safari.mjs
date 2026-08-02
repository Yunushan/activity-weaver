import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

if (process.platform !== "darwin") {
  throw new Error("Safari packaging requires macOS and Xcode's safari-web-extension-packager.");
}

const root = resolve(".");
const source = join(root, "apps", "extension", "dist");
const output = join(root, "artifacts", "activityweaver-safari");
const platform = process.env.SAFARI_PLATFORM ?? "macos";
if (platform !== "macos" && platform !== "ios") {
  throw new Error("SAFARI_PLATFORM must be either macos or ios.");
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const args = [
  "safari-web-extension-packager",
  source,
  "--project-location", output,
  "--app-name", "ActivityWeaver",
  "--bundle-identifier", "com.yunushan.activityweaver",
  "--swift",
  platform === "ios" ? "--ios-only" : "--macos-only",
  "--copy-resources",
  "--no-prompt",
  "--force"
];

await new Promise((resolvePromise, reject) => {
  const child = spawn("xcrun", args, { stdio: "inherit" });
  child.on("error", reject);
  child.on("exit", (code, signal) => {
    if (signal || code !== 0) reject(new Error("Safari packager failed"));
    else resolvePromise();
  });
});
console.log("Prepared " + output);
