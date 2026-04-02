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
- `config.toml` currently allows localhost callbacks plus a temporary `https://**.vercel.app/**`
  wildcard so preview deployments can complete auth before a stable production URL exists
- once the first stable Vercel production URL exists, replace `auth.site_url` with that exact URL
  and tighten the wildcard redirect allow-list if you want stricter redirect policy
