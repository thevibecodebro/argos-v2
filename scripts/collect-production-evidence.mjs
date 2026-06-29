#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = resolveRepoRoot();
const evidenceDir = path.join(repoRoot, "docs", "compliance", "soc2", "evidence");
const now = new Date();
const stamp = formatTimestamp(now);

function resolveRepoRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const stderr = error && typeof error === "object" && "stderr" in error
      ? String(error.stderr).trim()
      : "";
    console.error(`Unable to resolve repository root${stderr ? `: ${stderr}` : ""}`);
    process.exit(1);
  }
}

function formatTimestamp(date) {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}Z`;
}

function markdownTableCell(value) {
  return String(value)
    .replaceAll("|", "\\|")
    .replace(/\r?\n/g, "<br>");
}

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
const gitShortCommit = run("git", ["rev-parse", "--short=7", "HEAD"]);
const gitStatus = run("git", ["status", "--short"]);
const packageScripts = readPackageScripts();
const latestMigrations = listLatestMigrations();
const gitStatusSummary = gitStatus ? `Non-empty: ${gitStatus}` : "Clean";

const output = `# Production Release Evidence Packet

Date collected: ${now.toISOString()}
Collector: ${process.env.USER ?? "unknown-local-user"}
Control IDs: ARGOS-CC-002, ARGOS-CC-003, ARGOS-CC-004

## Local Repository State

| Evidence | Result |
| --- | --- |
| Git branch | ${markdownTableCell(gitBranch || "UNAVAILABLE")} |
| Git commit | ${markdownTableCell(gitCommit || "UNAVAILABLE")} |
| Git status | ${markdownTableCell(gitStatusSummary)} |

## Verification Scripts Present

| Script | Command |
| --- | --- |
${Object.entries(packageScripts)
  .filter(([name]) => name.startsWith("verify") || name.startsWith("test") || name.startsWith("typecheck") || name === "build:web")
  .map(([name, command]) => `| ${markdownTableCell(name)} | \`${markdownTableCell(command)}\` |`)
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
const shortSha = gitShortCommit && !gitShortCommit.startsWith("UNAVAILABLE:")
  ? gitShortCommit
  : "unknown";
const outputPath = path.join(evidenceDir, `${stamp}-${shortSha}-ARGOS-CC-002-production-release.md`);
if (existsSync(outputPath)) {
  console.error(`Refusing to overwrite existing evidence packet: ${outputPath}`);
  process.exit(1);
}
writeFileSync(outputPath, output);
console.log(outputPath);
