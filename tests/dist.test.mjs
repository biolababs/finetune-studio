import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const requiredFiles = [
  "dist/.nojekyll",
  "dist/index.html",
  "dist/src/app.js",
  "dist/src/core.js",
  "dist/src/styles.css",
];

test("the static build contains every deployable asset", async () => {
  await Promise.all(requiredFiles.map((file) => access(file)));
});

test("the built page uses repository-relative asset paths", async () => {
  const html = await readFile("dist/index.html", "utf8");
  assert.match(html, /href="\.\/src\/styles\.css"/);
  assert.match(html, /src="\.\/src\/app\.js"/);
});

test("the build does not contain source secrets or dependency folders", async () => {
  const entries = await readdir("dist");
  assert.deepEqual(entries.sort(), [".nojekyll", "index.html", "src"]);
});
