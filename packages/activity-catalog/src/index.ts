import type { ActivityDefinition } from "@activityweaver/protocol";
import { builtInActivities } from "./generated.js";

export { builtInActivities };

export function findActivityForUrl(rawUrl: string): ActivityDefinition | undefined {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return undefined;
  }

  const candidates = builtInActivities
    .filter((activity) => matchesHostname(url.hostname, activity.match.hostnames))
    .filter((activity) => {
      const prefixes = activity.match.pathPrefixes;
      return !prefixes || prefixes.length === 0 || prefixes.some((prefix) => url.pathname.startsWith(prefix));
    })
    .sort((left, right) => specificity(right) - specificity(left));

  return candidates[0];
}

function matchesHostname(hostname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern === "*") return true;
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(1).toLowerCase();
      return hostname.toLowerCase().endsWith(suffix) && hostname.length > suffix.length;
    }
    return hostname.toLowerCase() === pattern.toLowerCase();
  });
}

function specificity(activity: ActivityDefinition): number {
  const hostScore = Math.max(...activity.match.hostnames.map((hostname) => hostname.replace("*.", "").length), 0);
  const pathScore = Math.max(...(activity.match.pathPrefixes ?? ["/"]).map((prefix) => prefix.length), 0);
  return hostScore * 10 + pathScore;
}
