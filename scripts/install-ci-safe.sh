#!/usr/bin/env bash
set -euo pipefail

# Sites checkouts can already contain a complete dependency bundle. Reuse it
# when it is healthy; clean build environments still get a locked npm install.
if [[ -x node_modules/.bin/vite ]] \
  && [[ -x node_modules/.bin/tsc ]] \
  && node_modules/.bin/vite --version >/dev/null 2>&1 \
  && node_modules/.bin/tsc --version >/dev/null 2>&1 \
  && node -e "require('react')" >/dev/null 2>&1; then
  echo "Using verified existing dependencies."
  exit 0
fi

npm ci --no-audit --no-fund --cache "${TMPDIR:-/tmp}/css-vista-npm-cache"
