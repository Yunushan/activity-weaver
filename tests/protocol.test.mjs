import test from "node:test";
import assert from "node:assert/strict";
import { normaliseUrl, parseBridgeRequest } from "../packages/protocol/dist/index.js";

test("normaliseUrl removes credentials and tracking fragments", () => {
  assert.equal(
    normaliseUrl("https://user:secret@example.com/path?token=private#section", "path"),
    "https://example.com/path"
  );
  assert.equal(normaliseUrl("https://example.com/private/path?token=private", "origin"), "https://example.com/");
  assert.equal(normaliseUrl("https://example.com/private", "none"), undefined);
});

test("parseBridgeRequest validates timestamps and strips source credentials", () => {
  const request = parseBridgeRequest({
    type: "set_activity",
    protocol: 1,
    envelope: {
      source: { id: "tab:1", url: "https://user:secret@example.com/" },
      activity: { details: "Browsing" },
      observedAt: Date.now()
    }
  });
  assert.equal(request?.type, "set_activity");
  assert.equal(request?.envelope.source.url, "https://example.com/");

  assert.equal(parseBridgeRequest({
    type: "set_activity",
    protocol: 1,
    envelope: {
      source: { id: "tab:1" },
      activity: { details: "Future" },
      observedAt: Date.now() + 10 * 60 * 1000
    }
  }), null);
});

test("parseBridgeRequest preserves the remote authentication token only on hello", () => {
  assert.deepEqual(parseBridgeRequest({
    type: "hello",
    protocol: 1,
    client: "extension",
    authToken: "a".repeat(32)
  }), {
    type: "hello",
    protocol: 1,
    client: "extension",
    authToken: "a".repeat(32)
  });
});
