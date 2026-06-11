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
- hosted auth is configured for magic link + Google sign-in

Hosted project notes:

- remote schema has already been pushed to the linked Supabase project
- Google auth is backed by a dedicated Google Cloud project and OAuth client
- hosted Auth `site_url` should stay on the canonical production domain:
  `https://argosrevenuecommand.com`
- hosted Auth redirect allow-list must include localhost development callbacks, the canonical
  production domains, and Vercel preview/alias callbacks so OAuth and magic-link flows can return
  to `/auth/callback?next=...` instead of falling back to the site root
