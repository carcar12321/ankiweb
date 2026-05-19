/* global console, process */
import { cp, rm, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const nextStaticSource = path.join(root, ".next", "static");
const nextStaticTarget = path.join(standaloneDir, ".next", "static");
const publicSource = path.join(root, "public");
const publicTarget = path.join(standaloneDir, "public");

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      return false;
    }
    throw error;
  }
}

async function copyDirectory(source, target, label) {
  if (!(await exists(source))) {
    console.log(`[prepare-standalone] skipped ${label}; source not found`);
    return;
  }

  await rm(target, { force: true, recursive: true });
  await cp(source, target, { recursive: true });
  console.log(`[prepare-standalone] copied ${label}`);
}

if (!(await exists(standaloneDir))) {
  throw new Error(
    "Next standalone output was not found. Make sure next.config sets output: 'standalone'."
  );
}

await copyDirectory(nextStaticSource, nextStaticTarget, ".next/static");
await copyDirectory(publicSource, publicTarget, "public");
