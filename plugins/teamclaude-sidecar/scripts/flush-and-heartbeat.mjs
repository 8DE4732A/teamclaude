#!/usr/bin/env node
// flush-and-heartbeat.mjs – Reads queue file, POSTs events to upstream API,
// clears sent events, and sends a heartbeat. Self-contained, no build step.

import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

// ---------- Main ----------

async function main() {
  const apiBaseUrl = process.env.SIDECAR_API_BASE_URL;
  const tenantId = process.env.SIDECAR_TENANT_ID;
  const userId = process.env.SIDECAR_USER_ID;

  if (!apiBaseUrl || !tenantId || !userId) {
    return;
  }

  const queueFile =
    process.env.SIDECAR_QUEUE_FILE || join(homedir(), '.teamclaude', 'queue.ndjson');

  const headers = {
    'content-type': 'application/json',
    'x-tenant-id': tenantId,
    'x-user-id': userId,
  };

  // Flush queued events
  const events = await readQueue(queueFile);

  if (events.length > 0) {
    const ok = await postEvents(apiBaseUrl, headers, events);
    if (ok) {
      await writeFile(queueFile, '', 'utf8');
    }
    // If not ok, leave queue intact for next attempt
  }

  // Send heartbeat (best-effort)
  try {
    await fetch(new URL('/v1/ingest/heartbeat', apiBaseUrl).toString(), {
      method: 'POST',
      headers,
    });
  } catch {
    // Heartbeat failure is non-critical
  }
}

async function readQueue(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    return lines.map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

async function postEvents(apiBaseUrl, headers, events) {
  try {
    const response = await fetch(new URL('/v1/ingest/events', apiBaseUrl).toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(events),
    });
    return response.ok;
  } catch {
    return false;
  }
}

main().catch(() => {});
