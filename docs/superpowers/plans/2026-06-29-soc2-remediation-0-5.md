# SOC 2 Remediation 0-5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate the first SOC 2 readiness slice by adding governance evidence scaffolding, production evidence capture, environment resource guards, invite-only provisioning enforcement, and member offboarding/session revocation.

**Architecture:** This plan treats "0-5" as Task 0 plus audit findings F-01 through F-05 from `/Users/thevibecodebro/Projects/argos-v2/.worktrees/soc2-type-ii-readiness-audit/docs/audits/soc2-type-ii-readiness-audit-2026-06-27.md`. Documentation/evidence controls live under `docs/compliance/soc2`, release evidence is captured by a local Node script, environment separation stays in `packages/runtime-identity`, auth provisioning stays in `apps/web/lib/provisioning`, and offboarding stays in `apps/web/lib/users` with a small Supabase Auth session revocation adapter.

**Tech Stack:** TypeScript, Next.js App Router route handlers, Supabase Auth/Admin API, Drizzle ORM, Vitest, Node.js scripts, Markdown compliance evidence files.

---

## Scope Notes

This plan covers:

- Task 0: isolated branch/worktree setup and baseline.
- F-01: formal SOC 2 governance and evidence program.
- F-02: current production evidence capture.
- F-03: environment separation label/resource guard.
- F-04: hosted auth and invite-only access enforcement.
- F-05: user offboarding and session revocation.

This plan does not cover tenant-admin MFA, full tenant audit-log expansion, backup/DR, vendor inventory, AI governance, dependency scanning, or worker hardening. Those map to later SOC 2 findings and should be separate plans.

## File Structure

Create:

- `docs/compliance/soc2/README.md` - index for SOC 2 evidence process, owners, cadence, and evidence folders.
- `docs/compliance/soc2/control-matrix.md` - control-to-evidence matrix for the first Type II readiness controls.
- `docs/compliance/soc2/evidence-calendar.md` - recurring evidence schedule.
- `docs/compliance/soc2/production-release-evidence-template.md` - release evidence checklist.
- `docs/compliance/soc2/access-review-template.md` - access review evidence checklist.
- `docs/compliance/soc2/offboarding-evidence-template.md` - offboarding sample evidence checklist.
- `scripts/collect-production-evidence.mjs` - local evidence packet generator that writes redaction-safe Markdown.
- `apps/web/lib/provisioning/invite-only.ts` - invite-only provisioning policy helpers.
- `apps/web/lib/users/session-revocation.ts` - Supabase Auth session revocation adapter.
- `supabase/migrations/202606290001_member_offboarding_audit_events.sql` - audit event constraint expansion for member removal.

Modify:

- `package.json` - add `evidence:production` script.
- `packages/runtime-identity/src/index.ts` - enforce production resource identity, not only production labels.
- `apps/web/.env.example` - add production resource identity variables.
- `apps/web/lib/server-env.test.ts` - add web resource guard tests.
- `apps/worker/src/env.test.ts` - add worker resource guard tests.
- `apps/web/lib/provisioning/service.ts` - gate first-time user creation in invite-only mode.
- `apps/web/lib/provisioning/service.test.ts` - cover invite-only allow/deny/bypass behavior.
- `apps/web/lib/provisioning/repository.ts` - add pending invite lookup by email.
- `apps/web/app/auth/callback/route.ts` - sign out and redirect uninvited first-time OAuth users.
- `apps/web/lib/auth-callback-route.test.ts` - cover uninvited OAuth callback behavior.
- `apps/web/lib/invites/repository.ts` - expose pending invite lookup by email.
- `apps/web/lib/invites/supabase-repository.ts` - implement pending invite lookup by email.
- `packages/db/src/schema/auditEvents.ts` - include `member_removed` and `user`.
- `apps/web/lib/users/service.ts` - call deprovisioning and session revocation.
- `apps/web/lib/users/service.test.ts` - cover offboarding cleanup and revocation.
- `apps/web/lib/users/repository.ts` - implement transactional deprovisioning and audit event insert.
- `apps/web/app/api/organizations/members/[userId]/route.ts` - accept optional offboarding reason and ticket ID.
- `apps/web/lib/platform-audit-coverage.test.ts` - keep route coverage expectations aligned if needed.

---

### Task 0: Branch, Baseline, And Execution Guardrails

**Files:**
- Read: `/Users/thevibecodebro/Projects/argos-v2/.worktrees/soc2-type-ii-readiness-audit/docs/audits/soc2-type-ii-readiness-audit-2026-06-27.md`
- Modify: none
- Test: git/worktree state only

- [ ] **Step 1: Confirm the isolated branch and worktree**

Run:

```bash
git status --short --branch
pwd
```

Expected:

```text
## codex/soc2-remediation-0-5-plan
/Users/thevibecodebro/Projects/argos-v2/.worktrees/soc2-remediation-0-5-plan
```

- [ ] **Step 2: Install dependencies in the worktree if `node_modules` is missing**

Run:

```bash
test -d node_modules || npm install
```

Expected:

```text
added ... packages
```

If npm reports everything is already installed, continue.

- [ ] **Step 3: Confirm the plan scope against the audit**

Run:

```bash
sed -n '41,169p' /Users/thevibecodebro/Projects/argos-v2/.worktrees/soc2-type-ii-readiness-audit/docs/audits/soc2-type-ii-readiness-audit-2026-06-27.md
```

Expected: the output includes headings for F-01 through F-05.

- [ ] **Step 4: Run the focused baseline checks**

Run:

```bash
npm run typecheck -w @argos-v2/web
npm run test -w @argos-v2/web -- lib/provisioning/service.test.ts lib/users/service.test.ts lib/server-env.test.ts lib/auth-callback-route.test.ts
npm run test -w @argos-v2/worker -- src/env.test.ts
```

Expected: all commands pass before implementation. If a command fails because dependencies are missing, repeat Step 2 and rerun the command.

- [ ] **Step 5: Commit the branch setup only if setup changed tracked files**

Run:

```bash
git status --short
```

Expected: no tracked file changes from setup. Do not commit `node_modules`.

---

### Task 1: Add SOC 2 Governance And Evidence Scaffolding

**Files:**
- Create: `docs/compliance/soc2/README.md`
- Create: `docs/compliance/soc2/control-matrix.md`
- Create: `docs/compliance/soc2/evidence-calendar.md`
- Create: `docs/compliance/soc2/production-release-evidence-template.md`
- Create: `docs/compliance/soc2/access-review-template.md`
- Create: `docs/compliance/soc2/offboarding-evidence-template.md`

- [ ] **Step 1: Create the SOC 2 evidence README**

Create `docs/compliance/soc2/README.md`:

```markdown
# SOC 2 Evidence Program

Purpose: keep audit evidence for Argos SOC 2 readiness in one predictable location.

Control owner: Founder / CTO until a dedicated security owner is assigned.

Evidence rule: every evidence artifact must include the date collected, collector, source system, production environment or account reviewed, result, exceptions, and remediation owner.

Folders:

- `docs/compliance/soc2/` contains reusable procedures, templates, and the active control matrix.
- `docs/compliance/soc2/evidence/` contains dated evidence packets generated or copied during operation.

Required recurring evidence:

| Cadence | Evidence | Owner | File or System |
| --- | --- | --- | --- |
| Every production release | Deployment SHA, Supabase migration state, smoke test, provider webhook status | Release owner | `production-release-evidence-template.md` |
| Monthly | Production privileged access review | Founder / CTO | `access-review-template.md` |
| Monthly | Dependency/vulnerability review | Engineering | dependency register |
| Quarterly | Vendor review and subprocessor check | Founder / CTO | vendor inventory |
| Quarterly | Backup restore test | Engineering | backup/DR evidence |
| Every user removal | Offboarding evidence packet | Workspace admin or support owner | `offboarding-evidence-template.md` |

Exception handling:

1. Record the exception in the evidence packet.
2. Assign an owner and target remediation date.
3. Link the remediation PR, ticket, or customer approval.
4. Re-review open exceptions during the next monthly evidence review.
```

- [ ] **Step 2: Create the first control matrix**

Create `docs/compliance/soc2/control-matrix.md`:

```markdown
# SOC 2 Control Matrix

| Control ID | Trust Services Criteria | Control Objective | Implementation | Evidence | Cadence | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| ARGOS-CC-001 | CC1.2, CC2.1, CC2.3, CC3.2, CC4.1 | Management defines security ownership and reviews control evidence. | SOC 2 evidence program, control matrix, evidence calendar, monthly review. | Dated evidence review notes and exception register. | Monthly | Founder / CTO |
| ARGOS-CC-002 | CC8.1, CC7.2, A1.2 | Production releases are reviewed, tested, and traceable to a commit. | Release evidence packet generated for each production deployment. | Deployment SHA, CI pass, Supabase migration list, smoke results. | Every production release | Release owner |
| ARGOS-CC-003 | CC6.1, CC6.6, CC6.7, C1.1 | Production resources are not used by non-production runtimes. | Runtime identity guard validates resource identity and environment labels. | Runtime identity tests and redacted environment inventory. | Every change and monthly | Engineering |
| ARGOS-CC-004 | CC6.1, CC6.2, CC6.3 | New users are provisioned only through approved invite or approved bootstrap path. | Invite-only provisioning gate in auth callback and provisioning service. | Invite-only tests, hosted Auth configuration evidence, invite acceptance samples. | Every auth change and monthly | Engineering |
| ARGOS-CC-005 | CC6.2, CC6.3, CC6.6, CC7.2 | Removed users lose tenant access and sessions are revoked. | Transactional member deprovisioning, session revocation adapter, audit event. | Offboarding evidence packet and user lifecycle tests. | Every user removal | Workspace admin / support owner |
```

- [ ] **Step 3: Create the evidence calendar**

Create `docs/compliance/soc2/evidence-calendar.md`:

```markdown
# SOC 2 Evidence Calendar

## Monthly Evidence Review

Run during the first week of each month.

Checklist:

- [ ] Review GitHub, Vercel, Supabase, Fly, Stripe, OpenAI, Resend, Zoom, GoHighLevel, and platform staff access.
- [ ] Review dependency advisories and exception owners.
- [ ] Review production release evidence packets from the prior month.
- [ ] Review platform support sessions and tenant-impacting admin actions.
- [ ] Record exceptions with owner and remediation date.

## Quarterly Evidence Review

Run during the first week of each quarter.

Checklist:

- [ ] Refresh vendor SOC reports, DPAs, and subprocessor list.
- [ ] Run a backup restore test into a non-production environment.
- [ ] Run an incident response tabletop.
- [ ] Review data retention and deletion samples.
- [ ] Review production environment inventory and resource identifiers.

## Evidence File Naming

Use this format:

```text
YYYY-MM-DD-<control-id>-<short-description>.md
```

Example:

```text
2026-07-01-ARGOS-CC-002-production-release.md
```
```

- [ ] **Step 4: Create the production release evidence template**

Create `docs/compliance/soc2/production-release-evidence-template.md`:

```markdown
# Production Release Evidence

Date:
Collector:
Release owner:
Git branch:
Git commit:
Production URL:

## Required Evidence

| Evidence | Result | Source |
| --- | --- | --- |
| GitHub PR approved |  | GitHub PR URL |
| Required CI passed |  | GitHub Actions URL |
| Vercel deployment SHA matches Git commit |  | Vercel deployment URL |
| Fly worker release reviewed |  | Fly release output |
| Supabase migrations current |  | Supabase migration list |
| Redacted production env inventory reviewed |  | Vercel/Fly/Supabase export |
| `/api/health` responds |  | HTTP output |
| Auth callback smoke test completed |  | Browser or Playwright output |
| Webhook endpoints reviewed |  | Stripe/Zoom/GHL provider dashboards |
| Rollback path identified |  | Prior deployment or revert plan |

## Exceptions

| Exception | Severity | Owner | Remediation Date |
| --- | --- | --- | --- |

## Signoff

Release owner:
Reviewer:
```

- [ ] **Step 5: Create the access review template**

Create `docs/compliance/soc2/access-review-template.md`:

```markdown
# Access Review Evidence

Date:
Reviewer:
Scope:

## Systems Reviewed

| System | Admins Reviewed | Exceptions | Evidence Source |
| --- | --- | --- | --- |
| GitHub |  |  |  |
| Vercel |  |  |  |
| Supabase |  |  |  |
| Fly |  |  |  |
| Stripe |  |  |  |
| OpenAI |  |  |  |
| Resend |  |  |  |
| Zoom |  |  |  |
| GoHighLevel |  |  |  |
| Argos platform staff |  |  |  |

## Required Checks

- [ ] Every admin has a current business need.
- [ ] Departed users are removed.
- [ ] Shared accounts are documented or eliminated.
- [ ] MFA is enabled where supported.
- [ ] Exceptions have owners and remediation dates.

## Signoff

Reviewer:
Approver:
```

- [ ] **Step 6: Create the offboarding evidence template**

Create `docs/compliance/soc2/offboarding-evidence-template.md`:

```markdown
# User Offboarding Evidence

Date:
Removed user email:
Removed user ID:
Organization:
Removing admin:
Reason:
Ticket or approval reference:

## System Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| User removed from organization |  |  |
| User role cleared |  |  |
| Team memberships removed |  |  |
| Team permission grants removed |  |  |
| Manager assignments removed |  |  |
| Pending invites revoked |  |  |
| Supabase Auth sessions revoked |  |  |
| Audit event recorded |  |  |

## Exceptions

| Exception | Owner | Remediation Date |
| --- | --- | --- |

## Signoff

Executor:
Reviewer:
```

- [ ] **Step 7: Verify the documents contain the required control anchors**

Run:

```bash
rg -n "ARGOS-CC-001|ARGOS-CC-002|ARGOS-CC-003|ARGOS-CC-004|ARGOS-CC-005|Access Review Evidence|User Offboarding Evidence" docs/compliance/soc2
```

Expected: matches in the files created above.

- [ ] **Step 8: Commit the governance scaffolding**

Run:

```bash
git add docs/compliance/soc2
git commit -m "docs: add soc2 evidence program scaffolding"
```

Expected: commit succeeds with only `docs/compliance/soc2/*` staged.

---

### Task 2: Add Production Evidence Packet Generator

**Files:**
- Create: `scripts/collect-production-evidence.mjs`
- Modify: `package.json`
- Test: `docs/compliance/soc2/evidence/<generated-file>.md`

- [ ] **Step 1: Write the evidence generator script**

Create `scripts/collect-production-evidence.mjs`:

```javascript
#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const evidenceDir = path.join(repoRoot, "docs", "compliance", "soc2", "evidence");
const now = new Date();
const stamp = now.toISOString().slice(0, 10);

function run(command, args) {
  try {
    return execFileSync(command, args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const stderr = error && typeof error === "object" && "stderr" in error
      ? String(error.stderr)
      : "";
    return `UNAVAILABLE: ${command} ${args.join(" ")} failed${stderr ? `: ${stderr.trim()}` : ""}`;
  }
}

function listLatestMigrations() {
  const migrationsDir = path.join(repoRoot, "supabase", "migrations");
  if (!existsSync(migrationsDir)) {
    return ["UNAVAILABLE: supabase/migrations directory is missing"];
  }

  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .slice(-10);
}

function readPackageScripts() {
  const source = readFileSync(path.join(repoRoot, "package.json"), "utf8");
  const pkg = JSON.parse(source);
  return pkg.scripts ?? {};
}

const gitBranch = run("git", ["branch", "--show-current"]);
const gitCommit = run("git", ["rev-parse", "HEAD"]);
const gitStatus = run("git", ["status", "--short"]);
const packageScripts = readPackageScripts();
const latestMigrations = listLatestMigrations();

const output = `# Production Release Evidence Packet

Date collected: ${now.toISOString()}
Collector: ${process.env.USER ?? "unknown-local-user"}
Control IDs: ARGOS-CC-002, ARGOS-CC-003, ARGOS-CC-004

## Local Repository State

| Evidence | Result |
| --- | --- |
| Git branch | ${gitBranch || "UNAVAILABLE"} |
| Git commit | ${gitCommit || "UNAVAILABLE"} |
| Git status | ${gitStatus ? `Non-empty: ${gitStatus.replaceAll("\n", "; ")}` : "Clean"} |

## Verification Scripts Present

| Script | Command |
| --- | --- |
${Object.entries(packageScripts)
  .filter(([name]) => name.startsWith("verify") || name.startsWith("test") || name.startsWith("typecheck") || name === "build:web")
  .map(([name, command]) => `| ${name} | \`${command}\` |`)
  .join("\n")}

## Latest Supabase Migrations In Repo

${latestMigrations.map((migration) => `- ${migration}`).join("\n")}

## Manual Evidence To Attach

| Required Evidence | Source System | Result |
| --- | --- | --- |
| Vercel production deployment SHA matches Git commit | Vercel |  |
| Vercel production env inventory reviewed without secret values | Vercel |  |
| Fly worker release matches intended image/config | Fly |  |
| Fly worker production env labels reviewed without secret values | Fly |  |
| Hosted Supabase migration list matches repo migrations | Supabase |  |
| Hosted Supabase Auth signup/provider/redirect settings reviewed | Supabase |  |
| Supabase private storage bucket settings reviewed | Supabase |  |
| Stripe webhook delivery tested after release | Stripe |  |
| Zoom webhook delivery tested after release | Zoom |  |
| GoHighLevel webhook delivery tested after release | GoHighLevel |  |
| OpenAI account retention/training settings reviewed | OpenAI |  |
| Auth callback smoke test completed | Browser or Playwright |  |
| Invite-only negative signup test completed | Browser or Playwright |  |
| Rollback deployment identified | Vercel/Fly/GitHub |  |

## Exceptions

| Exception | Severity | Owner | Remediation Date |
| --- | --- | --- | --- |

## Signoff

Release owner:
Reviewer:
`;

mkdirSync(evidenceDir, { recursive: true });
const outputPath = path.join(evidenceDir, `${stamp}-ARGOS-CC-002-production-release.md`);
writeFileSync(outputPath, output);
console.log(outputPath);
```

- [ ] **Step 2: Add the package script**

Modify the root `package.json` scripts block to include:

```json
"evidence:production": "node scripts/collect-production-evidence.mjs"
```

The scripts block should keep the existing entries and add this line after `verify`.

- [ ] **Step 3: Run the generator**

Run:

```bash
npm run evidence:production
```

Expected: the command prints a path like:

```text
/Users/thevibecodebro/Projects/argos-v2/.worktrees/soc2-remediation-0-5-plan/docs/compliance/soc2/evidence/2026-06-29-ARGOS-CC-002-production-release.md
```

- [ ] **Step 4: Verify generated packet content**

Run:

```bash
rg -n "Vercel production deployment SHA|Hosted Supabase Auth|Invite-only negative signup|ARGOS-CC-002" docs/compliance/soc2/evidence
```

Expected: matches in the generated evidence packet.

- [ ] **Step 5: Commit the evidence generator**

Run:

```bash
git add package.json scripts/collect-production-evidence.mjs docs/compliance/soc2/evidence
git commit -m "chore: add production evidence packet generator"
```

Expected: commit succeeds with the script, package script, and generated evidence packet staged.

---

### Task 3: Enforce Production Resource Identity In Runtime Guard

**Files:**
- Modify: `packages/runtime-identity/src/index.ts`
- Modify: `apps/web/.env.example`
- Modify: `apps/web/lib/server-env.test.ts`
- Modify: `apps/worker/src/env.test.ts`

- [ ] **Step 1: Add failing web tests for production resource detection**

Append these tests to `apps/web/lib/server-env.test.ts` inside the existing `describe("getServerEnv", ...)` block:

```typescript
  it("rejects production Supabase resources when the runtime is labeled development", () => {
    expect(() =>
      getServerEnv({
        APP_ENV: "development",
        NEXT_PUBLIC_SUPABASE_URL: "https://mlluqkmmcfqjmjqoparf.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SUPABASE_ENVIRONMENT: "development",
        ARGOS_PRODUCTION_SUPABASE_PROJECT_REF: "mlluqkmmcfqjmjqoparf",
      }),
    ).toThrow("production Supabase resource requires APP_ENV=production");
  });

  it("rejects production database resources when the runtime is labeled preview", () => {
    expect(() =>
      getServerEnv({
        APP_ENV: "preview",
        NEXT_PUBLIC_SUPABASE_URL: "https://preview-project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_SITE_URL: "https://preview.example.com",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SUPABASE_ENVIRONMENT: "preview",
        DATABASE_URL: "postgres://postgres:postgres@db.mlluqkmmcfqjmjqoparf.supabase.co:5432/postgres",
        DATABASE_ENVIRONMENT: "preview",
        ARGOS_PRODUCTION_DATABASE_HOST: "db.mlluqkmmcfqjmjqoparf.supabase.co",
      }),
    ).toThrow("production database resource requires APP_ENV=production");
  });
```

- [ ] **Step 2: Add failing worker tests for production resource detection**

Append this test to `apps/worker/src/env.test.ts` inside the existing `describe("getWorkerEnv", ...)` block:

```typescript
  it("rejects production worker resources when APP_ENV is not production", () => {
    expect(() =>
      getWorkerEnv({
        CALL_PROCESSING_ENABLED: "true",
        APP_ENV: "development",
        DATABASE_URL: "postgres://postgres:postgres@db.mlluqkmmcfqjmjqoparf.supabase.co:5432/postgres",
        DATABASE_ENVIRONMENT: "development",
        OPENAI_API_KEY: "openai-key",
        OPENAI_ENVIRONMENT: "development",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SUPABASE_URL: "https://mlluqkmmcfqjmjqoparf.supabase.co",
        SUPABASE_ENVIRONMENT: "development",
        ARGOS_PRODUCTION_SUPABASE_PROJECT_REF: "mlluqkmmcfqjmjqoparf",
        ARGOS_PRODUCTION_DATABASE_HOST: "db.mlluqkmmcfqjmjqoparf.supabase.co",
      }),
    ).toThrow("production Supabase resource requires APP_ENV=production");
  });
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm run test -w @argos-v2/web -- lib/server-env.test.ts
npm run test -w @argos-v2/worker -- src/env.test.ts
```

Expected: both fail because `assertPrivilegedRuntimeIdentity` does not inspect production resource identifiers yet.

- [ ] **Step 4: Implement resource identity detection**

Replace `packages/runtime-identity/src/index.ts` with:

```typescript
export type RuntimeIdentityEnv = Partial<Record<string, string | undefined>>;

export type PrivilegedRuntimeIdentityOptions = {
  databaseUrl?: string | null;
  env: RuntimeIdentityEnv;
  openaiApiKey?: string | null;
  requireDatabase?: boolean;
  requireOpenAi?: boolean;
  requireSupabase?: boolean;
  supabaseUrl?: string | null;
};

const PRODUCTION_ENVIRONMENT = "production";
const DEFAULT_PRODUCTION_FLY_APP_NAME = "argos-v2-worker-jared";

function readEnvValue(env: RuntimeIdentityEnv, key: string) {
  const value = env[key]?.trim();

  return value || null;
}

function normalizeEnvValue(value: string | null) {
  return value?.toLowerCase() ?? null;
}

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function isProductionFlyApp(env: RuntimeIdentityEnv) {
  const flyAppName = readEnvValue(env, "FLY_APP_NAME");
  const expectedFlyAppName =
    readEnvValue(env, "ARGOS_PRODUCTION_FLY_APP_NAME") ?? DEFAULT_PRODUCTION_FLY_APP_NAME;

  return Boolean(flyAppName && flyAppName === expectedFlyAppName);
}

function isProductionRuntime(env: RuntimeIdentityEnv) {
  const appEnv = normalizeEnvValue(readEnvValue(env, "APP_ENV"));
  const vercelEnv = normalizeEnvValue(readEnvValue(env, "VERCEL_ENV"));
  const nextPublicVercelEnv = normalizeEnvValue(readEnvValue(env, "NEXT_PUBLIC_VERCEL_ENV"));

  return (
    appEnv === PRODUCTION_ENVIRONMENT ||
    vercelEnv === PRODUCTION_ENVIRONMENT ||
    nextPublicVercelEnv === PRODUCTION_ENVIRONMENT ||
    isProductionFlyApp(env)
  );
}

function getHostname(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function getSupabaseProjectRef(value: string | null | undefined) {
  const hostname = getHostname(value);
  const match = hostname?.match(/^([a-z0-9]{20})\.supabase\.co$/);

  return match?.[1] ?? null;
}

function usesProductionSupabaseResource(env: RuntimeIdentityEnv, supabaseUrl: string | null | undefined) {
  const productionProjectRef = normalizeEnvValue(readEnvValue(env, "ARGOS_PRODUCTION_SUPABASE_PROJECT_REF"));
  const currentProjectRef = normalizeEnvValue(getSupabaseProjectRef(supabaseUrl));

  return Boolean(productionProjectRef && currentProjectRef === productionProjectRef);
}

function usesProductionDatabaseResource(env: RuntimeIdentityEnv, databaseUrl: string | null | undefined) {
  const productionDatabaseHost = normalizeEnvValue(readEnvValue(env, "ARGOS_PRODUCTION_DATABASE_HOST"));
  const currentDatabaseHost = normalizeEnvValue(getHostname(databaseUrl));

  return Boolean(productionDatabaseHost && currentDatabaseHost === productionDatabaseHost);
}

function assertProductionLabel(env: RuntimeIdentityEnv, key: string) {
  const value = normalizeEnvValue(readEnvValue(env, key));

  if (value !== PRODUCTION_ENVIRONMENT) {
    throw new Error(
      `Production environment identity guard failed: expected ${key}=production.`,
    );
  }
}

function assertDeploymentLabelConsistency(env: RuntimeIdentityEnv) {
  const appEnv = normalizeEnvValue(readEnvValue(env, "APP_ENV"));
  const vercelEnv = normalizeEnvValue(readEnvValue(env, "VERCEL_ENV"));
  const nextPublicVercelEnv = normalizeEnvValue(readEnvValue(env, "NEXT_PUBLIC_VERCEL_ENV"));

  if (appEnv === PRODUCTION_ENVIRONMENT && vercelEnv && vercelEnv !== PRODUCTION_ENVIRONMENT) {
    throw new Error(
      `Production environment identity guard failed: APP_ENV=production conflicts with VERCEL_ENV=${vercelEnv}.`,
    );
  }

  if (
    appEnv === PRODUCTION_ENVIRONMENT &&
    nextPublicVercelEnv &&
    nextPublicVercelEnv !== PRODUCTION_ENVIRONMENT
  ) {
    throw new Error(
      `Production environment identity guard failed: APP_ENV=production conflicts with NEXT_PUBLIC_VERCEL_ENV=${nextPublicVercelEnv}.`,
    );
  }
}

function assertProductionResourceLabels(
  env: RuntimeIdentityEnv,
  options: {
    databaseUrl?: string | null;
    openaiApiKey?: string | null;
    requireDatabase: boolean;
    requireOpenAi: boolean;
    requireSupabase: boolean;
    supabaseUrl?: string | null;
  },
) {
  const usesProductionSupabase = usesProductionSupabaseResource(env, options.supabaseUrl);
  const usesProductionDatabase = usesProductionDatabaseResource(env, options.databaseUrl);

  if (usesProductionSupabase) {
    const appEnv = normalizeEnvValue(readEnvValue(env, "APP_ENV"));

    if (appEnv !== PRODUCTION_ENVIRONMENT) {
      throw new Error(
        "Production environment identity guard failed: production Supabase resource requires APP_ENV=production.",
      );
    }
  }

  if (usesProductionDatabase) {
    const appEnv = normalizeEnvValue(readEnvValue(env, "APP_ENV"));

    if (appEnv !== PRODUCTION_ENVIRONMENT) {
      throw new Error(
        "Production environment identity guard failed: production database resource requires APP_ENV=production.",
      );
    }
  }

  if (usesProductionSupabase || isProductionRuntime(env)) {
    assertDeploymentLabelConsistency(env);
    assertProductionLabel(env, "APP_ENV");
  }

  if (options.requireSupabase || hasValue(options.supabaseUrl) || usesProductionSupabase) {
    assertProductionLabel(env, "SUPABASE_ENVIRONMENT");
  }

  if (options.requireDatabase || hasValue(options.databaseUrl) || usesProductionDatabase) {
    assertProductionLabel(env, "DATABASE_ENVIRONMENT");
  }

  if (options.requireOpenAi || hasValue(options.openaiApiKey)) {
    assertProductionLabel(env, "OPENAI_ENVIRONMENT");
  }
}

export function assertPrivilegedRuntimeIdentity({
  databaseUrl,
  env,
  openaiApiKey,
  requireDatabase = false,
  requireOpenAi = false,
  requireSupabase = false,
  supabaseUrl,
}: PrivilegedRuntimeIdentityOptions) {
  const guardedByRuntime = isProductionRuntime(env);
  const guardedByResource =
    usesProductionSupabaseResource(env, supabaseUrl) ||
    usesProductionDatabaseResource(env, databaseUrl);

  if (!guardedByRuntime && !guardedByResource) {
    return;
  }

  assertProductionResourceLabels(env, {
    databaseUrl,
    openaiApiKey,
    requireDatabase,
    requireOpenAi,
    requireSupabase,
    supabaseUrl,
  });
}
```

- [ ] **Step 5: Add resource identity variables to the env example**

Add these lines to `apps/web/.env.example` after `DATABASE_ENVIRONMENT=development`:

```dotenv
ARGOS_PRODUCTION_SUPABASE_PROJECT_REF=
ARGOS_PRODUCTION_DATABASE_HOST=
```

- [ ] **Step 6: Run the focused env tests**

Run:

```bash
npm run test -w @argos-v2/web -- lib/server-env.test.ts
npm run test -w @argos-v2/worker -- src/env.test.ts
```

Expected: both pass.

- [ ] **Step 7: Commit the runtime identity guard**

Run:

```bash
git add packages/runtime-identity/src/index.ts apps/web/.env.example apps/web/lib/server-env.test.ts apps/worker/src/env.test.ts
git commit -m "fix: guard production resources by identity"
```

Expected: commit succeeds with only runtime identity and env-test files staged.

---

### Task 4: Enforce Invite-Only Provisioning For New Auth Users

**Files:**
- Create: `apps/web/lib/provisioning/invite-only.ts`
- Modify: `apps/web/lib/provisioning/service.ts`
- Modify: `apps/web/lib/provisioning/service.test.ts`
- Modify: `apps/web/lib/provisioning/repository.ts`
- Modify: `apps/web/lib/invites/repository.ts`
- Modify: `apps/web/lib/invites/supabase-repository.ts`
- Modify: `apps/web/app/auth/callback/route.ts`
- Modify: `apps/web/lib/auth-callback-route.test.ts`

- [ ] **Step 1: Add invite-only policy helpers**

Create `apps/web/lib/provisioning/invite-only.ts`:

```typescript
export class InviteOnlyProvisioningError extends Error {
  constructor(email: string) {
    super(`No active Argos invite exists for ${email}`);
    this.name = "InviteOnlyProvisioningError";
  }
}

export function normalizeProvisioningEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isInviteOnlyProvisioningEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.ARGOS_INVITE_ONLY === "true";
}

function readEmailSet(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map(normalizeProvisioningEmail)
      .filter(Boolean),
  );
}

export function canBypassInviteOnlyProvisioning(
  email: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const normalizedEmail = normalizeProvisioningEmail(email);
  const bootstrapAdminEmails = readEmailSet(env.ARGOS_BOOTSTRAP_ADMIN_EMAILS);
  const platformBootstrapOwnerEmails = readEmailSet(env.ARGOS_PLATFORM_BOOTSTRAP_OWNER_EMAILS);
  const trustedPlatformOwnerEmails = readEmailSet(env.ARGOS_PLATFORM_TRUSTED_OWNER_EMAILS);

  return (
    bootstrapAdminEmails.has(normalizedEmail) ||
    platformBootstrapOwnerEmails.has(normalizedEmail) ||
    trustedPlatformOwnerEmails.has(normalizedEmail)
  );
}
```

- [ ] **Step 2: Extend provisioning repository types**

Modify `apps/web/lib/provisioning/service.ts` so `ProvisioningRepository` includes:

```typescript
  findPendingInviteByEmail(email: string): Promise<{ id: string; orgId: string; email: string } | null>;
```

Add these imports at the top:

```typescript
import {
  canBypassInviteOnlyProvisioning,
  InviteOnlyProvisioningError,
  isInviteOnlyProvisioningEnabled,
  normalizeProvisioningEmail,
} from "./invite-only";
```

Then replace the first-time create block with:

```typescript
  const normalizedEmail = normalizeProvisioningEmail(user.email);

  if (
    isInviteOnlyProvisioningEnabled() &&
    !canBypassInviteOnlyProvisioning(normalizedEmail)
  ) {
    const pendingInvite = await repository.findPendingInviteByEmail(normalizedEmail);

    if (!pendingInvite) {
      throw new InviteOnlyProvisioningError(normalizedEmail);
    }
  }

  const { firstName, lastName } = getNameParts(user);

  await repository.createUser({
    id: user.id,
    orgId: null,
    email: normalizedEmail,
    role: null,
    firstName,
    lastName,
    displayNameSet: Boolean(firstName || lastName),
  });
```

- [ ] **Step 3: Add failing provisioning service tests**

Modify the `createRepository` helper in `apps/web/lib/provisioning/service.test.ts` to include:

```typescript
    findPendingInviteByEmail: vi.fn(),
```

Add these tests inside `describe("ensureUserProvisioned", ...)`:

```typescript
  it("blocks first-time users without an invite when invite-only provisioning is enabled", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "true");
    const repository = createRepository({
      findUserById: vi.fn().mockResolvedValue(null),
      findPendingInviteByEmail: vi.fn().mockResolvedValue(null),
      createUser: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      ensureUserProvisioned(repository, {
        id: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
        email: "NewUser@Argos.ai",
        user_metadata: {},
      }),
    ).rejects.toThrow("No active Argos invite exists for newuser@argos.ai");

    expect(repository.createUser).not.toHaveBeenCalled();
  });

  it("allows first-time invited users when invite-only provisioning is enabled", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "true");
    const repository = createRepository({
      findUserById: vi.fn().mockResolvedValue(null),
      findPendingInviteByEmail: vi.fn().mockResolvedValue({
        id: "invite-1",
        orgId: "org-1",
        email: "newuser@argos.ai",
      }),
      createUser: vi.fn().mockResolvedValue(undefined),
    });

    const result = await ensureUserProvisioned(repository, {
      id: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      email: "NewUser@Argos.ai",
      user_metadata: {},
    });

    expect(result).toEqual({
      userId: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      orgId: null,
      created: true,
    });
    expect(repository.createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: "newuser@argos.ai",
    }));
  });

  it("allows bootstrap admins to provision without an invite", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "true");
    vi.stubEnv("ARGOS_BOOTSTRAP_ADMIN_EMAILS", "owner@argos.ai");
    const repository = createRepository({
      findUserById: vi.fn().mockResolvedValue(null),
      findPendingInviteByEmail: vi.fn().mockResolvedValue(null),
      createUser: vi.fn().mockResolvedValue(undefined),
    });

    const result = await ensureUserProvisioned(repository, {
      id: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      email: "owner@argos.ai",
      user_metadata: {},
    });

    expect(result.created).toBe(true);
    expect(repository.findPendingInviteByEmail).not.toHaveBeenCalled();
  });
```

Add `afterEach` to the import and test file cleanup if not present:

```typescript
afterEach(() => {
  vi.unstubAllEnvs();
});
```

- [ ] **Step 4: Run provisioning tests to verify they fail**

Run:

```bash
npm run test -w @argos-v2/web -- lib/provisioning/service.test.ts
```

Expected: failure because `findPendingInviteByEmail` and invite-only helpers are not fully wired yet.

- [ ] **Step 5: Implement pending invite lookup in Supabase provisioning repository**

Modify `apps/web/lib/provisioning/repository.ts`:

Add this type:

```typescript
type PendingInviteRow = Pick<Tables<"invites">, "id" | "org_id" | "email">;
```

Add this method to `SupabaseProvisioningRepository`:

```typescript
  async findPendingInviteByEmail(email: string) {
    const { data, error } = await this.supabase
      .from("invites")
      .select("id, org_id, email")
      .eq("email", email.trim().toLowerCase())
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const invite = data as PendingInviteRow | null;

    return invite
      ? {
          id: invite.id,
          orgId: invite.org_id,
          email: invite.email,
        }
      : null;
  }
```

- [ ] **Step 6: Mirror pending invite lookup in invite repositories**

Modify `apps/web/lib/invites/repository.ts` and add:

```typescript
  findPendingInviteByEmail(email: string): Promise<InviteRecord | null>;
```

Modify `apps/web/lib/invites/supabase-repository.ts` and add:

```typescript
  async findPendingInviteByEmail(email: string): Promise<InviteRecord | null> {
    const now = new Date();
    const normalizedEmail = normalizeInviteRepositoryEmail(email);
    const [row] = await this.db
      .select()
      .from(invitesTable)
      .where(
        and(
          eq(invitesTable.email, normalizedEmail),
          isNull(invitesTable.acceptedAt),
          gt(invitesTable.expiresAt, now),
        ),
      )
      .limit(1);
    return row ? mapInvite(row) : null;
  }
```

- [ ] **Step 7: Update auth callback for invite-only failures**

Modify `apps/web/app/auth/callback/route.ts`:

Add import:

```typescript
import { InviteOnlyProvisioningError } from "@/lib/provisioning/invite-only";
```

Wrap provisioning in a try/catch:

```typescript
        let provisionedUser;

        try {
          provisionedUser = await ensureUserProvisioned(
            new SupabaseProvisioningRepository(),
            user,
          );
        } catch (error) {
          if (error instanceof InviteOnlyProvisioningError) {
            await supabase.auth.signOut();
            return NextResponse.redirect(`${origin}/auth/error?reason=invite_required`);
          }

          throw error;
        }
```

Remove the previous direct `const provisionedUser = await ensureUserProvisioned(...)` block.

- [ ] **Step 8: Run focused auth/provisioning tests**

Run:

```bash
npm run test -w @argos-v2/web -- lib/provisioning/service.test.ts lib/auth-callback-route.test.ts lib/invite-only-auth-config.test.ts
```

Expected: all pass after updating any route mocks in `lib/auth-callback-route.test.ts` to include `signOut: vi.fn()`.

- [ ] **Step 9: Commit invite-only provisioning enforcement**

Run:

```bash
git add apps/web/lib/provisioning apps/web/lib/invites apps/web/app/auth/callback/route.ts apps/web/lib/auth-callback-route.test.ts
git commit -m "fix: enforce invite-only user provisioning"
```

Expected: commit succeeds with provisioning/auth files staged.

---

### Task 5: Implement Member Offboarding Cleanup And Session Revocation

**Files:**
- Create: `apps/web/lib/users/session-revocation.ts`
- Create: `supabase/migrations/202606290001_member_offboarding_audit_events.sql`
- Modify: `packages/db/src/schema/auditEvents.ts`
- Modify: `apps/web/lib/users/service.ts`
- Modify: `apps/web/lib/users/service.test.ts`
- Modify: `apps/web/lib/users/repository.ts`
- Modify: `apps/web/app/api/organizations/members/[userId]/route.ts`

- [ ] **Step 1: Add audit-event migration for member removal**

Create `supabase/migrations/202606290001_member_offboarding_audit_events.sql`:

```sql
alter table public.audit_events
  drop constraint if exists audit_events_event_type_check;

alter table public.audit_events
  add constraint audit_events_event_type_check
  check (event_type in ('call_exported', 'call_deleted', 'member_removed'));

alter table public.audit_events
  drop constraint if exists audit_events_resource_type_check;

alter table public.audit_events
  add constraint audit_events_resource_type_check
  check (resource_type in ('call', 'user'));
```

- [ ] **Step 2: Update audit event schema**

Modify `packages/db/src/schema/auditEvents.ts`:

```typescript
    eventType: text("event_type", {
      enum: ["call_exported", "call_deleted", "member_removed"],
    }).notNull(),
    resourceType: text("resource_type", {
      enum: ["call", "user"],
    }).notNull(),
```

- [ ] **Step 3: Add session revocation adapter**

Create `apps/web/lib/users/session-revocation.ts`:

```typescript
import { getServerEnv } from "@/lib/server-env";

export interface AuthSessionRevoker {
  revokeUserSessions(userId: string): Promise<void>;
}

export class SupabaseAuthSessionRevoker implements AuthSessionRevoker {
  async revokeUserSessions(userId: string) {
    const { supabaseUrl, supabaseServiceRoleKey } = getServerEnv();
    const response = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}/logout`,
      {
        method: "POST",
        headers: {
          apikey: supabaseServiceRoleKey,
          authorization: `Bearer ${supabaseServiceRoleKey}`,
        },
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Failed to revoke Supabase sessions for ${userId}: ${response.status} ${body.slice(0, 200)}`,
      );
    }
  }
}
```

- [ ] **Step 4: Extend users service interfaces**

Modify `apps/web/lib/users/service.ts`.

Add import:

```typescript
import type { AuthSessionRevoker } from "./session-revocation";
```

Add to `UsersRepository`:

```typescript
  deprovisionOrganizationMember(input: {
    actorId: string;
    orgId: string;
    reason: string;
    targetUserId: string;
    ticketId: string | null;
  }): Promise<boolean>;
```

Replace the call to `repository.removeOrganizationMember(targetUserId, viewer.orgId);` in `removeOrganizationMember` with:

```typescript
  const reason =
    typeof options.reason === "string" && options.reason.trim()
      ? options.reason.trim()
      : "Organization admin removed member";
  const ticketId =
    typeof options.ticketId === "string" && options.ticketId.trim()
      ? options.ticketId.trim()
      : null;

  const removed = await repository.deprovisionOrganizationMember({
    actorId: viewer.id,
    orgId: viewer.orgId,
    reason,
    targetUserId,
    ticketId,
  });

  if (!removed) {
    return {
      ok: false,
      status: 404,
      error: "Member not found in your organization",
    };
  }

  if (options.sessionRevoker) {
    await options.sessionRevoker.revokeUserSessions(targetUserId);
  }
```

Update the function signature:

```typescript
export async function removeOrganizationMember(
  repository: UsersRepository,
  authUserId: string,
  targetUserId: string,
  options: {
    reason?: unknown;
    sessionRevoker?: AuthSessionRevoker;
    ticketId?: unknown;
  } = {},
): Promise<ServiceResult<{ success: true }>> {
```

- [ ] **Step 5: Add failing offboarding service tests**

Modify `apps/web/lib/users/service.test.ts`.

Update `createRepository` to include:

```typescript
    deprovisionOrganizationMember: vi.fn(),
```

Replace the final removal test expectation with:

```typescript
    expect(repository.deprovisionOrganizationMember).toHaveBeenCalledWith({
      actorId: "user-1",
      orgId: "org-1",
      reason: "Organization admin removed member",
      targetUserId: "user-2",
      ticketId: null,
    });
```

Add this test inside `describe("removeOrganizationMember", ...)`:

```typescript
  it("deprovisions a member with reason, ticket, cleanup, and session revocation", async () => {
    const sessionRevoker = {
      revokeUserSessions: vi.fn().mockResolvedValue(undefined),
    };
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminUser),
      findOrganizationMember: vi.fn().mockResolvedValue({
        id: "user-2",
        orgId: "org-1",
        role: "rep",
      }),
      deprovisionOrganizationMember: vi.fn().mockResolvedValue(true),
    });

    const result = await removeOrganizationMember(
      repository,
      "user-1",
      "user-2",
      {
        reason: "Employee left customer account",
        ticketId: "SUP-123",
        sessionRevoker,
      },
    );

    expect(result).toEqual({
      ok: true,
      data: { success: true },
    });
    expect(repository.deprovisionOrganizationMember).toHaveBeenCalledWith({
      actorId: "user-1",
      orgId: "org-1",
      reason: "Employee left customer account",
      targetUserId: "user-2",
      ticketId: "SUP-123",
    });
    expect(sessionRevoker.revokeUserSessions).toHaveBeenCalledWith("user-2");
  });
```

- [ ] **Step 6: Run service tests to verify failure**

Run:

```bash
npm run test -w @argos-v2/web -- lib/users/service.test.ts
```

Expected: failure until repository interface and service implementation are updated.

- [ ] **Step 7: Implement transactional deprovisioning in Drizzle repository**

Modify imports in `apps/web/lib/users/repository.ts`:

```typescript
import { and, count, eq, or } from "drizzle-orm";
import {
  auditEventsTable,
  callsTable,
  getDb,
  invitesTable,
  organizationsTable,
  repManagerAssignmentsTable,
  teamMembershipsTable,
  teamPermissionGrantsTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
```

Add this method to `DrizzleUsersRepository`:

```typescript
  async deprovisionOrganizationMember(input: {
    actorId: string;
    orgId: string;
    reason: string;
    targetUserId: string;
    ticketId: string | null;
  }) {
    return this.db.transaction(async (tx) => {
      const [member] = await tx
        .select({
          id: usersTable.id,
          email: usersTable.email,
          role: usersTable.role,
        })
        .from(usersTable)
        .where(and(eq(usersTable.id, input.targetUserId), eq(usersTable.orgId, input.orgId)))
        .limit(1);

      if (!member) {
        return false;
      }

      await tx
        .delete(teamPermissionGrantsTable)
        .where(
          and(
            eq(teamPermissionGrantsTable.orgId, input.orgId),
            or(
              eq(teamPermissionGrantsTable.userId, input.targetUserId),
              eq(teamPermissionGrantsTable.grantedBy, input.targetUserId),
            ),
          ),
        );

      await tx
        .delete(repManagerAssignmentsTable)
        .where(
          and(
            eq(repManagerAssignmentsTable.orgId, input.orgId),
            or(
              eq(repManagerAssignmentsTable.repId, input.targetUserId),
              eq(repManagerAssignmentsTable.managerId, input.targetUserId),
            ),
          ),
        );

      await tx
        .delete(teamMembershipsTable)
        .where(
          and(
            eq(teamMembershipsTable.orgId, input.orgId),
            eq(teamMembershipsTable.userId, input.targetUserId),
          ),
        );

      await tx
        .delete(invitesTable)
        .where(and(eq(invitesTable.orgId, input.orgId), eq(invitesTable.email, member.email)));

      await tx
        .update(usersTable)
        .set({
          orgId: null,
          role: null,
          updatedAt: new Date(),
        })
        .where(and(eq(usersTable.id, input.targetUserId), eq(usersTable.orgId, input.orgId)));

      await tx.insert(auditEventsTable).values({
        orgId: input.orgId,
        actorId: input.actorId,
        eventType: "member_removed",
        resourceType: "user",
        resourceId: input.targetUserId,
        metadata: {
          reason: input.reason,
          ticketId: input.ticketId,
          removedUserEmail: member.email,
          removedUserRole: member.role,
        },
      });

      return true;
    });
  }
```

- [ ] **Step 8: Update the member removal route to pass evidence fields and revoke sessions**

Modify `apps/web/app/api/organizations/members/[userId]/route.ts`.

Add import:

```typescript
import { SupabaseAuthSessionRevoker } from "@/lib/users/session-revocation";
```

Change the DELETE signature and body:

```typescript
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const { userId } = await context.params;
    const payload = request.headers.get("content-type")?.includes("application/json")
      ? ((await request.json()) as { reason?: unknown; ticketId?: unknown })
      : {};
    const repository = await createEffectiveTenantUsersRepository(
      createUsersRepository(),
      authUser.id,
    );

    return fromServiceResult(
      await removeOrganizationMember(repository, authUser.id, userId, {
        reason: payload.reason,
        ticketId: payload.ticketId,
        sessionRevoker: new SupabaseAuthSessionRevoker(),
      }),
    );
  } catch (error) {
    console.error("Failed to remove organization member", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 9: Run focused tests and schema typecheck**

Run:

```bash
npm run test -w @argos-v2/web -- lib/users/service.test.ts
npm run typecheck -w @argos-v2/db
npm run typecheck -w @argos-v2/web
```

Expected: all pass.

- [ ] **Step 10: Commit offboarding cleanup**

Run:

```bash
git add supabase/migrations/202606290001_member_offboarding_audit_events.sql packages/db/src/schema/auditEvents.ts apps/web/lib/users apps/web/app/api/organizations/members/[userId]/route.ts
git commit -m "fix: deprovision removed organization members"
```

Expected: commit succeeds with offboarding, audit schema, migration, and route files staged.

---

## Final Verification

- [ ] **Step 1: Run full database verification**

Run:

```bash
npm run verify:db
```

Expected: typecheck passes.

- [ ] **Step 2: Run full web verification**

Run:

```bash
npm run verify:web
```

Expected: typecheck, Vitest, and build pass.

- [ ] **Step 3: Run worker verification**

Run:

```bash
npm run verify:worker
```

Expected: typecheck and Vitest pass.

- [ ] **Step 4: Generate a fresh production evidence packet**

Run:

```bash
npm run evidence:production
```

Expected: a dated file is written under `docs/compliance/soc2/evidence/`.

- [ ] **Step 5: Inspect final changed files**

Run:

```bash
git status --short
git log --oneline -5
```

Expected: working tree is clean after the planned commits, and recent commits match the task commit messages.

## Self-Review Checklist

- Spec coverage: Tasks 1-5 map directly to F-01 through F-05, and Task 0 handles the "own branch" execution boundary.
- Placeholder scan: The plan contains concrete file paths, commands, code blocks, expected outputs, and exact commit messages.
- Type consistency: `deprovisionOrganizationMember`, `AuthSessionRevoker`, `findPendingInviteByEmail`, and runtime identity variable names are used consistently across service, repository, route, and tests.
