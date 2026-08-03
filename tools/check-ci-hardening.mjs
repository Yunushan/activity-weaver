import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(".");
const workflows = (await readdir(join(root, ".github", "workflows")))
  .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
  .sort();
const checks = [];
const check = (name, pass) => checks.push([name, Boolean(pass)]);
const contents = await Promise.all(workflows.map(async (file) => [file, await readFile(join(root, ".github", "workflows", file), "utf8")]));
const allWorkflowText = contents.map(([, text]) => text).join("\n");
const actions = [...allWorkflowText.matchAll(/^\s+uses:\s+([^@\s]+)@([^\s#]+)/gm)];

check("all third-party workflow actions use immutable 40-character SHAs", actions.length > 0 && actions.every(([, , ref]) => /^[0-9a-f]{40}$/i.test(ref)));
check("CI cancels superseded runs", /ci-\$\{\{ github\.workflow \}\}/.test(await readWorkflow("ci.yml")));
check("release runs have an environment gate", /environment:\s+release/.test(await readWorkflow("release.yml")));
check("CodeQL workflow exists", workflows.includes("codeql.yml") && allWorkflowText.includes("github/codeql-action/init@"));
check("dependency review workflow exists", workflows.includes("dependency-review.yml") && allWorkflowText.includes("actions/dependency-review-action@"));
check("artifact smoke job exists", /artifact-package:/.test(await readWorkflow("ci.yml")) && allWorkflowText.includes("actions/upload-artifact@"));
check("real Chromium extension smoke job exists", /browser-e2e:/.test(await readWorkflow("ci.yml")) && allWorkflowText.includes("pnpm test:e2e"));
check("workflow jobs have timeouts", allWorkflowText.match(/runs-on:/g)?.length === allWorkflowText.match(/timeout-minutes:/g)?.length);

for (const [name, pass] of checks) console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
if (checks.some(([, pass]) => !pass)) process.exitCode = 1;

async function readWorkflow(file) {
  return readFile(join(root, ".github", "workflows", file), "utf8");
}
