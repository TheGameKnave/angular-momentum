#!/bin/bash
# This script runs after the Node buildpack via heroku-buildpack-run
# It removes large packages that are only needed during build

echo "🧹 Running post-build cleanup..."

rm -rf node_modules/mermaid \
  node_modules/@rolldown \
  node_modules/vite \
  node_modules/@babel \
  node_modules/@schematics \
  node_modules/esbuild-wasm \
  node_modules/cytoscape* \
  node_modules/lightningcss-* \
  node_modules/@esbuild \
  node_modules/webpack \
  node_modules/@modelcontextprotocol \
  node_modules/emoji-toolkit \
  node_modules/sass \
  node_modules/zod-to-json-schema \
  node_modules/@lmdb

echo "✅ Cleanup complete"
