# Finetune Studio source bundle

This download contains one Finetune Studio desktop UI and the source for its three local training engines:

- `launch.py` is the unified desktop UI. Choose text, audio, video, or a full Liquid YAML run and monitor it in one window.
- `studio/` is the Liquid YAML builder opened from the desktop UI.
- `webslm-trainer/` provides the text and media training commands used by the desktop UI.
- `liquid-finetune/` is Liquid AI's full training CLI, included under its MIT license in `liquid-finetune/LICENSE`.
- `llama-factory/` is the audio/video training backend used by WebSLM Trainer, included under its Apache-2.0 license in `llama-factory/LICENSE`.

The bundle contains source code and sample data. It does not contain model weights, Python packages, GPU drivers, or a trained model. `SOURCES.txt` records the exact upstream commits. The components use separate Python environments because their dependency versions differ.

Run `python launch.py` from this directory to open Finetune Studio. Python must include Tkinter (some Linux distributions package it separately). The YAML builder works immediately. Install the training environments below to enable the corresponding training workflows.

## Open the configuration studio

From the extracted `finetune-studio` directory, use **Open Liquid YAML builder** in the desktop UI. Or serve the static files directly:

```sh
python -m http.server 4173 --bind 127.0.0.1 --directory studio
```

Open `http://127.0.0.1:4173/` in a browser. The site creates Liquid YAML locally. It does not itself train a model.

## Enable text training

Use Python 3.10 or newer. On Windows PowerShell:

```powershell
cd webslm-trainer
py -m venv .venv
.venv\Scripts\python -m pip install -e ".[train]"
cd ..
py launch.py
```

For audio and video, install the bundled `llama-factory/` source in another Python 3.11–3.13 environment. For example, from the bundle root on Windows:

```powershell
py -3.11 -m venv llama-factory\.venv
llama-factory\.venv\Scripts\python -m pip install -e .\llama-factory
```

Finetune Studio automatically uses `llama-factory\.venv\Scripts\python.exe` for audio and video. You can edit the **Media Python** field if your environment is elsewhere. Media training still needs compatible GPU hardware and installed Python packages.

On Linux or macOS, create the text environment from the bundle root with `python3 -m venv webslm-trainer/.venv`, then run `webslm-trainer/.venv/bin/python -m pip install -e './webslm-trainer[train]'`. For media, use a supported Python 3.11–3.13 interpreter to create `llama-factory/.venv` and run `llama-factory/.venv/bin/python -m pip install -e ./llama-factory`. Launch the UI with `python3 launch.py`.

## Run Liquid Finetune

Liquid Finetune currently specifies Python 3.12 and Linux/macOS environments. On a compatible machine, create `liquid-finetune/.venv` and install its dependencies using `liquid-finetune/README.md`. The UI looks for `liquid-finetune/.venv/bin/liquid-finetune`; choose **liquid** and select a YAML exported by the builder. On Windows, the full Liquid workflow requires running this bundle and desktop UI inside a compatible Linux environment with a graphical display. The Liquid model weights have their own license and are downloaded separately.

The WebSLM Trainer also has a smaller Liquid LFM2 text recipe that runs through TRL and PEFT. It was verified with a one-step CPU run on LFM2.5-230M. See its README for the supported scope and model licenses.
