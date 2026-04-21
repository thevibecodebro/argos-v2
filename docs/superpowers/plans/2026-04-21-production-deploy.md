# Argos V2 Production Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a valid Vercel production deployment for the `apps/web` Next.js app, sync required production environment variables, redeploy, and verify that the live site serves the real application instead of a 404 shell.

**Architecture:** The codebase itself is currently buildable, so the release work is primarily deployment configuration. The critical fix is to reconfigure the Vercel project to build `apps/web` as a Next.js app in a monorepo, then backfill missing production secrets and verify the promoted deployment at the HTTP layer.

**Tech Stack:** Vercel, Next.js 15 App Router, npm workspaces, Supabase SSR/auth, Resend, Zoom OAuth/webhooks

---

### Task 1: Capture Current Production State

**Files:**
- Modify: `docs/superpowers/plans/2026-04-21-production-deploy.md`
- Inspect: `.vercel/project.json`
- Inspect: `README.md`

- [ ] **Step 1: Confirm the current branch and local repo cleanliness**

Run: `git branch --show-current`
Expected: `main`

Run: `git status --short`
Expected: no application code changes before remote rollout work starts

- [ ] **Step 2: Confirm the local app is buildable**

Run: `npm run test:web`
Expected: all tests pass

Run: `npm run build -w @argos-v2/web`
Expected: Next.js production build succeeds and emits routes for `/`, `/login`, `/dashboard`, and `/api/health`

- [ ] **Step 3: Confirm the current Vercel project is misconfigured**

Run: `vercel project inspect argos-v2`
Expected:
- `Root Directory` reports `.`
- `Framework Preset` reports `Other`

Run: `vercel pull --yes --environment=production`
Expected: `.vercel/project.json` includes `settings.framework: null` and `settings.rootDirectory: null`

### Task 2: Repair Vercel Project Configuration

**Files:**
- Inspect: `.vercel/project.json`
- Inspect: `README.md`

- [ ] **Step 1: Update the Vercel project to target the monorepo web app**

Target settings:
- Framework preset: `Next.js`
- Root Directory: `apps/web`
- Build Command: default
- Output Directory: default
- Install Command: default
- Include files outside root directory: enabled

Run the appropriate Vercel CLI or API command to apply those settings.
Expected: a subsequent `vercel project inspect argos-v2` shows:
- `Root Directory` as `apps/web`
- `Framework Preset` as `Next.js`

- [ ] **Step 2: Re-pull the project settings to verify the fix**

Run: `vercel pull --yes --environment=production`
Expected: `.vercel/project.json` reflects the updated remote settings for `framework` and `rootDirectory`

### Task 3: Sync Required Production Environment Variables

**Files:**
- Inspect: `.vercel/.env.production.local`
- Inspect: `apps/web/.env.local`

- [ ] **Step 1: Compare required production keys without printing secret values**

Required non-public runtime keys:
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` if production should use Drizzle repositories
- `RESEND_API_KEY`
- `ZOOM_CLIENT_SECRET`

Required public/runtime routing keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `ZOOM_CLIENT_ID`
- `ZOOM_WEBHOOK_SECRET_TOKEN`

Expected: missing production keys are identified and sourced from secure local environment values when appropriate

- [ ] **Step 2: Write missing production env vars into Vercel**

Use `vercel env` commands and pipe values from secure local sources instead of echoing secrets into terminal history.
Expected: a fresh `vercel pull --yes --environment=production` shows required keys populated for production

### Task 4: Redeploy Production

**Files:**
- Inspect: `.vercel/project.json`

- [ ] **Step 1: Trigger a fresh production deployment**

Run: `vercel --prod`
Expected: build runs against `apps/web`, detects Next.js, and completes with a non-404 deployment URL

- [ ] **Step 2: Confirm production alias assignment**

Run: `vercel inspect <deployment-url-or-id>`
Expected:
- deployment `target` is `production`
- aliases include the production hostname
- build output corresponds to the Next.js app instead of an empty root deployment

### Task 5: Verify Live Production Behavior

**Files:**
- Inspect: `apps/web/app/api/health/route.ts`

- [ ] **Step 1: Verify the deployed application responds from the real app**

Fetch:
- `/api/health`
- `/login`
- `/`

Expected:
- `/api/health` returns JSON with `ok: true`
- `/login` returns the Argos login page, not Vercel `NOT_FOUND`
- `/` returns the app landing page

- [ ] **Step 2: Check runtime logs after deploy**

Run: `vercel logs <deployment-url-or-id>`
Expected: no startup crash caused by missing server env vars

### Task 6: Clean Up Release Hygiene

**Files:**
- Modify: `apps/web/tsconfig.json` or relevant release script files if needed

- [ ] **Step 1: Confirm whether cold-start typecheck still fails before build output exists**

Run from a clean generated-state context: `npm run typecheck:web`
Expected:
- If it fails due to `.next/types` missing, patch the typecheck workflow so release preflight is repeatable on a clean checkout
- If it passes reliably, no code change is needed

- [ ] **Step 2: Re-run final verification**

Run:
- `npm run test:web`
- `npm run build -w @argos-v2/web`
- any fixed `npm run typecheck:web` flow

Expected: all verification commands pass with fresh output
