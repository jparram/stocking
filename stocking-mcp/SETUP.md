# stocking-mcp — Full Setup Guide

This document covers everything needed to deploy the MCP server to AWS Lambda
and wire it up to Claude.ai via GitHub Actions.

After completing these steps, every push to the `mcp-server` branch will
automatically build and redeploy the server. Claude will call it via a stable
HTTPS URL — no local process, no manual deploys.

---

## Prerequisites

- AWS account (same one used for Amplify)
- AWS CLI installed and configured (`aws configure`)
- Node.js 20+ installed locally
- GitHub repo access (you already have this)

---

## Part 1 — AWS Setup

Do this once. After this, GitHub Actions handles all future deploys.

### 1.1 — Build the initial deployment package

```bash
cd stocking-mcp
npm install
npm run build
npm ci --omit=dev
zip -r ../mcp-lambda.zip dist node_modules package.json
cd ..
```

This creates `mcp-lambda.zip` in the repo root.

---

### 1.2 — Create the Lambda execution role

```bash
aws iam create-role \
  --role-name stocking-mcp-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'
```

Attach the basic execution policy (CloudWatch logs):

```bash
aws iam attach-role-policy \
  --role-name stocking-mcp-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

Note your account ID for the next step:

```bash
aws sts get-caller-identity --query Account --output text
```

---

### 1.3 — Create the Lambda function

Replace the placeholder values before running:
- `YOUR_ACCOUNT_ID` — from the command above
- `YOUR_REGION` — e.g. `us-east-1` (match your Amplify region)
- `YOUR_APPSYNC_ENDPOINT` — from `amplify_outputs.json` or AWS AppSync console
- `YOUR_APPSYNC_API_KEY` — from `amplify_outputs.json` or AWS AppSync console
- `YOUR_MCP_AUTH_TOKEN` — any strong random string, e.g. `openssl rand -hex 32`

```bash
aws lambda create-function \
  --function-name stocking-mcp \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/stocking-mcp-role \
  --handler dist/lambda.handler \
  --zip-file fileb://mcp-lambda.zip \
  --timeout 30 \
  --memory-size 256 \
  --region YOUR_REGION \
  --environment 'Variables={
    APPSYNC_ENDPOINT=YOUR_APPSYNC_ENDPOINT,
    APPSYNC_API_KEY=YOUR_APPSYNC_API_KEY,
    CADENCE_START_DATE=2026-01-04,
    MCP_AUTH_TOKEN=YOUR_MCP_AUTH_TOKEN
  }'
```

---

### 1.4 — Enable a public Function URL

This gives the Lambda a stable HTTPS endpoint Claude can call directly.

```bash
aws lambda create-function-url-config \
  --function-name stocking-mcp \
  --auth-type NONE \
  --region YOUR_REGION
```

Allow public invocations:

```bash
aws lambda add-permission \
  --function-name stocking-mcp \
  --statement-id FunctionURLAllowPublicAccess \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE \
  --region YOUR_REGION
```

Get your URL:

```bash
aws lambda get-function-url-config \
  --function-name stocking-mcp \
  --region YOUR_REGION \
  --query FunctionUrl \
  --output text
```

Save this URL — you'll need it for Part 3 (Claude.ai).
It looks like: `https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.lambda-url.us-east-1.on.aws/`

---

### 1.5 — Verify the Lambda is working

```bash
curl -X POST YOUR_FUNCTION_URL \
  -H "Authorization: Bearer YOUR_MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

You should get back a JSON response listing all 7 tools. If you see the tool
names (`get_due_store`, `suggest_items`, `create_shopping_list`, etc.) the
Lambda is live and healthy.

---

### 1.6 — Create the GitHub Actions deploy user

Create a dedicated IAM user with minimal permissions for CI/CD:

```bash
aws iam create-user --user-name stocking-mcp-deploy
```

Create and attach a least-privilege policy:

```bash
aws iam put-user-policy \
  --user-name stocking-mcp-deploy \
  --policy-name stocking-mcp-deploy-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "lambda:UpdateFunctionCode",
          "lambda:GetFunction",
          "lambda:GetFunctionUrlConfig",
          "lambda:GetFunctionConfiguration"
        ],
        "Resource": "arn:aws:lambda:*:*:function:stocking-mcp"
      }
    ]
  }'
```

Create access keys for this user:

```bash
aws iam create-access-key --user-name stocking-mcp-deploy
```

This returns an `AccessKeyId` and `SecretAccessKey`. **Save both** — you'll
need them in the next section. The secret key is only shown once.

---

## Part 2 — GitHub Secrets

GitHub Actions uses these secrets to authenticate with AWS on every deploy.

### 2.1 — Add the secrets

1. Go to your GitHub repo
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each of the following:

| Secret name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | `AccessKeyId` from Step 1.6 |
| `AWS_SECRET_ACCESS_KEY` | `SecretAccessKey` from Step 1.6 |
| `AWS_REGION` | Your AWS region, e.g. `us-east-1` |

### 2.2 — Verify the workflow

The deploy workflow is already in the repo at:
`.github/workflows/deploy-mcp.yml`

It triggers automatically on any push to the `mcp-server` branch that
touches files inside `stocking-mcp/`.

To test it, make a small change to any file in `stocking-mcp/` and push
to `mcp-server`. Then go to:
**GitHub repo → Actions tab → Deploy stocking-mcp to Lambda**

You should see the workflow run, build the TypeScript, and deploy to Lambda
in about 60 seconds. The Function URL is printed at the end of the run
under the **Print Function URL** step.

---

## Part 3 — Connect to Claude.ai

### 3.1 — Add the MCP integration

1. Open [claude.ai](https://claude.ai)
2. Click your profile → **Settings**
3. Go to **Integrations** (or **Connectors** depending on your plan)
4. Click **Add custom integration**
5. Fill in:
   - **Name:** `Stocking MCP`
   - **URL:** Your Lambda Function URL from Step 1.4
   - **Authentication:** Bearer token
   - **Token:** Your `MCP_AUTH_TOKEN` value from Step 1.3
6. Click **Save**
7. Reload Claude

### 3.2 — Test it in Claude

Start a new conversation and try:

> *"What store is due for a shopping run this week?"*

Claude should call `get_due_store` and return the cadence status. Then try:

> *"What Sam's items are getting low?"*

Claude will call `suggest_items` and return urgency-ranked suggestions from
the master catalog.

> *"Build me a Sam's list for this Sunday"*

Claude will call `suggest_items`, show you the list for confirmation, then
call `create_shopping_list` to write it to DynamoDB — and it will appear
live in the Stocking app.

---

## Part 4 — Ongoing workflow

After initial setup, you never touch AWS again.

```
You or Claude edit stocking-mcp/ code
  → push to mcp-server branch
  → GitHub Actions builds TypeScript (~15s)
  → zips production bundle
  → aws lambda update-function-code (~10s)
  → Claude.ai is on the new version immediately
```

The GitHub Actions summary for each deploy shows the live Function URL
as a clickable link.

---

## Troubleshooting

**Lambda returns 401 Unauthorized**
Check that the `Authorization: Bearer YOUR_TOKEN` header matches the
`MCP_AUTH_TOKEN` environment variable set on the Lambda function.
Update env vars in AWS Console → Lambda → stocking-mcp → Configuration → Environment variables.

**Lambda returns 500 with AppSync error**
The `APPSYNC_ENDPOINT` or `APPSYNC_API_KEY` is wrong, or API key auth
hasn't been deployed to Amplify yet. Run `npx ampx sandbox` or trigger
a new Amplify Hosting deploy from the `mcp-server` branch.

**GitHub Actions fails at "Configure AWS credentials"**
Double-check the three secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`AWS_REGION`) are set correctly in repo Settings → Secrets → Actions.

**GitHub Actions fails at "Deploy to Lambda"**
The IAM user may be missing permissions. Re-run Step 1.6 and confirm
`lambda:UpdateFunctionCode` is in the policy.

**Claude says the integration isn't connected**
Make sure the Function URL ends with `/` and the Bearer token in
Claude.ai Settings matches `MCP_AUTH_TOKEN` exactly.

---

## Environment variable reference

| Variable | Where to set | Description |
|---|---|---|
| `APPSYNC_ENDPOINT` | Lambda env vars | AppSync GraphQL URL from `amplify_outputs.json` |
| `APPSYNC_API_KEY` | Lambda env vars | AppSync API key (rotates every 365 days) |
| `CADENCE_START_DATE` | Lambda env vars | First Sam's Sunday — `2026-01-04` |
| `MCP_AUTH_TOKEN` | Lambda env vars + Claude.ai | Random secret protecting the endpoint |
| `AWS_ACCESS_KEY_ID` | GitHub secret | Deploy user key from Step 1.6 |
| `AWS_SECRET_ACCESS_KEY` | GitHub secret | Deploy user secret from Step 1.6 |
| `AWS_REGION` | GitHub secret | AWS region, e.g. `us-east-1` |
