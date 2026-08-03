import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import WebSocket from "ws";
import { ActivityRouter } from "../dist/activity-router.js";
import { BridgeServer } from "../dist/server.js";

const logger = { debug() {}, info() {}, warn() {}, error() {} };

async function startServer() {
  const updates = [];
  const router = new ActivityRouter((activity) => {
    updates.push(activity?.details ?? null);
  }, logger);
  const server = new BridgeServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error" },
    router,
    discordStatus: () => "disabled",
    logger
  });
  server.start();
  const localServer = server.localServer;
  assert.ok(localServer);
  if (!localServer.listening) await once(localServer, "listening");
  const address = localServer.address();
  assert.equal(typeof address, "object");
  return { server, updates, port: address.port };
}

function nextMessage(socket) {
  return new Promise((resolve, reject) => {
    const onMessage = (data) => {
      cleanup();
      try {
        resolve(JSON.parse(data.toString("utf8")));
      } catch (error) {
        reject(error);
      }
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("message", onMessage);
      socket.off("error", onError);
    };
    socket.once("message", onMessage);
    socket.once("error", onError);
  });
}

test("local bridge performs the hello, validation, acknowledgement, and cleanup flow", async () => {
  const { server, updates, port } = await startServer();
  const socket = new WebSocket(`ws://127.0.0.1:${port}`, {
    origin: "chrome-extension://activityweaver-test"
  });
  try {
    await once(socket, "open");
    socket.send(JSON.stringify({ type: "hello", protocol: 1, client: "test" }));
    assert.deepEqual(await nextMessage(socket), {
      type: "hello",
      protocol: 1,
      bridge: "activityweaver",
      discord: "disabled"
    });

    socket.send(JSON.stringify({ type: "not-a-request", protocol: 1 }));
    assert.deepEqual(await nextMessage(socket), {
      type: "error",
      code: "invalid_request",
      message: "Message does not match the protocol."
    });

    socket.send(JSON.stringify({
      type: "set_activity",
      protocol: 1,
      envelope: {
        source: { id: "test:tab:1", hostname: "example.com" },
        activity: { details: "Integration test" },
        observedAt: Date.now()
      }
    }));
    assert.deepEqual(await nextMessage(socket), {
      type: "ack",
      request: "set_activity",
      sourceId: "test:tab:1"
    });

    await new Promise((resolve) => setTimeout(resolve, 220));
    assert.deepEqual(updates, ["Integration test"]);

    socket.close();
    await once(socket, "close");
    await new Promise((resolve) => setTimeout(resolve, 220));
    assert.deepEqual(updates, ["Integration test", null]);
  } finally {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
    await server.stop();
  }
});

