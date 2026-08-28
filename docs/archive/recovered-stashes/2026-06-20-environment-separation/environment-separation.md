# Environment Separation

Argos uses one codebase with separate secrets and service credentials for local, staging, and production. The canonical env templates live in `apps/web` because Vercel is configured with `apps/web` as the project root and the worker loads `apps/web/.env` plus `apps/web/.env.local` for local development.

## Runtime Guards

Set `APP_ENV` explicitly in every hosted environment:

- `APP_ENV=local` for local development.
- `APP_ENV=staging` for Vercel Preview/staging and staging workers.
- `APP_ENV=production` for Vercel Production and production workers.

The startup guard also checks these non-secret labels:

- `SUPABASE_ENVIRONMENT`
- `DATABASE_ENVIRONMENT`
- `OPENAI_ENVIRONMENT`

Each label must match `APP_ENV`. Production rejects staging/local labels. Local and staging reject `production` labels. Stripe is checked by key prefix: production requires `sk_live_`, while local and staging reject `sk_live_`.

Production also rejects localhost callback URLs, staging/local-looking URLs, Stripe test keys, missing `STRIPE_WEBHOOK_SECRET`, and missing production site URL.

## Local Setup

1. Copy `apps/web/.env.local.example` to `apps/web/.env.local`.
2. Start local Supabase and copy the local URL, anon key, and service-role key from `supabase status`.
3. Generate fresh local-only values for `ARGOS_TOKEN_ENCRYPTION_KEY` and `ARGOS_RATE_LIMIT_HASH_SECRET`.
4. Use Stripe test keys only: `STRIPE_SECRET_KEY=sk_test_...` and a local `STRIPE_WEBHOOK_SECRET=whsec_...`.
5. Use local/dev OpenAI keys or leave AI keys blank when not testing AI flows.
6. Run `npm run dev:web` and `npm run dev:worker` from the repo root.

Never put production Supabase, database, OpenAI, Stripe, Resend, Zoom, or GoHighLevel credentials in `apps/web/.env.local`.

## Staging Setup

Use Vercel Preview environment variables, preferably scoped to the staging branch:

```bash
vercel env add APP_ENV preview --git-branch=staging
vercel env add DATABASE_URL preview --git-branch=staging
vercel env add SUPABASE_SERVICE_ROLE_KEY preview --git-branch=staging
```

Set these staging guard labels:

- `APP_ENV=staging`
- `SUPABASE_ENVIRONMENT=staging`
- `DATABASE_ENVIRONMENT=staging`
- `OPENAI_ENVIRONMENT=staging`

Staging must use its own Supabase project/database, Stripe test-mode keys, staging webhook secrets, staging OAuth apps, and non-production OpenAI project/key material. Do not point staging at the production database or production service-role key.

## Production Setup

Use Vercel Production environment variables for the web app and Fly secrets for the worker.

Required production guard labels:

- `APP_ENV=production`
- `SUPABASE_ENVIRONMENT=production`
- `DATABASE_ENVIRONMENT=production`
- `OPENAI_ENVIRONMENT=production`

Production must use:

- `NEXT_PUBLIC_SITE_URL=https://argosrevenuecommand.com`
- `STRIPE_SECRET_KEY=sk_live_...`
- A production `STRIPE_WEBHOOK_SECRET`
- Production Supabase URL, anon key, and service-role key
- Production database URL
- Production OpenAI keys
- Production Resend, Zoom, and GoHighLevel credentials when those features are enabled

Vercel project settings:

- Framework Preset: `Next.js`
- Root Directory: `apps/web`
- Include source files outside Root Directory in the Build Step: enabled
- Automatically expose System Environment Variables: enabled

Worker deployment settings:

- Set the same `APP_ENV`, `SUPABASE_ENVIRONMENT`, `DATABASE_ENVIRONMENT`, and `OPENAI_ENVIRONMENT` labels as Fly secrets.
- Set worker secrets with `flyctl secrets import -a argos-v2-worker-jared`.
- Keep web and worker production secrets aligned, but do not reuse staging/local secrets.

## Browser Exposure Rules

Only variables prefixed with `NEXT_PUBLIC_` are intentionally exposed to the browser. In this repo, the intended public variables are:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- Vercel-provided public deployment URL variables

Do not create `NEXT_PUBLIC_` aliases for service-role keys, database URLs, Stripe secret keys, OpenAI keys, webhook secrets, OAuth client secrets, Resend keys, or token-encryption keys.

## Rotate If Leaked

Rotate these immediately if exposed:

- `SUPABASE_SERVICE_ROLE_KEY`
- Supabase database password and `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY` and scoped OpenAI keys
- `RESEND_API_KEY`
- `ZOOM_CLIENT_SECRET`
- `ZOOM_WEBHOOK_SECRET_TOKEN`
- `GHL_CLIENT_SECRET`
- `GHL_WEBHOOK_TOKEN`
- `ARGOS_TOKEN_ENCRYPTION_KEY`
- `ARGOS_RATE_LIMIT_HASH_SECRET`
- Any OAuth provider client secret or webhook signing secret

`ARGOS_TOKEN_ENCRYPTION_KEY` protects stored integration tokens. If it leaks, rotate provider tokens and plan a token re-encryption migration; changing only the env value can make existing encrypted tokens unreadable.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is public by design, but rotate it if it was bundled with other leaked Supabase credentials or if Supabase project access rules changed.
