#!/usr/bin/env node
// handle-hook.mjs – Reads Claude Code hook JSON from stdin, maps to a SidecarEvent,
// and appends it to a NDJSON queue file. No network I/O. Target: <50ms.
//
// Config: needs SIDECAR_TENANT_ID (header auth) OR a token file (Bearer auth).
// When using token auth, tenantId/userId are extracted server-side from JWT.

import { createHash, randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

// ---------- Event mapping (inlined from event-mapper.ts) ----------

const TOOL_EVENT_MAP = {
  Bash: 'command',
  Edit: 'codegen',
  Write: 'codegen',
};

function mapHook(input) {
  const { session_id, cwd, hook_event_name, tool_name } = input;

  let eventType;
  if (hook_event_name === 'UserPromptSubmit') {
    eventType = 'chat';
  } else if (hook_event_name === 'PostToolUse' && tool_name && TOOL_EVENT_MAP[tool_name]) {
    eventType = TOOL_EVENT_MAP[tool_name];
  } else {
    return null;
  }

  return {
    eventId: `${session_id}:${randomUUID()}`,
    eventType,
    ts: new Date().toISOString(),
    projectHash: createHash('sha256').update(cwd || '').digest('hex'),
  };
}

// ---------- Stdin reader ----------

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data.trim()));
    process.stdin.on('error', () => resolve(''));
    // If stdin is a TTY or not piped, resolve immediately
    if (process.stdin.isTTY) {
      resolve('');
    }
  });
}

// ---------- Token file check ----------

async function hasTokenFile() {
  const tokenPath =
    process.env.SIDECAR_TOKEN_FILE || join(homedir(), '.teamclaude', 'token');
  try {
    const content = await readFile(tokenPath, 'utf8');
    return content.trim().length > 0;
  } catch {
    return false;
  }
}

// ---------- Main ----------

async function main() {
  const tenantId = process.env.SIDECAR_TENANT_ID;
  const userId = process.env.SIDECAR_USER_ID;
  const tokenExists = await hasTokenFile();

  // Need either a token file or tenantId for auth
  if (!tenantId && !tokenExists) {
    return;
  }

  const raw = await readStdin();
  if (!raw) {
    return;
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return;
  }

  const event = mapHook(input);
  if (!event) {
    return;
  }

  // When using header auth, embed tenantId/userId in the event.
  // When using token auth, server extracts these from JWT — but we still
  // include them if available for offline queue consistency.
  if (tenantId) {
    event.tenantId = tenantId;
  }
  if (userId) {
    event.userId = userId;
  }

  const queueFile =
    process.env.SIDECAR_QUEUE_FILE || join(homedir(), '.teamclaude', 'queue.ndjson');

  await mkdir(dirname(queueFile), { recursive: true });
  await appendFile(queueFile, JSON.stringify(event) + '\n', 'utf8');
}

main().catch(() => {});
