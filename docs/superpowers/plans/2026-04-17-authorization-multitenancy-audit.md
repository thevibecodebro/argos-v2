# Authorization And Multitenancy Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit the Argos API surface for authz and tenant-isolation gaps, patch the highest-risk issues with minimal shared changes, and add regression tests.

**Architecture:** Inventory all `app/api` routes, trace each route into its shared service/repository authorization path, then patch only the shared service or route guard points that create cross-org or privilege-escalation risk. Prefer explicit org/object checks close to existing authorization helpers so product behavior stays unchanged outside the security boundary.

**Tech Stack:** Next.js route handlers, shared service layer in `apps/web/lib`, Drizzle repositories in `apps/web/lib/*/repository.ts`, Vitest.

---

### Task 1: Route Surface Inventory

**Files:**
- Read: `apps/web/app/api/**/route.ts`
- Read: `apps/web/lib/*/service.ts`
- Output: audit table in final report

- [ ] Enumerate every backend route handler and its HTTP methods.
- [ ] Map each route to the shared service or repository it uses.
- [ ] Record expected role access, org scoping, and object-level access rules from the implementation.

### Task 2: High-Risk Authorization Review

**Files:**
- Read: `apps/web/lib/roleplay/service.ts`
- Read: `apps/web/lib/dashboard/service.ts`
- Read: `apps/web/lib/onboarding/service.ts`
- Read: `apps/web/lib/*/repository.ts`

- [ ] Identify routes/services that authorize by user role or rep visibility without verifying target object org.
- [ ] Identify routes that let authenticated users join or mutate org-scoped resources without an invite or admin boundary.
- [ ] Rank findings by exploitability and blast radius.

### Task 3: Regression Tests First

**Files:**
- Modify: `apps/web/lib/*.test.ts`
- Create or extend focused Vitest files around affected service/route logic

- [ ] Add failing tests for cross-org object access attempts.
- [ ] Add failing tests for rep access to manager-only/admin-only mutations.
- [ ] Add failing tests for privilege escalation paths and cross-org update/delete attempts.

### Task 4: Minimal Shared Fixes

**Files:**
- Modify only the minimal shared authz/service files implicated by failing tests

- [ ] Add explicit org-boundary validation where object-level auth currently trusts role/rep visibility alone.
- [ ] Tighten any insecure join/escalation path with the smallest behavior change required for tenant safety.
- [ ] Keep route handlers thin and reuse shared helpers or service-level checks.

### Task 5: Verification And Report

**Files:**
- Verify changed tests and impacted service files

- [ ] Run targeted Vitest suites for changed domains.
- [ ] Summarize applied patches and remaining audit findings.
- [ ] Include the route audit table and severity-ranked findings in the final response.
