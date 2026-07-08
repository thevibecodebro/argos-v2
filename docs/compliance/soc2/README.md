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
