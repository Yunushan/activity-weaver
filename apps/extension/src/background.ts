import {
  DEFAULT_BRIDGE_PORT,
  PROTOCOL_VERSION,
  type BridgeRequest,
  type PresenceActivity
} from "@activityweaver/protocol";

type ContentMessage =
  | {
      type: "activity_update";
      activity: PresenceActivity;
      source: {
        hostname?: string;
        url?: string;
        title?: string;
      };
    }
  | { type: "activity_clear" };

const pending = new Map<string, string>();
let socket: WebSocket | undefined;
let reconnectTimer: number | undefined;
const DEFAULT_BRIDGE_URL = "ws://127.0.0.1:" + DEFAULT_BRIDGE_PORT;
let bridgeUrl = DEFAULT_BRIDGE_URL;
let bridgeToken = "";
let clientInstanceId = "client:unknown";
let enabled = true;

void loadSettings();
chrome.storage.onChanged.addListener((changes) => {
  if (changes.bridgeUrl?.newValue !== undefined
    || changes.bridgeToken?.newValue !== undefined
    || changes.bridgePort?.newValue !== undefined
    || changes.enabled?.newValue !== undefined) {
    void loadSettings(true);
  }
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const content = parseContentMessage(message);
  if (!content) {
    sendResponse({ ok: false });
    return false;
  }

  const tabId = sender.tab?.id;
  const sourceId = clientInstanceId + ":" + (tabId === undefined ? "runtime:" + (sender.id ?? "unknown") : "tab:" + tabId);
  if (content.type === "activity_update") {
    const request: BridgeRequest = {
      type: "set_activity",
      protocol: PROTOCOL_VERSION,
      envelope: {
        source: {
          id: sourceId,
          tabId,
          frameId: sender.frameId,
          hostname: content.source.hostname,
          url: content.source.url,
          title: content.source.title
        },
        activity: content.activity,
        observedAt: Date.now()
      }
    };
    sendOrQueue(sourceId, request);
  } else {
    sendOrQueue(sourceId, {
      type: "clear_activity",
      protocol: PROTOCOL_VERSION,
      sourceId
    });
  }

  sendResponse({ ok: true });
  return false;
});

async function loadSettings(reconnect = false): Promise<void> {
  const settings = await chrome.storage.local.get({
    bridgeUrl: DEFAULT_BRIDGE_URL,
    bridgePort: DEFAULT_BRIDGE_PORT,
    bridgeToken: "",
    clientInstanceId: "",
    enabled: true
  });
  bridgeUrl = validBridgeUrl(settings.bridgeUrl)
    ? settings.bridgeUrl
    : validPort(settings.bridgePort) ? "ws://127.0.0.1:" + settings.bridgePort : DEFAULT_BRIDGE_URL;
  bridgeToken = typeof settings.bridgeToken === "string" ? settings.bridgeToken.trim() : "";
  clientInstanceId = typeof settings.clientInstanceId === "string" && /^[a-z0-9:-]{8,64}$/i.test(settings.clientInstanceId)
    ? settings.clientInstanceId
    : "client:" + crypto.randomUUID();
  if (settings.clientInstanceId !== clientInstanceId) {
    await chrome.storage.local.set({ clientInstanceId });
  }
  enabled = Boolean(settings.enabled);
  if (!enabled) pending.clear();
  if (reconnect) {
    socket?.close();
    socket = undefined;
  }
}

function sendOrQueue(sourceId: string, request: BridgeRequest): void {
  if (!enabled) return;
  const serialized = JSON.stringify(request);
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(serialized);
    return;
  }
  pending.set(sourceId, serialized);
  connect();
}

function connect(): void {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
  socket = new WebSocket(bridgeUrl);
  socket.addEventListener("open", () => {
    const hello: BridgeRequest = {
      type: "hello",
      protocol: PROTOCOL_VERSION,
      client: "extension",
      ...(bridgeToken ? { authToken: bridgeToken } : {})
    };
    socket?.send(JSON.stringify(hello));
    for (const message of pending.values()) socket?.send(message);
    pending.clear();
  });
  socket.addEventListener("close", () => {
    socket = undefined;
    scheduleReconnect();
  });
  socket.addEventListener("error", () => {
    socket?.close();
  });
}

function scheduleReconnect(): void {
  if (reconnectTimer !== undefined || pending.size === 0) return;
  reconnectTimer = self.setTimeout(() => {
    reconnectTimer = undefined;
    connect();
  }, 1500);
}

function parseContentMessage(value: unknown): ContentMessage | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  if (value.type === "activity_clear") return { type: "activity_clear" };
  if (value.type !== "activity_update" || !isRecord(value.activity)) return null;
  const activity = value.activity as PresenceActivity;
  const source = isRecord(value.source) ? value.source : {};
  return {
    type: "activity_update",
    activity,
    source: {
      hostname: optionalString(source.hostname),
      url: optionalString(source.url),
      title: optionalString(source.title)
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function validPort(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value < 65536;
}

function validBridgeUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") return false;
    if (parsed.username || parsed.password) return false;
    return parsed.protocol === "wss:" || isLoopbackHost(parsed.hostname);
  } catch {
    return false;
  }
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]" || hostname === "::1";
}
