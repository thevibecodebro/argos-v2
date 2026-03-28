# Supabase Setup

This directory now contains the repo-side Supabase project wiring for Argos V2:

- `config.toml`: local project configuration for the Supabase CLI
- `migrations/`: canonical SQL migrations for the app schema
- `seed.sql`: local seed data for the first dashboard summary slice

Current scope of the schema:

- `organizations`
- `users`
- `calls`

Current local dev assumptions:

- web app runs on `http://127.0.0.1:3000`
- Supabase local API on `http://127.0.0.1:54321`
- local Postgres on `127.0.0.1:54322`

Current blocker:

- no working Supabase access token or CLI is configured in this environment, so the
  actual remote Supabase project has not been provisioned or linked yet
