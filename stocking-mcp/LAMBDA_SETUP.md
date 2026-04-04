# One-Time Lambda Setup

Do this once in AWS, then every push to `mcp-server` auto-deploys via GitHub Actions.

All local `aws` commands use the `jp-admin` SSO profile. Run `aws sso login --profile jp-admin` first if your session has expired.

---

## 1 — Create the Lambda IAM role

```bash
# Create execution role
aws iam create-role \
  --profile jp-admin \
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
  --profile jp-admin \
  --role-name stocking-mcp-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Add inline policy for Cognito admin operations (family member management)
aws iam put-role-policy \
  --profile jp-admin \
  --role-name stocking-mcp-role \
  --policy-name stocking-mcp-cognito-admin \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "cognito-idp:GetUser",
        "cognito-idp:ListUsersInGroup",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminAddUserToGroup",
        "cognito-idp:AdminRemoveUserFromGroup",
        "cognito-idp:AdminListGroupsForUser"
      ],
      "Resource": "arn:aws:cognito-idp:us-east-1:YOUR_ACCOUNT_ID:userpool/*"
    }]
  }'
```

---

## 2 — Build and deploy the function for the first time

```bash
# From repo root
cd stocking-mcp && npm run package && cd ..

aws lambda create-function \
  --profile jp-admin \
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
    MCP_AUTH_TOKEN=YOUR_RANDOM_SECRET,
    COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX,
    COGNITO_REGION=us-east-1,
    ADMIN_USER_SUB=YOUR_COGNITO_USER_SUB
  }'
```

Replace placeholder values — `APPSYNC_ENDPOINT` and `APPSYNC_API_KEY` come from `amplify_outputs.json` after an Amplify deploy. `MCP_AUTH_TOKEN` can be any random secret (e.g. `openssl rand -hex 32`). `COGNITO_USER_POOL_ID` comes from `amplify_outputs.json` (`auth.user_pool_id`). `ADMIN_USER_SUB` is the Cognito `sub` of the admin user (find it in the Cognito console or via `aws cognito-idp admin-get-user`); if omitted, admin access is granted to all members of the `admin` Cognito group.

---

## 3 — Create an API Gateway HTTP API (public HTTPS endpoint)

Lambda Function URLs require disabling account-level Block Public Access (BPA), which isn't easily toggled via CLI. API Gateway sidesteps this entirely — it invokes the Lambda internally and exposes a clean public HTTPS endpoint.

```bash
LAMBDA_ARN=$(aws lambda get-function \
  --profile jp-admin \
  --function-name stocking-mcp \
  --query 'Configuration.FunctionArn' --output text)

# Create HTTP API
API_ID=$(aws apigatewayv2 create-api \
  --profile jp-admin \
  --name stocking-mcp-api \
  --protocol-type HTTP \
  --query 'ApiId' --output text)

# Create Lambda integration
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --profile jp-admin \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
  --payload-format-version 2.0 \
  --query 'IntegrationId' --output text)

# Route all requests to Lambda
aws apigatewayv2 create-route \
  --profile jp-admin \
  --api-id $API_ID \
  --route-key 'ANY /' \
  --target "integrations/$INTEGRATION_ID"

# Auto-deploy default stage
aws apigatewayv2 create-stage \
  --profile jp-admin \
  --api-id $API_ID \
  --stage-name '$default' \
  --auto-deploy

# Grant API Gateway permission to invoke Lambda
aws lambda add-permission \
  --profile jp-admin \
  --function-name stocking-mcp \
  --statement-id apigw-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:YOUR_ACCOUNT_ID:${API_ID}/*/*/"

echo "API endpoint: https://${API_ID}.execute-api.us-east-1.amazonaws.com/"
```

**Current endpoint:** `https://e880pa3u03.execute-api.us-east-1.amazonaws.com/`

---

## 4 — Set up GitHub Actions OIDC (no static keys needed)

Because we use AWS SSO, GitHub Actions authenticates via OIDC instead of `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`.

### 4a — Create the OIDC identity provider (one-time per AWS account)

```bash
aws iam create-open-id-connect-provider \
  --profile jp-admin \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 4b — Create an IAM deploy role trusted by the repo

```bash
aws iam create-role \
  --profile jp-admin \
  --role-name stocking-mcp-deploy \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:jparram/stocking:*"
        }
      }
    }]
  }'

aws iam put-role-policy \
  --profile jp-admin \
  --role-name stocking-mcp-deploy \
  --policy-name stocking-mcp-deploy-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction",
        "lambda:GetFunctionUrlConfig",
        "lambda:WaitForFunctionUpdated"
      ],
      "Resource": "arn:aws:lambda:*:YOUR_ACCOUNT_ID:function:stocking-mcp"
    }]
  }'
```

### 4c — Set GitHub Actions secrets with gh cli

```bash
gh secret set AWS_REGION \
  --repo jparram/stocking \
  --body "us-east-1"

gh secret set AWS_ROLE_ARN \
  --repo jparram/stocking \
  --body "arn:aws:iam::YOUR_ACCOUNT_ID:role/stocking-mcp-deploy"
```

---

## 5 — Connect to Claude.ai

1. Settings → Integrations → Add custom integration
2. URL: `https://e880pa3u03.execute-api.us-east-1.amazonaws.com/`
3. Authentication: Bearer token → paste your `MCP_AUTH_TOKEN` value
4. Save and reload

After that, every push to `mcp-server` auto-deploys and Claude is always on the latest version.

---

## 6 — Verify it's working

```bash
curl -X POST https://e880pa3u03.execute-api.us-east-1.amazonaws.com/ \
  -H "Authorization: Bearer YOUR_MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

You should get back the 7 tool definitions.
