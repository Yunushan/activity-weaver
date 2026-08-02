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
let bridgePort: number = DEFAULT_BRIDGE_PORT;
let enabled = true;

void loadSettings();
chrome.storage.onChanged.addListener((changes) => {
  if (changes.bridgePort?.newValue !== undefined || changes.enabled?.newValue !== undefined) {
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
  const sourceId = tabId === undefined ? "runtime:" + (sender.id ?? "unknown") : "tab:" + tabId;
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
    bridgePort: DEFAULT_BRIDGE_PORT,
    enabled: true
  });
  bridgePort = validPort(settings.bridgePort) ? settings.bridgePort : DEFAULT_BRIDGE_PORT;
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
  socket = new WebSocket("ws://127.0.0.1:" + bridgePort);
  socket.addEventListener("open", () => {
    const hello: BridgeRequest = {
      type: "hello",
      protocol: PROTOCOL_VERSION,
      client: "extension"
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
