import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const release = join(root, "release");
const archive = join(release, "finetune-studio-source.tar.gz");
const sources = {
  trainer: {
    url: "https://github.com/webslm-studio/webslm-trainer.git",
    sha: "a9f7748ebfc262e67835575847928e14f306efc4",
  },
  liquid: {
    url: "https://github.com/Liquid4All/liquid-finetune.git",
    sha: "d9cc23dae5a16498ab7dc11958b80ca803e0440a",
  },
  media: {
    url: "https://github.com/hiyouga/LLaMA-Factory.git",
    sha: "438b3611d1538547876c9e7af044b022dc0e53f2",
  },
};

function run(program, args, cwd = root) {
  execFileSync(program, args, { cwd, stdio: "inherit" });
}

async function clonePinned({ url, sha }, target) {
  run("git", ["init", target]);
  run("git", ["-C", target, "remote", "add", "origin", url]);
  run("git", ["-C", target, "fetch", "--depth", "1", "origin", sha]);
  run("git", ["-C", target, "checkout", "--detach", "FETCH_HEAD"]);
  const actual = execFileSync("git", ["-C", target, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (actual !== sha) throw new Error(`Unexpected commit for ${url}: ${actual}`);
}

function include(path) {
  return !path.split(/[\\/]/).some((part) =>
    [".git", ".venv", ".venv-media", "outputs", "__pycache__", "dist"].includes(part));
}

const temporary = await mkdtemp(join(tmpdir(), "finetune-studio-bundle-"));
try {
  const stage = join(temporary, "finetune-studio");
  await mkdir(stage, { recursive: true });
  await import("./build.mjs");
  await cp(join(root, "dist"), join(stage, "studio"), { recursive: true });
  await cp(join(root, "bundle", "README.md"), join(stage, "README.md"));
  await cp(join(root, "bundle", "launch.py"), join(stage, "launch.py"));
  await cp(join(root, "bundle", "studio_core.py"), join(stage, "studio_core.py"));

  for (const [name, source] of Object.entries(sources)) {
    const checkout = join(temporary, `${name}-checkout`);
    await clonePinned(source, checkout);
    const folder = { trainer: "webslm-trainer", liquid: "liquid-finetune", media: "llama-factory" }[name];
    await cp(checkout, join(stage, folder), { recursive: true, filter: include });
  }

  await writeFile(join(stage, "SOURCES.txt"),
    `WebSLM Trainer: ${sources.trainer.url} @ ${sources.trainer.sha}\n` +
    `Liquid Finetune: ${sources.liquid.url} @ ${sources.liquid.sha}\n` +
    `LLaMA-Factory: ${sources.media.url} @ ${sources.media.sha}\n`);
  await mkdir(release, { recursive: true });
  await rm(archive, { force: true });
  run("tar", ["-czf", archive, "finetune-studio"], temporary);
  console.log(`Created ${archive}`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
