# stocking-mcp

MCP server that lets Claude create and manage grocery shopping lists directly from conversation.

## What this enables

Once connected, you can say things like:
- *"What store is due this week?"*
- *"Build me a Sam's list for this Sunday"*
- *"What HT items are getting low?"*
- *"Mark the bacon as checked on my active list"*
- *"Complete last week's list — I spent $284"*
- *"Create a family meal plan for this week"*
- *"Set Monday dinner to the chicken stir-fry recipe"*

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
# Edit .env — fill in APPSYNC_ENDPOINT, APPSYNC_API_KEY, and DAILY_BRIEF_BASE_URL
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

### Shopping

| Tool | What it does |
|---|---|
| `get_due_store` | Which store is due this week per bi-weekly cadence |
| `get_daily_brief` | Fetch DailyBrief slice for a date (headline, calendar, household) |
| `suggest_items` | Item suggestions ranked by urgency (overdue → due → approaching) |
| `generate_list_from_plan` | Aggregate ingredients from a week's meal plan (preview only — no list created yet) |
| `create_shopping_list` | Write a full list to DynamoDB — appears live in the app |
| `get_shopping_lists` | Read recent lists with status and totals |
| `get_list_items` | Full line items for a list, grouped by category |
| `update_list_item` | Check/uncheck an item (use while shopping) |
| `complete_list` | Mark done, record actual spend for history |

### Meal planning

| Tool | What it does |
|---|---|
| `create_meal_plan` | Create a meal plan for a given week. **Idempotent** — returns the existing plan if one already exists for the same week, type, and member |
| `get_meal_plan` | Fetch a plan by `week_of` + `type` (+ `member_id` for individual plans), including all entries sorted by day and meal. Returns a `not_found` error when no plan exists for that week |
| `update_meal_entry` | Set or update a single day/mealType slot in a plan. Looks up an existing entry for the given slot and updates it, or creates a new one if the slot is empty |
| `delete_meal_entry` | Remove a single meal entry from a plan by its entry ID |
| `list_meal_plans` | List weeks that have plans, with optional filters by week, type, or member |

### Brief generation

| Tool | What it does |
|---|---|
| `get_daily_brief` | Assembles the `household` block for the Morning Advantage DailyBrief — calls `get_due_store`, `get_shopping_lists`, and `get_meal_plan` internally and returns a single ready-to-embed object |

#### Shopping tool signatures (generate_list_from_plan + create_shopping_list)

```ts
generate_list_from_plan({
  week_of: string,           // any ISO date in the target week (normalised to Monday)
  store: 'sams' | 'ht' | 'both',
  plan_type?: 'family' | 'individual',  // defaults to 'family'
  member_id?: string,        // required when plan_type is 'individual'
})
→ {
    week_of, store, plan_type, plan_id,
    recipe_count,             // unique recipes found
    recipes: string[],        // recipe names
    slot_count,               // meal slots that had a recipe
    item_count,
    items: Array<{
      item_id: string,        // catalog ID, or 'custom' for free-text items
      name?: string,          // only present when item_id === 'custom'
      quantity: number,
      unit: string,           // unit of measure — pass directly to create_shopping_list
    }>,
    message,
  }
  | { error: 'no_plan' | 'member_id_required' | 'member_id_not_allowed', message }
```

> **Workflow**: call `generate_list_from_plan` → review items → call `create_shopping_list` with the same `store`, `week_of`, and `items` array (including `unit`) to create the list. `unit` is accepted and persisted by `create_shopping_list` and `add_list_item`.

```ts
// Item format accepted by create_shopping_list and add_list_item:
{
  item_id:  string,   // catalog ID or 'custom'
  name?:    string,   // required when item_id === 'custom'
  quantity: number,
  unit?:    string,   // persisted as-is for custom items; overrides catalog default for catalog items
  notes?:   string,
}
```

#### Meal plan tool signatures

```ts
create_meal_plan({ week_of: string, type: 'family' | 'individual', member_id?: string })
  → { plan_id, week_of, type, member_id, already_existed, message }

get_meal_plan({ week_of: string, type: 'family' | 'individual', member_id?: string })
  OR
get_meal_plan({ plan_id: string })
  → MealPlan & { entries: MealEntry[] }   |   { error: 'not_found', ... }

update_meal_entry({ plan_id: string, day_of_week: string, meal_type: string, recipe_id?: string, label?: string, notes?: string })
  → { success, entry_id, plan_id, action: 'created' | 'updated', entry? }

delete_meal_entry({ entry_id: string, plan_id?: string })
  → { success, deleted_entry_id }

list_meal_plans({ limit?: number, week_of?: string, type?: string, member_id?: string })
  → MealPlan[]
```

#### Day and meal type values

- **day_of_week**: `sun` | `mon` | `tue` | `wed` | `thu` | `fri` | `sat`
- **meal_type**: `breakfast` | `lunch` | `dinner`

#### `get_daily_brief` tool signature

```ts
get_daily_brief({ date?: string })
  → {
      available: true,
      household: {
        shopping_due: boolean,
        shopping_store: "Sam's Club" | "Harris Teeter" | null,
        shopping_list_id: string | null,
        meal_plan_week_of: string | null,   // ISO YYYY-MM-DD, Monday of current week
        today_dinner: string | null,
        pantry_flags: string[],             // reserved — always [] for now
      },
      flags: { has_household: true },
    }
```

---

## DailyBrief schema (v1.1) — `household` block

For Morning Advantage brief generation, include the following in the DailyBrief payload:

```json
{
  "flags": {
    "has_household": true
  },
  "household": {
    "shopping_due": true,
    "shopping_store": "Sam's Club",
    "shopping_list_id": "3a53b369-...",
    "meal_plan_week_of": "2026-05-10",
    "today_dinner": "Chicken thighs — baked",
    "pantry_flags": []
  }
}
```

### `household` field definitions

| Field | Type | Source |
|---|---|---|
| `shopping_due` | boolean | Derived from `stocking:get_due_store` (`due_store !== null`) |
| `shopping_store` | string \| null | Derived from `stocking:get_due_store.due_store` (`sams` \| `ht`) and mapped to display label (`Sam's Club` \| `Harris Teeter`) |
| `shopping_list_id` | string \| null | Active list ID for the due store, if one exists |
| `meal_plan_week_of` | string \| null | `stocking:get_meal_plan` for current week (ISO `YYYY-MM-DD`, Monday-of-week) |
| `today_dinner` | string \| null | Dinner entry from meal plan for today's date |
| `pantry_flags` | string[] | Reserved — empty for now, future pantry tracking |

### Morning Advantage brief-generator integration

The Work LVM brief generator (Morning Advantage repo) calls `stocking:get_daily_brief` at ~5 AM each day to populate the `household` block before writing the brief to S3.

#### Required environment variables on the LVM host

```bash
STOCKING_MCP_URL=https://<lambda-function-url>.lambda-url.us-east-1.on.aws/
STOCKING_MCP_TOKEN=<same bearer token as MCP_AUTH_TOKEN in stocking-mcp/.env>
```

These are the same credentials used by the Claude.ai connector — no new secrets required.

#### Brief generator call sequence

```
POST $STOCKING_MCP_URL  (Bearer $STOCKING_MCP_TOKEN)
  → { method: "tools/call", params: { name: "get_daily_brief", arguments: {} } }

Response household block → embed in DailyBrief JSON → write to S3 briefs/YYYY-MM-DD.json
```

#### Failure handling

If `get_daily_brief` fails or is unreachable, omit the `household` block and set `flags.has_household = false`. The brief still writes to S3.

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
