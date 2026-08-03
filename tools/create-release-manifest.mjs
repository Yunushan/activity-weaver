import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const root = resolve(".");
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const assetNames = process.argv.slice(2);
if (assetNames.length === 0) throw new Error("Provide at least one release asset.");

const assets = [];
for (const name of assetNames.sort()) {
  const path = resolve(name);
  const data = await readFile(path);
  const metadata = await stat(path);
  assets.push({
    name: basename(name),
    bytes: metadata.size,
    sha256: createHash("sha256").update(data).digest("hex")
  });
}

const manifest = {
  schema: "https://activityweaver.dev/release-manifest/v1",
  version: packageJson.version,
  commit: process.env.GITHUB_SHA ?? "local",
  assets
};
const output = join(root, "artifacts", "release-manifest.json");
await writeFile(output, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`Created ${output}`);
