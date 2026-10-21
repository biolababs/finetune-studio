import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(
  new URL("../.github/workflows/pages.yml", import.meta.url),
  "utf8",
);

function jobBlock(name, nextName) {
  const start = workflow.indexOf(`  ${name}:`);
  const end = nextName
    ? workflow.indexOf(`  ${nextName}:`, start + 1)
    : workflow.length;
  assert.notEqual(start, -1, `Missing ${name} job`);
  assert.notEqual(end, -1, `Missing ${nextName} job`);
  return workflow.slice(start, end);
}

test("the workflow denies permissions by default", () => {
  assert.match(workflow, /^permissions: \{\}$/m);
});

test("only the deploy job receives an identity token", () => {
  const build = jobBlock("build", "deploy");
  const deploy = jobBlock("deploy");
  assert.doesNotMatch(build, /id-token:\s*write/);
  assert.match(deploy, /id-token:\s*write/);
  assert.match(deploy, /pages:\s*write/);
});

test("checkout does not persist workflow credentials", () => {
  assert.match(workflow, /persist-credentials:\s*false/);
});

test("jobs have execution time limits", () => {
  assert.equal([...workflow.matchAll(/timeout-minutes:\s*5/g)].length, 2);
});
