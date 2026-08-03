import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { archiveDirectory } from "./archive-directory.mjs";

const root = resolve(".");
const source = join(root, "apps", "extension", "dist");
const output = join(root, "artifacts", "activityweaver-firefox");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, join(output, "extension"), { recursive: true });
await writeFile(join(output, "README.txt"), [
  "ActivityWeaver Firefox extension",
  "",
  "Load extension/ temporarily from about:debugging, or submit the built folder",
  "to Mozilla Add-ons after signing and review.",
  "The desktop bridge must be running separately.",
  ""
].join("\n"), "utf8");
await archiveDirectory(join(output, "extension"), join(root, "artifacts", "activityweaver-firefox.zip"));
console.log("Prepared " + output);
