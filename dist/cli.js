#!/usr/bin/env node
import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// src/ui.tsx
var exports_ui = {};
__export(exports_ui, {
  HotboxUI: () => HotboxUI
});
import { createElement } from "react";
import { Box, Text, useStdout } from "ink";
function HotboxUI({ nodeVersion, cpus, mem, pids, port, noNetwork, logs }) {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns || 120;
  const statusBoxWidth = 45;
  const logBoxWidth = termWidth - statusBoxWidth - 3;
  const frameIndex = Math.floor(Date.now() / 200) % flames.length;
  const fireColor = fireColors[frameIndex % fireColors.length];
  const flame = flames[frameIndex];
  const termHeight = stdout?.rows || 30;
  const maxLogs = termHeight - 3;
  const displayLogs = logs.slice(-maxLogs);
  return createElement(Box, { flexDirection: "row", width: termWidth }, createElement(Box, { flexDirection: "column", width: statusBoxWidth, borderStyle: "round", borderColor: "#f77f00", paddingX: 1 }, createElement(Box, { justifyContent: "center", marginBottom: 1 }, createElement(Text, { bold: true }, createElement(Text, { color: fireColor }, flame), " ", createElement(Text, { color: "#f77f00" }, " HOTBOX"), " ", createElement(Text, { color: fireColor }, flame))), createElement(Box, { marginBottom: 1 }, createElement(Text, { dimColor: true }, " Container   "), createElement(Text, { color: "#61afef" }, `node:${nodeVersion}-alpine`)), createElement(Box, { marginBottom: 1 }, createElement(Text, { dimColor: true }, " Resources   "), createElement(Text, { color: "#e5c07b" }, cpus), createElement(Text, null, " CPU  "), createElement(Text, { color: "#e5c07b" }, mem), createElement(Text, null, "  "), createElement(Text, { color: "#e5c07b" }, pids), createElement(Text, null, " PIDs")), createElement(Box, { marginBottom: 1 }, createElement(Text, { dimColor: true }, " Network     "), noNetwork ? createElement(Text, { color: "#e5c07b" }, " off") : createElement(Text, { color: "#98c379" }, " enabled")), createElement(Box, { marginBottom: 1 }, createElement(Text, { dimColor: true }, " Security    "), createElement(Text, { color: "#98c379" }, "read-only")), createElement(Box, { marginTop: 1, borderStyle: "single", borderColor: "#f77f00", paddingX: 1 }, createElement(Text, { bold: true, color: "#f77f00" }, `http://localhost:${port}`)), createElement(Box, { marginTop: "auto" }, createElement(Text, { dimColor: true }, "Press Ctrl+C to stop"))), createElement(Box, { flexDirection: "column", width: logBoxWidth, borderStyle: "round", borderColor: "#5c6370", paddingX: 1, marginLeft: 1 }, createElement(Box, { borderBottom: true, borderColor: "#5c6370", marginBottom: 1 }, createElement(Text, { dimColor: true }, "Logs")), createElement(Box, { flexDirection: "column" }, displayLogs.length === 0 ? createElement(Text, { dimColor: true }, "Waiting for logs...") : displayLogs.map((log, idx) => createElement(Text, { key: idx, wrap: "truncate-end" }, log)))));
}
var fireColors, flames;
var init_ui = __esm(() => {
  fireColors = ["#e06c75", "#f77f00", "#ffa500", "#ffc800"];
  flames = ["▁▂", "▂▃", "▃▄", "▄▅", "▅▆", "▆▇", "▇█"];
});

// src/cli.ts
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync, spawn } from "node:child_process";
var reset = "\x1B[0m";
var red = "\x1B[38;2;224;108;117m";
var yellow = "\x1B[38;2;229;192;123m";
var orange = "\x1B[38;2;247;127;0m";
var gray = "\x1B[38;2;92;99;112m";
var i = {
  docker: "",
  cpu: "",
  mem: "",
  net: "",
  port: "",
  box: "",
  term: "",
  warn: "",
  err: "",
  lock: "",
  rocket: "",
  package: "",
  check: "",
  arrow: ""
};
var defaultOpts = {
  mem: "512m",
  cpus: "0.5",
  pids: "200",
  nodeVersion: "22",
  envs: []
};
function parseArgs(argv) {
  const o = { ...defaultOpts, envs: [] };
  for (let i2 = 0;i2 < argv.length; i2++) {
    const a = argv[i2];
    if (a === "-p" || a === "--port")
      o.port = argv[++i2];
    else if (a === "-n" || a === "--no-network")
      o.noNetwork = true;
    else if (a === "--mem")
      o.mem = argv[++i2];
    else if (a === "--cpus")
      o.cpus = argv[++i2];
    else if (a === "--pids")
      o.pids = argv[++i2];
    else if (a === "-i" || a === "--image")
      o.image = argv[++i2];
    else if (a === "--node-version")
      o.nodeVersion = argv[++i2];
    else if (a === "--env")
      o.envs.push(argv[++i2]);
    else if (a === "--rw")
      o.rw = true;
    else if (a === "--verbose")
      o.verbose = true;
    else if (a === "--shell-on-fail")
      o.shellOnFail = true;
    else if (a === "--help" || a === "-h")
      help(0);
    else if (a.startsWith("-"))
      die(`Unknown flag: ${a}`);
  }
  return o;
}
function help(code = 0) {
  console.log(`${orange}${i.docker} hotbox${reset} ${gray}— sandbox Node projects${reset}

${gray}Options:${reset}
  -p, --port        Port or mapping
  -n, --no-network  Disable networking
  --mem             Memory limit (512m)
  --cpus            CPU limit (0.5)
  --pids            PIDs limit (200)
  -i, --image       Docker image ${yellow}${i.warn} requires HOTBOX_ALLOW_IMAGE=1${reset}
  --node-version    Node version (18, 20, 22)
  --env             KEY=VAL (repeatable)
  --rw              Read-write ${yellow}${i.warn} requires HOTBOX_ALLOW_RW=1${reset}
  --shell-on-fail   Shell on fail ${yellow}${i.warn} requires HOTBOX_ALLOW_SHELL=1${reset}
  --verbose         Show docker command
  -h, --help        This help`);
  process.exit(code);
}
function die(msg) {
  console.error(`${red}${i.err} ${msg}${reset}`);
  process.exit(1);
}
function detectNodeVersion() {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (!fs.existsSync(pkgPath))
      return null;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const nodeRange = pkg.engines?.node;
    if (!nodeRange)
      return null;
    const match = nodeRange.match(/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
function ensureDocker() {
  const p = spawnSync("docker", ["version"], { stdio: "ignore" });
  if (p.status !== 0)
    die("Docker not found/running");
}
function buildDockerCmd(o) {
  const cwd = process.cwd();
  let host = "", container = "";
  if (!o.port) {
    const defaultPort = process.env.PORT || "3000";
    host = container = defaultPort;
  } else if (o.port.includes(":")) {
    [host, container] = o.port.split(":");
  } else {
    host = container = o.port;
  }
  const containerName = `hotbox-${Date.now()}`;
  const net = o.noNetwork ? "none" : "bridge";
  const roFlag = o.rw ? "rw" : "ro";
  const cmd = ["docker", "run", "--rm"];
  if (process.stdin.isTTY)
    cmd.push("-it");
  cmd.push("--name", containerName, "--network", net, "--pids-limit", o.pids, "--memory", o.mem, "--cpus", o.cpus, "--security-opt", "no-new-privileges:true", "--cap-drop", "ALL", "--read-only", "--tmpfs", "/tmp:exec,uid=1000,gid=1000,size=64m", "--tmpfs", "/home/node/.npm:exec,uid=1000,gid=1000,size=32m", "--tmpfs", "/home/node/.cache:exec,uid=1000,gid=1000,size=32m", "--tmpfs", "/home/node/work:exec,uid=1000,gid=1000,size=512m", "-v", `${cwd}:/home/node/source:${roFlag}`, "-w", "/home/node/work", "-p", `${host}:${container}`, "--user", "node", "--env", `HOST=0.0.0.0`, "--env", `PORT=${container}`, "--env", `CI=true`);
  for (const kv of o.envs)
    cmd.push("--env", kv);
  const image = o.image || `node:${o.nodeVersion}-alpine`;
  const shellFallback = o.shellOnFail && process.env.HOTBOX_ALLOW_SHELL === "1" ? "exec sh" : "exit 0";
  cmd.push(image);
  const statusBox = o.noNetwork ? "" : `
    echo ''
    echo '\x1B[38;2;247;127;0m──────────────────────────────────────────────────────────────────────\x1B[0m'
    echo '\x1B[38;2;247;127;0m  \x1B[1mREADY\x1B[0m'
    echo '\x1B[38;2;247;127;0m──────────────────────────────────────────────────────────────────────\x1B[0m'
    echo '\x1B[38;2;247;127;0m  \x1B[1mhttp://localhost:${host}\x1B[0m'
    echo ''
    echo '\x1B[38;2;247;127;0m  Limits      \x1B[38;2;229;192;123m${o.cpus}\x1B[0m\x1B[38;2;247;127;0m CPU   \x1B[38;2;229;192;123m${o.mem}\x1B[0m\x1B[38;2;247;127;0m   \x1B[38;2;229;192;123m${o.pids}\x1B[0m\x1B[38;2;247;127;0m PIDs\x1B[0m'
    echo '\x1B[38;2;247;127;0m  Security    Read-only filesystem, no capabilities\x1B[0m'
    echo '\x1B[38;2;247;127;0m──────────────────────────────────────────────────────────────────────\x1B[0m'
    echo ''
  `;
  cmd.push("sh", "-c", `
    set -euo pipefail
    tar -C /home/node/source -cf - . | tar -C /home/node/work -xf - || { echo 'Failed to copy source files'; exit 3; }
    cd /home/node/work
    echo ''
    echo '\x1B[38;2;247;127;0m──────────────────────────────────────────────────────────────────────\x1B[0m'
    echo '\x1B[38;2;247;127;0m  Installing dependencies...\x1B[0m'
    echo '\x1B[38;2;247;127;0m──────────────────────────────────────────────────────────────────────\x1B[0m'
    echo ''
    npx --yes --package=@antfu/ni ni --verbose || npm install --verbose || yarn install --verbose || pnpm install || exit 2
    echo ''
    echo '\x1B[38;2;247;127;0m──────────────────────────────────────────────────────────────────────\x1B[0m'
    echo '\x1B[38;2;247;127;0m  Starting application...\x1B[0m'
    echo '\x1B[38;2;247;127;0m──────────────────────────────────────────────────────────────────────\x1B[0m'
    echo ''
    ${statusBox}
    echo '\x1B[2m\x1B[38;2;92;99;112m──────────────────────────────────────────────────────────────────────\x1B[0m'
    echo '\x1B[2m\x1B[38;2;92;99;112m  Package Output\x1B[0m'
    echo '\x1B[2m\x1B[38;2;92;99;112m──────────────────────────────────────────────────────────────────────\x1B[0m'
    echo ''
    npx --yes --package=@antfu/ni nr start || npx --yes --package=@antfu/ni nr dev || npm start || npm run dev || yarn start || yarn dev || pnpm start || pnpm dev || node index.js || ${shellFallback}
  `.trim());
  return cmd;
}
async function main() {
  const o = parseArgs(process.argv.slice(2));
  ensureDocker();
  if (o.rw && process.env.HOTBOX_ALLOW_RW !== "1")
    die(`${i.lock} --rw requires HOTBOX_ALLOW_RW=1`);
  if (o.image && process.env.HOTBOX_ALLOW_IMAGE !== "1")
    die(`${i.lock} --image requires HOTBOX_ALLOW_IMAGE=1`);
  if (o.shellOnFail && process.env.HOTBOX_ALLOW_SHELL !== "1")
    die(`${i.lock} --shell-on-fail requires HOTBOX_ALLOW_SHELL=1`);
  if (o.noNetwork && !fs.existsSync(path.join(process.cwd(), "node_modules")))
    die(`${i.err} --no-network requires node_modules`);
  const socketPaths = ["docker.sock", "var/run/docker.sock", ".docker/docker.sock"];
  for (const sockPath of socketPaths) {
    if (fs.existsSync(path.join(process.cwd(), sockPath))) {
      die(`${i.err} Docker socket at '${sockPath}'`);
    }
  }
  if (!o.nodeVersion || o.nodeVersion === defaultOpts.nodeVersion) {
    const detected = detectNodeVersion();
    if (detected)
      o.nodeVersion = detected;
  }
  let hostPort = "";
  if (!o.port) {
    hostPort = process.env.PORT || "3000";
  } else if (o.port.includes(":")) {
    hostPort = o.port.split(":")[0];
  } else {
    hostPort = o.port;
  }
  const cmd = buildDockerCmd(o);
  if (o.verbose) {
    console.error(`${gray}$ ${cmd.join(" ")}${reset}
`);
  }
  const React = await import("react");
  const { render } = await import("ink");
  const { HotboxUI: HotboxUI2 } = await Promise.resolve().then(() => (init_ui(), exports_ui));
  const logs = [];
  let rerender = null;
  let lastRenderTime = 0;
  const RENDER_THROTTLE_MS = 100;
  const scheduleRerender = () => {
    if (!rerender)
      return;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime;
    if (timeSinceLastRender >= RENDER_THROTTLE_MS) {
      lastRenderTime = now;
      rerender(React.createElement(HotboxUI2, {
        nodeVersion: o.nodeVersion,
        cpus: o.cpus,
        mem: o.mem,
        pids: o.pids,
        port: hostPort,
        noNetwork: o.noNetwork || false,
        logs: logs.slice()
      }));
    }
  };
  const p = spawn(cmd[0], cmd.slice(1), {
    stdio: ["inherit", "pipe", "pipe"]
  });
  p.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    const lines = text.split(`
`).filter((l) => l.trim());
    logs.push(...lines);
    scheduleRerender();
  });
  p.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    const lines = text.split(`
`).filter((l) => l.trim());
    logs.push(...lines);
    scheduleRerender();
  });
  const { rerender: rerenderFn } = render(React.createElement(HotboxUI2, {
    nodeVersion: o.nodeVersion,
    cpus: o.cpus,
    mem: o.mem,
    pids: o.pids,
    port: hostPort,
    noNetwork: o.noNetwork || false,
    logs
  }));
  rerender = rerenderFn;
  await new Promise((resolve) => {
    p.on("close", (code) => {
      process.exit(code || 0);
      resolve();
    });
  });
}
main().catch((e) => {
  console.error(`${red}${i.err} ${e?.stack || e}${reset}`);
  process.exit(1);
});
