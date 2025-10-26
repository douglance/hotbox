#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync, spawn } from "node:child_process";

// ANSI color codes (Atom One Dark + Fire)
const reset = "\x1b[0m";
const red = "\x1b[38;2;224;108;117m";
const green = "\x1b[38;2;152;195;121m";
const yellow = "\x1b[38;2;229;192;123m";
const blue = "\x1b[38;2;97;175;239m";
const orange = "\x1b[38;2;247;127;0m"; // Fire orange for hotbox
const cyan = "\x1b[38;2;86;182;194m";
const gray = "\x1b[38;2;92;99;112m";
const dim = "\x1b[2m";
const bold = "\x1b[1m";

// ANSI control codes
const clearScreen = "\x1b[2J";
const clearLine = "\x1b[2K";
const hideCursor = "\x1b[?25l";
const showCursor = "\x1b[?25h";
const saveCursor = "\x1b[s";
const restoreCursor = "\x1b[u";
const moveCursor = (row: number, col: number) => `\x1b[${row};${col}H`;
const altScreenOn = "\x1b[?1049h";
const altScreenOff = "\x1b[?1049l";

// Nerd Font icons
const i = {
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
  arrow: "",
};

type Opts = {
  port?: string;
  noNetwork?: boolean;
  mem?: string;
  cpus?: string;
  pids?: string;
  image?: string;
  nodeVersion?: string;
  envs: string[];
  rw?: boolean;
  verbose?: boolean;
  shellOnFail?: boolean;
  paranoid?: boolean;
};

const defaultOpts: Opts = {
  mem: "512m",
  cpus: "0.5",
  pids: "200",
  nodeVersion: "22",
  envs: [],
};

function parseArgs(argv: string[]): Opts {
  const o: Opts = { ...defaultOpts, envs: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-p" || a === "--port") o.port = argv[++i];
    else if (a === "-n" || a === "--no-network") o.noNetwork = true;
    else if (a === "--paranoid") {
      o.paranoid = true;
      // Apply stricter defaults for paranoid mode
      o.noNetwork = true;
      o.pids = "100";
      o.mem = "256m";
      o.cpus = "0.25";
    }
    else if (a === "--mem") o.mem = argv[++i];
    else if (a === "--cpus") o.cpus = argv[++i];
    else if (a === "--pids") o.pids = argv[++i];
    else if (a === "-i" || a === "--image") o.image = argv[++i];
    else if (a === "--node-version") o.nodeVersion = argv[++i];
    else if (a === "--env") o.envs.push(argv[++i]);
    else if (a === "--rw") o.rw = true;
    else if (a === "--verbose") o.verbose = true;
    else if (a === "--shell-on-fail") o.shellOnFail = true;
    else if (a === "--help" || a === "-h") help(0);
    else if (a.startsWith("-")) die(`Unknown flag: ${a}`);
  }
  return o;
}

function help(code = 0): never {
  console.log(`${orange}${i.docker} hotbox${reset} ${gray}— sandbox Node projects${reset}

${gray}Options:${reset}
  -p, --port        Port or mapping
  -n, --no-network  Disable networking
  --paranoid        Maximum security (no net, stricter limits)
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

function die(msg: string): never {
  console.error(`${red}${i.err} ${msg}${reset}`);
  process.exit(1);
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

function visibleWidth(str: string): number {
  const clean = stripAnsi(str);
  let width = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    if (code >= 0x1100 && (code <= 0x115f || code >= 0x2e80)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

function padLine(content: string, totalWidth: number): string {
  const visible = visibleWidth(content);
  const padding = totalWidth - visible;
  return content + " ".repeat(Math.max(0, padding));
}

function detectNodeVersion(): string | null {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (!fs.existsSync(pkgPath)) return null;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const nodeRange = pkg.engines?.node;
    if (!nodeRange) return null;
    const match = nodeRange.match(/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function ensureDocker(): void {
  const p = spawnSync("docker", ["version"], { stdio: "ignore" });
  if (p.status !== 0) die("Docker not found/running");
}

function buildDockerCmd(o: Opts): string[] {
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
  const runtime = process.env.HOTBOX_RUNTIME; // e.g. runsc (gVisor), kata-runtime
  const cmd = ["docker", "run", "--rm", ...(runtime ? ["--runtime", runtime] : [])];

  if (process.stdin.isTTY) cmd.push("-it");

  cmd.push(
    "--name", containerName,
    "--network", net,
    "--init",
    "--pids-limit", o.pids!,
    "--memory", o.mem!,
    "--cpus", o.cpus!,
    "--security-opt", "no-new-privileges:true",
    // optionally add a pinned seccomp profile via env HOTBOX_SECCOMP
    ...(process.env.HOTBOX_SECCOMP ? ["--security-opt", `seccomp=${process.env.HOTBOX_SECCOMP}`] : []),
    // AppArmor/SELinux if available
    ...(process.env.HOTBOX_APPARMOR ? ["--security-opt", `apparmor=${process.env.HOTBOX_APPARMOR}`] : []),
    "--cap-drop", "ALL",
    "--read-only",
    // exec only where truly needed
    "--tmpfs", "/tmp:noexec,uid=1000,gid=1000,size=64m",
    "--tmpfs", "/home/node/.npm:noexec,uid=1000,gid=1000,size=32m",
    "--tmpfs", "/home/node/.cache:noexec,uid=1000,gid=1000,size=32m",
    "--tmpfs", "/home/node/work:exec,uid=1000,gid=1000,size=512m",
    "--ipc=none", "--uts=container",
    "--ulimit", "nofile=2048:4096",
    "--ulimit", "nproc=256:256",
    "-v", `${cwd}:/home/node/source:${roFlag}`,
    "-w", "/home/node/work",
    "-p", `${host}:${container}`,
    "--user", "node",
    "--env", `HOST=0.0.0.0`,
    "--env", `PORT=${container}`,
    "--env", `CI=true`,
    "--env", `NODE_OPTIONS=--disable-proto=throw`,
    "--pull", "always",
  );

  for (const kv of o.envs) cmd.push("--env", kv);

  const image = o.image || `node:${o.nodeVersion}-alpine`;
  const shellFallback = o.shellOnFail && process.env.HOTBOX_ALLOW_SHELL === "1" ? "exec sh" : "exit 0";

  cmd.push(image);
  const statusBox = o.noNetwork ? "" : `
    echo ''
    echo '\x1b[38;2;247;127;0m──────────────────────────────────────────────────────────────────────\x1b[0m'
    echo '\x1b[38;2;247;127;0m  \x1b[1mREADY\x1b[0m'
    echo '\x1b[38;2;247;127;0m──────────────────────────────────────────────────────────────────────\x1b[0m'
    echo '\x1b[38;2;247;127;0m  \x1b[1mhttp://localhost:${host}\x1b[0m'
    echo ''
    echo '\x1b[38;2;247;127;0m  Limits      \x1b[38;2;229;192;123m${o.cpus}\x1b[0m\x1b[38;2;247;127;0m CPU   \x1b[38;2;229;192;123m${o.mem}\x1b[0m\x1b[38;2;247;127;0m   \x1b[38;2;229;192;123m${o.pids}\x1b[0m\x1b[38;2;247;127;0m PIDs\x1b[0m'
    echo '\x1b[38;2;247;127;0m  Security    Read-only filesystem, no capabilities\x1b[0m'
    echo '\x1b[38;2;247;127;0m──────────────────────────────────────────────────────────────────────\x1b[0m'
    echo ''
  `;
  cmd.push("sh", "-c", `
    set -euo pipefail
    tar -C /home/node/source \\
      --exclude='.git' \\
      --exclude='node_modules' \\
      -cf - . | tar -C /home/node/work -xf - || { echo 'Failed to copy source files'; exit 3; }
    cd /home/node/work
    echo ''
    echo '\x1b[38;2;247;127;0m──────────────────────────────────────────────────────────────────────\x1b[0m'
    echo '\x1b[38;2;247;127;0m  Installing dependencies...\x1b[0m'
    echo '\x1b[38;2;247;127;0m──────────────────────────────────────────────────────────────────────\x1b[0m'
    echo ''
    # Pin ni version to reduce supply-chain risk
    npx --yes --package=@antfu/ni@0.22.0 ni --verbose || npm ci --verbose || yarn install --frozen-lockfile --verbose || pnpm i --frozen-lockfile || exit 2
    echo ''
    echo '\x1b[38;2;247;127;0m──────────────────────────────────────────────────────────────────────\x1b[0m'
    echo '\x1b[38;2;247;127;0m  Starting application...\x1b[0m'
    echo '\x1b[38;2;247;127;0m──────────────────────────────────────────────────────────────────────\x1b[0m'
    echo ''
    ${statusBox}
    echo '\x1b[2m\x1b[38;2;92;99;112m──────────────────────────────────────────────────────────────────────\x1b[0m'
    echo '\x1b[2m\x1b[38;2;92;99;112m  Package Output\x1b[0m'
    echo '\x1b[2m\x1b[38;2;92;99;112m──────────────────────────────────────────────────────────────────────\x1b[0m'
    echo ''
    npx --yes --package=@antfu/ni@0.22.0 nr start || npx --yes --package=@antfu/ni@0.22.0 nr dev || npm start || npm run dev || yarn start || yarn dev || pnpm start || pnpm dev || node index.js || ${shellFallback}
  `.trim());

  return cmd;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  ensureDocker();

  if (o.rw && process.env.HOTBOX_ALLOW_RW !== "1") die(`${i.lock} --rw blocked (allows host filesystem writes). Set HOTBOX_ALLOW_RW=1 to override.`);
  if (o.image && process.env.HOTBOX_ALLOW_IMAGE !== "1") die(`${i.lock} --image blocked for security. Set HOTBOX_ALLOW_IMAGE=1 to override.`);
  if (o.shellOnFail && process.env.HOTBOX_ALLOW_SHELL !== "1") die(`${i.lock} --shell-on-fail blocked (provides container shell access). Set HOTBOX_ALLOW_SHELL=1 to override.`);
  if (o.noNetwork && !fs.existsSync(path.join(process.cwd(), "node_modules"))) die(`${i.err} --no-network requires node_modules`);

  const socketPaths = ["docker.sock", "var/run/docker.sock", ".docker/docker.sock"];
  for (const sockPath of socketPaths) {
    if (fs.existsSync(path.join(process.cwd(), sockPath))) {
      die(`${i.err} Docker socket at '${sockPath}'`);
    }
  }

  if (!o.nodeVersion || o.nodeVersion === defaultOpts.nodeVersion) {
    const detected = detectNodeVersion();
    if (detected) o.nodeVersion = detected;
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
    console.error(`${gray}$ ${cmd.join(" ")}${reset}\n`);
  }

  // Spawn docker process with inherited stdio for direct streaming
  const p = spawn(cmd[0], cmd.slice(1), {
    stdio: 'inherit'
  });

  // Wait for process to exit
  await new Promise<void>((resolve) => {
    p.on('close', (code) => {
      process.exit(code || 0);
      resolve();
    });
  });
}

main().catch((e) => {
  console.error(`${red}${i.err} ${e?.stack || e}${reset}`);
  process.exit(1);
});
