#!/usr/bin/env node
/**
 * vaast-mcp: MCP server shim for VAAST
 *
 * Forwards stdin/stdout MCP JSON-RPC to VAAST's local HTTP/SSE endpoint.
 * Reads port + token from ~/.vaast/mcp.json.
 *
 * Security model: read-only, local-only, this user's data only.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

interface McpSessionInfo {
  port: number;
  token: string;
  protocol_version: string;
}

async function loadSessionInfo(): Promise<McpSessionInfo> {
  const sessionPath = join(homedir(), '.vaast', 'mcp.json');
  try {
    const content = await fs.readFile(sessionPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to read VAAST MCP session file at ${sessionPath}. ` +
      `Make sure VAAST is running and the MCP server is started.`
    );
  }
}

async function forwardRequest(
  session: McpSessionInfo,
  method: string,
  params?: any
): Promise<any> {
  const url = `http://127.0.0.1:${session.port}/message`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.token}`,
      'Host': `127.0.0.1:${session.port}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params: params ?? {},
    }),
  });

  if (!response.ok) {
    const statusText = response.statusText || 'Request failed';
    throw new Error(`VAAST MCP server error: HTTP ${response.status} ${statusText}`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error.message ?? JSON.stringify(result.error));
  }

  return result.result;
}

async function main() {
  const session = await loadSessionInfo();

  const server = new Server(
    {
      name: 'vaast-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Forward tools/list to VAAST
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return await forwardRequest(session, 'tools/list');
  });

  // Forward tools/call to VAAST
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return await forwardRequest(session, 'tools/call', request.params);
  });

  // Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('vaast-mcp shim started (forwarding to VAAST on port', session.port, ')');
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
