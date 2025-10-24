#!/bin/bash

# Demo script showing safenode usage

echo "=== Safenode Demo ==="
echo ""
echo "This script demonstrates how to use safenode to run Node.js projects safely in Docker."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed. Visit https://docker.com"
    exit 1
fi
echo "✅ Docker is installed"

if [ ! -f "./bin/safenode" ]; then
    echo "❌ safenode binary not found. Run 'bun install' first."
    exit 1
fi
echo "✅ safenode binary found"
echo ""

# Show help
echo -e "${GREEN}1. Viewing help:${NC}"
echo "$ ./bin/safenode --help"
./bin/safenode --help
echo ""

# Demo running the example app
echo -e "${GREEN}2. Running example app:${NC}"
echo "$ cd example"
echo "$ ../bin/safenode        # Auto-detect port (3000)"
echo "$ ../bin/safenode -p 8080  # Run on port 8080"
echo ""
echo "This will:"
echo "  - Mount the example/ project read-only in Docker"
echo "  - Install dependencies automatically"
echo "  - Run the app on the specified port (or auto-detect)"
echo "  - Apply security hardening (dropped caps, resource limits, etc.)"
echo ""

echo -e "${GREEN}3. Running with custom resource limits:${NC}"
echo "$ ../bin/safenode --mem 1g --cpus 1.0 --pids 150"
echo ""

echo -e "${GREEN}4. Running in air-gapped mode (no network):${NC}"
echo "$ ../bin/safenode --no-network"
echo ""

echo -e "${GREEN}5. Running with write access (for codegen):${NC}"
echo "$ ../bin/safenode --rw"
echo ""

echo -e "${GREEN}6. Using verbose mode to see Docker command:${NC}"
echo "$ ../bin/safenode --verbose"
echo ""

echo -e "${BLUE}Try it yourself:${NC}"
echo "$ cd example && ../bin/safenode"
echo ""
echo "Then open http://localhost:3000 in your browser!"
echo ""
echo "Or specify a different port:"
echo "$ cd example && ../bin/safenode -p 8080"
echo "Then open http://localhost:8080 in your browser!"