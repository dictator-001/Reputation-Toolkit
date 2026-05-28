import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const srcDir = path.join(rootDir, "src");
const manifestsDir = path.join(rootDir, "manifests");
const cleanOnly = process.argv.includes("--clean");

async function copyDir(source, target) {
  await mkdir(target, { recursive: true });
  const entries = await readdir(source);

  for (const entry of entries) {
    const sourcePath = path.join(source, entry);
    const targetPath = path.join(target, entry);
    const entryStat = await stat(sourcePath);

    if (entryStat.isDirectory()) {
      await copyDir(sourcePath, targetPath);
      continue;
    }

    const contents = await readFile(sourcePath);
    await writeFile(targetPath, contents);
  }
}

async function buildTarget(targetName) {
  const targetDir = path.join(distDir, targetName);
  await rm(targetDir, { recursive: true, force: true });
  await copyDir(srcDir, targetDir);

  const manifest = await readFile(path.join(manifestsDir, `${targetName}.json`), "utf8");
  await writeFile(path.join(targetDir, "manifest.json"), manifest);
}

await rm(distDir, { recursive: true, force: true });

if (!cleanOnly) {
  await mkdir(distDir, { recursive: true });
  await buildTarget("chrome");
  await buildTarget("firefox");
  console.log("Built dist/chrome and dist/firefox");
} else {
  console.log("Removed dist");
}
