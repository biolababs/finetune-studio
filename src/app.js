import {
  PROFILES,
  createConfig,
  filenameForProject,
  toYaml,
  validateYaml,
} from "./core.js";

const MAX_FILE_BYTES = 1_000_000;
const elements = {
  form: document.querySelector("#configForm"),
  trainingType: document.querySelector("#trainingType"),
  profileDescription: document.querySelector("#profileDescription"),
  projectName: document.querySelector("#projectName"),
  modelName: document.querySelector("#modelName"),
  datasetPath: document.querySelector("#datasetPath"),
  datasetLimit: document.querySelector("#datasetLimit"),
  testSize: document.querySelector("#testSize"),
  epochs: document.querySelector("#epochs"),
  batchSize: document.querySelector("#batchSize"),
  gradientSteps: document.querySelector("#gradientSteps"),
  learningRate: document.querySelector("#learningRate"),
  usePeft: document.querySelector("#usePeft"),
  peftRow: document.querySelector("#peftRow"),
  editor: document.querySelector("#configEditor"),
  activeFilename: document.querySelector("#activeFilename"),
  lineCount: document.querySelector("#lineCount"),
  validationCard: document.querySelector("#validationCard"),
  validateButton: document.querySelector("#validateButton"),
  importButton: document.querySelector("#importButton"),
  copyYamlButton: document.querySelector("#copyYamlButton"),
  downloadButton: document.querySelector("#downloadButton"),
  resetButton: document.querySelector("#resetButton"),
  copyCommandButton: document.querySelector("#copyCommandButton"),
  commandPreview: document.querySelector("#commandPreview"),
  recipeGrid: document.querySelector("#recipeGrid"),
  recipeSearch: document.querySelector("#recipeSearch"),
  profileCount: document.querySelector("#profileCount"),
  summaryStatus: document.querySelector("#summaryStatus"),
  summaryDetail: document.querySelector("#summaryDetail"),
  fileInput: document.querySelector("#fileInput"),
  toast: document.querySelector("#toast"),
};

let currentFilename = "my_sft_project.yaml";
let toastTimer;

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = setTimeout(
    () => elements.toast.classList.remove("visible"),
    2200,
  );
}

async function copyText(value, message) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = value;
    fallback.setAttribute("readonly", "");
    fallback.className = "copy-fallback";
    document.body.append(fallback);
    fallback.select();
    document.execCommand("copy");
    fallback.remove();
  }
  showToast(message);
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function updateFilename(filename) {
  currentFilename = filename;
  elements.activeFilename.textContent = filename;
  elements.commandPreview.textContent = `uv run liquid-finetune ${shellQuote(filename)}`;
}

function updateLineCount() {
  const count = elements.editor.value
    ? elements.editor.value.split("\n").length
    : 0;
  elements.lineCount.textContent = `${count} ${count === 1 ? "line" : "lines"}`;
}

function markDraft(message = "Changes are waiting for browser preflight.") {
  const icon = elements.validationCard.querySelector(".validation-icon");
  const title = elements.validationCard.querySelector("strong");
  const detail = elements.validationCard.querySelector("p");
  elements.validationCard.className = "validation-card";
  icon.textContent = "?";
  title.textContent = "Draft configuration";
  detail.textContent = message;
  elements.summaryStatus.textContent = "Draft";
  elements.summaryDetail.textContent = "Ready for browser preflight";
}

function setValidation(result) {
  const icon = elements.validationCard.querySelector(".validation-icon");
  const title = elements.validationCard.querySelector("strong");
  const detail = elements.validationCard.querySelector("p");

  if (result.valid) {
    elements.validationCard.className = "validation-card valid";
    icon.textContent = "✓";
    title.textContent = result.warnings.length
      ? "Core fields passed with a note"
      : "Core fields passed";
    detail.textContent = result.warnings.length
      ? result.warnings.join(" ")
      : "Download this YAML and run the Liquid Finetune CLI for final validation.";
    elements.summaryStatus.textContent = "Preflight passed";
    elements.summaryDetail.textContent = result.warnings.length
      ? `${result.warnings.length} review note`
      : "Ready to download";
    return;
  }

  elements.validationCard.className = "validation-card invalid";
  icon.textContent = "!";
  title.textContent = `${result.errors.length} ${result.errors.length === 1 ? "issue" : "issues"} found`;
  detail.textContent = result.errors.slice(0, 4).join(" ");
  elements.summaryStatus.textContent = "Needs work";
  elements.summaryDetail.textContent = `${result.errors.length} preflight ${result.errors.length === 1 ? "issue" : "issues"}`;
}

function populateRecipeSelect() {
  for (const [value, profile] of Object.entries(PROFILES)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = profile.label;
    elements.trainingType.append(option);
  }
  elements.profileCount.textContent = String(Object.keys(PROFILES).length);
}

function applyProfile(trainingType, { preserveProject = true } = {}) {
  const profile = PROFILES[trainingType];
  elements.trainingType.value = trainingType;
  elements.profileDescription.textContent = profile.description;
  if (!preserveProject) {
    elements.projectName.value = `my_${trainingType}_project`;
  }
  elements.modelName.value = profile.model;
  elements.datasetPath.value = profile.datasetPath;
  elements.datasetLimit.value = profile.limit ?? "";
  elements.testSize.value = profile.testSize ?? "";
  elements.epochs.value = profile.epochs;
  elements.batchSize.value = profile.batchSize;
  elements.gradientSteps.value = profile.gradientSteps;
  elements.learningRate.value = profile.learningRate;
  elements.usePeft.checked = Boolean(profile.peft);
  elements.usePeft.disabled = !profile.peft;
  elements.peftRow.classList.toggle("disabled", !profile.peft);
}

function formValues() {
  return {
    trainingType: elements.trainingType.value,
    projectName: elements.projectName.value,
    modelName: elements.modelName.value,
    datasetPath: elements.datasetPath.value,
    datasetLimit: elements.datasetLimit.value,
    testSize: elements.testSize.value,
    epochs: elements.epochs.value,
    batchSize: elements.batchSize.value,
    gradientSteps: elements.gradientSteps.value,
    learningRate: elements.learningRate.value,
    usePeft: elements.usePeft.checked,
  };
}

function generateYaml() {
  if (!elements.form.reportValidity()) return;
  const config = createConfig(formValues());
  elements.editor.value = toYaml(config);
  updateFilename(filenameForProject(config.project_name));
  updateLineCount();
  markDraft(
    "Generated from the guided recipe. Run preflight before downloading.",
  );
}

function hydrateForm(config) {
  const profile = PROFILES[config?.training_type];
  if (!profile) return;
  elements.trainingType.value = config.training_type;
  elements.profileDescription.textContent = profile.description;
  elements.projectName.value =
    config.project_name ?? config.job_name ?? "liquid_job";
  elements.modelName.value = config.model_name ?? profile.model;
  elements.datasetPath.value =
    config.dataset?.path ?? config.dataset?.train_path ?? profile.datasetPath;
  elements.datasetLimit.value = config.dataset?.limit ?? "";
  elements.testSize.value = config.dataset?.test_size ?? "";
  elements.epochs.value =
    config.training_config?.num_train_epochs ?? profile.epochs;
  elements.batchSize.value =
    config.training_config?.per_device_train_batch_size ?? profile.batchSize;
  elements.gradientSteps.value =
    config.training_config?.gradient_accumulation_steps ??
    profile.gradientSteps;
  elements.learningRate.value =
    config.training_config?.learning_rate ?? profile.learningRate;
  elements.usePeft.checked = config.peft_config?.use_peft !== false;
  elements.usePeft.disabled = !profile.peft;
  elements.peftRow.classList.toggle("disabled", !profile.peft);
}

function validateCurrent() {
  const result = validateYaml(elements.editor.value);
  setValidation(result);
  if (result.config) hydrateForm(result.config);
}

function recipeCard(trainingType, profile, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "recipe-card";
  button.dataset.search =
    `${profile.label} ${profile.description} ${profile.model}`.toLowerCase();

  const number = document.createElement("span");
  number.className = "recipe-number";
  number.textContent = String(index + 1).padStart(2, "0");

  const badge = document.createElement("span");
  badge.className = "recipe-badge";
  badge.textContent = profile.shortLabel;

  const arrow = document.createElement("span");
  arrow.className = "recipe-arrow";
  arrow.textContent = "→";
  arrow.setAttribute("aria-hidden", "true");

  const heading = document.createElement("h3");
  heading.textContent = profile.label;

  const description = document.createElement("p");
  description.textContent = profile.description;

  const model = document.createElement("small");
  model.textContent = profile.model;

  button.append(number, badge, arrow, heading, description, model);
  button.addEventListener("click", () => {
    applyProfile(trainingType, { preserveProject: false });
    generateYaml();
    document.querySelector("#builder").scrollIntoView({ behavior: "smooth" });
    showToast(`${profile.shortLabel} recipe loaded`);
  });
  return button;
}

function renderRecipes(query = "") {
  const normalized = query.trim().toLowerCase();
  const entries = Object.entries(PROFILES);
  elements.recipeGrid.replaceChildren();

  const cards = entries
    .map(([trainingType, profile], index) =>
      recipeCard(trainingType, profile, index),
    )
    .filter((card) => card.dataset.search.includes(normalized));

  if (!cards.length) {
    const empty = document.createElement("p");
    empty.className = "empty-recipes";
    empty.textContent = "No recipes match that filter.";
    elements.recipeGrid.append(empty);
    return;
  }
  elements.recipeGrid.append(...cards);
}

function downloadYaml() {
  const blob = new Blob([elements.editor.value], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = currentFilename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("YAML downloaded");
}

async function importYaml(file) {
  if (!file) return;
  const validExtension = /\.ya?ml$/i.test(file.name);
  if (!validExtension) {
    showToast("Choose a .yaml or .yml file");
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    showToast("YAML files must be 1 MB or smaller");
    return;
  }

  elements.editor.value = await file.text();
  updateFilename(file.name);
  updateLineCount();
  validateCurrent();
  showToast("YAML imported locally");
}

function resetStudio() {
  elements.projectName.value = "my_sft_project";
  applyProfile("sft");
  generateYaml();
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateYaml();
});
elements.trainingType.addEventListener("change", () => {
  applyProfile(elements.trainingType.value, { preserveProject: false });
  markDraft("Recipe changed. Generate YAML to apply the new defaults.");
});
elements.editor.addEventListener("input", () => {
  updateLineCount();
  markDraft();
});
elements.validateButton.addEventListener("click", validateCurrent);
elements.importButton.addEventListener("click", () =>
  elements.fileInput.click(),
);
elements.fileInput.addEventListener("change", (event) => {
  importYaml(event.target.files?.[0]);
  event.target.value = "";
});
elements.copyYamlButton.addEventListener("click", () =>
  copyText(elements.editor.value, "YAML copied"),
);
elements.downloadButton.addEventListener("click", downloadYaml);
elements.copyCommandButton.addEventListener("click", () =>
  copyText(elements.commandPreview.textContent, "Command copied"),
);
elements.resetButton.addEventListener("click", resetStudio);
elements.recipeSearch.addEventListener("input", (event) =>
  renderRecipes(event.target.value),
);

populateRecipeSelect();
renderRecipes();
resetStudio();
