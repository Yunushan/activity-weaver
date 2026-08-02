import type { ActivityDefinition } from "@activityweaver/protocol";

export interface ValidationIssue {
  path: string;
  message: string;
}

export function validateActivity(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return [{ path: "$", message: "activity must be an object" }];

  requireString(value.id, "id", issues);
  requireString(value.name, "name", issues);
  requireString(value.description, "description", issues);
  if (!Number.isInteger(value.version) || Number(value.version) < 1) {
    issues.push({ path: "version", message: "must be a positive integer" });
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value.id ?? ""))) {
    issues.push({ path: "id", message: "must use lowercase kebab-case" });
  }

  if (!isRecord(value.match)) {
    issues.push({ path: "match", message: "is required" });
  } else {
    requireStringArray(value.match.hostnames, "match.hostnames", issues);
    if (value.match.pathPrefixes !== undefined) {
      requireStringArray(value.match.pathPrefixes, "match.pathPrefixes", issues);
    }
  }

  if (value.extract !== undefined) {
    if (!isRecord(value.extract)) {
      issues.push({ path: "extract", message: "must be an object" });
    } else {
      for (const [field, rule] of Object.entries(value.extract)) {
        if (!isRecord(rule)) {
          issues.push({ path: "extract." + field, message: "must be an object" });
          continue;
        }
        requireStringArray(rule.selectors, "extract." + field + ".selectors", issues);
        if (rule.attribute !== undefined) requireString(rule.attribute, "extract." + field + ".attribute", issues);
      }
    }
  }

  if (isRecord(value.privacy) && value.privacy.urlMode !== undefined) {
    if (!["path", "origin", "none"].includes(String(value.privacy.urlMode))) {
      issues.push({ path: "privacy.urlMode", message: "must be path, origin, or none" });
    }
  }

  return issues;
}

export function isActivityDefinition(value: unknown): value is ActivityDefinition {
  return validateActivity(value).length === 0;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

function requireString(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string" || value.trim() === "") {
    issues.push({ path, message: "must be a non-empty string" });
  }
}

function requireStringArray(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    issues.push({ path, message: "must be a non-empty string array" });
  }
}
