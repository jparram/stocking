# stocking-mcp

MCP server that lets Claude create and manage grocery shopping lists directly from conversation.

## What this enables

Once connected, you can say things like:
- *"What store is due this week?"*
- *"Build me a Sam's list for this Sunday"*
- *"What HT items are getting low?"*
- *"Mark the bacon as checked on my active list"*
- *"Complete last week's list — I spent $284"*

The list writes directly to DynamoDB and appears live in the Stocking app.

---

## Step 1 — Deploy the Amplify backend change

The `amplify/data/resource.ts` in this branch already has API key auth enabled. You just need to deploy it:

```bash
npx ampx sandbox   # local dev
# or merge to your Amplify Hosting branch to trigger a cloud deploy
```

---

## Step 2 — Get your AppSync credentials

After deploying, find your credentials in one of two places:

**Option A — amplify_outputs.json** (generated after deploy, in repo root):
```json
{
  "API": {
    "GraphQL": {
      "endpoint": "https://xxx.appsync-api.us-east-1.amazonaws.com/graphql",
      "apiKey": "da2-xxx"
    }
  }
}
```

**Option B — AWS Console**:
1. AWS Console → AppSync → your API
2. Settings → copy **API URL** → this is `APPSYNC_ENDPOINT`
3. Settings → API keys → copy the key value → this is `APPSYNC_API_KEY`

---

## Step 3 — Install and build

```bash
cd stocking-mcp
cp .env.example .env
# Edit .env — fill in APPSYNC_ENDPOINT and APPSYNC_API_KEY
npm install
npm run build
```

---

## Step 4 — Connect to Claude.ai

1. Open Claude.ai → **Settings** → **Integrations** (or Connectors)
2. Click **Add custom integration** / **Add MCP Server**
3. Set the command to:
   ```
   node /absolute/path/to/stocking/stocking-mcp/dist/index.js
   ```
4. Save and reload Claude

Claude will confirm the `stocking-mcp` server is connected and list the available tools.

---

## Available tools

| Tool | What it does |
|---|---|
| `get_due_store` | Which store is due this week per bi-weekly cadence |
| `suggest_items` | Item suggestions ranked by urgency (overdue → due → approaching) |
| `create_shopping_list` | Write a full list to DynamoDB — appears live in the app |
| `get_shopping_lists` | Read recent lists with status and totals |
| `get_list_items` | Full line items for a list, grouped by category |
| `update_list_item` | Check/uncheck an item (use while shopping) |
| `complete_list` | Mark done, record actual spend for history |

---

## File structure

```
stocking-mcp/
  src/
    index.ts     — MCP server entry point, tool definitions and handlers
    graphql.ts   — AppSync client (create, read, update via API key)
    cadence.ts   — Bi-weekly cadence engine + item suggestion logic
    catalog.ts   — Master item catalog (mirrors src/data/masterCatalog.ts)
  .env.example   — Environment variable template
  package.json
  tsconfig.json
  README.md
```

---

## Keeping catalog.ts in sync

`stocking-mcp/src/catalog.ts` mirrors `src/data/masterCatalog.ts`. When you add or update items in the app catalog, make the same change here. A future improvement would be to share both from a single source file via a monorepo workspace.
