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
