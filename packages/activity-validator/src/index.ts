import type { ActivityDefinition } from "@activityweaver/protocol";

export interface ValidationIssue {
  path: string;
  message: string;
}

export function validateActivity(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return [{ path: "$", message: "activity must be an object" }];

  reportUnknownKeys(value, ["id", "name", "version", "description", "match", "extract", "display", "privacy", "media"], "$", issues);

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
    reportUnknownKeys(value.match, ["hostnames", "pathPrefixes"], "match", issues);
    requireStringArray(value.match.hostnames, "match.hostnames", issues);
    if (Array.isArray(value.match.hostnames)) {
      value.match.hostnames.forEach((hostname, index) => {
        if (typeof hostname === "string" && !isHostnamePattern(hostname)) {
          issues.push({ path: `match.hostnames[${index}]`, message: "must be a hostname or wildcard hostname" });
        }
      });
    }
    if (value.match.pathPrefixes !== undefined) {
      requireStringArray(value.match.pathPrefixes, "match.pathPrefixes", issues);
      if (Array.isArray(value.match.pathPrefixes)) {
        value.match.pathPrefixes.forEach((prefix, index) => {
          if (typeof prefix === "string" && (!prefix.startsWith("/") || /\s/.test(prefix))) {
            issues.push({ path: `match.pathPrefixes[${index}]`, message: "must start with / and contain no whitespace" });
          }
        });
      }
    }
  }

  if (value.extract !== undefined) {
    if (!isRecord(value.extract)) {
      issues.push({ path: "extract", message: "must be an object" });
    } else {
      reportUnknownKeys(value.extract, ["title", "state", "description", "image", "author"], "extract", issues);
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

  if (value.display !== undefined) {
    if (!isRecord(value.display)) {
      issues.push({ path: "display", message: "must be an object" });
    } else {
      reportUnknownKeys(value.display, ["details", "state"], "display", issues);
      for (const key of ["details", "state"] as const) {
        if (value.display[key] !== undefined) requireString(value.display[key], `display.${key}`, issues);
      }
    }
  }

  if (value.privacy !== undefined) {
    if (!isRecord(value.privacy)) {
      issues.push({ path: "privacy", message: "must be an object" });
    } else {
      reportUnknownKeys(value.privacy, ["urlMode"], "privacy", issues);
    }
    if (isRecord(value.privacy) && value.privacy.urlMode !== undefined
      && !["path", "origin", "none"].includes(String(value.privacy.urlMode))) {
      issues.push({ path: "privacy.urlMode", message: "must be path, origin, or none" });
    }
  }

  if (value.media !== undefined) {
    if (!isRecord(value.media)) {
      issues.push({ path: "media", message: "must be an object" });
    } else {
      reportUnknownKeys(value.media, ["enabled"], "media", issues);
      if (value.media.enabled !== undefined && typeof value.media.enabled !== "boolean") {
        issues.push({ path: "media.enabled", message: "must be a boolean" });
      }
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

function reportUnknownKeys(
  value: Record<string, any>,
  allowed: string[],
  path: string,
  issues: ValidationIssue[]
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) issues.push({ path: path === "$" ? key : path + "." + key, message: "is not supported" });
  }
}

function isHostnamePattern(value: string): boolean {
  const hostname = value.trim().toLowerCase();
  if (hostname === "*") return true;
  const candidate = hostname.startsWith("*.") ? hostname.slice(2) : hostname;
  return candidate.length > 0
    && candidate.length <= 253
    && !candidate.includes("/")
    && !candidate.includes(":")
    && candidate.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}
