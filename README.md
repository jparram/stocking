# 🛒 Family Grocery Tracker

A smart weekly shopping list app for families, targeting **Sam's Club** and **Harris Teeter**. Built with React 18 + TypeScript + Vite + Tailwind CSS, deployable to **AWS Amplify**.

![Dashboard](https://github.com/user-attachments/assets/8dc36b4d-0938-4e49-9c5c-285a718fefe6)

---

## Features

- **Dashboard** — cadence-driven "due this week" split by store, active list progress, quick stats
- **Stocking Guide** — searchable/filterable catalog of 78 items across 13 categories
- **New List Wizard** — 3-step: Store → Items (cadence suggestions) → Review & Save
- **Active Checklist** — mobile-friendly, category-grouped, real-time check-off with progress bar
- **Share / Export** — PDF, CSV, print layout, shareable link
- **History** — spend tracking with bar chart, completed lists, bulk CSV export
- **Settings** — household name, member count, cadence start date, default store

---

## Deploy to AWS Amplify (Quickstart)

> **Yes, you can deploy this directly!** The `amplify.yml` build spec is already configured.

### Step 1 — Connect the repo

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/home)
2. Click **"New app"** → **"Host web app"**
3. Choose **GitHub** → authorize and select the `jparram/stocking` repository
4. Choose the branch to deploy (e.g. `main` or your PR branch)

### Step 2 — Review build settings

Amplify auto-detects `amplify.yml`. The build settings are pre-configured:

```yaml
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
```

Click **"Next"** → **"Save and deploy"**. Amplify builds and hosts the app automatically on every push.

### Step 3 — Done ✅

Your app will be live at a URL like `https://main.d1abc123.amplifyapp.com`.

> **Note:** By default the app uses **browser localStorage** for persistence — no backend required. This works great for a single-device family use case.

---

## Enable Full Gen 2 Backend (Cognito + DynamoDB + S3)

The `amplify/` directory contains a complete **Amplify Gen 2** backend definition. To enable it:

### 1. Install backend packages

```bash
npm install -D @aws-amplify/backend @aws-amplify/backend-cli
npm install aws-amplify
```

### 2. Deploy backend sandbox locally (first time)

```bash
npx ampx sandbox
```

This provisions Cognito, DynamoDB tables, and S3 in your AWS account and writes `amplify_outputs.json`.

### 3. Wire the client

Add to `src/main.tsx`:

```tsx
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
Amplify.configure(outputs);
```

### 4. Deploy backend via CI/CD

Update `amplify.yml` to include the backend deployment phase:

```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
```

> **IAM note:** Amplify's service role needs `AdministratorAccess-Amplify` to provision resources.

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Type check + build
npm run build

# Lint
npm run lint
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (custom Sam's Club / HT palette) |
| Routing | React Router v7 |
| PDF Export | jsPDF 4.x |
| State | localStorage (swap-ready for Amplify Data) |
| Backend | AWS Amplify Gen 2 (Auth + Data + Storage) |
| Database | DynamoDB via AppSync GraphQL |
| Auth | Cognito User Pool (email/password) |
| Hosting | Amplify Hosting (CI/CD via `amplify.yml`) |

---

## Project Structure

```
stocking/
├── amplify/                  # AWS Amplify Gen 2 backend
│   ├── backend.ts            # Root backend definition
│   ├── auth/resource.ts      # Cognito User Pool
│   ├── data/resource.ts      # DynamoDB models (GraphQL)
│   └── storage/resource.ts   # S3 bucket
├── src/
│   ├── components/           # Layout, Navbar, StoreBadge, ProgressBar
│   ├── data/masterCatalog.ts # 78-item seed catalog
│   ├── hooks/                # useAppState, useLocalStorage
│   ├── pages/                # Dashboard, StockingGuide, NewList, ...
│   ├── types/                # TypeScript interfaces
│   └── utils/                # Date, cost, export helpers
├── amplify.yml               # Amplify Hosting build spec
└── tailwind.config.js        # Custom color palette
```

---

## Color Palette

| Store | Color | Hex |
|-------|-------|-----|
| Sam's Club | Dark blue | `#004990` |
| Harris Teeter | Green | `#00843D` |
