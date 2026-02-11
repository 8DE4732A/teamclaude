import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SCRIPT_PATH = join(import.meta.dirname, 'handle-hook.mjs');

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
  input: Record<string, unknown>,
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

    cp.stdin.write(JSON.stringify(input));
    cp.stdin.end();
  });
}

describe('handle-hook.mjs', () => {
  it('appends a command event for PostToolUse Bash', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hook-test-'));
    const queueFile = join(dir, 'queue.ndjson');

    try {
      await runScript(
        { session_id: 's1', cwd: '/tmp/project', hook_event_name: 'PostToolUse', tool_name: 'Bash' },
        { SIDECAR_TENANT_ID: 't1', SIDECAR_USER_ID: 'u1', SIDECAR_QUEUE_FILE: queueFile },
      );

      const content = await readFile(queueFile, 'utf8');
      const event = JSON.parse(content.trim());
      expect(event.eventType).toBe('command');
      expect(event.tenantId).toBe('t1');
      expect(event.userId).toBe('u1');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('appends a codegen event for PostToolUse Write', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hook-test-'));
    const queueFile = join(dir, 'queue.ndjson');

    try {
      await runScript(
        { session_id: 's1', cwd: '/tmp/project', hook_event_name: 'PostToolUse', tool_name: 'Write' },
        { SIDECAR_TENANT_ID: 't1', SIDECAR_USER_ID: 'u1', SIDECAR_QUEUE_FILE: queueFile },
      );

      const content = await readFile(queueFile, 'utf8');
      const event = JSON.parse(content.trim());
      expect(event.eventType).toBe('codegen');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('appends a chat event for UserPromptSubmit', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hook-test-'));
    const queueFile = join(dir, 'queue.ndjson');

    try {
      await runScript(
        { session_id: 's1', cwd: '/tmp/project', hook_event_name: 'UserPromptSubmit' },
        { SIDECAR_TENANT_ID: 't1', SIDECAR_USER_ID: 'u1', SIDECAR_QUEUE_FILE: queueFile },
      );

      const content = await readFile(queueFile, 'utf8');
      const event = JSON.parse(content.trim());
      expect(event.eventType).toBe('chat');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('exits silently when SIDECAR_TENANT_ID is not set', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hook-test-'));
    const queueFile = join(dir, 'queue.ndjson');

    try {
      const result = await runScript(
        { session_id: 's1', cwd: '/tmp', hook_event_name: 'PostToolUse', tool_name: 'Bash' },
        { SIDECAR_USER_ID: 'u1', SIDECAR_QUEUE_FILE: queueFile },
      );

      expect(result.exitCode).toBe(0);
      await expect(readFile(queueFile, 'utf8')).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('exits silently for unrecognized hook events', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hook-test-'));
    const queueFile = join(dir, 'queue.ndjson');

    try {
      const result = await runScript(
        { session_id: 's1', cwd: '/tmp', hook_event_name: 'SessionStart' },
        { SIDECAR_TENANT_ID: 't1', SIDECAR_USER_ID: 'u1', SIDECAR_QUEUE_FILE: queueFile },
      );

      expect(result.exitCode).toBe(0);
      await expect(readFile(queueFile, 'utf8')).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('auto-creates queue directory if it does not exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hook-test-'));
    const queueFile = join(dir, 'nested', 'deep', 'queue.ndjson');

    try {
      await runScript(
        { session_id: 's1', cwd: '/tmp', hook_event_name: 'UserPromptSubmit' },
        { SIDECAR_TENANT_ID: 't1', SIDECAR_USER_ID: 'u1', SIDECAR_QUEUE_FILE: queueFile },
      );

      const content = await readFile(queueFile, 'utf8');
      expect(content.trim().length).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('writes valid NDJSON that can be parsed line by line', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hook-test-'));
    const queueFile = join(dir, 'queue.ndjson');

    try {
      await runScript(
        { session_id: 's1', cwd: '/tmp', hook_event_name: 'PostToolUse', tool_name: 'Bash' },
        { SIDECAR_TENANT_ID: 't1', SIDECAR_USER_ID: 'u1', SIDECAR_QUEUE_FILE: queueFile },
      );
      await runScript(
        { session_id: 's2', cwd: '/tmp', hook_event_name: 'UserPromptSubmit' },
        { SIDECAR_TENANT_ID: 't1', SIDECAR_USER_ID: 'u1', SIDECAR_QUEUE_FILE: queueFile },
      );

      const content = await readFile(queueFile, 'utf8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(2);
      lines.forEach((line) => expect(() => JSON.parse(line)).not.toThrow());
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('does not include prompt or tool_input in queued events', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hook-test-'));
    const queueFile = join(dir, 'queue.ndjson');

    try {
      await runScript(
        {
          session_id: 's1',
          cwd: '/tmp',
          hook_event_name: 'PostToolUse',
          tool_name: 'Bash',
          tool_input: 'secret command',
          tool_response: 'secret output',
          prompt: 'secret prompt',
        },
        { SIDECAR_TENANT_ID: 't1', SIDECAR_USER_ID: 'u1', SIDECAR_QUEUE_FILE: queueFile },
      );

      const content = await readFile(queueFile, 'utf8');
      expect(content).not.toContain('secret command');
      expect(content).not.toContain('secret output');
      expect(content).not.toContain('secret prompt');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
