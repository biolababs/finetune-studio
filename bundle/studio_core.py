"""Backend routing for the unified Finetune Studio desktop app."""

from dataclasses import dataclass
from pathlib import Path
import sys


MODES = ("text", "audio", "video", "liquid")
STARTERS = {
    "text": ("LiquidAI/LFM2.5-230M", "LiquidAI/LFM2.5-350M", "Qwen/Qwen2.5-0.5B-Instruct",
             "Qwen/Qwen3-0.6B", "HuggingFaceTB/SmolLM2-360M-Instruct"),
    "audio": ("Qwen/Qwen2.5-Omni-3B",),
    "video": ("Qwen/Qwen3-VL-2B-Instruct", "Qwen/Qwen2.5-Omni-3B"),
    "liquid": (),
}
TEMPLATES = {
    "Qwen/Qwen2.5-Omni-3B": "qwen2_omni",
    "Qwen/Qwen3-VL-2B-Instruct": "qwen3_vl_nothink",
}


def environment_executable(folder: Path, name: str) -> Path:
    bin_dir = "Scripts" if sys.platform == "win32" else "bin"
    suffix = ".exe" if sys.platform == "win32" else ""
    return folder / ".venv" / bin_dir / f"{name}{suffix}"


@dataclass(frozen=True)
class RunRequest:
    mode: str
    dataset: Path
    model: str = ""
    output: Path | None = None
    steps: int = 30
    template: str = ""
    precision: str = "bf16"
    media_python: Path | None = None


@dataclass(frozen=True)
class RunPlan:
    check: tuple[str, ...]
    train: tuple[str, ...]
    cwd: Path


def build_plan(root: Path, request: RunRequest) -> RunPlan:
    root = root.resolve()
    if request.mode not in MODES:
        raise ValueError("Choose text, audio, video, or Liquid YAML.")
    dataset = request.dataset.expanduser().resolve()
    if not dataset.is_file():
        raise ValueError(f"Input file not found: {dataset}")

    if request.mode == "liquid":
        if dataset.suffix.lower() not in (".yaml", ".yml"):
            raise ValueError("Liquid Finetune needs a .yaml or .yml configuration.")
        liquid = root / "liquid-finetune"
        executable = environment_executable(liquid, "liquid-finetune")
        if not executable.is_file():
            raise ValueError(f"Install the bundled Liquid Finetune CLI first: {executable}")
        return RunPlan((), (str(executable), str(dataset)), liquid)

    if dataset.suffix.lower() != ".jsonl":
        raise ValueError("Text, audio, and video need a .jsonl dataset.")
    if not request.model.strip():
        raise ValueError("Choose or enter a model ID.")
    if not 1 <= request.steps <= 100000:
        raise ValueError("Steps must be between 1 and 100000.")
    if request.output is None:
        raise ValueError("Choose an output directory.")
    output = request.output.expanduser().resolve()
    if output == dataset:
        raise ValueError("Output cannot be the dataset file.")
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        raise ValueError("Output directory must be new or empty.")

    trainer = root / "webslm-trainer"
    python = environment_executable(trainer, "python")
    if not python.is_file():
        raise ValueError(f"Install WebSLM Trainer first: {python}")
    common = (str(python), "-u", "-m", "webslm_trainer")
    options = ("--model", request.model.strip(), "--dataset", str(dataset), "--output", str(output))
    if request.mode == "text":
        return RunPlan(common + ("check",) + options,
                       common + ("train",) + options + ("--steps", str(request.steps)), trainer)

    if request.precision not in ("bf16", "fp16", "fp32"):
        raise ValueError("Precision must be bf16, fp16, or fp32.")
    template = request.template.strip() or TEMPLATES.get(request.model.strip(), "")
    if not template:
        raise ValueError("Enter a media template for this model.")
    backend = (request.media_python or environment_executable(root / "llama-factory", "python")).expanduser().resolve()
    if not backend.is_file():
        raise ValueError(f"Install the bundled media backend first: {backend}")
    media_options = options + ("--modality", request.mode, "--template", template,
                               "--precision", request.precision, "--backend-python", str(backend))
    return RunPlan(common + ("check-media",) + media_options,
                   common + ("train-media",) + media_options + ("--steps", str(request.steps)), trainer)
