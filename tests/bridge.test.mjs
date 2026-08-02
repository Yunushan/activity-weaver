import test from "node:test";
import assert from "node:assert/strict";
import { readConfig } from "../apps/bridge/dist/config.js";
import { ActivityRouter } from "../apps/bridge/dist/activity-router.js";

const logger = { debug() {}, info() {}, warn() {}, error() {} };

test("bridge configuration remains loopback-only", () => {
  assert.equal(readConfig({ ACTIVITYWEAVER_HOST: "0.0.0.0" }).host, "127.0.0.1");
  assert.equal(readConfig({ ACTIVITYWEAVER_HOST: "::1", ACTIVITYWEAVER_PORT: "32165" }).host, "::1");
  assert.equal(readConfig({ ACTIVITYWEAVER_PORT: "32165" }).port, 32165);
});

test("remote bridge configuration requires TLS and a strong token", () => {
  assert.throws(
    () => readConfig({ ACTIVITYWEAVER_REMOTE_HOST: "0.0.0.0", ACTIVITYWEAVER_REMOTE_TOKEN: "short" }),
    /Remote bridge requires/
  );
  const config = readConfig({
    ACTIVITYWEAVER_REMOTE_HOST: "0.0.0.0",
    ACTIVITYWEAVER_REMOTE_PORT: "32165",
    ACTIVITYWEAVER_REMOTE_TOKEN: "a".repeat(32),
    ACTIVITYWEAVER_REMOTE_TLS_CERT: "fullchain.pem",
    ACTIVITYWEAVER_REMOTE_TLS_KEY: "private-key.pem"
  });
  assert.equal(config.remote?.host, "0.0.0.0");
  assert.equal(config.remote?.port, 32165);
});

test("router serializes presence updates and retains the freshest source", async () => {
  const updates = [];
  const router = new ActivityRouter(async (activity) => {
    updates.push(activity?.details ?? null);
    await new Promise((resolve) => setTimeout(resolve, 40));
  }, logger);
  const now = Date.now();
  router.upsert({ source: { id: "tab:old" }, activity: { details: "Old" }, observedAt: now });
  router.upsert({ source: { id: "tab:new" }, activity: { details: "New" }, observedAt: now + 1 });
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.deepEqual(updates, ["New"]);
});
