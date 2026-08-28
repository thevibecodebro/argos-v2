# Retained stash inventory — 2026-08-28

This inventory records the two recovery stashes intentionally retained after the August 2026 repository cleanup. Stash numbers can change when other stashes are deleted; the commit IDs below are stable.

Do not apply either stash wholesale to current `main`. Both were created against older bases and contain older versions of files that have since shipped or continued elsewhere.

## `6ef35d48bd7da52c3b21676a939d06038f89eb30`

- Current reference: `stash@{0}`
- Label: `2026-08-27-github-alignment: main`
- Base: `1c557b27c7676f84af3fc6c7233daa944fdc1d67`
- Intended outcome: preserve voice-balance and coaching-access work, managed-client/Intero hardening material, founder and marketplace deck artifacts, and related planning documents before returning the checkout to GitHub-aligned `main`.
- Contents: 24 tracked changes and 286 untracked files. The untracked material is primarily 253 temporary deck-generation files plus 23 documents.
- Current overlap after PR #89 merged: seven tracked files and six formerly untracked files are byte-identical to current `main`; 17 tracked files and four formerly untracked files have evolved or different versions on `main`. The managed-client/Intero outcome shipped in PR #89, while 276 stash files remain absent from `main`, mostly deck build artifacts and historical planning/security documents.
- Recommendation: retain until the owner decides whether the unique decks and planning documents should be archived outside Git or deleted. Recover individual files by commit ID rather than applying the full stash.

## `47cb9ca71c18c846c34932fa4e0032634b708f83`

- Current reference: `stash@{1}`; this was the original stash 9 before cleanup renumbered the list.
- Label: `preserve untracked files before returning to main from codex/fix-homepage-cta-copy 2026-06-11`
- Base: `aba5b08c23695f42b39712f2ec5531a26656de3a`
- Intended outcome: preserve an onboarding workspace prototype, May 2026 code/UX audit reports, Playwright screenshots, and a Supabase admin server-boundary regression test.
- Contents: 14 untracked files.
- Current overlap: the Supabase admin regression test is byte-identical to current `main` and its security outcome shipped in PR #90. The remaining 13 files are stash-only historical audits, screenshots, a test helper from the older Vitest layout, and the onboarding prototype.
- Recommendation: retain until the historical audits and onboarding prototype receive an owner decision. Do not restore the old test helper over the current Vitest layout.
