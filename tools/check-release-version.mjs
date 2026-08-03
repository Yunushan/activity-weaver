import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const tag = process.env.GITHUB_REF_NAME;
if (!tag) {
  console.log("No release tag supplied; version check skipped for local use.");
} else if (tag !== `v${packageJson.version}`) {
  throw new Error(`Release tag ${tag} does not match package version ${packageJson.version}.`);
} else {
  console.log(`Release tag ${tag} matches package version ${packageJson.version}.`);
}
