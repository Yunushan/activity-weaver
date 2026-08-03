import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const read = (relative) => readFileSync(join(root, relative), "utf8");
const docs = read("docs/platform-support.md");
const ci = read(".github/workflows/ci.yml");
const release = read(".github/workflows/release.yml");
const packageJson = JSON.parse(read("package.json"));
const checks = [
  ["Chrome desktop target is documented", docs.includes("Chrome 121+ desktop")],
  ["Edge desktop target is documented", docs.includes("Edge 121+ desktop")],
  ["Brave desktop target is documented", docs.includes("Brave 121+ desktop")],
  ["Vivaldi desktop target is documented", docs.includes("Vivaldi 121+ desktop")],
  ["Opera desktop target is documented", docs.includes("Opera 121+ desktop")],
  ["Firefox desktop target is documented", docs.includes("Firefox 121+ desktop")],
  ["Safari macOS target is documented", docs.includes("Safari macOS")],
  ["Windows bridge target is documented", docs.includes("| Windows |")],
  ["macOS bridge target is documented", docs.includes("| macOS |")],
  ["Linux bridge target is documented", docs.includes("| Linux |")],
  ["Safari iOS/iPadOS target is documented", docs.includes("Safari iOS/iPadOS") && docs.includes("SAFARI_PLATFORM=ios")],
  ["Firefox for Android package exists", packageJson.scripts?.["package:firefox:android"] === "node tools/package-firefox-android.mjs" && existsSync(join(root, "tools", "package-firefox-android.mjs"))],
  ["Chrome Android limitation is explicit", docs.includes("Chrome Android") && docs.includes("No extension target")],
  ["Authenticated mobile transport is wired", read("apps/bridge/src/server.ts").includes("authentication_required") && read("apps/extension/src/background.ts").includes("wss:")],
  ["Desktop OS CI matrix exists", ci.includes("os: [ubuntu-latest, windows-latest, macos-latest")],
  ["Safari macOS/iOS CI matrix exists", ci.includes("platform: [macos, ios]")],
  ["CI can be manually dispatched", ci.includes("workflow_dispatch:")],
  ["Pinned pnpm setup action is used", /pnpm\/action-setup@[0-9a-f]{40}/i.test(ci) && /pnpm\/action-setup@[0-9a-f]{40}/i.test(release)],
  ["Node.js 26 is used in CI and release", ci.includes("node-version: 26") && release.includes("node-version: 26")]
];

for (const [name, pass] of checks) console.log((pass ? "PASS" : "FAIL") + " " + name);
if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
