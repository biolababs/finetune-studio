"""Finetune Studio desktop UI for text, audio, video, and Liquid YAML runs."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import queue
import signal
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk
import webbrowser

from studio_core import MODES, STARTERS, TEMPLATES, RunRequest, build_plan, environment_executable


ROOT = Path(__file__).resolve().parent
SAMPLES = {"text": "harbor_bike_train.jsonl", "audio": "audio_train.jsonl", "video": "video_train.jsonl"}


class FinetuneStudio:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title("Finetune Studio")
        self.root.minsize(820, 620)
        self.server: ThreadingHTTPServer | None = None
        self.process: subprocess.Popen[str] | None = None
        self.events: queue.Queue[tuple[str, str]] = queue.Queue()
        self.stop_requested = False
        self.closed = False

        self.mode = tk.StringVar(value="text")
        self.model = tk.StringVar()
        self.dataset = tk.StringVar()
        self.output = tk.StringVar()
        self.steps = tk.StringVar(value="30")
        self.template = tk.StringVar()
        self.precision = tk.StringVar(value="bf16")
        self.media_python = tk.StringVar()

        frame = ttk.Frame(self.root, padding=20)
        frame.pack(fill="both", expand=True)
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(9, weight=1)
        heading = ttk.Frame(frame)
        heading.grid(row=0, column=0, columnspan=3, sticky="ew", pady=(0, 18))
        ttk.Label(heading, text="Finetune Studio", font=("Segoe UI", 20, "bold")).pack(side="left")
        ttk.Button(heading, text="Open Liquid YAML builder", command=self.open_builder).pack(side="right")

        ttk.Label(frame, text="Training workflow").grid(row=1, column=0, sticky="w", pady=5)
        mode_box = ttk.Combobox(frame, textvariable=self.mode, values=MODES, state="readonly")
        mode_box.grid(row=1, column=1, sticky="ew", pady=5)
        mode_box.bind("<<ComboboxSelected>>", self.on_mode)

        ttk.Label(frame, text="Model ID").grid(row=2, column=0, sticky="w", pady=5)
        self.model_box = ttk.Combobox(frame, textvariable=self.model)
        self.model_box.grid(row=2, column=1, sticky="ew", pady=5)
        self.model_box.bind("<<ComboboxSelected>>", self.on_model)
        self.model_button = ttk.Button(frame, text="Browse SLMs", command=self.browse_models)
        self.model_button.grid(row=2, column=2, padx=(8, 0), pady=5)

        self.input_label = ttk.Label(frame, text="Training data (.jsonl)")
        self.input_label.grid(row=3, column=0, sticky="w", pady=5)
        ttk.Entry(frame, textvariable=self.dataset).grid(row=3, column=1, sticky="ew", pady=5)
        ttk.Button(frame, text="Browse", command=self.pick_dataset).grid(row=3, column=2, padx=(8, 0), pady=5)
        self.sample_button = ttk.Button(frame, text="Use sample", command=self.use_sample)
        self.sample_button.grid(row=4, column=1, sticky="w", pady=(0, 6))

        ttk.Label(frame, text="Run output").grid(row=5, column=0, sticky="w", pady=5)
        self.output_entry = ttk.Entry(frame, textvariable=self.output)
        self.output_entry.grid(row=5, column=1, sticky="ew", pady=5)
        self.output_button = ttk.Button(frame, text="Browse", command=self.pick_output)
        self.output_button.grid(row=5, column=2, padx=(8, 0), pady=5)

        settings = ttk.Frame(frame)
        settings.grid(row=6, column=0, columnspan=3, sticky="ew", pady=9)
        ttk.Label(settings, text="Steps").grid(row=0, column=0, sticky="w")
        self.steps_entry = ttk.Entry(settings, textvariable=self.steps, width=9)
        self.steps_entry.grid(row=0, column=1, padx=(8, 22))
        ttk.Label(settings, text="Media template").grid(row=0, column=2, sticky="w")
        self.template_entry = ttk.Entry(settings, textvariable=self.template, width=21)
        self.template_entry.grid(row=0, column=3, padx=(8, 22))
        ttk.Label(settings, text="Precision").grid(row=0, column=4, sticky="w")
        self.precision_box = ttk.Combobox(settings, textvariable=self.precision,
                                           values=("bf16", "fp16", "fp32"), state="readonly", width=8)
        self.precision_box.grid(row=0, column=5, padx=(8, 0))

        ttk.Label(frame, text="Media Python").grid(row=7, column=0, sticky="w", pady=5)
        self.backend_entry = ttk.Entry(frame, textvariable=self.media_python)
        self.backend_entry.grid(row=7, column=1, sticky="ew", pady=5)
        self.backend_button = ttk.Button(frame, text="Browse", command=self.pick_backend)
        self.backend_button.grid(row=7, column=2, padx=(8, 0), pady=5)

        controls = ttk.Frame(frame)
        controls.grid(row=8, column=0, columnspan=3, sticky="w", pady=(12, 8))
        self.start_button = ttk.Button(controls, text="Start training", command=self.start)
        self.start_button.pack(side="left")
        self.stop_button = ttk.Button(controls, text="Stop", command=self.stop, state="disabled")
        self.stop_button.pack(side="left", padx=8)
        self.status = tk.StringVar(value="Choose a workflow and dataset.")
        ttk.Label(controls, textvariable=self.status).pack(side="left", padx=12)

        self.log = scrolledtext.ScrolledText(frame, wrap="word", state="disabled", height=17)
        self.log.grid(row=9, column=0, columnspan=3, sticky="nsew")
        self.on_mode()
        self.root.after(100, self.drain_events)
        self.root.protocol("WM_DELETE_WINDOW", self.close)

    def on_mode(self, _event=None) -> None:
        mode = self.mode.get()
        choices = STARTERS[mode]
        self.model_box.configure(values=choices, state="disabled" if mode == "liquid" else "normal")
        self.model_button.configure(state="disabled" if mode == "liquid" else "normal")
        self.model.set(choices[0] if choices else "")
        self.on_model()
        self.input_label.configure(text="Liquid YAML configuration" if mode == "liquid" else "Training data (.jsonl)")
        self.sample_button.configure(state="disabled" if mode == "liquid" else "normal")
        for widget in (self.output_entry, self.output_button, self.steps_entry):
            widget.configure(state="disabled" if mode == "liquid" else "normal")
        media = mode in ("audio", "video")
        self.template_entry.configure(state="normal" if media else "disabled")
        self.precision_box.configure(state="readonly" if media else "disabled")
        self.backend_entry.configure(state="normal" if media else "disabled")
        self.backend_button.configure(state="normal" if media else "disabled")
        if media:
            self.media_python.set(str(environment_executable(ROOT / "llama-factory", "python")))
        if mode == "liquid":
            self.status.set("Full Liquid CLI requires Linux/macOS; export YAML with the builder."
                            if sys.platform == "win32" else "Export YAML with the builder, then choose it here.")
        else:
            self.status.set("Use a sample to inspect the expected data format.")

    def on_model(self, _event=None) -> None:
        self.template.set(TEMPLATES.get(self.model.get(), ""))

    def browse_models(self) -> None:
        trainer = ROOT / "webslm-trainer"
        if not trainer.is_dir():
            messagebox.showerror("Bundle needed", "The WebSLM Trainer model catalog is missing from this bundle.")
            return
        sys.path.insert(0, str(trainer))
        from webslm_trainer.catalog import format_parameters, search_hub_models, starter_models

        window = tk.Toplevel(self.root)
        window.title("Browse small models")
        window.geometry("760x430")
        panel = ttk.Frame(window, padding=12)
        panel.pack(fill="both", expand=True)
        query = tk.StringVar()
        bar = ttk.Frame(panel)
        bar.pack(fill="x", pady=(0, 8))
        ttk.Entry(bar, textvariable=query).pack(side="left", fill="x", expand=True)
        results: queue.Queue[tuple[list, str]] = queue.Queue()
        status = tk.StringVar(value="Starter models. Search results are candidates; review the model license and template.")
        ttk.Label(panel, textvariable=status).pack(anchor="w", pady=(0, 8))
        tree = ttk.Treeview(panel, columns=("size", "task", "license"), show="tree headings")
        tree.heading("#0", text="Model ID")
        tree.column("#0", width=350)
        for name, title, width in (("size", "Size", 65), ("task", "Task", 150), ("license", "License", 130)):
            tree.heading(name, text=title)
            tree.column(name, width=width)
        tree.pack(fill="both", expand=True)

        def show(entries) -> None:
            tree.delete(*tree.get_children())
            for entry in entries:
                tree.insert("", "end", text=entry.model_id,
                            values=(format_parameters(entry.parameters), entry.modes, entry.license))

        def choose(_event=None) -> None:
            selection = tree.selection()
            if selection:
                self.model.set(tree.item(selection[0], "text"))
                self.on_model()
                window.destroy()

        def search() -> None:
            name = query.get().strip()
            if not name:
                status.set("Enter a model or organization to search.")
                return
            status.set("Searching Hugging Face...")
            selected_mode = self.mode.get()

            def worker() -> None:
                try:
                    results.put((search_hub_models(name, 100, selected_mode), ""))
                except (ValueError, OSError) as exc:
                    results.put(([], str(exc)))

            threading.Thread(target=worker, daemon=True).start()

        def drain() -> None:
            if not window.winfo_exists():
                return
            try:
                entries, error = results.get_nowait()
                show(entries)
                status.set(error or f"{len(entries)} candidates found. Check compatibility before training.")
            except queue.Empty:
                pass
            window.after(100, drain)

        ttk.Button(bar, text="Search", command=search).pack(side="left", padx=(8, 0))
        tree.bind("<Double-1>", choose)
        show(starter_models(self.mode.get()))
        window.after(100, drain)

    def pick_dataset(self) -> None:
        types = [("YAML", "*.yaml *.yml")] if self.mode.get() == "liquid" else [("JSON Lines", "*.jsonl")]
        selected = filedialog.askopenfilename(filetypes=types)
        if selected:
            self.dataset.set(selected)

    def pick_output(self) -> None:
        parent = filedialog.askdirectory()
        if parent:
            self.output.set(str(Path(parent) / "finetune-run"))

    def pick_backend(self) -> None:
        selected = filedialog.askopenfilename(title="Python in the LLaMA-Factory environment")
        if selected:
            self.media_python.set(selected)

    def use_sample(self) -> None:
        mode = self.mode.get()
        if mode not in SAMPLES:
            return
        self.dataset.set(str(ROOT / "webslm-trainer" / "examples" / "corpus" / SAMPLES[mode]))
        candidate = ROOT / "outputs" / f"{mode}-run"
        index = 2
        while candidate.exists() and any(candidate.iterdir()):
            candidate = ROOT / "outputs" / f"{mode}-run-{index}"
            index += 1
        self.output.set(str(candidate))

    def open_builder(self) -> None:
        if self.server is None:
            handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT / "studio"))
            self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
            threading.Thread(target=self.server.serve_forever, daemon=True).start()
        webbrowser.open(f"http://127.0.0.1:{self.server.server_port}/")

    def append(self, line: str) -> None:
        self.log.configure(state="normal")
        self.log.insert("end", line + "\n")
        self.log.see("end")
        self.log.configure(state="disabled")

    def start(self) -> None:
        try:
            request = RunRequest(
                mode=self.mode.get(), dataset=Path(self.dataset.get().strip()),
                model=self.model.get(), output=Path(self.output.get().strip()) if self.output.get().strip() else None,
                steps=int(self.steps.get()) if self.mode.get() != "liquid" else 30,
                template=self.template.get(), precision=self.precision.get(),
                media_python=Path(self.media_python.get().strip()) if self.media_python.get().strip() else None,
            )
            plan = build_plan(ROOT, request)
        except (ValueError, OSError) as exc:
            messagebox.showerror("Check training setup", str(exc))
            return
        self.stop_requested = False
        self.start_button.configure(state="disabled")
        self.stop_button.configure(state="normal")
        self.status.set("Checking input..." if plan.check else "Training...")
        self.append(f"Starting {request.mode} workflow")
        threading.Thread(target=self.run_plan, args=(plan,), daemon=True).start()

    def run_plan(self, plan) -> None:
        try:
            for phase, command in (("check", plan.check), ("train", plan.train)):
                if not command or self.stop_requested:
                    continue
                self.events.put(("status", "Checking input..." if phase == "check" else "Training..."))
                flags = (subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP) if os.name == "nt" else 0
                self.process = subprocess.Popen(command, cwd=plan.cwd, stdout=subprocess.PIPE,
                                                stderr=subprocess.STDOUT, text=True, encoding="utf-8",
                                                errors="replace", bufsize=1, creationflags=flags,
                                                start_new_session=os.name != "nt")
                assert self.process.stdout is not None
                for line in self.process.stdout:
                    self.events.put(("log", line.rstrip()))
                code = self.process.wait()
                self.process = None
                if code:
                    self.events.put(("done", f"{phase.capitalize()} stopped or failed (exit {code})."))
                    return
            self.events.put(("done", "Stopped." if self.stop_requested else "Training finished."))
        except OSError as exc:
            self.events.put(("done", f"Could not start training: {exc}"))

    def drain_events(self) -> None:
        if self.closed:
            return
        try:
            while True:
                kind, message = self.events.get_nowait()
                if kind == "log":
                    self.append(message)
                elif kind == "status":
                    self.status.set(message)
                else:
                    self.append(message)
                    self.status.set(message)
                    self.start_button.configure(state="normal")
                    self.stop_button.configure(state="disabled")
        except queue.Empty:
            pass
        self.root.after(100, self.drain_events)

    def stop(self) -> None:
        self.stop_requested = True
        process = self.process
        if process and process.poll() is None:
            if os.name == "nt":
                subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], check=False,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                               creationflags=subprocess.CREATE_NO_WINDOW)
            else:
                os.killpg(process.pid, signal.SIGTERM)
            self.status.set("Stopping...")

    def close(self) -> None:
        self.stop()
        self.closed = True
        if self.server is not None:
            self.server.shutdown()
            self.server.server_close()
        self.root.destroy()


if __name__ == "__main__":
    FinetuneStudio().root.mainloop()
