#!/usr/bin/env bun
/**
 * hotbox — run current Node project in a hardened Docker sandbox.
 *
 * Port behavior:
 *   No flag:     Uses app's default port (PORT env or 3000) on same port
 *   -p 8080:     Runs on port 8080 (both host and container)
 *   -p 9000:3000: Maps host port 9000 to container port 3000
 *
 * Flags:
 *   -p, --port        port or host:container mapping
 *   -n, --no-network  disable networking
 *   --mem             memory limit (default 512m)
 *   --cpus            CPU limit (default 0.5)
 *   --pids            PIDs limit (default 200)
 *   -i, --image       Docker base image (overrides --node-version)
 *   --node-version    Node.js major version (e.g., 18, 20, 22)
 *                     Auto-detected from package.json engines.node
 *   --env             repeatable KEY=VAL to pass into container
 *   --rw              allow write access to project (default ro)
 *   --verbose         show docker command before run
 *   --help
 *
 * Examples:
 *   hotbox                    # Auto-detect port and Node version
 *   hotbox -p 8080            # Runs on port 8080
 *   hotbox --node-version 18  # Use Node 18
 *   hotbox -p 9000:3000       # Maps port 9000→3000
 *   hotbox -n                 # No network access
 */

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
    else if (a === "--mem") o.mem = argv[++i];
    else if (a === "--cpus") o.cpus = argv[++i];
    else if (a === "--pids") o.pids = argv[++i];
    else if (a === "-i" || a === "--image") o.image = argv[++i];
    else if (a === "--node-version") o.nodeVersion = argv[++i];
    else if (a === "--env") o.envs.push(argv[++i]);
    else if (a === "--rw") o.rw = true;
    else if (a === "--verbose") o.verbose = true;
    else if (a === "--help" || a === "-h") help(0);
    else if (a.startsWith("-")) die(`Unknown flag: ${a}`);
  }
  return o;
}

function help(code = 0): never {
  console.log(`hotbox — sandbox your Node project with Docker

Usage: hotbox [options]

Options:
  -p, --port        Port (e.g., 8080) or mapping (e.g., 9000:3000)
                    Default: app's port (3000 or $PORT)
  -n, --no-network  Disable networking
  --mem             Memory limit (default 512m)
  --cpus            CPU limit (default 0.5)
  --pids            PIDs limit (default 200)
  -i, --image       Docker base image (overrides --node-version)
  --node-version    Node.js version (e.g., 18, 20, 22)
                    Auto-detected from package.json engines.node if present
                    Default: 22
  --env             Pass KEY=VAL (repeatable)
  --rw              Mount project read-write (default read-only)
  --verbose         Print docker invocation
  -h, --help        Show help

Examples:
  hotbox                    # Auto-detect port and Node version
  hotbox -p 8080            # Run on port 8080
  hotbox --node-version 18  # Use Node 18
  hotbox -p 9000:3000       # Map host 9000 to container 3000
  hotbox -n                 # No network access
`);
  process.exit(code);
}

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function detectNodeVersion(): string | null {
  try {
    const fs = require("fs");
    const pkgPath = `${process.cwd()}/package.json`;
    if (!fs.existsSync(pkgPath)) return null;

    const pkgText = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(pkgText);
    const nodeRange = pkg.engines?.node;
    if (!nodeRange) return null;

    // Extract major version from ranges like ">=18", "^18.0.0", "18.x", "18"
    const match = nodeRange.match(/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function ensureDocker(): void {
  const p = Bun.spawnSync(["docker", "version"], { stdout: "ignore", stderr: "ignore" });
  if (p.exitCode !== 0) die("Docker is required but not found/running.");
}

function buildDockerCmd(o: Opts): string[] {
  const cwd = process.cwd();
  // Smart port detection
  let host = "";
  let container = "";

  if (!o.port) {
    // No port specified: use app's default (PORT env or 3000) for both
    const defaultPort = process.env.PORT || "3000";
    host = defaultPort;
    container = defaultPort;
  } else if (o.port.includes(":")) {
    // Explicit mapping: host:container
    [host, container] = o.port.split(":");
  } else {
    // Single port: use same for both host and container
    host = o.port;
    container = o.port;
  }

  const containerName = `hotbox-${Date.now()}`;
  const net = o.noNetwork ? "none" : "bridge";
  const roFlag = o.rw ? "rw" : "ro";

  // Check if we have an interactive terminal
  const isInteractive = process.stdin.isTTY;

  const cmd = [
    "docker", "run", "--rm",
  ];

  // Only add interactive flags if we have a TTY
  if (isInteractive) {
    cmd.push("-it");
  }

  cmd.push(
    "--name", containerName,
    "--network", net,
    "--pids-limit", o.pids!,
    "--memory", o.mem!,
    "--cpus", o.cpus!,
    "--security-opt", "no-new-privileges:true",
    "--cap-drop", "ALL",
    "--tmpfs", "/tmp:exec,uid=1000,gid=1000,size=64m",
    "--tmpfs", "/home/node/.npm:exec,uid=1000,gid=1000,size=32m",
    "--tmpfs", "/home/node/.cache:exec,uid=1000,gid=1000,size=32m",
    "--tmpfs", "/home/node/work:exec,uid=1000,gid=1000,size=512m",
    "-v", `${cwd}:/home/node/source:${roFlag}`,
    "-w", "/home/node/work",
    "-p", `${host}:${container}`,
    "--user", "node",
    "--env", `HOST=0.0.0.0`,
    "--env", `PORT=${container}`,
    "--env", `CI=true`,
  );

  for (const kv of o.envs) cmd.push("--env", kv);

  // Determine Docker image: explicit --image flag takes precedence, otherwise use node:version-alpine
  const image = o.image || `node:${o.nodeVersion}-alpine`;

  cmd.push(image);
  cmd.push("sh", "-c", `
    set -euo pipefail
    cp -r /home/node/source/* /home/node/work/
    cp /home/node/source/package*.json /home/node/work/ 2>/dev/null || true
    cp /home/node/source/yarn.lock /home/node/work/ 2>/dev/null || true
    cp /home/node/source/pnpm-lock.yaml /home/node/work/ 2>/dev/null || true
    cp /home/node/source/bun.lockb /home/node/work/ 2>/dev/null || true
    cd /home/node/work
    echo '>> Installing dependencies...'
    npx --yes --package=@antfu/ni ni || npm install --no-audit || yarn install --no-audit || pnpm install || exit 2
    echo '>> Starting application...'
    npx --yes --package=@antfu/ni nr start || npx --yes --package=@antfu/ni nr dev || npm start || npm run dev || yarn start || yarn dev || pnpm start || pnpm dev || node index.js || exec sh
  `.trim());

  return cmd;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  ensureDocker();

  // Auto-detect Node version from package.json if not explicitly set
  if (!o.nodeVersion || o.nodeVersion === defaultOpts.nodeVersion) {
    const detected = detectNodeVersion();
    if (detected) {
      o.nodeVersion = detected;
    }
  }

  // Get the host port for URL display
  let hostPort = "";
  if (!o.port) {
    hostPort = process.env.PORT || "3000";
  } else if (o.port.includes(":")) {
    hostPort = o.port.split(":")[0];
  } else {
    hostPort = o.port;
  }

  const cmd = buildDockerCmd(o);
  if (o.verbose) console.error("docker cmd:\n", cmd.join(" "));

  // Display starting message with URL
  if (!o.noNetwork) {
    console.log(`\n🚀 Starting hotbox...`);
    console.log(`📦 Container starting with sandboxed environment`);
    console.log(`\n🔗 Your app will be available at:`);
    console.log(`   \x1b[36mhttp://localhost:${hostPort}\x1b[0m`);
    console.log(`\n⏳ Starting server (may take a moment to install dependencies)...`);
    console.log(`   Press Ctrl+C to stop the container\n`);
  } else {
    console.log(`\n🔒 Starting hotbox in air-gapped mode (no network)...`);
    console.log(`   Press Ctrl+C to stop the container\n`);
  }

  const p = Bun.spawn(cmd, { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
  const code = await p.exited;
  process.exit(code);
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});