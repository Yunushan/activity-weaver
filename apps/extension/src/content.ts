import { findActivityForUrl } from "@activityweaver/activity-catalog";
import {
  normaliseUrl,
  type ActivityDefinition,
  type PresenceActivity,
  type SelectorRule
} from "@activityweaver/protocol";

let refreshTimer: number | undefined;
let lastSignature = "";
const attachedMedia = new WeakSet<HTMLMediaElement>();

void start();

async function start(): Promise<void> {
  installHistoryHooks();
  installObservers();
  await refresh();
}

function installObservers(): void {
  const observer = new MutationObserver(() => scheduleRefresh(500));
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  document.addEventListener("visibilitychange", () => scheduleRefresh(50), { passive: true });
  window.addEventListener("popstate", () => scheduleRefresh(50), { passive: true });
  window.addEventListener("hashchange", () => scheduleRefresh(50), { passive: true });
  window.addEventListener("pagehide", () => {
    lastSignature = "";
    void chrome.runtime.sendMessage({ type: "activity_clear" });
  }, { passive: true });
  window.addEventListener("pageshow", () => {
    lastSignature = "";
    scheduleRefresh(50);
  }, { passive: true });
}

function installHistoryHooks(): void {
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method];
    history[method] = function (this: History, ...args: Parameters<History[typeof method]>): void {
      original.apply(this, args);
      scheduleRefresh(100);
    } as History[typeof method];
  }
}

function scheduleRefresh(delay: number): void {
  if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    refreshTimer = undefined;
    void refresh();
  }, delay);
}

async function refresh(): Promise<void> {
  const definition = findActivityForUrl(location.href);
  const activity = extractActivity(definition);
  const source = {
    hostname: location.hostname,
    url: normaliseUrl(location.href, definition?.privacy?.urlMode ?? "origin"),
    title: document.title
  };
  attachMediaListeners();
  const signature = JSON.stringify({ activity, source });
  if (signature === lastSignature) return;
  lastSignature = signature;
  await chrome.runtime.sendMessage({
    type: "activity_update",
    activity,
    source
  });
}

function extractActivity(definition: ActivityDefinition | undefined): PresenceActivity {
  const site = location.hostname.replace(/^www\./, "");
  const title = readField(definition?.extract?.title) ?? readGenericTitle() ?? site;
  const author = readField(definition?.extract?.author);
  const description = readField(definition?.extract?.description);
  const extractedState = readField(definition?.extract?.state);
  const media = selectMedia();
  const state = render(
    definition?.display?.state ?? (media && !media.element.paused ? "Playing on {site}" : "Visiting {site}"),
    { title, state: extractedState, site, author, description }
  );
  const details = render(definition?.display?.details ?? "{title}", {
    title,
    state,
    site,
    author,
    description
  });

  const activity: PresenceActivity = {
    details: details ?? title,
    state: state ?? ("Visiting " + site),
    type: 0,
    instance: false
  };

  if (media) {
    const start = Date.now() - Math.floor(media.element.currentTime * 1000);
    const end = Number.isFinite(media.element.duration) && media.element.duration > 0
      ? start + Math.floor(media.element.duration * 1000)
      : undefined;
    activity.timestamps = end ? { start, end } : { start };
    if (media.element.paused) activity.state = "Paused · " + (state ?? site);
  }
  return activity;
}

function readField(rule: SelectorRule | undefined): string | undefined {
  if (!rule) return undefined;
  for (const selector of rule.selectors) {
    let element: Element | null = null;
    try {
      element = document.querySelector(selector);
    } catch {
      continue;
    }
    if (!element) continue;
    const value = rule.attribute ? element.getAttribute(rule.attribute) ?? element.textContent : element.textContent;
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }
  return undefined;
}

function readGenericTitle(): string | undefined {
  const meta = document.querySelector("meta[property='og:title'], meta[name='twitter:title']");
  const metadataTitle = meta?.getAttribute("content");
  const pageTitle = clean(metadataTitle ?? document.title);
  return pageTitle?.replace(/\s+[|·—-]\s+[^|·—-]+$/, "") ?? undefined;
}

function selectMedia(): { element: HTMLMediaElement } | undefined {
  const candidates = Array.from(document.querySelectorAll<HTMLMediaElement>("video, audio"))
    .filter((element) => isVisible(element) && (Number.isFinite(element.duration) || !element.paused));
  const active = candidates.find((element) => !element.paused && element.readyState > 0);
  const element = active ?? candidates[0];
  return element ? { element } : undefined;
}

function attachMediaListeners(): void {
  for (const element of Array.from(document.querySelectorAll<HTMLMediaElement>("video, audio"))) {
    if (attachedMedia.has(element)) continue;
    attachedMedia.add(element);
    for (const event of ["play", "pause", "timeupdate", "loadedmetadata", "ended"]) {
      element.addEventListener(event, () => scheduleRefresh(event === "timeupdate" ? 2500 : 50), { passive: true });
    }
  }
}

function isVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
}

function render(template: string, values: Record<string, string | undefined>): string | undefined {
  const result = template.replace(/\{([a-z]+)\}/gi, (_full, key: string) => values[key] ?? "");
  return clean(result);
}

function clean(value: string | null | undefined, maximum = 128): string | undefined {
  const result = value?.replace(/\s+/g, " ").trim().slice(0, maximum);
  return result || undefined;
}
