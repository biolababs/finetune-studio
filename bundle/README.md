# Finetune Studio source bundle

This download contains three components together:

- `studio/` is the browser configuration builder for Liquid Finetune.
- `webslm-trainer/` is WebSLM's text, audio, and video LoRA trainer and desktop UI.
- `liquid-finetune/` is Liquid AI's full training CLI, included under its MIT license in `liquid-finetune/LICENSE`.

The bundle contains source code and sample data. It does not contain model weights, Python packages, GPU drivers, or a trained model. `SOURCES.txt` records the exact upstream commits. The components use separate Python environments because their dependency versions differ.

Run `python launch.py` from this directory to open the local launcher. Its Studio button works immediately. Install the training environments below before using its training buttons.

## Open the configuration studio

From the extracted `finetune-studio` directory, use the launcher's **Open Liquid configuration studio** button. Or serve the static files directly:

```sh
python -m http.server 4173 --bind 127.0.0.1 --directory studio
```

Open `http://127.0.0.1:4173/` in a browser. The site creates Liquid YAML locally. It does not itself train a model.

## Open the desktop trainer

Use Python 3.10 or newer. On Windows PowerShell:

```powershell
cd webslm-trainer
py -m venv .venv
.venv\Scripts\python -m pip install -e ".[train]"
.venv\Scripts\python -m webslm_trainer desktop
```

For audio and video, follow `webslm-trainer/README.md` to set up LLaMA-Factory in another environment. The desktop UI then launches that backend locally.

## Run Liquid Finetune

Liquid Finetune currently specifies Python 3.12 and Linux/macOS environments. From a compatible machine, install its dependencies using the instructions in `liquid-finetune/README.md`. If you create `liquid-finetune/.venv`, the launcher can start its CLI with YAML exported by the studio. On Windows, use a compatible Linux environment for the full Liquid CLI. The Liquid model weights have their own license and are downloaded separately.

The WebSLM Trainer also has a smaller Liquid LFM2 text recipe that runs through TRL and PEFT. It was verified with a one-step CPU run on LFM2.5-230M. See its README for the supported scope and model licenses.
