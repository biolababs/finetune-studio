# Finetune Studio

An unofficial, browser-only configuration studio for
[Liquid Finetune](https://github.com/Liquid4All/liquid-finetune).

[Open Finetune Studio](https://biolababs.github.io/liquid-finetune-ui/) ·
[View Liquid Finetune](https://github.com/Liquid4All/liquid-finetune)

[![Deploy Finetune Studio](https://github.com/biolababs/liquid-finetune-ui/actions/workflows/pages.yml/badge.svg)](https://github.com/biolababs/liquid-finetune-ui/actions/workflows/pages.yml)

Finetune Studio turns guided training choices into deterministic YAML you can
download and run from your own Liquid Finetune checkout. It does not upload
configuration data or execute training.

> [!IMPORTANT]
> Finetune Studio is an independent community project. It is not affiliated
> with or endorsed by Liquid AI. The Liquid Finetune CLI remains the source of
> truth for complete validation and execution.

## Highlights

- Guided configuration for all 11 bundled Liquid Finetune training modes.
- Deterministic YAML generation and browser-side preflight checks.
- Local YAML import, editing, copying, and download.
- Ready-to-copy `uv run liquid-finetune ...` command.
- Responsive interface that works without an account or backend.
- Zero runtime dependencies and a deterministic static build.

## Supported recipes

| Category               | Recipes            |
| ---------------------- | ------------------ |
| Text tuning            | SFT, DPO, KTO      |
| Retrieval              | Embedding, ColBERT |
| Vision-language        | VLM SFT, VLM DPO   |
| Mixture of experts     | MoE SFT, MoE DPO   |
| Reinforcement learning | GRPO, VLM GRPO     |

The included values are starting points. Review model names, dataset paths,
reward recipes, and resource requirements before launching a training run.

## Use the web app

1. Open [Finetune Studio](https://biolababs.github.io/liquid-finetune-ui/).
2. Choose a recipe and adjust the model, dataset, and training parameters.
3. Generate the YAML and run browser preflight.
4. Download the configuration into your Liquid Finetune checkout.
5. Run the generated CLI command locally.

Finetune Studio does not install models, resolve local paths, or run training.

## Run locally

Node.js 20 or newer is required. The project has no runtime dependencies.

```bash
git clone https://github.com/biolababs/liquid-finetune-ui.git
cd liquid-finetune-ui
npm run dev
```

Open `http://127.0.0.1:4173`. The preview server listens only on loopback and
rejects unrecognized host headers. To select another loopback port:

```bash
npm run dev -- --port 8088
```

## Test and build

```bash
npm run check
```

This runs the configuration, DOM/privacy, preview-server, and deployable-artifact
checks. The static site is written to `dist/`.

## Privacy and security

- No API, database, authentication, cookies, analytics, or telemetry.
- No network requests from the application JavaScript.
- Imported YAML is limited to 1 MB and remains in the current browser tab.
- A restrictive content security policy blocks connections and embedded objects.
- The development server binds to `127.0.0.1`, never a wildcard interface.

Do not place secrets in configuration files or the static bundle. Everything
published through GitHub Pages is publicly downloadable. See
[SECURITY.md](./SECURITY.md) for vulnerability reporting.

## Project structure

```text
index.html               Static application shell
src/app.js               Browser interactions
src/core.js              Config generation, YAML, and validation
src/styles.css           Responsive visual system
scripts/serve.mjs        Loopback-only local preview
scripts/server-core.mjs  Preview-server security boundaries
scripts/build.mjs        Deterministic static build
.github/workflows/       GitHub Pages deployment
tests/                   Core, DOM, security, and artifact checks
```

## Contributing

Issues and focused pull requests are welcome. Please run `npm run check` before
submitting a change and keep the application browser-only unless a proposal has
first established a clear need for a backend.
