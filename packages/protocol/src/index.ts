export const PROTOCOL_VERSION = 1 as const;
export const DEFAULT_BRIDGE_PORT = 32164 as const;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export type UrlMode = "path" | "origin" | "none";

export interface PresenceTimestamps {
  start?: number;
  end?: number;
}

export interface PresenceAssets {
  large_image?: string;
  large_text?: string;
  small_image?: string;
  small_text?: string;
}

export interface PresenceButton {
  label: string;
  url: string;
}

export interface PresenceActivity {
  details?: string;
  state?: string;
  timestamps?: PresenceTimestamps;
  assets?: PresenceAssets;
  buttons?: PresenceButton[];
  type?: number;
  instance?: boolean;
}

export interface ActivitySource {
  id: string;
  tabId?: number;
  frameId?: number;
  hostname?: string;
  url?: string;
  title?: string;
}

export interface ActivityEnvelope {
  source: ActivitySource;
  activity: PresenceActivity;
  observedAt: number;
}

export type BridgeRequest =
  | {
      type: "hello";
      protocol: number;
      client: "extension" | "cli" | "test";
      authToken?: string;
    }
  | {
      type: "set_activity";
      protocol: number;
      envelope: ActivityEnvelope;
    }
  | {
      type: "clear_activity";
      protocol: number;
      sourceId: string;
    };

export type BridgeResponse =
  | {
      type: "hello";
      protocol: number;
      bridge: "activityweaver";
      discord: "connected" | "disconnected" | "disabled";
    }
  | {
      type: "ack";
      request: "set_activity" | "clear_activity";
      sourceId?: string;
    }
  | {
      type: "error";
      code: string;
      message: string;
    };

export interface SelectorRule {
  selectors: string[];
  attribute?: string;
}

export interface ActivityMatch {
  hostnames: string[];
  pathPrefixes?: string[];
}

export interface ActivityExtract {
  title?: SelectorRule;
  state?: SelectorRule;
  description?: SelectorRule;
  image?: SelectorRule;
  author?: SelectorRule;
}

export interface ActivityDisplay {
  details?: string;
  state?: string;
}

export interface ActivityPrivacy {
  urlMode?: UrlMode;
}

export interface ActivityDefinition {
  id: string;
  name: string;
  version: number;
  description: string;
  match: ActivityMatch;
  extract?: ActivityExtract;
  display?: ActivityDisplay;
  privacy?: ActivityPrivacy;
  media?: {
    enabled?: boolean;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function boundedString(value: unknown, maxLength: number): string | undefined {
  if (!isNonEmptyString(value)) {
    return undefined;
  }
  return value.trim().slice(0, maxLength);
}

function parseTimestamp(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function parseActivity(value: unknown): PresenceActivity | null {
  if (!isRecord(value)) {
    return null;
  }

  const activity: PresenceActivity = {};
  const details = boundedString(value.details, 128);
  const state = boundedString(value.state, 128);
  if (details) activity.details = details;
  if (state) activity.state = state;

  if (isRecord(value.timestamps)) {
    const start = parseTimestamp(value.timestamps.start);
    const end = parseTimestamp(value.timestamps.end);
    if ((start || end) && (!start || !end || end >= start)) {
      activity.timestamps = { start, end };
    }
  }

  if (isRecord(value.assets)) {
    const assets: PresenceAssets = {};
    for (const key of ["large_image", "large_text", "small_image", "small_text"] as const) {
      const item = boundedString(value.assets[key], 256);
      if (item) assets[key] = item;
    }
    if (Object.keys(assets).length > 0) activity.assets = assets;
  }

  if (Array.isArray(value.buttons)) {
    const buttons = value.buttons
      .filter(isRecord)
      .map((button) => {
        const label = boundedString(button.label, 32);
        const url = boundedString(button.url, 512);
        if (!label || !url) return null;
        try {
          const parsed = new URL(url);
          if (!["http:", "https:"].includes(parsed.protocol)) return null;
        } catch {
          return null;
        }
        return { label, url };
      })
      .filter((button): button is PresenceButton => button !== null)
      .slice(0, 2);
    if (buttons.length > 0) activity.buttons = buttons;
  }

  if (typeof value.type === "number" && Number.isInteger(value.type) && value.type >= 0 && value.type <= 5) {
    activity.type = value.type;
  }
  if (typeof value.instance === "boolean") activity.instance = value.instance;

  return Object.keys(activity).length > 0 ? activity : null;
}

function parseSource(value: unknown): ActivitySource | null {
  if (!isRecord(value)) return null;
  const id = boundedString(value.id, 128);
  if (!id) return null;

  const source: ActivitySource = { id };
  for (const key of ["hostname", "title"] as const) {
    const item = boundedString(value[key], 256);
    if (item) source[key] = item;
  }

  const rawUrl = boundedString(value.url, 1024);
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (["http:", "https:"].includes(parsed.protocol)) {
        parsed.username = "";
        parsed.password = "";
        source.url = parsed.toString();
      }
    } catch {
      // An invalid URL is simply omitted from optional source metadata.
    }
  }

  for (const key of ["tabId", "frameId"] as const) {
    const item = value[key];
    if (typeof item === "number" && Number.isInteger(item) && item >= 0) source[key] = item;
  }
  return source;
}

export function parseBridgeRequest(value: unknown): BridgeRequest | null {
  if (!isRecord(value) || value.protocol !== PROTOCOL_VERSION || !isNonEmptyString(value.type)) {
    return null;
  }

  if (value.type === "hello") {
    const client = value.client;
    if (client === "extension" || client === "cli" || client === "test") {
      const authToken = boundedString(value.authToken, 512);
      return { type: "hello", protocol: PROTOCOL_VERSION, client, ...(authToken ? { authToken } : {}) };
    }
    return null;
  }

  if (value.type === "set_activity") {
    if (!isRecord(value.envelope)) return null;
    const source = parseSource(value.envelope.source);
    const activity = parseActivity(value.envelope.activity);
    const observedAt = value.envelope.observedAt;
    if (!source || !activity || !isValidObservedAt(observedAt)) {
      return null;
    }
    return {
      type: "set_activity",
      protocol: PROTOCOL_VERSION,
      envelope: { source, activity, observedAt }
    };
  }

  if (value.type === "clear_activity") {
    const sourceId = boundedString(value.sourceId, 128);
    return sourceId
      ? { type: "clear_activity", protocol: PROTOCOL_VERSION, sourceId }
      : null;
  }

  return null;
}

export function normaliseUrl(rawUrl: string, mode: UrlMode = "path"): string | undefined {
  if (mode === "none") return undefined;
  try {
    const url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    url.username = "";
    url.password = "";
    url.hash = "";
    url.search = "";
    if (mode === "origin") url.pathname = "/";
    return url.toString();
  } catch {
    return undefined;
  }
}

function isValidObservedAt(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value > 0
    && value <= Date.now() + MAX_CLOCK_SKEW_MS;
}
