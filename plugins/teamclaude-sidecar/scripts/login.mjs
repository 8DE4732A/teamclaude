#!/usr/bin/env node
// login.mjs – Opens browser for Auth0 login, receives JWT via local callback server,
// and saves token to ~/.teamclaude/token. Usage: node login.mjs [--server URL]

import { createServer } from 'node:http';
import { writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { exec } from 'node:child_process';

const DEFAULT_PORT = 9876;

function getServerUrl() {
  const idx = process.argv.indexOf('--server');
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1].replace(/\/+$/, '');
  }
  const envUrl = process.env.SIDECAR_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');
  return null;
}

function openBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

function getTokenPath() {
  return process.env.SIDECAR_TOKEN_FILE || join(homedir(), '.teamclaude', 'token');
}

async function saveToken(token) {
  const tokenPath = getTokenPath();
  await mkdir(dirname(tokenPath), { recursive: true });
  await writeFile(tokenPath, token, { encoding: 'utf8', mode: 0o600 });
  return tokenPath;
}

async function main() {
  const serverUrl = getServerUrl();
  if (!serverUrl) {
    console.error(
      'Error: Server URL not set. Use --server <URL> or set SIDECAR_API_BASE_URL.',
    );
    process.exit(1);
  }

  const port = DEFAULT_PORT;
  const loginUrl = `${serverUrl}/auth/cli?port=${port}`;

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Login timed out after 120 seconds'));
    }, 120_000);

    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);

      if (url.pathname === '/callback') {
        const token = url.searchParams.get('token');

        if (token) {
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
          res.end(
            '<html><body><h2>Login successful!</h2><p>You can close this tab and return to your terminal.</p></body></html>',
          );
          clearTimeout(timeout);
          server.close();
          resolve(token);
        } else {
          res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' });
          res.end('<html><body><h2>Login failed</h2><p>No token received.</p></body></html>');
          clearTimeout(timeout);
          server.close();
          reject(new Error('No token in callback'));
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`Waiting for login callback on http://127.0.0.1:${port} ...`);
      console.log(`Opening browser: ${loginUrl}`);
      openBrowser(loginUrl);
    });

    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  const tokenPath = await saveToken(result);
  console.log(`Token saved to ${tokenPath}`);
  console.log('Login complete. You can now use the plugin with just SIDECAR_API_BASE_URL.');
}

main().catch((err) => {
  console.error(`Login failed: ${err.message}`);
  process.exit(1);
});
