#!/usr/bin/env node
/**
 * Heroku web-dyno supervisor.
 *
 * Runs the API server and the SSR server as child processes and ties their
 * fates together, because Heroku only watches THIS process:
 *
 * - The API is started first and the SSR server only after the API answers
 *   its health check (replaces the old `sleep 3` race).
 * - If either child exits for any reason, the other is stopped and the
 *   supervisor exits non-zero, so Heroku restarts the whole dyno instead of
 *   serving an app whose API is silently dead.
 * - SIGTERM/SIGINT (dyno cycling, deploys) are forwarded to both children
 *   for a graceful shutdown, with a kill escalation after a grace period.
 *
 * The API runs from server/ (it resolves the client dist via process.cwd())
 * and the SSR server from the repo root, matching the old Procfile.
 */

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const API_PORT = process.env.API_PORT || '4201';
const API_HEALTH_URL = `http://127.0.0.1:${API_PORT}/api/health`;
const API_BOOT_TIMEOUT_MS = 60_000;
const SHUTDOWN_GRACE_MS = 10_000;

const children = new Set();
let shuttingDown = false;

function log(message) {
  console.log(`[supervisor] ${message}`);
}

function launch(name, args, options) {
  const child = spawn('node', args, {
    stdio: 'inherit',
    ...options,
    env: { ...process.env, ...options.env },
  });
  children.add(child);
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;
    // A dead child means a broken dyno; exit non-zero so Heroku restarts it.
    log(`${name} exited unexpectedly (code=${code}, signal=${signal})`);
    shutdown(1);
  });
  log(`started ${name} (pid ${child.pid})`);
  return child;
}

async function waitForApiHealthy() {
  const deadline = Date.now() + API_BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (shuttingDown) return false;
    try {
      const response = await fetch(API_HEALTH_URL);
      if (response.ok) return true;
    } catch {
      // API not listening yet — keep polling.
    }
    await delay(250);
  }
  return false;
}

async function shutdown(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill('SIGTERM');
  const deadline = Date.now() + SHUTDOWN_GRACE_MS;
  while (children.size > 0 && Date.now() < deadline) {
    await delay(100);
  }
  for (const child of children) child.kill('SIGKILL');
  process.exit(exitCode);
}

process.on('SIGTERM', () => {
  log('SIGTERM received, shutting down');
  shutdown(0);
});
process.on('SIGINT', () => {
  log('SIGINT received, shutting down');
  shutdown(0);
});

launch('api', ['build/server/index.js'], {
  cwd: path.join(repoRoot, 'server'),
  env: { API_PORT },
});

if (await waitForApiHealthy()) {
  log(`api healthy on port ${API_PORT}, starting ssr`);
  launch('ssr', ['client/dist/angular-momentum/server/server.mjs'], { cwd: repoRoot });
} else if (!shuttingDown) {
  log(`api did not become healthy within ${API_BOOT_TIMEOUT_MS}ms`);
  shutdown(1);
}
