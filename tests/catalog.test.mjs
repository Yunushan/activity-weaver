import test from "node:test";
import assert from "node:assert/strict";
import { findActivityForUrl } from "../packages/activity-catalog/dist/index.js";
import { validateActivity } from "../packages/activity-validator/dist/index.js";

test("catalog matching prefers the most specific supported adapter", () => {
  assert.equal(findActivityForUrl("https://github.com/openai/codex")?.id, "github");
  assert.equal(findActivityForUrl("https://www.youtube.com/watch?v=123")?.id, "youtube");
  assert.equal(findActivityForUrl("https://example.invalid/") , undefined);
});

test("catalog validation rejects unknown and unsafe adapter fields", () => {
  const issues = validateActivity({
    id: "unsafe",
    name: "Unsafe",
    version: 1,
    description: "Example",
    match: { hostnames: ["https://example.com"], pathPrefixes: ["private path"] },
    unexpected: true
  });
  assert.ok(issues.some((issue) => issue.path === "unexpected"));
  assert.ok(issues.some((issue) => issue.path === "match.hostnames[0]"));
  assert.ok(issues.some((issue) => issue.path === "match.pathPrefixes[0]"));
});
