---
name: login
description: Login to TeamClaude server to get a CLI token for plugin authentication
disable-model-invocation: false
allowed-tools: Bash(node *)
argument-hint: "[--server URL]"
---

Run the TeamClaude login script to authenticate this CLI plugin with the server.

The script will:
1. Start a temporary local HTTP server
2. Open the browser for Auth0 login
3. Save the received JWT token to `~/.teamclaude/token`

Execute:
```bash
node "$CLAUDE_PLUGIN_DIR/scripts/login.mjs" $ARGUMENTS
```

After login succeeds, confirm to the user that authentication is complete and the plugin will use the saved token automatically for all future requests. Only `SIDECAR_API_BASE_URL` environment variable is needed going forward.

If the user hasn't set `SIDECAR_API_BASE_URL`, remind them to add it to their shell profile:
```bash
export SIDECAR_API_BASE_URL="https://your-server.com"
```
