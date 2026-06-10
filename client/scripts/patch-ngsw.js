#!/usr/bin/env node
/**
 * Post-build patch for ngsw-worker.js.
 *
 * Angular bug (angular/angular #45377, unfixed as of v21): skipWaiting() fires
 * immediately on install, before prefetch assets are cached. If the network
 * drops mid-activation the new SW activates with an incomplete cache, causing
 * navigation requests to 504 instead of serving the previously-cached version.
 *
 * Fix: wrap skipWaiting() so it only fires after initializeFully() resolves.
 *
 * Usage: node scripts/patch-ngsw.js [dist-path]
 * Default dist-path: dist/angular-momentum/browser
 */

const fs = require('fs');
const path = require('path');

const distPath = process.argv[2] || 'dist/angular-momentum/browser';
const workerPath = path.join(distPath, 'ngsw-worker.js');

if (!fs.existsSync(workerPath)) {
  console.error(`[patch-ngsw] ngsw-worker.js not found at: ${workerPath}`);
  process.exit(1);
}

const original = fs.readFileSync(workerPath, 'utf8');

const BEFORE = `event.waitUntil(this.scope.skipWaiting());`;
const AFTER = `event.waitUntil((async () => {
  try {
    const manifest = await this.fetchLatestManifest();
    const hash = hashManifest(manifest);
    if (!this.versions.has(hash)) {
      this.versions.set(hash, new AppVersion(this.scope, this.adapter, this.db, this.idle, this.debugger, manifest, hash));
    }
    await this.versions.get(hash).initializeFully();
  } catch(e) {
    this.debugger.log(e, "install: initializeFully");
  }
  await this.scope.skipWaiting();
})());`;

if (!original.includes(BEFORE)) {
  console.warn(`[patch-ngsw] WARNING: patch target not found in ngsw-worker.js — Angular may have changed the generated output. Skipping patch.`);
  process.exit(0);
}

const patched = original.replace(BEFORE, AFTER);
fs.writeFileSync(workerPath, patched, 'utf8');
console.log('[patch-ngsw] Successfully patched ngsw-worker.js: skipWaiting deferred until initializeFully');
