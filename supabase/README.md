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
- linked remote project ref: `mlluqkmmcfqjmjqoparf`
- linked remote Postgres major version: `17`

Current blocker:

- the repo is now linked to the remote Supabase project, but no remote schema push or
  database pull has been run yet
- applying the Argos V2 migrations to the linked remote requires an explicit go-ahead,
  because it would change a real Supabase project rather than just local repo config
