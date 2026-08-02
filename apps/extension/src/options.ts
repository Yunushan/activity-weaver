export {};

const DEFAULT_PORT = 32164;
const form = document.querySelector<HTMLFormElement>("#settings");
const portInput = document.querySelector<HTMLInputElement>("#port");
const enabledInput = document.querySelector<HTMLInputElement>("#enabled");
const statusElement = document.querySelector<HTMLElement>("#status");

void load();

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const port = Number(portInput?.value);
  const enabled = Boolean(enabledInput?.checked);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    if (statusElement) statusElement.textContent = "Enter a valid TCP port.";
    return;
  }
  await chrome.storage.local.set({ bridgePort: port, enabled });
  if (statusElement) statusElement.textContent = "Settings saved.";
});

async function load(): Promise<void> {
  const settings = await chrome.storage.local.get({
    bridgePort: DEFAULT_PORT,
    enabled: true
  });
  if (portInput) portInput.value = String(settings.bridgePort);
  if (enabledInput) enabledInput.checked = Boolean(settings.enabled);
}
