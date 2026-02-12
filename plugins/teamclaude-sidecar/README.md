# TeamClaude Sidecar — Claude Code Plugin

Automatically reports coding activity from Claude Code sessions to your TeamClaude server.

## Prerequisites

- Node.js 18+
- A running TeamClaude server instance

## Quick Setup (Token Auth — Recommended)

Only one environment variable needed:

```bash
export SIDECAR_API_BASE_URL="https://your-server.com"
```

Then login via the slash command in Claude Code:

```
/teamclaude-sidecar:login
```

This opens your browser for Auth0 login and saves a JWT token to `~/.teamclaude/token`. After that, the plugin authenticates automatically — no `SIDECAR_TENANT_ID` or `SIDECAR_USER_ID` needed.

To re-authenticate or switch users, run `/teamclaude-sidecar:login` again.

## Alternative Setup (Header Auth)

If you prefer not to use token auth, set all three environment variables:

| Variable | Required | Description | Default |
|---|---|---|---|
| `SIDECAR_API_BASE_URL` | Yes | TeamClaude server URL | — |
| `SIDECAR_TENANT_ID` | Yes | Your organization identifier | — |
| `SIDECAR_USER_ID` | Yes | Your user identifier | — |
| `SIDECAR_QUEUE_FILE` | No | Path to the offline queue file | `~/.teamclaude/queue.ndjson` |
| `SIDECAR_TOKEN_FILE` | No | Path to the JWT token file | `~/.teamclaude/token` |

Add these to `~/.zshrc` or `~/.bashrc`:

```bash
export SIDECAR_API_BASE_URL="https://your-server.com"
export SIDECAR_TENANT_ID="your-org"
export SIDECAR_USER_ID="your-name"
```

## Installation

### Option A: Marketplace (Recommended)

```bash
# Add the marketplace (one-time)
/plugin marketplace add https://github.com/<owner>/teamclaude.git

# Install the plugin
/plugin install teamclaude-sidecar
```

### Option B: CLI (direct)

```bash
claude plugin add /path/to/plugins/teamclaude-sidecar
```

### Option C: Manual

Edit `~/.claude/settings.json`:

```json
{
  "enabledPlugins": ["/path/to/plugins/teamclaude-sidecar"]
}
```

## How It Works

The plugin registers Claude Code hooks that fire on coding activity:

| Hook | Trigger | Event Type |
|---|---|---|
| `PostToolUse` (Bash) | Shell command executed | `command` |
| `PostToolUse` (Edit/Write) | File modified | `codegen` |
| `UserPromptSubmit` | User sends a prompt | `chat` |
| `SessionStart` | Session begins | flush + heartbeat |
| `Stop` | Task completes | flush + heartbeat |
| `SessionEnd` | Session ends | flush |

**Privacy**: Only metadata is collected (event type, timestamp, project hash). No prompts, code, or command content is ever transmitted.

### Architecture

Three scripts handle all work:

- **`login.mjs`** — One-time login. Opens browser for Auth0 auth, receives JWT token, saves to `~/.teamclaude/token`.
- **`handle-hook.mjs`** — Runs on every tool use / prompt. Appends a single NDJSON line to the queue file. No network I/O (<50ms).
- **`flush-and-heartbeat.mjs`** — Runs on session start/stop. Sends queued events to the server and reports a heartbeat. Retains events on failure.

Auth priority: **Bearer token** (from token file) > **x-tenant-id / x-user-id headers** (from env vars).

All hooks run with `"async": true` so they never block Claude Code.
