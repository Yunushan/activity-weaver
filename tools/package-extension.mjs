import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(".");
const source = join(root, "apps", "extension", "dist");
const output = join(root, "artifacts", "activityweaver-extension");

await rm(output, { recursive: true, force: true });
await mkdir(join(output, "extension"), { recursive: true });
await cp(source, join(output, "extension"), { recursive: true });
await writeFile(join(output, "README.txt"), [
  "ActivityWeaver Chromium extension",
  "",
  "Load the extension/ directory as an unpacked extension in chrome://extensions.",
  "The local bridge must be running separately with ACTIVITYWEAVER_DISCORD_CLIENT_ID configured.",
  ""
].join("\n"), "utf8");
console.log("Prepared " + output);
