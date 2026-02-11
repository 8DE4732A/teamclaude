# TeamClaude Sidecar — Claude Code Plugin

Automatically reports coding activity from Claude Code sessions to your TeamClaude server.

## Prerequisites

- Node.js 18+
- A running TeamClaude server instance

## Environment Variables

| Variable | Required | Description | Default |
|---|---|---|---|
| `SIDECAR_API_BASE_URL` | Yes | TeamClaude server URL | — |
| `SIDECAR_TENANT_ID` | Yes | Your organization identifier | — |
| `SIDECAR_USER_ID` | Yes | Your user identifier | — |
| `SIDECAR_QUEUE_FILE` | No | Path to the offline queue file | `~/.teamclaude/queue.ndjson` |

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

Two scripts handle all work:

- **`handle-hook.mjs`** — Runs on every tool use / prompt. Appends a single NDJSON line to the queue file. No network I/O (<50ms).
- **`flush-and-heartbeat.mjs`** — Runs on session start/stop. Sends queued events to the server and reports a heartbeat. Retains events on failure.

All hooks run with `"async": true` so they never block Claude Code.
