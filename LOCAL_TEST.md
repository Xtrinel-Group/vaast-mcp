# Local Development Testing

## Build from Source

```bash
cd vaast-mcp
npm install
npm run build
```

## MCP Client Config (Local Build)

**For local testing before npm publish**, use absolute path to your built `dist/index.js`:

```json
{
  "mcpServers": {
    "vaast": {
      "command": "node",
      "args": ["/absolute/path/to/vaast-mcp/dist/index.js"]
    }
  }
}

Replace `/absolute/path/to/` with your actual path.

## MCP Inspector Test

```bash
npx @modelcontextprotocol/inspector node /absolute/path/to/vaast-mcp/dist/index.js
```

## Test Steps

1. **Start VAAST** with MCP server:
   - Launch VAAST app
   - Sign in (any plan works - free tier supported)
   - Navigate to Integrations → MCP Server → Start
   - Verify shows "Running on 127.0.0.1:<port>"

2. **Connect MCP client** (Claude Desktop, Cursor, or Inspector) using config above

3. **Test tools**:
   - `tools/list` → returns 4 tools
   - `list_workspaces` → returns workspaces (or empty array)
   - `get_findings` → returns findings for workspace

4. **Negative test**: Stop VAAST MCP server → shim fails with clear error

## After Publishing

Once published to npm, users can use:

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
