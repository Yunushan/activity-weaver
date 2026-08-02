export {};

const DEFAULT_BRIDGE_URL = "ws://127.0.0.1:32164";
const form = document.querySelector<HTMLFormElement>("#settings");
const bridgeUrlInput = document.querySelector<HTMLInputElement>("#bridgeUrl");
const bridgeTokenInput = document.querySelector<HTMLInputElement>("#bridgeToken");
const enabledInput = document.querySelector<HTMLInputElement>("#enabled");
const statusElement = document.querySelector<HTMLElement>("#status");

void load();

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const bridgeUrl = bridgeUrlInput?.value.trim() ?? "";
  const bridgeToken = bridgeTokenInput?.value.trim() ?? "";
  const enabled = Boolean(enabledInput?.checked);
  if (!validBridgeUrl(bridgeUrl)) {
    if (statusElement) statusElement.textContent = "Use ws://localhost for local mode or wss://host for remote mode.";
    return;
  }
  if (bridgeUrl.startsWith("wss://") && bridgeToken.length < 32) {
    if (statusElement) statusElement.textContent = "Remote mode requires the 32+ character bridge token.";
    return;
  }
  await chrome.storage.local.set({ bridgeUrl, bridgeToken, enabled });
  if (statusElement) statusElement.textContent = "Settings saved.";
});

async function load(): Promise<void> {
  const settings = await chrome.storage.local.get({
    bridgeUrl: DEFAULT_BRIDGE_URL,
    bridgeToken: "",
    enabled: true
  });
  if (bridgeUrlInput) bridgeUrlInput.value = typeof settings.bridgeUrl === "string" ? settings.bridgeUrl : DEFAULT_BRIDGE_URL;
  if (bridgeTokenInput) bridgeTokenInput.value = typeof settings.bridgeToken === "string" ? settings.bridgeToken : "";
  if (enabledInput) enabledInput.checked = Boolean(settings.enabled);
}

function validBridgeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") return false;
    if (parsed.username || parsed.password) return false;
    return parsed.protocol === "wss:"
      || parsed.hostname === "127.0.0.1"
      || parsed.hostname === "localhost"
      || parsed.hostname === "[::1]"
      || parsed.hostname === "::1";
  } catch {
    return false;
  }
}
