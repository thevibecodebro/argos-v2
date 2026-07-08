# SOC 2 Control Matrix

| Control ID | Trust Services Criteria | Control Objective | Implementation | Evidence | Cadence | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| ARGOS-CC-001 | CC1.2, CC2.1, CC2.3, CC3.2, CC4.1 | Management defines security ownership and reviews control evidence. | SOC 2 evidence program, control matrix, evidence calendar, monthly review. | Dated evidence review notes and exception register. | Monthly | Founder / CTO |
| ARGOS-CC-002 | CC8.1, CC7.2, A1.2 | Production releases are reviewed, tested, and traceable to a commit. | Release evidence packet generated for each production deployment. | Deployment SHA, CI pass, Supabase migration list, smoke results. | Every production release | Release owner |
| ARGOS-CC-003 | CC6.1, CC6.6, CC6.7, C1.1 | Production resources are not used by non-production runtimes. | Runtime identity guard validates resource identity and environment labels. | Runtime identity tests and redacted environment inventory. | Every change and monthly | Engineering |
| ARGOS-CC-004 | CC6.1, CC6.2, CC6.3 | New users are provisioned only through approved invite or approved bootstrap path. | Invite-only provisioning gate in auth callback and provisioning service. | Invite-only tests, hosted Auth configuration evidence, invite acceptance samples. | Every auth change and monthly | Engineering |
| ARGOS-CC-005 | CC6.2, CC6.3, CC6.6, CC7.2 | Removed users lose tenant access and sessions are revoked. | Transactional member deprovisioning, session revocation adapter, audit event. | Offboarding evidence packet and user lifecycle tests. | Every user removal | Workspace admin / support owner |
