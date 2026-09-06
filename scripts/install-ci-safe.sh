#!/usr/bin/env bash
set -euo pipefail

# Reuse an already healthy dependency bundle when the hosting platform provides
# one. Clean environments reconcile package.json with the lockfile so direct
# production dependencies such as react-router cannot be silently omitted by a
# stale lock-only install.
if [[ -x node_modules/.bin/vite ]] \
  && [[ -x node_modules/.bin/tsc ]] \
  && node_modules/.bin/vite --version >/dev/null 2>&1 \
  && node_modules/.bin/tsc --version >/dev/null 2>&1 \
  && node -e "require('react')" >/dev/null 2>&1 \
  && node -e "require.resolve('react-router/package.json')" >/dev/null 2>&1; then
  echo "Using verified existing dependencies."
  exit 0
fi

npm install --no-audit --no-fund
