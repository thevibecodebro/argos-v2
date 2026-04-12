# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Run web app (Next.js on port 3000)
npm run dev:worker       # Run worker process

# Testing
npm run test:web         # Run all web tests
npm run test:worker      # Run all worker tests
npm run test:web -- --reporter=verbose  # Run with details

# Run a single test file
npx vitest run apps/web/lib/calls/service.test.ts

# Type checking
npm run typecheck:web
npm run typecheck:worker
npm run typecheck:db

# Database
npm run db:generate      # Generate Drizzle migrations
npm run db:studio        # Open Drizzle Studio
```

## Monorepo Structure

This is an npm workspaces monorepo with three packages:

- **`apps/web`** — Next.js 15 app (React 19, App Router, Tailwind v4)
- **`apps/worker`** — Node.js background worker (tsx, currently just a health-check skeleton)
- **`packages/db`** — Shared Drizzle ORM schema and client (`@argos-v2/db`)
- **`packages/ui`** — Shared UI primitives (`@argos-v2/ui`)

## Web App Architecture

### Auth & Routing
- Supabase Auth handles authentication via `@supabase/ssr`. The middleware (`apps/web/middleware.ts`) calls `updateSession` on every request.
- Auth callback lives at `/auth/callback`. Unauthenticated users are redirected by the middleware.
- All authenticated pages live under `app/(authenticated)/` and share a layout with the sidebar/shell.

### Service Layer Pattern
Business logic follows a consistent **repository / service** split:

1. **Repository interface** — defined in `lib/<domain>/service.ts` (e.g. `CallsRepository`) or `lib/<domain>/repository.ts`
2. **Drizzle implementation** — `lib/<domain>/supabase-repository.ts` (e.g. `DrizzleCallsRepository`)
3. **Factory** — `lib/<domain>/create-repository.ts` wires the concrete implementation
4. **Service functions** — pure functions in `lib/<domain>/service.ts` that accept a repository as their first arg, enabling in-process mocks in tests

Service functions return a `ServiceResult<T>` discriminated union: `{ ok: true; data: T }` or `{ ok: false; status: 400|403|404; error: string; code: ServiceErrorCode }`.

### Access Control
`lib/access/service.ts` contains the RBAC engine. Roles: `rep`, `manager`, `executive`, `admin`.

- Admins and executives have broad access.
- Managers get fine-grained per-team permissions via `teamPermissionGrants` (e.g. `view_team_calls`, `coach_team_calls`, `manage_call_highlights`).
- Call visibility for managers is determined by `buildAccessContext` → `canActorViewRep`.

An `AccessContext` is built per-request by loading team memberships and permission grants for the authenticated user's org.

### Database
`packages/db` exports a Drizzle client and all table schemas. The Supabase-hosted Postgres is accessed directly via `DATABASE_URL` using the Drizzle client (not the Supabase JS client) for all read/write operations. The Supabase JS client is only used for auth.

### Environment Variables (web)
Required in `apps/web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

### Call Evaluation (Mock)
`uploadCall` in `lib/calls/service.ts` immediately generates a deterministic mock evaluation via `buildMockEvaluation` (seeded from filename + file size). There is no real transcription/AI pipeline wired up yet — scoring is fully synthetic.

### Testing
Tests use Vitest. The service layer is tested with in-memory stub repositories — no database required. Test files live alongside the modules they test (e.g. `lib/calls/service.test.ts`).

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **argos-v2** (1958 symbols, 5800 relationships, 152 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/argos-v2/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/argos-v2/context` | Codebase overview, check index freshness |
| `gitnexus://repo/argos-v2/clusters` | All functional areas |
| `gitnexus://repo/argos-v2/processes` | All execution flows |
| `gitnexus://repo/argos-v2/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
