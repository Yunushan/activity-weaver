import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("content lifecycle recovers presence after pagehide and BFCache restore", async () => {
  const source = await readFile("apps/extension/src/content.ts", "utf8");
  assert.match(source, /pagehide/);
  assert.match(source, /pageshow/);
  assert.match(source, /lastSignature\s*=\s*""/);
});

test("background waits for settings before assigning a source identity", async () => {
  const source = await readFile("apps/extension/src/background.ts", "utf8");
  assert.match(source, /let settingsReady = loadSettings\(\)/);
  assert.match(source, /await settingsReady/);
  assert.match(source, /crypto\.randomUUID/);
});

