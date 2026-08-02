import type {
  ActivityDefinition,
  ActivityDisplay,
  ActivityExtract,
  ActivityMatch,
  SelectorRule
} from "@activityweaver/protocol";

export function defineActivity(activity: ActivityDefinition): ActivityDefinition {
  return structuredClone(activity);
}

export function host(...hostnames: string[]): ActivityMatch {
  return { hostnames };
}

export function selectors(...values: string[]): SelectorRule {
  return { selectors: values };
}

export function attribute(attributeName: string, ...values: string[]): SelectorRule {
  return { selectors: values, attribute: attributeName };
}

export function display(details?: string, state?: string): ActivityDisplay {
  return { details, state };
}

export function extract(fields: ActivityExtract): ActivityExtract {
  return structuredClone(fields);
}

export function interpolate(template: string | undefined, values: Record<string, string | undefined>): string | undefined {
  if (!template) return undefined;
  const result = template.replace(/\{([a-z]+)\}/gi, (full, key: string) => values[key] ?? "");
  const cleaned = result.replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}
