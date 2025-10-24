#!/usr/bin/env node
/**
 * postinstall: download platform binary from GitHub Releases into bin/hotbox.
 * Fallback: if invoked with --build-local (pack/publish), build with Bun locally.
 */
import { resolveTarget } from "./resolve-target.mjs";
import { createWriteStream, mkdirSync, chmodSync, existsSync, rmSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import https from "node:https";

const owner = "dl";
const repo = "hotbox";
const version = process.env.npm_package_version;

const BIN_DIR = join(process.cwd(), "bin");
const { triple, exe } = resolveTarget();
const destPath = join(BIN_DIR, exe);

function hasBin() {
  return existsSync(destPath);
}

function buildLocal() {
  try {
    execSync(`bun --version`, { stdio: "ignore" });
  } catch {
    console.error("Bun is required to build locally. Install from https://bun.sh");
    process.exit(1);
  }
  mkdirSync(BIN_DIR, { recursive: true });
  execSync(`bun build ./src/cli.ts --compile --outfile=${destPath}`, { stdio: "inherit" });
  chmodSync(destPath, 0o755);
}

function download(url, out) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed ${res.statusCode}: ${url}`));
        res.resume();
        return;
      }
      const file = createWriteStream(out);
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

async function main() {
  const buildLocalFlag = process.argv.includes("--build-local");
  if (buildLocalFlag) {
    if (hasBin()) rmSync(destPath);
    buildLocal();
    return;
  }

  // Download prebuilt
  mkdirSync(BIN_DIR, { recursive: true });
  const asset = `safenode-${triple}`;
  const base = `https://github.com/${owner}/${repo}/releases/download/v${version}/${asset}`;
  const url = process.platform === "win32" ? `${base}.exe` : base;

  try {
    await download(url, destPath);
    chmodSync(destPath, 0o755);
    // Optional smoke test: print version
    spawnSync(destPath, ["--help"], { stdio: "ignore" });
  } catch (e) {
    console.warn(`Prebuilt download failed (${e.message}). Falling back to local build.`);
    buildLocal();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});