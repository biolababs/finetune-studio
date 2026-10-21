import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_YAML_CHARACTERS,
  PROFILES,
  createConfig,
  filenameForProject,
  parseSimpleYaml,
  toYaml,
  validateConfig,
  validateYaml,
} from "../src/core.js";

test("every training profile generates a valid config", () => {
  for (const trainingType of Object.keys(PROFILES)) {
    const config = createConfig({ trainingType });
    const result = validateConfig(config);
    assert.equal(
      result.valid,
      true,
      `${trainingType}: ${result.errors.join(", ")}`,
    );
  }
});

test("generated YAML round-trips through browser preflight", () => {
  for (const trainingType of Object.keys(PROFILES)) {
    const original = createConfig({ trainingType });
    const parsed = parseSimpleYaml(toYaml(original));
    assert.deepEqual(parsed, original);
  }
});

test("MoE profiles use the dataset aliases expected by Liquid Finetune", () => {
  assert.equal(createConfig({ trainingType: "moe_sft" }).dataset.type, "sft");
  assert.equal(createConfig({ trainingType: "moe_dpo" }).dataset.type, "dpo");
});

test("GRPO profiles include a starter reward recipe", () => {
  assert.match(
    createConfig({ trainingType: "grpo" }).rewards.recipe,
    /GSM8KRecipe$/,
  );
  assert.match(
    createConfig({ trainingType: "vlm_grpo" }).rewards.recipe,
    /VLMGroundingIoURecipe$/,
  );
});

test("retrieval profiles explicitly disable PEFT", () => {
  for (const trainingType of ["embedding", "colbert"]) {
    assert.deepEqual(createConfig({ trainingType }).peft_config, {
      use_peft: false,
    });
  }
});

test("invalid project names are rejected", () => {
  const config = createConfig({ projectName: "bad name", trainingType: "sft" });
  const result = validateConfig(config);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /project_name/);
});

test("missing datasets are rejected", () => {
  const config = createConfig({ trainingType: "sft" });
  delete config.dataset.path;
  const result = validateConfig(config);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /dataset\.path/);
});

test("dataset type must match the training method", () => {
  const config = createConfig({ trainingType: "dpo" });
  config.dataset.type = "sft";
  assert.equal(validateConfig(config).valid, false);
});

test("validation split must be exclusive between zero and one", () => {
  const config = createConfig({ trainingType: "sft" });
  config.dataset.test_size = 1;
  assert.equal(validateConfig(config).valid, false);
});

test("parser supports comments, quoted values, and scientific notation", () => {
  const parsed = parseSimpleYaml(`
project_name: "demo" # comment
training_config:
  learning_rate: 2e-5
`);
  assert.equal(parsed.project_name, "demo");
  assert.equal(parsed.training_config.learning_rate, 0.00002);
});

test("parser rejects tabs and duplicate keys", () => {
  assert.throws(() => parseSimpleYaml("dataset:\n\tpath: demo"), /tabs/);
  assert.throws(
    () => parseSimpleYaml("project_name: one\nproject_name: two"),
    /duplicate key/,
  );
});

test("parser rejects JavaScript-special keys", () => {
  for (const key of ["__proto__", "constructor", "prototype"]) {
    assert.throws(
      () => parseSimpleYaml(`${key}:\n  polluted: true`),
      /not allowed/,
    );
  }
  assert.equal({}.polluted, undefined);
});

test("parser rejects oversized input", () => {
  const oversized = `project_name: ${"a".repeat(MAX_YAML_CHARACTERS)}`;
  assert.throws(() => parseSimpleYaml(oversized), /characters or fewer/);
});

test("parser rejects unexpected indentation", () => {
  assert.throws(() => parseSimpleYaml("  project_name: demo"), /indentation/);
  assert.throws(
    () => parseSimpleYaml("dataset:\n    path: demo"),
    /indentation/,
  );
});

test("advanced YAML sequences defer to the Liquid Finetune CLI", () => {
  const result = validateYaml("rewards:\n  - accuracy");
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /Liquid Finetune CLI/);
});

test("filenames are deterministic and filesystem-safe", () => {
  assert.equal(filenameForProject(" My demo / run "), "My-demo-run.yaml");
  assert.equal(filenameForProject(""), "liquid-job.yaml");
});

test("serializer is deterministic and ends with a newline", () => {
  const config = createConfig({ trainingType: "sft" });
  assert.equal(toYaml(config), toYaml(config));
  assert.equal(toYaml(config).endsWith("\n"), true);
});
