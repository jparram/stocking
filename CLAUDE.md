# Stocking — Family Grocery Tracker

Smart grocery shopping app for bi-weekly household shopping at Sam's Club and Harris Teeter, with a Claude MCP server for conversational list management.

## Architecture

```
src/                    React + TypeScript frontend (Vite)
stocking-mcp/           Claude MCP server (Node.js, deployed to AWS Lambda)
amplify/                AWS Amplify Gen 2 backend definition
.github/workflows/      CI/CD — auto-deploy MCP on push to mcp-server branch
```

### Data storage
- **Default (local):** browser localStorage via `useLocalStorage.ts`
- **Cloud:** DynamoDB via AppSync GraphQL (requires Cognito auth on frontend, API key auth from MCP server)

### Shared sources of truth
- `src/data/masterCatalog.ts` and `stocking-mcp/src/catalog.ts` are duplicates — keep them in sync manually (no shared package yet)
- Bi-weekly cadence logic is also duplicated in frontend (`src/utils/index.ts`) and MCP (`stocking-mcp/src/cadence.ts`)

## Commands

### Frontend (project root)
```bash
npm run dev       # Vite dev server → http://localhost:5173
npm run build     # TypeScript check + bundle → dist/
npm run lint      # ESLint
npm run preview   # Serve dist/ locally
```

### MCP server (from stocking-mcp/)
```bash
npm run build     # tsc → dist/
npm run dev       # Watch mode (tsx)
npm run start     # Run prebuilt dist/index.js
npm run package   # Build + zip for Lambda → ../mcp-lambda.zip
```

No test suite configured yet.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend framework | React 19, TypeScript 5, Vite 7 |
| Routing | React Router DOM 7 |
| Styling | Tailwind CSS 3 (custom Sams/HT color palette in `tailwind.config.js`) |
| Backend infra | AWS Amplify Gen 2 (Cognito, AppSync, DynamoDB, S3) |
| MCP transport | HTTP (Lambda Function URL for Claude.ai) + stdio (local/Claude Desktop) |
| MCP SDK | @modelcontextprotocol/sdk 1.0.0 |
| PDF export | jsPDF |

## MCP Server Tools

Defined in `stocking-mcp/src/tools.ts` — 7 tools for conversational list management:
reads/writes directly to AppSync using API key auth (bypasses Cognito).

## Environment Variables (stocking-mcp/.env)

```
APPSYNC_ENDPOINT=     # From amplify_outputs.json
APPSYNC_API_KEY=      # AppSync API key with create/read/update permissions
CADENCE_START_DATE=   # First Sam's Sunday, e.g. 2026-01-04
MCP_AUTH_TOKEN=       # Bearer token for Lambda auth
```

## Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useAppState.ts` | Central frontend state (lists, logs, settings) |
| `src/types/index.ts` | Shared TypeScript interfaces |
| `src/data/masterCatalog.ts` | 78-item seed catalog with 2025 prices |
| `stocking-mcp/src/lambda.ts` | Lambda HTTP entry point |
| `stocking-mcp/src/graphql.ts` | AppSync client (queries + mutations) |
| `amplify/data/resource.ts` | DynamoDB schema definition |

## Shopping Cadence

- **Sam's Club** — Sundays, every 2 weeks
- **Harris Teeter** — Wednesdays, every 2 weeks
- Cadence start date is configurable via `CADENCE_START_DATE` env var and household settings
