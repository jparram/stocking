# One-Time Lambda Setup

Do this once in AWS, then every push to `mcp-server` auto-deploys via GitHub Actions.

---

## 1 — Create the Lambda function

```bash
# Create execution role
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

aws iam attach-role-policy \
  --role-name stocking-mcp-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# First deploy (build the zip first: cd stocking-mcp && npm run package)
aws lambda create-function \
  --function-name stocking-mcp \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/stocking-mcp-role \
  --handler dist/lambda.handler \
  --zip-file fileb://mcp-lambda.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment 'Variables={
    APPSYNC_ENDPOINT=https://YOUR_ENDPOINT.appsync-api.us-east-1.amazonaws.com/graphql,
    APPSYNC_API_KEY=da2-YOUR_KEY,
    CADENCE_START_DATE=2026-01-04,
    MCP_AUTH_TOKEN=YOUR_RANDOM_SECRET
  }'
```

---

## 2 — Enable Function URL (public HTTPS endpoint)

```bash
aws lambda create-function-url-config \
  --function-name stocking-mcp \
  --auth-type NONE

# Allow public invoke
aws lambda add-permission \
  --function-name stocking-mcp \
  --statement-id FunctionURLAllowPublicAccess \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE
```

The URL will look like:
`https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.lambda-url.us-east-1.on.aws/`

---

## 3 — Add GitHub Actions secrets

In your repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user key with `lambda:UpdateFunctionCode` + `lambda:GetFunctionUrlConfig` |
| `AWS_SECRET_ACCESS_KEY` | Corresponding secret |
| `AWS_REGION` | e.g. `us-east-1` |

Minimum IAM policy for the deploy user:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction",
        "lambda:GetFunctionUrlConfig",
        "lambda:WaitForFunctionUpdated"
      ],
      "Resource": "arn:aws:lambda:*:*:function:stocking-mcp"
    }
  ]
}
```

---

## 4 — Connect to Claude.ai

1. Settings → Integrations → Add custom integration
2. URL: your Lambda Function URL (from step 2)
3. Authentication: Bearer token → paste your `MCP_AUTH_TOKEN` value
4. Save and reload

After that, every push to `mcp-server` auto-deploys and Claude is always on the latest version.

---

## 5 — Verify it's working

```bash
curl -X POST YOUR_FUNCTION_URL \
  -H "Authorization: Bearer YOUR_MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

You should get back the 7 tool definitions.
