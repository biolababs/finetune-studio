import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = join(projectRoot, "dist");
const files = ["index.html", "src/app.js", "src/core.js", "src/styles.css"];

await rm(outputRoot, { recursive: true, force: true });

for (const file of files) {
  const destination = join(outputRoot, file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(projectRoot, file), destination);
}

await writeFile(join(outputRoot, ".nojekyll"), "");
console.log(`Built ${files.length} assets in dist/`);
