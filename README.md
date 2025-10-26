# hotbox

<p align="center">
  <img src="logo.png" alt="hotbox logo" width="400"/>
</p>

Run any Node.js project safely in a hardened Docker sandbox with automatic package manager detection via `ni`.

## Features

- 🔒 **Security-first**: Read-only project mount, isolated dependencies, dropped capabilities
- 📦 **Package manager agnostic**: Uses `ni` to detect and work with npm/pnpm/yarn/bun
- 🚀 **Single binary**: Compiled Bun executable for fast startup
- 🌍 **Cross-platform**: Binaries for Linux, macOS, Windows (x64/arm64)
- 🛡️ **Resource limits**: CPU, memory, PIDs constraints
- 🔌 **Optional networking**: Air-gapped mode with `--no-network`

## Installation

```bash
npm install -g @douglance/hotbox
# or
yarn global add @douglance/hotbox
# or
pnpm add -g @douglance/hotbox
```

## Usage

```bash
# Run with auto-detected port (app's PORT env or 3000)
hotbox

# Use a specific port (same on host and container)
hotbox -p 8080

# Map different ports (host:container)
hotbox -p 9000:3000

# No network (air-gapped). Requires preinstalled node_modules in your project.
hotbox -n

# Paranoid mode (maximum security: no network, stricter limits)
hotbox --paranoid

# Custom resource limits
hotbox --mem 1g --cpus 1.0 --pids 150

# Allow write access (e.g., for codegen)
hotbox --rw

# Use specific Node version
hotbox --node-version 18

# Auto-detects Node 20 from package.json engines.node field
hotbox

# Custom Docker image (overrides version detection)
hotbox -i node:22-alpine

# Pass environment variables
hotbox --env API_KEY=secret --env DEBUG=true

# See all options
hotbox --help
```

## How It Works

1. **Mounts your project read-only** into a Docker container (toggle with `--rw`)
2. **Isolates node_modules** in an ephemeral Docker volume
3. **Auto-detects package manager** using `ni` from lockfiles:
   - `package-lock.json` → npm
   - `yarn.lock` → yarn
   - `pnpm-lock.yaml` → pnpm
   - `bun.lockb` → bun
4. **Installs dependencies** with detected package manager
5. **Runs your project** via `ni start` → `ni dev` → `node index.js` fallback
6. **Applies security hardening**:
   - Drops all Linux capabilities
   - Enables no-new-privileges
   - Sets resource limits (CPU/memory/PIDs)
   - Uses tmpfs for `/tmp`
   - Runs as non-root `node` user

## Security Features

| Feature | Description |
|---------|-------------|
| **Read-only mount** | Source code mounted as read-only by default |
| **Isolated deps** | `node_modules` in ephemeral Docker volume |
| **Dropped capabilities** | `--cap-drop ALL` removes all Linux capabilities |
| **No new privileges** | Prevents privilege escalation |
| **Resource limits** | CPU, memory, PIDs constraints |
| **Network isolation** | Optional `--no-network` for air-gapped execution |
| **Non-root user** | Runs as `node` user, not root |
| **Seccomp/AppArmor** | Supply `HOTBOX_SECCOMP`/`HOTBOX_APPARMOR` to enforce syscall/LSM policies |
| **Noexec tmpfs** | `noexec` everywhere except workdir to reduce RCE surface |
| **IPC/UTS isolation** | Container-level IPC and UTS namespaces |
| **ulimit controls** | File descriptor and process limits enforced |
| **Supply chain hardening** | SHA256 verification of binaries, pinned ni version |
| **Prototype pollution protection** | `NODE_OPTIONS=--disable-proto=throw` by default |
| **Alternative runtimes** | Support for gVisor/kata via `HOTBOX_RUNTIME` env var |

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port` | Port number or host:container mapping | Auto-detect (app's port) |
| `-n, --no-network` | Disable networking | `false` |
| `--paranoid` | Maximum security mode (no network, 256m RAM, 0.25 CPU, 100 PIDs) | `false` |
| `--mem` | Memory limit | `512m` |
| `--cpus` | CPU cores limit | `0.5` |
| `--pids` | Process IDs limit | `200` |
| `-i, --image` | Docker base image (overrides `--node-version`) | - |
| `--node-version` | Node.js major version (e.g., 18, 20, 22) | Auto-detect from `engines.node` or `22` |
| `--env` | Environment variables (repeatable) | - |
| `--rw` | Mount project read-write | `false` (read-only) |
| `--verbose` | Show Docker command | `false` |
| `-h, --help` | Show help | - |

### Port Behavior

- **No flag**: Uses app's default port (reads `PORT` env or defaults to 3000)
- **`-p 8080`**: Runs on port 8080 (both host and container)
- **`-p 9000:3000`**: Maps host port 9000 to container port 3000

### Node Version Detection

hotbox automatically selects the appropriate Node.js version:

1. **Explicit flag** (`--node-version 18`): Uses specified version
2. **Auto-detect from `package.json`**: Reads `engines.node` field
   - `"node": ">=20.0.0"` → Node 20
   - `"node": "^18.12.0"` → Node 18
   - `"node": "18.x"` → Node 18
3. **Default**: Falls back to Node 22 if no version specified or detected
4. **Custom image** (`--image`): Overrides all version detection

### Environment Variables

Advanced security and runtime configuration:

| Variable | Description | Example |
|----------|-------------|---------|
| `HOTBOX_ALLOW_RW` | Enable `--rw` flag | `HOTBOX_ALLOW_RW=1 hotbox --rw` |
| `HOTBOX_ALLOW_IMAGE` | Enable custom `--image` flag | `HOTBOX_ALLOW_IMAGE=1 hotbox -i alpine` |
| `HOTBOX_ALLOW_SHELL` | Enable `--shell-on-fail` flag | `HOTBOX_ALLOW_SHELL=1 hotbox --shell-on-fail` |
| `HOTBOX_SECCOMP` | Path to custom seccomp profile | `HOTBOX_SECCOMP=/path/to/profile.json` |
| `HOTBOX_APPARMOR` | AppArmor profile name | `HOTBOX_APPARMOR=docker-default` |
| `HOTBOX_RUNTIME` | Alternative container runtime | `HOTBOX_RUNTIME=runsc` (gVisor) |

## Development

### Prerequisites

- Bun 1.1.0+ (for building)
- Docker (for running)

### Building Locally

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Clone and build
git clone https://github.com/dl/hotbox
cd hotbox
bun install
bun run build
```

### Testing

```bash
# Test the CLI locally
bun run dev

# Build and test the binary
bun run build
./bin/hotbox --help
```

### Release Process

1. Update version in `package.json`
2. Commit and push changes
3. Create and push tag: `git tag v0.1.0 && git push --tags`
4. GitHub Actions will:
   - Build binaries for all platforms
   - Attach to GitHub release
   - Publish to npm

## Architecture

```
hotbox (your machine)
    ↓
docker run (hardened node:22-alpine container)
    ↓
copy source + lockfiles → /home/node/work
    ↓
ni (detects lockfile → npm/yarn/pnpm/bun)
    ↓
install dependencies with detected PM
    ↓
ni start/dev (run your project)
```

## Comparison

| Feature | hotbox | Direct `node` | Docker manually |
|---------|----------|---------------|-----------------|
| Zero-config | ✅ | ✅ | ❌ |
| Security isolation | ✅ | ❌ | ✅ |
| Package manager agnostic | ✅ | ❌ | ❌ |
| Resource limits | ✅ | ❌ | ✅ |
| Single binary | ✅ | ✅ | ❌ |

## License

MIT

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests if applicable
4. Submit a pull request

## Support

- Issues: [GitHub Issues](https://github.com/dl/hotbox/issues)
- Discussions: [GitHub Discussions](https://github.com/dl/hotbox/discussions)