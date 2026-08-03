import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { ActivityRouter } from "../apps/bridge/dist/activity-router.js";
import { BridgeServer } from "../apps/bridge/dist/server.js";

test("Chromium loads the extension and sends a page activity to the bridge", async (t) => {
  const extensionPath = resolve("apps/extension/dist");
  const diagnostics = [];
  const logger = {
    debug(message, details) { diagnostics.push(["debug", message, details]); },
    info(message, details) { diagnostics.push(["info", message, details]); },
    warn(message, details) { diagnostics.push(["warn", message, details]); },
    error(message, details) { diagnostics.push(["error", message, details]); }
  };
  const updates = [];
  const router = new ActivityRouter((activity) => {
    updates.push(activity?.details ?? null);
  }, logger);
  const bridge = new BridgeServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error" },
    router,
    discordStatus: () => "disabled",
    logger
  });
  bridge.start();
  const localServer = bridge.localServer;
  assert.ok(localServer);
  if (!localServer.listening) await once(localServer, "listening");
  const bridgeAddress = localServer.address();
  assert.equal(typeof bridgeAddress, "object");

  const httpServer = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><title>ActivityWeaver browser smoke</title><h1>Smoke page</h1>");
  });
  httpServer.listen(0, "127.0.0.1");
  await once(httpServer, "listening");
  const httpAddress = httpServer.address();
  assert.equal(typeof httpAddress, "object");

  let context;
  t.after(async () => {
    await context?.close();
    await new Promise((resolvePromise) => httpServer.close(() => resolvePromise()));
    await bridge.stop();
  });
  context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      "--no-sandbox",
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });
  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) serviceWorker = await context.waitForEvent("serviceworker");
  const bridgeUrl = `ws://127.0.0.1:${bridgeAddress.port}`;
  await serviceWorker.evaluate(async (url) => {
    await chrome.storage.local.set({ bridgeUrl: url, bridgeToken: "", enabled: true });
  }, bridgeUrl);

  const page = await context.newPage();
  page.on("console", (message) => diagnostics.push(["page-console", message.type(), message.text()]));
  page.on("pageerror", (error) => diagnostics.push(["page-error", error.message]));
  await page.goto(`http://127.0.0.1:${httpAddress.port}/`);
  try {
    await waitFor(() => updates.includes("ActivityWeaver browser smoke"), 10_000);
  } catch (error) {
    console.error(JSON.stringify({ updates, diagnostics, serviceWorkers: context.serviceWorkers().map((worker) => worker.url()) }, null, 2));
    throw error;
  }
  assert.ok(updates.includes("ActivityWeaver browser smoke"));
});

async function waitFor(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error("Timed out waiting for browser activity update.");
}
