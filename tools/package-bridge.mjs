import { cp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(".");
const output = join(root, "artifacts", "activityweaver-bridge");
const bridgeDist = join(root, "apps", "bridge", "dist");
const protocolDist = join(root, "packages", "protocol", "dist");
const wsSource = await realpath(join(root, "apps", "bridge", "node_modules", "ws"));
const rootPackage = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const wsPackage = JSON.parse(await readFile(join(wsSource, "package.json"), "utf8"));

await rm(output, { recursive: true, force: true });
await mkdir(join(output, "node_modules", "@activityweaver", "protocol"), { recursive: true });
await cp(bridgeDist, join(output, "dist"), { recursive: true });
await cp(protocolDist, join(output, "node_modules", "@activityweaver", "protocol", "dist"), { recursive: true });
await cp(wsSource, join(output, "node_modules", "ws"), { recursive: true });

await writeFile(join(output, "package.json"), JSON.stringify({
  name: "activityweaver-bridge-runtime",
  version: rootPackage.version,
  private: true,
  type: "module",
  scripts: { start: "node dist/index.js" },
  dependencies: { ws: wsPackage.version }
}, null, 2) + "\n", "utf8");
await writeFile(join(output, "node_modules", "@activityweaver", "protocol", "package.json"), JSON.stringify({
  name: "@activityweaver/protocol",
  version: rootPackage.version,
  type: "module",
  main: "dist/index.js",
  types: "dist/index.d.ts",
  exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } }
}, null, 2) + "\n", "utf8");
await cp(join(root, "LICENSE"), join(output, "LICENSE"));
await writeFile(join(output, "README.txt"), [
  "ActivityWeaver local bridge",
  "",
  "Run: node dist/index.js",
  "Set ACTIVITYWEAVER_DISCORD_CLIENT_ID before starting the bridge.",
  "The bridge binds to loopback by default.",
  "For mobile browsers, configure ACTIVITYWEAVER_REMOTE_HOST,",
  "ACTIVITYWEAVER_REMOTE_PORT, ACTIVITYWEAVER_REMOTE_TOKEN, and the TLS",
  "certificate/key paths, then use the resulting wss:// endpoint in the extension.",
  ""
].join("\n"), "utf8");
console.log("Prepared " + output);
