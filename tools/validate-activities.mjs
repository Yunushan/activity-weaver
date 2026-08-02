import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const directory = resolve("packages/activity-catalog/src/catalog");
const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
const errors = [];

function requireString(value, path, file) {
  if (typeof value !== "string" || value.trim() === "") errors.push(file + ": " + path + " must be a non-empty string");
}

function requireArray(value, path, file) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    errors.push(file + ": " + path + " must be a non-empty string array");
  }
}

for (const file of files) {
  const label = join("packages/activity-catalog/src/catalog", file);
  let activity;
  try {
    activity = JSON.parse(await readFile(join(directory, file), "utf8"));
  } catch (error) {
    errors.push(label + ": invalid JSON (" + error.message + ")");
    continue;
  }

  requireString(activity.id, "id", label);
  requireString(activity.name, "name", label);
  requireString(activity.description, "description", label);
  if (!Number.isInteger(activity.version) || activity.version < 1) {
    errors.push(label + ": version must be a positive integer");
  }
  if (!activity.match || typeof activity.match !== "object") {
    errors.push(label + ": match is required");
  } else {
    requireArray(activity.match.hostnames, "match.hostnames", label);
    if (activity.match.pathPrefixes !== undefined) requireArray(activity.match.pathPrefixes, "match.pathPrefixes", label);
  }

  for (const [field, rule] of Object.entries(activity.extract ?? {})) {
    if (!rule || typeof rule !== "object") {
      errors.push(label + ": extract." + field + " must be an object");
      continue;
    }
    requireArray(rule.selectors, "extract." + field + ".selectors", label);
    if (rule.attribute !== undefined) requireString(rule.attribute, "extract." + field + ".attribute", label);
  }

  const urlMode = activity.privacy?.urlMode;
  if (urlMode !== undefined && !["path", "origin", "none"].includes(urlMode)) {
    errors.push(label + ": privacy.urlMode must be path, origin, or none");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(activity.id ?? "")) {
    errors.push(label + ": id must use lowercase kebab-case");
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Validated " + files.length + " activity definitions.");
}
