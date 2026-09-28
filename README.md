# vaast-mcp

<p align="center">
  <img src="https://assets.xtrinel.com/vaast-mcp-full-icon.svg" alt="VAAST MCP" width="200"/>
</p>

**Read-only MCP server shim for VAAST** — gives AI agents secure, local-only access to your VAAST vulnerability data.

## What is this?

`vaast-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server that forwards requests to a locally running VAAST application. It provides AI agents (Claude, Cursor, etc.) with **read-only** access to your scan findings, workspaces, and targets.

### Security Model

- **Local only**: Connects only to `127.0.0.1` — never touches the network
- **Read-only**: No scan launching, no deletion, no modification
- **Your data stays local**: All queries run against your local VAAST SQLite database
- **Bearer token auth**: Token regenerated per VAAST session, read from `~/.vaast/mcp.json`
- **No data exfiltration**: The shim has no network access except to `localhost`

## Available Tools

| Tool | Description |
|------|-------------|
| `list_workspaces` | List all VAAST workspaces (local SQLite) |
| `get_findings` | Get scan findings for a workspace |
| `get_scan_status` | Get current scan status |
| `list_targets` | List registered scan targets (via Xtrinel API) |

All tools are read-only. No scanning, installation, or deletion capabilities.

## Prerequisites

1. **VAAST installed and running** — Download from [xtrinel.com](https://xtrinel.com)
2. **MCP server started in VAAST** — Navigate to Integrations → MCP Server → Start
3. **Node.js 18+** — For running the shim

## Setup

### Claude Code

```bash
claude mcp add vaast
```

When prompted, use:
- **Command**: `npx -y @xtrinel/vaast-mcp` (after package is published)
- **Local dev**: `node /path/to/vaast-mcp/dist/index.js`

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

**After npm publish:**
```json
{
  "mcpServers": {
    "vaast": {
      "command": "npx",
      "args": ["-y", "@xtrinel/vaast-mcp"]
    }
  }
}
```

**Local development (before publish):**
```json
{
  "mcpServers": {
    "vaast": {
      "command": "node",
      "args": ["/absolute/path/to/vaast-mcp/dist/index.js"]
    }
  }
}
```

### Cursor

Add to Cursor's MCP settings:

```json
{
  "mcpServers": {
    "vaast": {
      "command": "npx",
      "args": ["-y", "@xtrinel/vaast-mcp"]
    }
  }
}
```

### VS Code (Continue extension)

Add to `~/.continue/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "vaast",
      "command": "npx",
      "args": ["-y", "@xtrinel/vaast-mcp"]
    }
  ]
}
```

## Testing

### Manual Test with MCP Inspector

```bash
# Build the shim
cd vaast-mcp
npm install
npm run build

# Start VAAST and enable MCP server first!

# Test with inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

### Expected Behavior

**When VAAST MCP server is running:**
- Shim connects successfully
- Tools are listed (4 tools)
- Tool calls return data from local VAAST database

**When VAAST MCP server is NOT running:**
- Error: `Failed to read VAAST MCP session file at ~/.vaast/mcp.json`
- Clear instructions to start VAAST MCP server first

## How It Works

1. VAAST starts an MCP server on `127.0.0.1:<random-port>` when you click Start
2. VAAST writes `~/.vaast/mcp.json` with the port and a session bearer token
3. Your AI agent launches `vaast-mcp` as a subprocess
4. `vaast-mcp` reads the session file and forwards MCP requests via HTTP to VAAST
5. VAAST validates the token and returns data from your local SQLite database

## Troubleshooting

### Error: Failed to read VAAST MCP session file

**Cause**: VAAST MCP server is not running.

**Fix**: Open VAAST → Integrations → MCP Server → Start

### Connection refused / HTTP errors

**Cause**: VAAST MCP server stopped or crashed.

**Fix**: Restart the MCP server in VAAST.

### Tools not appearing in AI agent

**Cause**: MCP config incorrect or agent needs restart.

**Fix**: 
1. Verify config points to correct command/path
2. Restart your AI agent (Claude Desktop, Cursor, etc.)
3. Check agent's MCP logs for errors

## Development

```bash
# Clone and install
git clone <repo>
cd vaast-mcp
npm install

# Build
npm run build

# Test locally (see Local development config above)
node dist/index.js
```

## License

Apache-2.0 — See [LICENSE](LICENSE)

## Security

See [SECURITY.md](SECURITY.md) for vulnerability disclosure policy.

---

**Made by [Xtrinel](https://xtrinel.com)** — Offensive security tools for AI applications.
