export const MAX_YAML_CHARACTERS = 1_000_000;

const BLOCKED_YAML_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const common = {
  model: "LFM2-1.2B",
  limit: 1000,
  testSize: 0.2,
  gradientSteps: 1,
};

export const PROFILES = Object.freeze({
  sft: {
    ...common,
    label: "Supervised fine-tuning",
    shortLabel: "SFT",
    description: "Teach a model from demonstrations.",
    datasetType: "sft",
    datasetPath: "HuggingFaceTB/smoltalk",
    base: "DEFAULT_SFT",
    peft: "DEFAULT_LORA",
    epochs: 3,
    batchSize: 2,
    learningRate: 0.00002,
  },
  dpo: {
    ...common,
    label: "DPO preference tuning",
    shortLabel: "DPO",
    description: "Learn from chosen and rejected responses.",
    datasetType: "dpo",
    datasetPath: "mlabonne/orpo-dpo-mix-40k",
    base: "DEFAULT_DPO",
    peft: "DEFAULT_LORA",
    epochs: 3,
    batchSize: 4,
    learningRate: 0.000001,
  },
  kto: {
    ...common,
    label: "KTO preference tuning",
    shortLabel: "KTO",
    description: "Tune from desirable and undesirable examples.",
    datasetType: "kto",
    datasetPath: "trl-lib/kto-mix-14k",
    base: "DEFAULT_KTO",
    peft: "DEFAULT_LORA",
    epochs: 1,
    batchSize: 8,
    learningRate: 0.000001,
  },
  embedding: {
    ...common,
    label: "Embedding training",
    shortLabel: "Embedding",
    description: "Train dense retrieval representations.",
    model: "LiquidAI/LFM2.5-Embedding-350M",
    datasetType: "embedding",
    datasetPath: "sentence-transformers/msmarco-bm25",
    subset: "triplet",
    base: "DEFAULT_EMBEDDING",
    peft: null,
    epochs: 1,
    batchSize: 32,
    learningRate: 0.00002,
    testSize: 0.01,
  },
  colbert: {
    ...common,
    label: "ColBERT retrieval",
    shortLabel: "ColBERT",
    description: "Train token-level retrieval representations.",
    model: "LiquidAI/LFM2.5-ColBERT-350M",
    datasetType: "colbert",
    datasetPath: "sentence-transformers/msmarco-bm25",
    subset: "triplet",
    base: "DEFAULT_COLBERT",
    peft: null,
    epochs: 1,
    batchSize: 16,
    learningRate: 0.00002,
    testSize: 0.01,
  },
  vlm_sft: {
    ...common,
    label: "Vision-language SFT",
    shortLabel: "VLM SFT",
    description: "Fine-tune a multimodal model from examples.",
    datasetType: "vlm_sft",
    datasetPath: "alay2shah/example-vlm-sft-dataset",
    base: "DEFAULT_VLM_SFT",
    peft: "DEFAULT_VLM_LORA",
    epochs: 3,
    batchSize: 1,
    learningRate: 0.00001,
  },
  vlm_dpo: {
    ...common,
    label: "Vision-language DPO",
    shortLabel: "VLM DPO",
    description: "Preference-tune multimodal model responses.",
    model: "LFM2-VL-1.6B",
    datasetType: "vlm_dpo",
    datasetPath: "./data/vlm_dpo_dataset.jsonl",
    base: "DEFAULT_VLM_DPO",
    peft: "DEFAULT_VLM_LORA",
    epochs: 1,
    batchSize: 1,
    learningRate: 0.000001,
  },
  moe_sft: {
    ...common,
    label: "Mixture-of-experts SFT",
    shortLabel: "MoE SFT",
    description: "Fine-tune an MoE model from demonstrations.",
    model: "LFM2-8B-A1B",
    datasetType: "sft",
    datasetPath: "HuggingFaceTB/smoltalk",
    base: "MOE_SFT",
    peft: "MOE_LORA",
    epochs: 2,
    batchSize: 2,
    learningRate: 0.00005,
  },
  moe_dpo: {
    ...common,
    label: "Mixture-of-experts DPO",
    shortLabel: "MoE DPO",
    description: "Preference-tune an MoE model.",
    model: "LFM2-8B-A1B",
    datasetType: "dpo",
    datasetPath: "mlabonne/orpo-dpo-mix-40k",
    base: "MOE_DPO",
    peft: "MOE_LORA",
    epochs: 1,
    batchSize: 2,
    learningRate: 0.000001,
  },
  grpo: {
    ...common,
    label: "GRPO reinforcement learning",
    shortLabel: "GRPO",
    description: "Optimize text reasoning with reward functions.",
    datasetType: "grpo",
    datasetPath: "your-org/your-gsm8k-parquet",
    base: "DEFAULT_GRPO",
    peft: null,
    epochs: 1,
    batchSize: 8,
    learningRate: 0.000001,
    testSize: null,
    rewardRecipe: "tasks/gsm8k/recipe.py::GSM8KRecipe",
  },
  vlm_grpo: {
    ...common,
    label: "Vision-language GRPO",
    shortLabel: "VLM GRPO",
    description: "Optimize multimodal reasoning with rewards.",
    model: "LFM2.5-VL-450M",
    datasetType: "vlm_grpo",
    datasetPath: "your-org/your-grounding-parquet",
    base: "DEFAULT_VLM_GRPO",
    peft: null,
    epochs: 1,
    batchSize: 4,
    learningRate: 0.000001,
    testSize: null,
    rewardRecipe: "tasks/vlm_grounding/recipe.py::VLMGroundingIoURecipe",
  },
});

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalPositiveInteger(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function optionalFraction(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed < 1 ? parsed : null;
}

export function createConfig(input) {
  const trainingType = input.trainingType ?? "sft";
  const profile = PROFILES[trainingType];
  if (!profile) throw new Error(`Unknown training type: ${trainingType}`);

  const config = {
    project_name:
      String(input.projectName ?? "liquid_job").trim() || "liquid_job",
    model_name:
      String(input.modelName ?? profile.model).trim() || profile.model,
    training_type: trainingType,
    dataset: {
      path:
        String(input.datasetPath ?? profile.datasetPath).trim() ||
        profile.datasetPath,
      type: profile.datasetType,
    },
    training_config: {
      extends: profile.base,
      num_train_epochs: positiveNumber(input.epochs, profile.epochs),
      per_device_train_batch_size: positiveNumber(
        input.batchSize,
        profile.batchSize,
      ),
      gradient_accumulation_steps: positiveNumber(
        input.gradientSteps,
        profile.gradientSteps,
      ),
      learning_rate: positiveNumber(input.learningRate, profile.learningRate),
    },
  };

  const limit = optionalPositiveInteger(input.datasetLimit ?? profile.limit);
  const testSize = optionalFraction(input.testSize ?? profile.testSize);
  if (limit !== null) config.dataset.limit = limit;
  if (testSize !== null) config.dataset.test_size = testSize;
  if (profile.subset) config.dataset.subset = profile.subset;

  if (profile.peft) {
    config.peft_config = {
      extends: profile.peft,
      use_peft: input.usePeft !== false,
    };
  } else {
    config.peft_config = { use_peft: false };
  }

  if (profile.rewardRecipe) {
    config.rewards = { recipe: profile.rewardRecipe };
  }

  return config;
}

function yamlScalar(value) {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(String(value));
}

function yamlLines(value, indent = 0) {
  const prefix = " ".repeat(indent);
  const lines = [];
  for (const [key, item] of Object.entries(value)) {
    if (Array.isArray(item)) {
      lines.push(`${prefix}${key}:`);
      for (const entry of item) {
        lines.push(`${prefix}  - ${yamlScalar(entry)}`);
      }
    } else if (item && typeof item === "object") {
      lines.push(`${prefix}${key}:`);
      lines.push(...yamlLines(item, indent + 2));
    } else {
      lines.push(`${prefix}${key}: ${yamlScalar(item)}`);
    }
  }
  return lines;
}

export function toYaml(config) {
  return `${yamlLines(config).join("\n")}\n`;
}

function stripInlineComment(value) {
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if ((character === '"' || character === "'") && value[index - 1] !== "\\") {
      quote = quote === character ? null : (quote ?? character);
    }
    if (
      character === "#" &&
      quote === null &&
      (index === 0 || /\s/.test(value[index - 1]))
    ) {
      return value.slice(0, index).trimEnd();
    }
  }
  return value.trimEnd();
}

function parseScalar(value, lineNumber) {
  const normalized = stripInlineComment(value).trim();
  if (normalized === "") return "";
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (normalized === "null" || normalized === "~") return null;
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) {
    return Number(normalized);
  }
  if (normalized.startsWith('"')) {
    try {
      return JSON.parse(normalized);
    } catch {
      throw new Error(`Line ${lineNumber}: invalid quoted string.`);
    }
  }
  if (normalized.startsWith("'") && normalized.endsWith("'")) {
    return normalized.slice(1, -1).replaceAll("''", "'");
  }
  return normalized;
}

export function parseSimpleYaml(source) {
  const normalizedSource = String(source);
  if (normalizedSource.length > MAX_YAML_CHARACTERS) {
    throw new Error(
      `YAML input must be ${MAX_YAML_CHARACTERS.toLocaleString()} characters or fewer.`,
    );
  }

  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = normalizedSource.replaceAll("\r\n", "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const lineNumber = index + 1;
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) continue;
    if (rawLine.includes("\t")) {
      throw new Error(
        `Line ${lineNumber}: tabs are not supported in YAML indentation.`,
      );
    }

    const indent = rawLine.length - rawLine.trimStart().length;
    if (indent % 2 !== 0) {
      throw new Error(`Line ${lineNumber}: use two-space indentation.`);
    }

    const content = rawLine.trim();
    if (content.startsWith("- ")) {
      throw new Error(
        `Line ${lineNumber}: sequence validation is handled by the Liquid Finetune CLI.`,
      );
    }
    const match = content.match(/^([A-Za-z_][A-Za-z0-9_-]*):(.*)$/);
    if (!match)
      throw new Error(`Line ${lineNumber}: expected a key and value.`);

    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const expectedIndent = stack.length === 1 ? 0 : stack.at(-1).indent + 2;
    if (indent !== expectedIndent) {
      throw new Error(`Line ${lineNumber}: unexpected indentation.`);
    }
    const parent = stack.at(-1).value;
    const [, key, rawValue] = match;
    if (BLOCKED_YAML_KEYS.has(key)) {
      throw new Error(`Line ${lineNumber}: key "${key}" is not allowed.`);
    }
    if (Object.hasOwn(parent, key)) {
      throw new Error(`Line ${lineNumber}: duplicate key "${key}".`);
    }

    if (rawValue.trim() === "") {
      const child = {};
      parent[key] = child;
      stack.push({ indent, value: child });
    } else {
      parent[key] = parseScalar(rawValue, lineNumber);
    }
  }

  return root;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requirePositive(errors, value, path) {
  if (
    value !== undefined &&
    (!Number.isFinite(Number(value)) || Number(value) <= 0)
  ) {
    errors.push(`${path} must be a positive number.`);
  }
}

export function validateConfig(config) {
  const errors = [];
  const warnings = [];
  if (!isObject(config)) {
    return {
      valid: false,
      errors: ["Config must be a YAML mapping."],
      warnings,
    };
  }

  const jobName = config.project_name ?? config.job_name;
  if (typeof jobName !== "string" || !jobName) {
    errors.push("project_name is required.");
  } else if (!/^[A-Za-z0-9_-]+$/.test(jobName)) {
    errors.push(
      "project_name may contain only letters, numbers, hyphens, and underscores.",
    );
  }

  if (typeof config.model_name !== "string" || !config.model_name) {
    errors.push("model_name is required.");
  }

  const profile = PROFILES[config.training_type];
  if (!profile) {
    errors.push(
      `training_type must be one of: ${Object.keys(PROFILES).join(", ")}.`,
    );
  }

  if (!isObject(config.dataset)) {
    errors.push("dataset must be a mapping.");
  } else {
    if (!config.dataset.path && !config.dataset.train_path) {
      errors.push("dataset.path or dataset.train_path is required.");
    }
    if (profile && config.dataset.type !== profile.datasetType) {
      errors.push(
        `dataset.type must be "${profile.datasetType}" for ${config.training_type}.`,
      );
    }
    if (
      config.dataset.test_size !== undefined &&
      (!Number.isFinite(Number(config.dataset.test_size)) ||
        Number(config.dataset.test_size) <= 0 ||
        Number(config.dataset.test_size) >= 1)
    ) {
      errors.push("dataset.test_size must be between 0 and 1.");
    }
    if (
      config.dataset.limit !== undefined &&
      (!Number.isInteger(Number(config.dataset.limit)) ||
        Number(config.dataset.limit) <= 0)
    ) {
      errors.push("dataset.limit must be a positive integer.");
    }
  }

  if (!isObject(config.training_config)) {
    errors.push("training_config must be a mapping.");
  } else {
    requirePositive(
      errors,
      config.training_config.num_train_epochs,
      "training_config.num_train_epochs",
    );
    requirePositive(
      errors,
      config.training_config.per_device_train_batch_size,
      "training_config.per_device_train_batch_size",
    );
    requirePositive(
      errors,
      config.training_config.gradient_accumulation_steps,
      "training_config.gradient_accumulation_steps",
    );
    requirePositive(
      errors,
      config.training_config.learning_rate,
      "training_config.learning_rate",
    );
    if (
      profile &&
      config.training_config.extends &&
      config.training_config.extends !== profile.base
    ) {
      warnings.push(
        `This method usually extends ${profile.base}; review the custom base before running.`,
      );
    }
  }

  if (
    profile &&
    profile.peft === null &&
    isObject(config.peft_config) &&
    config.peft_config.use_peft !== false
  ) {
    errors.push(
      `PEFT is not supported by the ${config.training_type} starter.`,
    );
  }

  if (
    profile?.rewardRecipe &&
    !isObject(config.rewards) &&
    !isObject(config.rl_env)
  ) {
    warnings.push("GRPO normally needs a rewards recipe or RL environment.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateYaml(source) {
  try {
    const config = parseSimpleYaml(source);
    return { config, ...validateConfig(config) };
  } catch (error) {
    return {
      config: null,
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings: [],
    };
  }
}

export function filenameForProject(projectName) {
  const normalized = String(projectName ?? "")
    .trim()
    .replaceAll(/[^A-Za-z0-9_-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
  return `${normalized || "liquid-job"}.yaml`;
}
