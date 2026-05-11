# Dependency Risk Notes - 2026-05-11

## Next/PostCSS Audit Exception

- `npm view next version` returned `16.2.6`.
- `npm view next@latest dependencies.postcss` returned `8.4.31`.
- `npm audit --omit=dev --audit-level=moderate` still reports `postcss <8.5.10` through `node_modules/next/node_modules/postcss`.
- NPM's suggested remediation is `npm audit fix --force`, which would install `next@9.3.3`. That is not acceptable for this App Router codebase.
- The advisory range in the audit output currently includes stable Next releases through `16.2.6`; clearing it appears to require waiting for a stable Next release with a patched vendored PostCSS or explicitly approving a canary/framework-channel change.

## Current Decision

Do not downgrade Next and do not move Argos to a canary framework release as part of this remediation sweep.

Keep the existing stable Next release, keep `npm run verify` as the local release gate, and recheck the stable Next/PostCSS state before the next production release.
