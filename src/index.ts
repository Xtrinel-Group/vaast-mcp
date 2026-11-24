#!/usr/bin/env node
/**
 * vaast-mcp: MCP server shim for VAAST
 *
 * Forwards stdin/stdout MCP JSON-RPC to VAAST's local HTTP endpoint.
 * Reads port + token from ~/.vaast/mcp.json.
 *
 * Security model: read-only, local-only, this user's data only.
 * Only the tools in ALLOWED_TOOLS are listed or forwarded.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { createRequire } from 'module';
import { VaastClient } from './client.js';
import { filterToolList, isAllowedTool } from './tools.js';

const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

async function main() {
  // The session file is read on first use, so the shim can start before VAAST.
  const client = new VaastClient();

  const server = new Server(
    {
      name: 'vaast-mcp-server',
      version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return filterToolList(await client.request('tools/list'));
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (!isAllowedTool(request.params.name)) {
      throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${request.params.name}`);
    }
    return await client.request('tools/call', request.params);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`vaast-mcp ${version} shim started`);
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
