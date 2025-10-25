#!/bin/bash
set -e

rm -f .git/index.lock

git commit -m "Add security hardening v0.2.0" && \
git tag v0.2.0 && \
git push origin main --tags && \
echo "✅ Successfully published v0.2.0"
