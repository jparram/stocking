/**
 * Lambda entry point for stocking-mcp.
 *
 * Claude.ai calls this function URL directly via HTTP POST.
 * Each request is a single MCP JSON-RPC message; the response is the result.
 *
 * Environment variables (set in Lambda console or via GitHub Actions secrets):
 *   APPSYNC_ENDPOINT  — AppSync GraphQL URL
 *   APPSYNC_API_KEY   — AppSync API key
 *   CADENCE_START_DATE — First Sam's Sunday, e.g. 2026-01-04
 *   MCP_AUTH_TOKEN    — Secret token Claude sends in Authorization header
 */

import { CadenceEngine } from './cadence.js';
import { GraphQLClient } from './graphql.js';
import { KrogerClient } from './kroger.js';
import { MASTER_CATALOG } from './catalog.js';
import { TOOL_DEFINITIONS, handleToolCall } from './tools.js';

const cadence = new CadenceEngine(
  process.env['CADENCE_START_DATE'] ?? '2026-01-04'
);

const gql = new GraphQLClient(
  process.env['APPSYNC_ENDPOINT'] ?? '',
  process.env['APPSYNC_API_KEY']  ?? ''
);

const kroger = process.env['KROGER_CLIENT_ID'] && process.env['KROGER_CLIENT_SECRET']
  ? new KrogerClient(process.env['KROGER_CLIENT_ID'], process.env['KROGER_CLIENT_SECRET'])
  : undefined;

interface LambdaEvent {
  httpMethod?: string;
  requestContext?: { http?: { method?: string } };
  headers?: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  const method =
    event.httpMethod ??
    event.requestContext?.http?.method ??
    'POST';

  // CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  // Auth check
  const authToken = process.env['MCP_AUTH_TOKEN'];
  if (authToken) {
    const incoming =
      event.headers?.['authorization'] ??
      event.headers?.['Authorization'] ??
      '';
    if (incoming !== `Bearer ${authToken}`) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }
  }

  let body = event.body ?? '{}';
  if (event.isBase64Encoded) {
    body = Buffer.from(body, 'base64').toString('utf-8');
  }

  let rpc: { method: string; params?: Record<string, unknown>; id?: unknown };
  try {
    rpc = JSON.parse(body);
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }

  try {
    let result: unknown;

    // MCP JSON-RPC dispatch
    switch (rpc.method) {
      case 'tools/list':
        result = { tools: TOOL_DEFINITIONS };
        break;

      case 'tools/call': {
        const p = rpc.params as { name: string; arguments?: Record<string, unknown> };
        result = await handleToolCall(p.name, p.arguments ?? {}, cadence, gql, MASTER_CATALOG, kroger);
        break;
      }

      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'stocking-mcp', version: '1.0.0' },
        };
        break;

      default:
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: rpc.id,
            error: { code: -32601, message: `Method not found: ${rpc.method}` },
          }),
        };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: rpc.id,
        error: { code: -32603, message: msg },
      }),
    };
  }
};
