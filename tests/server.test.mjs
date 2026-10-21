import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import {
  ALLOWED_HOSTS,
  DEFAULT_PORT,
  HOST,
  parsePort,
  resolveRequestPath,
} from "../scripts/server-core.mjs";

const projectRoot = "/project";

test("the preview server is loopback-only", () => {
  assert.equal(HOST, "127.0.0.1");
  assert.deepEqual([...ALLOWED_HOSTS].sort(), ["127.0.0.1", "localhost"]);
});

test("the preview server has a safe default port", () => {
  assert.equal(parsePort([]), DEFAULT_PORT);
});

test("the preview server accepts an explicit valid port", () => {
  assert.equal(parsePort(["--port", "8080"]), 8080);
});

test("the preview server rejects invalid ports", () => {
  for (const args of [
    ["--port"],
    ["--port", "0"],
    ["--port", "65536"],
    ["--port", "not-a-port"],
  ]) {
    assert.throws(() => parsePort(args));
  }
});

test("the preview server resolves only allowlisted assets", () => {
  assert.equal(
    resolveRequestPath("/", projectRoot),
    join(projectRoot, "index.html"),
  );
  assert.equal(
    resolveRequestPath("/src/app.js", projectRoot),
    join(projectRoot, "src/app.js"),
  );
  assert.equal(resolveRequestPath("/README.md", projectRoot), null);
});

test("the preview server rejects traversal and malformed encoding", () => {
  assert.equal(resolveRequestPath("/../package.json", projectRoot), null);
  assert.equal(resolveRequestPath("/%2e%2e/package.json", projectRoot), null);
  assert.equal(resolveRequestPath("/%E0%A4%A", projectRoot), null);
});
