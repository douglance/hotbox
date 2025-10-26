#!/usr/bin/env node
/**
 * postinstall: download platform binary from GitHub Releases into bin/hotbox.
 * Fallback: if invoked with --build-local (pack/publish), build with Bun locally.
 */
import { resolveTarget } from "./resolve-target.mjs";
import { createWriteStream, mkdirSync, chmodSync, existsSync, rmSync, readFileSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import https from "node:https";
import crypto from "node:crypto";

const owner = "douglance";
const repo = "hotbox";
const version = process.env.npm_package_version;

const BIN_DIR = join(process.cwd(), "bin");
const VENDOR_DIR = join(BIN_DIR, "vendor");
const { triple } = resolveTarget();
const filename = process.platform === "win32" ? `hotbox-${triple}.exe` : `hotbox-${triple}`;
const destPath = join(VENDOR_DIR, filename);

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
  mkdirSync(VENDOR_DIR, { recursive: true });
  execSync(`bun build ./src/cli.ts --compile --outfile=${destPath}`, { stdio: "inherit" });
  chmodSync(destPath, 0o755);
}

function download(url, out, attempts = 3) {
  return new Promise((resolve, reject) => {
    const doGet = (tries) => https.get(url, (res) => {
      if (res.statusCode !== 200) {
        if (tries > 1 && res.statusCode && res.statusCode >= 500) {
          res.resume();
          return setTimeout(() => doGet(tries - 1), 500 * (4 - tries));
        }
        reject(new Error(`Download failed ${res.statusCode}: ${url}`));
        res.resume();
        return;
      }
      const file = createWriteStream(out);
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (e) => {
      if (attempts > 1) return setTimeout(() => doGet(attempts - 1), 500 * (4 - attempts));
      reject(e);
    });
    doGet(attempts);
  });
}

async function sha256(filePath) {
  const h = crypto.createHash("sha256");
  h.update(readFileSync(filePath));
  return h.digest("hex");
}

async function main() {
  const buildLocalFlag = process.argv.includes("--build-local");
  if (buildLocalFlag) {
    if (hasBin()) rmSync(destPath);
    buildLocal();
    return;
  }

  // Download prebuilt + checksum
  mkdirSync(VENDOR_DIR, { recursive: true });
  const asset = `hotbox-${triple}`;
  const base = `https://github.com/${owner}/${repo}/releases/download/v${version}/${asset}`;
  const url = process.platform === "win32" ? `${base}.exe` : base;
  const sumUrl = `${base}.sha256`;

  try {
    await download(url, destPath);
    chmodSync(destPath, 0o755);

    // verify sha256 if available
    try {
      const sumPath = join(VENDOR_DIR, `${asset}.sha256`);
      await download(sumUrl, sumPath);
      const expected = readFileSync(sumPath, "utf8").trim().split(/\s+/)[0];
      const actual = await sha256(destPath);
      if (expected && expected !== actual) {
        throw new Error(`Checksum mismatch: expected ${expected} got ${actual}`);
      }
    } catch (e) {
      console.warn(`Checksum verification skipped/failed (${e.message}).`);
    }

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