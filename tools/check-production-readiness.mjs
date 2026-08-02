import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const read = (relative) => readFileSync(join(root, relative), "utf8");
const packageJson = JSON.parse(read("package.json"));
const checks = [
  {
    name: "Node 26 runtime is pinned",
    weight: 8,
    pass: packageJson.engines?.node === ">=26.0.0" && read(".nvmrc").trim() === "26"
  },
  {
    name: "Frozen dependency installation is reproducible",
    weight: 8,
    pass: /^lockfileVersion:\s*['"]?9\.0/m.test(read("pnpm-lock.yaml"))
      && read(".github/workflows/ci.yml").includes("pnpm install --frozen-lockfile")
  },
  {
    name: "CI runs the complete quality gate",
    weight: 10,
    pass: ["pnpm validate", "pnpm build", "pnpm lint", "pnpm typecheck", "pnpm test", "pnpm audit --audit-level=high", "pnpm check:production", "pnpm check:browsers", "pnpm check:platforms"]
      .every((command) => read(".github/workflows/ci.yml").includes(command))
      && read(".github/workflows/ci.yml").includes("pnpm package:firefox:android")
  },
  {
    name: "Chromium, Firefox, and Safari package compatibility exists",
    weight: 15,
    pass: packageJson.scripts?.["check:browsers"] === "node tools/check-browser-compatibility.mjs"
      && packageJson.scripts?.["package:firefox"] === "node tools/package-firefox.mjs"
      && packageJson.scripts?.["package:firefox:android"] === "node tools/package-firefox-android.mjs"
      && packageJson.scripts?.["package:safari"] === "node tools/package-safari.mjs"
      && read("apps/extension/public/manifest.json").includes('"scripts": ["background.js"]')
      && read("apps/extension/public/manifest.json").includes('"service_worker": "background.js"')
      && read(".github/workflows/ci.yml").includes("platform: [macos, ios]")
      && existsSync(join(root, "docs", "platform-support.md"))
  },
  {
    name: "Windows, macOS, and Linux CI coverage exists",
    weight: 10,
    pass: read(".github/workflows/ci.yml").includes("matrix:")
      && read(".github/workflows/ci.yml").includes("ubuntu-latest, windows-latest, macos-latest")
      && read("apps/bridge/src/discord-ipc.ts").includes("process.platform === \"win32\"")
  },
  {
    name: "Unit and package tests are present",
    weight: 10,
    pass: packageJson.scripts?.["test:unit"] === "node --test tests/*.test.mjs"
      && existsSync(join(root, "tests", "protocol.test.mjs"))
      && existsSync(join(root, "tests", "bridge.test.mjs"))
      && existsSync(join(root, "tests", "catalog.test.mjs"))
  },
  {
    name: "Protocol input validation is hardened",
    weight: 8,
    pass: read("packages/protocol/src/index.ts").includes("MAX_CLOCK_SKEW_MS")
      && read("packages/protocol/src/index.ts").includes("parsed.username = \"\"")
      && read("packages/activity-validator/src/index.ts").includes("reportUnknownKeys")
  },
  {
    name: "Bridge transport is loopback and abuse resistant",
    weight: 8,
    pass: read("apps/bridge/src/config.ts").includes("LOOPBACK_HOSTS")
      && read("apps/bridge/src/config.ts").includes("MIN_REMOTE_TOKEN_LENGTH")
      && read("apps/bridge/src/server.ts").includes("MAX_MESSAGES_PER_WINDOW")
      && read("apps/bridge/src/server.ts").includes("maxPayload: 128 * 1024")
      && read("apps/bridge/src/server.ts").includes("createHttpsServer")
      && read("apps/bridge/src/server.ts").includes("authentication_required")
      && read("apps/extension/src/background.ts").includes("authToken")
  },
  {
    name: "Runtime updates are serialized and errors are contained",
    weight: 5,
    pass: read("apps/bridge/src/activity-router.ts").includes("flushInProgress")
      && read("apps/bridge/src/activity-router.ts").includes("Failed to update Discord presence")
      && read("apps/bridge/src/server.ts").includes("closeWebSocketServer")
  },
  {
    name: "Release artifact preparation exists",
    weight: 8,
    pass: packageJson.scripts?.["package:extension"] === "node tools/package-extension.mjs"
      && packageJson.scripts?.["package:bridge"] === "node tools/package-bridge.mjs"
      && packageJson.scripts?.["package:firefox"] === "node tools/package-firefox.mjs"
      && packageJson.scripts?.["package:safari"] === "node tools/package-safari.mjs"
      && existsSync(join(root, "tools", "package-extension.mjs"))
      && existsSync(join(root, "tools", "package-bridge.mjs"))
      && read(".github/workflows/release.yml").includes("activityweaver-firefox-android.tar.gz")
      && read(".github/workflows/release.yml").includes("activityweaver-safari-ios.tar.gz")
      && existsSync(join(root, ".github", "workflows", "release.yml"))
  },
  {
    name: "Operational and contributor documentation exists",
    weight: 5,
    pass: ["README.md", "SECURITY.md", "CONTRIBUTING.md", "docs/privacy.md", "docs/troubleshooting.md", "docs/platform-support.md", "CHANGELOG.md"]
      .every((file) => existsSync(join(root, file)))
  },
  {
    name: "Dependency automation and source hygiene are enforced",
    weight: 5,
    pass: read(".github/dependabot.yml").includes("package-ecosystem: npm")
      && read(".github/dependabot.yml").includes("package-ecosystem: github-actions")
      && read(".gitignore").includes("artifacts/")
      && read(".gitignore").includes("packages/activity-catalog/src/generated.ts")
  }
];

const score = checks.reduce((total, check) => total + (check.pass ? check.weight : 0), 0);
for (const check of checks) console.log((check.pass ? "PASS" : "FAIL") + " " + check.name + " (" + check.weight + ")");
console.log("Production readiness score: " + score + "/100");
if (score !== 100) process.exitCode = 1;
