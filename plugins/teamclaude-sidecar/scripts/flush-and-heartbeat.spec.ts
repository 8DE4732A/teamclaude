import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { AddressInfo } from 'node:net';

import { describe, expect, it, afterEach } from 'vitest';

const SCRIPT_PATH = join(import.meta.dirname, 'flush-and-heartbeat.mjs');

function buildEnv(overrides: Record<string, string>): NodeJS.ProcessEnv {
  const env = { ...process.env, ...overrides };
  for (const key of Object.keys(env)) {
    if (key.startsWith('SIDECAR_') && !(key in overrides)) {
      delete env[key];
    }
  }
  return env;
}

function runScript(
  envOverrides: Record<string, string>,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const cp = spawn('node', [SCRIPT_PATH], {
      env: buildEnv(envOverrides),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    cp.stdout.on('data', (d) => {
      stdout += d;
    });
    cp.stderr.on('data', (d) => {
      stderr += d;
    });

    cp.on('close', (code) => {
      resolve({ exitCode: code ?? 0, stdout, stderr });
    });

    // Close stdin immediately — this script doesn't read stdin
    cp.stdin.end();
  });
}

interface MockServerOptions {
  statusCode?: number;
}

function createMockServer(
  options: MockServerOptions = {},
): Promise<{
  url: string;
  requests: Array<{ method: string; url: string; body: string; headers: Record<string, string | string[] | undefined> }>;
  close: () => Promise<void>;
}> {
  const { statusCode = 200 } = options;
  const requests: Array<{ method: string; url: string; body: string; headers: Record<string, string | string[] | undefined> }> = [];

  return new Promise((resolve) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        requests.push({
          method: req.method ?? '',
          url: req.url ?? '',
          body,
          headers: req.headers as Record<string, string | string[] | undefined>,
        });
        res.writeHead(statusCode, { 'content-type': 'application/json' });
        res.end('{}');
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        requests,
        close: () => new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}

describe('flush-and-heartbeat.mjs', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const fn of cleanups) {
      await fn();
    }
    cleanups.length = 0;
  });

  it('sends queued events to /v1/ingest/events and clears queue', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'flush-test-'));
    cleanups.push(() => rm(dir, { recursive: true, force: true }));

    const queueFile = join(dir, 'queue.ndjson');
    await writeFile(
      queueFile,
      '{"eventId":"e1","eventType":"command"}\n{"eventId":"e2","eventType":"chat"}\n',
      'utf8',
    );

    const server = await createMockServer();
    cleanups.push(() => server.close());

    await runScript({
      SIDECAR_API_BASE_URL: server.url,
      SIDECAR_TENANT_ID: 't1',
      SIDECAR_USER_ID: 'u1',
      SIDECAR_QUEUE_FILE: queueFile,
    });

    // Should have posted to events endpoint
    const eventRequests = server.requests.filter((r) => r.url === '/v1/ingest/events');
    expect(eventRequests.length).toBe(1);
    const sentEvents = JSON.parse(eventRequests[0].body);
    expect(sentEvents).toHaveLength(2);
    expect(sentEvents[0].eventId).toBe('e1');
    expect(sentEvents[1].eventId).toBe('e2');

    // Should have sent heartbeat
    const heartbeatRequests = server.requests.filter((r) => r.url === '/v1/ingest/heartbeat');
    expect(heartbeatRequests.length).toBe(1);

    // Queue should be empty
    const remaining = await readFile(queueFile, 'utf8');
    expect(remaining.trim()).toBe('');
  });

  it('sends heartbeat', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'flush-test-'));
    cleanups.push(() => rm(dir, { recursive: true, force: true }));

    const queueFile = join(dir, 'queue.ndjson');
    // Empty queue file
    await writeFile(queueFile, '', 'utf8');

    const server = await createMockServer();
    cleanups.push(() => server.close());

    await runScript({
      SIDECAR_API_BASE_URL: server.url,
      SIDECAR_TENANT_ID: 't1',
      SIDECAR_USER_ID: 'u1',
      SIDECAR_QUEUE_FILE: queueFile,
    });

    const heartbeatRequests = server.requests.filter((r) => r.url === '/v1/ingest/heartbeat');
    expect(heartbeatRequests.length).toBe(1);
  });

  it('retains events when server returns 5xx', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'flush-test-'));
    cleanups.push(() => rm(dir, { recursive: true, force: true }));

    const queueFile = join(dir, 'queue.ndjson');
    await writeFile(queueFile, '{"eventId":"e1","eventType":"command"}\n', 'utf8');

    const server = await createMockServer({ statusCode: 503 });
    cleanups.push(() => server.close());

    await runScript({
      SIDECAR_API_BASE_URL: server.url,
      SIDECAR_TENANT_ID: 't1',
      SIDECAR_USER_ID: 'u1',
      SIDECAR_QUEUE_FILE: queueFile,
    });

    // Queue should still have the event
    const remaining = await readFile(queueFile, 'utf8');
    expect(remaining.trim()).toBe('{"eventId":"e1","eventType":"command"}');
  });

  it('exits silently when not configured', async () => {
    const result = await runScript({});
    expect(result.exitCode).toBe(0);
  });

  it('handles empty queue gracefully', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'flush-test-'));
    cleanups.push(() => rm(dir, { recursive: true, force: true }));

    const queueFile = join(dir, 'queue.ndjson');
    // No file exists at all

    const server = await createMockServer();
    cleanups.push(() => server.close());

    const result = await runScript({
      SIDECAR_API_BASE_URL: server.url,
      SIDECAR_TENANT_ID: 't1',
      SIDECAR_USER_ID: 'u1',
      SIDECAR_QUEUE_FILE: queueFile,
    });

    expect(result.exitCode).toBe(0);

    // Only heartbeat should have been sent
    const heartbeatRequests = server.requests.filter((r) => r.url === '/v1/ingest/heartbeat');
    expect(heartbeatRequests.length).toBe(1);
    const eventRequests = server.requests.filter((r) => r.url === '/v1/ingest/events');
    expect(eventRequests.length).toBe(0);
  });

  // ── Bearer token auth tests ──────────────────────────────────────

  it('sends Authorization: Bearer header when token file exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'flush-test-'));
    cleanups.push(() => rm(dir, { recursive: true, force: true }));

    const queueFile = join(dir, 'queue.ndjson');
    await writeFile(queueFile, '{"eventId":"e1","eventType":"command"}\n', 'utf8');

    const tokenFile = join(dir, 'token');
    await writeFile(tokenFile, 'my-jwt-token-123', 'utf8');

    const server = await createMockServer();
    cleanups.push(() => server.close());

    await runScript({
      SIDECAR_API_BASE_URL: server.url,
      SIDECAR_QUEUE_FILE: queueFile,
      SIDECAR_TOKEN_FILE: tokenFile,
    });

    // Should have posted with Bearer header
    const eventRequests = server.requests.filter((r) => r.url === '/v1/ingest/events');
    expect(eventRequests.length).toBe(1);
    expect(eventRequests[0].headers['authorization']).toBe('Bearer my-jwt-token-123');
    // Should NOT have x-tenant-id/x-user-id
    expect(eventRequests[0].headers['x-tenant-id']).toBeUndefined();
    expect(eventRequests[0].headers['x-user-id']).toBeUndefined();

    // Heartbeat should also use Bearer
    const heartbeatRequests = server.requests.filter((r) => r.url === '/v1/ingest/heartbeat');
    expect(heartbeatRequests.length).toBe(1);
    expect(heartbeatRequests[0].headers['authorization']).toBe('Bearer my-jwt-token-123');
  });

  it('prefers token file over header env vars', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'flush-test-'));
    cleanups.push(() => rm(dir, { recursive: true, force: true }));

    const queueFile = join(dir, 'queue.ndjson');
    await writeFile(queueFile, '{"eventId":"e1","eventType":"command"}\n', 'utf8');

    const tokenFile = join(dir, 'token');
    await writeFile(tokenFile, 'my-jwt-token', 'utf8');

    const server = await createMockServer();
    cleanups.push(() => server.close());

    await runScript({
      SIDECAR_API_BASE_URL: server.url,
      SIDECAR_TENANT_ID: 't1',
      SIDECAR_USER_ID: 'u1',
      SIDECAR_QUEUE_FILE: queueFile,
      SIDECAR_TOKEN_FILE: tokenFile,
    });

    const eventRequests = server.requests.filter((r) => r.url === '/v1/ingest/events');
    expect(eventRequests.length).toBe(1);
    // Token takes priority
    expect(eventRequests[0].headers['authorization']).toBe('Bearer my-jwt-token');
    expect(eventRequests[0].headers['x-tenant-id']).toBeUndefined();
  });

  it('falls back to header auth when no token file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'flush-test-'));
    cleanups.push(() => rm(dir, { recursive: true, force: true }));

    const queueFile = join(dir, 'queue.ndjson');
    await writeFile(queueFile, '{"eventId":"e1","eventType":"command"}\n', 'utf8');

    const tokenFile = join(dir, 'no-such-token');

    const server = await createMockServer();
    cleanups.push(() => server.close());

    await runScript({
      SIDECAR_API_BASE_URL: server.url,
      SIDECAR_TENANT_ID: 't1',
      SIDECAR_USER_ID: 'u1',
      SIDECAR_QUEUE_FILE: queueFile,
      SIDECAR_TOKEN_FILE: tokenFile,
    });

    const eventRequests = server.requests.filter((r) => r.url === '/v1/ingest/events');
    expect(eventRequests.length).toBe(1);
    expect(eventRequests[0].headers['x-tenant-id']).toBe('t1');
    expect(eventRequests[0].headers['x-user-id']).toBe('u1');
    expect(eventRequests[0].headers['authorization']).toBeUndefined();
  });

  it('exits silently when only API URL set (no token, no headers)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'flush-test-'));
    cleanups.push(() => rm(dir, { recursive: true, force: true }));

    const tokenFile = join(dir, 'no-such-token');

    const result = await runScript({
      SIDECAR_API_BASE_URL: 'http://localhost:9999',
      SIDECAR_TOKEN_FILE: tokenFile,
    });

    expect(result.exitCode).toBe(0);
  });
});
