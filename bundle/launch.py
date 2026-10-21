"""Local entry point for the combined Finetune Studio source bundle."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import webbrowser


ROOT = Path(__file__).resolve().parent


def environment_executable(folder: Path, name: str) -> Path:
    scripts = "Scripts" if sys.platform == "win32" else "bin"
    suffix = ".exe" if sys.platform == "win32" else ""
    return folder / ".venv" / scripts / f"{name}{suffix}"


class Launcher:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title("Finetune Studio")
        self.root.minsize(460, 270)
        frame = ttk.Frame(self.root, padding=24)
        frame.pack(fill="both", expand=True)
        ttk.Label(frame, text="Finetune Studio", font=("Segoe UI", 19, "bold")).pack(anchor="w")
        ttk.Label(frame, text="Choose a local workflow. Model weights and training packages install separately.",
                  wraplength=400).pack(anchor="w", pady=(5, 17))
        ttk.Button(frame, text="Open Liquid configuration studio", command=self.open_studio).pack(fill="x", pady=4)
        ttk.Button(frame, text="Open WebSLM Trainer desktop", command=self.open_trainer).pack(fill="x", pady=4)
        ttk.Button(frame, text="Run a Liquid YAML configuration", command=self.run_liquid).pack(fill="x", pady=4)
        ttk.Label(frame, text="Liquid's full CLI currently targets Linux/macOS and Python 3.12.",
                  wraplength=400).pack(anchor="w", pady=(14, 0))
        self.server = None
        self.root.protocol("WM_DELETE_WINDOW", self.close)

    def open_studio(self) -> None:
        if self.server is None:
            handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT / "studio"))
            self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
            threading.Thread(target=self.server.serve_forever, daemon=True).start()
        webbrowser.open(f"http://127.0.0.1:{self.server.server_port}/")

    def open_trainer(self) -> None:
        trainer = ROOT / "webslm-trainer"
        python = environment_executable(trainer, "python")
        if not python.is_file():
            messagebox.showerror("Setup needed", "Install WebSLM Trainer first using the steps in this bundle's README.")
            return
        try:
            subprocess.Popen([str(python), "-m", "webslm_trainer", "desktop"], cwd=trainer)
        except OSError as exc:
            messagebox.showerror("Could not open trainer", str(exc))

    def run_liquid(self) -> None:
        liquid = ROOT / "liquid-finetune"
        executable = environment_executable(liquid, "liquid-finetune")
        if not executable.is_file():
            messagebox.showerror("Setup needed", "Install Liquid Finetune first using the steps in this bundle's README.")
            return
        config = filedialog.askopenfilename(title="Choose Liquid YAML", filetypes=[("YAML", "*.yaml *.yml")])
        if not config:
            return
        try:
            flags = subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0
            subprocess.Popen([str(executable), str(Path(config).resolve())], cwd=liquid, creationflags=flags)
        except OSError as exc:
            messagebox.showerror("Could not start Liquid Finetune", str(exc))

    def close(self) -> None:
        if self.server is not None:
            self.server.shutdown()
            self.server.server_close()
        self.root.destroy()


if __name__ == "__main__":
    Launcher().root.mainloop()
