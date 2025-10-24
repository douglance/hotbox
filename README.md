# safenode

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
npm install -g safenode
# or
yarn global add safenode
# or
pnpm add -g safenode
```

## Usage

```bash
# Run with auto-detected port (app's PORT env or 3000)
safenode

# Use a specific port (same on host and container)
safenode -p 8080

# Map different ports (host:container)
safenode -p 9000:3000

# No network (air-gapped)
safenode -n

# Custom resource limits
safenode --mem 1g --cpus 1.0 --pids 150

# Allow write access (e.g., for codegen)
safenode --rw

# Custom Docker image
safenode -i node:22-alpine

# Pass environment variables
safenode --env API_KEY=secret --env DEBUG=true

# See all options
safenode --help
```

## How It Works

1. **Mounts your project read-only** into a Docker container (toggle with `--rw`)
2. **Isolates node_modules** in an ephemeral Docker volume
3. **Installs dependencies** using `ni` (auto-detects npm/pnpm/yarn/bun)
4. **Runs your project** via `ni start` → `ni dev` → `node index.js` fallback
5. **Applies security hardening**:
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

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port` | Port number or host:container mapping | Auto-detect (app's port) |
| `-n, --no-network` | Disable networking | `false` |
| `--mem` | Memory limit | `512m` |
| `--cpus` | CPU cores limit | `0.5` |
| `--pids` | Process IDs limit | `200` |
| `-i, --image` | Docker base image | `node:20-alpine` |
| `--env` | Environment variables (repeatable) | - |
| `--rw` | Mount project read-write | `false` (read-only) |
| `--verbose` | Show Docker command | `false` |
| `-h, --help` | Show help | - |

### Port Behavior

- **No flag**: Uses app's default port (reads `PORT` env or defaults to 3000)
- **`-p 8080`**: Runs on port 8080 (both host and container)
- **`-p 9000:3000`**: Maps host port 9000 to container port 3000

## Development

### Prerequisites

- Bun 1.1.0+ (for building)
- Docker (for running)

### Building Locally

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Clone and build
git clone https://github.com/your-org/safenode
cd safenode
bun install
bun run build
```

### Testing

```bash
# Test the CLI locally
bun run dev

# Build and test the binary
bun run build
./bin/safenode --help
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
safenode (your machine)
    ↓
docker run (hardened container)
    ↓
ni install (auto-detect package manager)
    ↓
ni start/dev (run your project)
```

## Comparison

| Feature | safenode | Direct `node` | Docker manually |
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

- Issues: [GitHub Issues](https://github.com/your-org/safenode/issues)
- Discussions: [GitHub Discussions](https://github.com/your-org/safenode/discussions)