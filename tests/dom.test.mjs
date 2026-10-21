import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const core = await readFile(new URL("../src/core.js", import.meta.url), "utf8");

test("every literal JavaScript ID selector exists in the page", () => {
  const idList = [...html.matchAll(/\sid="([A-Za-z0-9_-]+)"/g)].map(
    (match) => match[1],
  );
  const ids = new Set(idList);
  const selectors = [
    ...app.matchAll(/querySelector\("#([A-Za-z0-9_-]+)"\)/g),
  ].map((match) => match[1]);

  for (const selector of selectors) {
    assert.equal(ids.has(selector), true, `Missing #${selector}`);
  }
  assert.equal(ids.size, idList.length, "The page contains duplicate IDs");
});

test("fragment navigation targets existing IDs", () => {
  const idList = [...html.matchAll(/\sid="([A-Za-z0-9_-]+)"/g)].map(
    (match) => match[1],
  );
  const ids = new Set(idList);
  const fragments = [...html.matchAll(/href="#([A-Za-z0-9_-]+)"/g)].map(
    (match) => match[1],
  );
  for (const fragment of fragments) {
    assert.equal(ids.has(fragment), true, `Missing #${fragment}`);
  }
});

test("the public app contains no inline event handlers", () => {
  assert.doesNotMatch(html, /\son[a-z]+=/i);
});

test("the browser app performs no network or persistent-storage calls", () => {
  const applicationCode = `${app}\n${core}`;
  assert.doesNotMatch(applicationCode, /\bfetch\s*\(/);
  assert.doesNotMatch(applicationCode, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(applicationCode, /localStorage|sessionStorage|indexedDB/);
});

test("the document declares a restrictive static-site policy", () => {
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.match(html, /No sign-in/);
  assert.match(html, /No telemetry/);
  assert.match(html, /Not affiliated with or endorsed by Liquid AI/);
});

test("external links suppress referrer information", () => {
  const externalLinks = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].filter(
    (link) => /href="https:\/\//.test(link[0]),
  );
  assert.ok(externalLinks.length > 0);
  for (const link of externalLinks) {
    assert.match(link[0], /rel="noreferrer"/);
  }
});
