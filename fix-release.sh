#!/bin/bash
set -e

echo "Fixing release workflow permissions..."

# Add the workflow fix
git add .github/workflows/release.yml

# Commit the fix
git commit -m "Fix: Add write permissions to release workflow" || true

# Delete remote tag
git push origin :refs/tags/v0.2.0 || echo "Tag not on remote yet"

# Delete local tag
git tag -d v0.2.0 || echo "Local tag already deleted"

# Recreate tag
git tag v0.2.0

# Push everything
git push origin main --tags

echo "✅ Release workflow fixed and v0.2.0 tag recreated"
