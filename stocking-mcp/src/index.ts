#!/usr/bin/env node
/**
 * stdio entry point — used for local development and direct Claude Desktop connection.
 * For production (Claude.ai via URL), see lambda.ts.
 *
 * Usage:
 *   npm run build
 *   node dist/index.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GraphQLClient } from './graphql.js';
import { CadenceEngine } from './cadence.js';
import { KrogerClient } from './kroger.js';
import { MASTER_CATALOG } from './catalog.js';
import { TOOL_DEFINITIONS, handleToolCall } from './tools.js';

const server = new Server(
  { name: 'stocking-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

const gql = new GraphQLClient(
  process.env['APPSYNC_ENDPOINT'] ?? '',
  process.env['APPSYNC_API_KEY']  ?? ''
);

const cadence = new CadenceEngine(
  process.env['CADENCE_START_DATE'] ?? '2026-01-04'
);

const kroger = process.env['KROGER_CLIENT_ID'] && process.env['KROGER_CLIENT_SECRET']
  ? new KrogerClient(process.env['KROGER_CLIENT_ID'], process.env['KROGER_CLIENT_SECRET'])
  : undefined;

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    return await handleToolCall(
      name, args as Record<string, unknown>, cadence, gql, MASTER_CATALOG, kroger
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('stocking-mcp running on stdio');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
