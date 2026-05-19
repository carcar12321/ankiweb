/* global console, process */
import { cp, rm, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.HOSTNAME = "0.0.0.0";

const root = path.dirname(fileURLToPath(import.meta.url));
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

async function copyIfPresent(source, target, label) {
  if (!(await exists(source))) {
    return;
  }

  await rm(target, { force: true, recursive: true });
  await cp(source, target, { recursive: true });
  console.log(`[server] prepared ${label}`);
}

await copyIfPresent(nextStaticSource, nextStaticTarget, ".next/static");
await copyIfPresent(publicSource, publicTarget, "public");

const require = createRequire(import.meta.url);
require("./.next/standalone/server.js");
