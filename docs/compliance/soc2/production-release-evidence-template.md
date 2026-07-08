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
