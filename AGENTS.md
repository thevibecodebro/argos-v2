# Global Skill And Plugin Routing

These rules apply globally unless a repository-level `AGENTS.md` gives narrower instructions.

## Routing Priority

- Use the narrowest matching capability. Prefer repo-specific instructions first, then a named skill, then a plugin-specific skill, then a general domain skill, then baseline tools.
- If the user explicitly names a skill or plugin, use that capability when it is installed and relevant. If it is unavailable, say so briefly and use the closest safe fallback.
- When duplicate skill names exist in marketplace mirrors or plugin caches, prefer the enabled plugin cache or user-installed skill under `$CODEX_HOME/skills`. Ignore inactive marketplace mirrors unless installing or inspecting plugins.
- Prefer connector/plugin tools for app data and app actions. Do not replace Gmail, Google Calendar, Google Drive, GitHub, or browser-use requests with ad hoc shell or web work unless the plugin path is unavailable or the user asks for a fallback.
- For implementation work, read the repo first and follow its local patterns. For unclear bugs or regressions, use a debugging workflow before proposing fixes. For completion claims, run relevant verification first.

## Installed Local Skills

- Use `skill-installer` when the user asks to list, install, reinstall, or inspect installable Codex skills from curated, experimental, or GitHub sources.
- Use `skill-creator` when creating or updating a Codex skill, including writing `SKILL.md`, bundled references, scripts, examples, and validation tasks.
- Use `plugin-creator` when creating, scaffolding, or updating a Codex plugin, plugin manifest, plugin marketplace entry, or plugin folder layout.
- Use `openai-docs` for OpenAI product, API, model, SDK, Responses API, Agents SDK, Realtime, Apps SDK, Codex, or model-upgrade questions. Use official OpenAI documentation sources first.
- Use `imagegen` when the user asks to generate or edit bitmap images, mockups, sprites, textures, illustrations, photos, or transparent-background raster assets. Prefer code/vector edits for SVG, CSS, canvas, or repo-native graphics.
- Use `playwright` when the task needs terminal-driven real-browser automation, snapshots, screenshots, form filling, scraping, UI-flow debugging, or repeatable browser actions. Prefer `browser-use` when the user explicitly wants the in-app browser.

## Enabled Plugin Routing

- Use `browser-use` for opening, navigating, clicking, typing, inspecting, or screenshotting local browser targets, especially `localhost`, `127.0.0.1`, `::1`, `file://`, or the current in-app browser tab.
- Use `computer-use` when the user asks to control visible macOS desktop apps, interact with native app UI, or inspect an on-screen desktop workflow.
- Use `github` for repositories, issues, pull requests, branches, reviews, GitHub Actions, CI failures, releases, and publishing code through GitHub.
- Use `vercel` for Vercel projects, deployments, logs, environment variables, domains, functions, storage, Next.js hosting, Vercel AI SDK, and Vercel platform configuration.
- Use `build-web-apps` for building or improving web apps, React UI, shadcn components, frontend architecture, web payments, Supabase/Postgres integration, and browser-tested frontend experiences.
- Use `game-studio` for browser games, game prototypes, game UI, Phaser, Three.js games, React Three Fiber games, sprites, asset pipelines, and playtesting.
- Use `gmail` for Gmail search, triage, message lookup, reply drafting, email summaries, labels, and inbox workflows.
- Use `google-calendar` for calendar lookup, scheduling, availability, daily briefs, meeting prep, and group scheduling.
- Use `google-drive` for Drive search and for Google Docs, Sheets, Slides, and Drive comments.
- Use `documents` for creating, editing, rendering, or exporting document artifacts in Codex.
- Use `spreadsheets` for creating, editing, analyzing, visualizing, rendering, or exporting spreadsheet files in Codex.
- Use `remotion` for React-based programmatic video, Remotion compositions, animations, captions, audio, and video rendering.
- Use `hyperframes` for HTML-to-video, GSAP-heavy motion, website capture to video, captioned videos, voiceovers, and HyperFrames registry/CLI workflows.
- Use `superpowers` for structured software-development workflows: brainstorming, planning, TDD, debugging, verification, code review, branch finishing, and parallel-agent coordination.

## Superpowers Skill Routing

- Use `using-superpowers` at the start of a session when deciding which `superpowers` workflow should govern the task.
- Use `brainstorming` before creative implementation work where behavior, UX, architecture, or product direction is not settled.
- Use `writing-plans` when the user gives requirements for a multi-step implementation and no written plan exists yet.
- Use `executing-plans` when a written plan already exists and the job is to carry it out with checkpoints.
- Use `subagent-driven-development` when executing a plan that can be split into independent implementation tracks in the current session.
- Use `dispatching-parallel-agents` when there are two or more independent tasks with no tight sequencing or shared-state dependency.
- Use `using-git-worktrees` when starting isolated feature work, risky experiments, or parallel implementation branches.
- Use `systematic-debugging` before proposing fixes for bugs, failing tests, flaky behavior, regressions, or unexplained runtime issues.
- Use `test-driven-development` before implementing a feature or bugfix when code changes are expected and test-first work is feasible.
- Use `requesting-code-review` after substantial implementation and before merge or final handoff.
- Use `receiving-code-review` when review feedback arrives and needs to be evaluated before applying changes.
- Use `verification-before-completion` before claiming something is fixed, complete, passing, or ready to merge.
- Use `finishing-a-development-branch` when implementation and verification are done and the remaining work is merge, PR, cleanup, or branch integration.
- Use `writing-skills` when creating, editing, testing, or publishing a skill.

## Build Web Apps Skill Routing

- Use `frontend-app-builder` for full frontend app implementation, major UI builds, complex component assembly, or frontend feature work.
- Use `react-best-practices` for React state, rendering, component boundaries, effects, performance, and maintainability when the task is not specifically Vercel or Next.js platform work.
- Use `shadcn-best-practices` for shadcn/ui component installation, composition, variants, theming, and component-library usage outside a Vercel-specific workflow.
- Use `stripe-best-practices` for Stripe checkout, billing, webhooks, subscriptions, payment flows, and payment-security implementation.
- Use `supabase-best-practices` for Supabase, Postgres, auth, RLS, migrations, storage, and database-backed web app work.

## Game Studio Skill Routing

- Use `game-studio` for overall browser-game direction, architecture, design choices, and deciding which game-specific skill should apply.
- Use `web-game-foundations` for project setup, loops, input, persistence, responsive canvas/layout, and shared browser-game foundations.
- Use `game-ui-frontend` for menus, HUDs, controls, overlays, scoreboards, settings, and game-facing frontend UI.
- Use `phaser-2d-game` for Phaser-based 2D games, arcade physics, tilemaps, sprites, collisions, and scenes.
- Use `three-webgl-game` for Three.js/WebGL games and custom 3D browser gameplay.
- Use `react-three-fiber-game` for React Three Fiber game scenes and React-integrated 3D gameplay.
- Use `sprite-pipeline` for generating, preparing, slicing, animating, or organizing sprite assets.
- Use `web-3d-asset-pipeline` for preparing 3D models, materials, textures, optimization, and web delivery.
- Use `game-playtest` for browser-game verification, playtesting loops, controls checks, screenshots, and gameplay QA.

## GitHub Skill Routing

- Use `github` for general GitHub repo, issue, PR, branch, review, release, and repository management tasks.
- Use `gh-fix-ci` for failing GitHub Actions or CI checks, especially when logs need inspection and targeted fixes.
- Use `gh-address-comments` when PR review comments or issue comments need to be triaged and resolved.
- Use `yeet` when the task is to publish local changes through GitHub, create a PR, or push a branch for review.

## Google And Mail Skill Routing

- Use `gmail` for Gmail search, message retrieval, thread summaries, reply drafts, label changes, and send-related Gmail work.
- Use `gmail-inbox-triage` for prioritizing inboxes, summarizing unread mail, identifying action items, or batch email triage.
- Use `google-calendar` for general calendar operations, event lookup, creation, edits, and scheduling questions.
- Use `google-calendar-daily-brief` for day or week agenda summaries.
- Use `google-calendar-free-up-time` for finding movable meetings and freeing schedule blocks.
- Use `google-calendar-group-scheduler` for finding meeting times across attendees.
- Use `google-calendar-meeting-prep` for preparing notes, context, and agenda material for calendar events.
- Use `google-drive` for Drive search, file discovery, folder organization, and Drive file operations.
- Use `google-docs` for creating, reading, or editing Google Docs.
- Use `google-sheets` for Google Sheets data reading, formulas, analysis, cleanup, or sheet editing.
- Use `google-slides` for Google Slides creation, editing, deck structure, and slide content.
- Use `google-drive-comments` for reading, writing, or resolving comments on Drive files.

## Documents And Spreadsheets Routing

- Use `documents` for local Word-style documents, PDFs, reports, exported docs, rendered document artifacts, and document transformations in Codex.
- Use `spreadsheets` for local spreadsheet creation, analysis, formula work, charts, CSV/XLSX transforms, rendered previews, and spreadsheet exports.
- If the user asks for PowerPoint, PPT, PPTX, slide deck, or presentation work and a presentation plugin is not enabled, use the closest available document or Google Slides workflow and state the fallback.

## Remotion And Hyperframes Routing

- Use `remotion` for React video compositions, animation timelines, programmatic video rendering, captioning, audio sync, and Remotion-specific debugging.
- Use `hyperframes` for HTML video compositions, HyperFrames project structure, voiceover/caption workflows, and rendered web-video pipelines.
- Use `hyperframes-cli` for HyperFrames command-line operations, rendering, project setup, or CLI troubleshooting.
- Use `hyperframes-registry` when publishing, installing, or inspecting HyperFrames registry components/templates.
- Use `website-to-hyperframes` when turning an existing website or web page into a video composition.
- Use `gsap` for GSAP animation timing, timelines, scroll/motion effects, or HTML animation work, especially inside HyperFrames.

## Browser And Automation Routing

- Use `browser` from `browser-use` when the user asks for in-app browser navigation, visual browser inspection, clicking, typing, or screenshots.
- Use `playwright` when the user asks for terminal automation, repeatable browser scripts, browser snapshots, or test-like browser verification.
- Use `agent-browser` for Vercel agent-browser workflows and browser inspection inside Vercel-specific tasks.
- Use `agent-browser-verify` when verifying a Vercel-deployed or Vercel-built browser experience with the agent browser.

## Vercel Skill Routing

- Use `workflow` for broad Vercel development workflow decisions and to choose the most specific Vercel skill.
- Use `bootstrap` for starting new Vercel apps, templates, project structure, and initial setup.
- Use `nextjs` for Next.js app-router, routing, server components, data fetching, metadata, and framework behavior.
- Use `next-forge` for next-forge monorepo/app conventions.
- Use `turbopack` for Turbopack-specific dev, build, caching, bundling, and diagnostics.
- Use `turborepo` for Turborepo workspaces, pipelines, caching, and monorepo task graphs.
- Use `react-best-practices` from Vercel when React work is inside a Vercel or Next.js project and Vercel conventions matter.
- Use `shadcn` for shadcn/ui work in Vercel or Next.js projects.
- Use `ai-sdk` for Vercel AI SDK implementation, streaming, providers, tools, and model calls.
- Use `ai-elements` for Vercel AI Elements UI components.
- Use `ai-gateway` for Vercel AI Gateway routing, provider configuration, and gateway troubleshooting.
- Use `ai-generation-persistence` for storing AI outputs, resumable generations, and persistence around AI flows.
- Use `chat-sdk` for Vercel Chat SDK and chat application patterns.
- Use `json-render` for rendering structured JSON data or AI responses in Vercel UI.
- Use `vercel-agent` for building or deploying Vercel agents.
- Use `vercel-sandbox` for Vercel Sandbox tasks and sandboxed execution.
- Use `auth` for authentication in Vercel apps.
- Use `sign-in-with-vercel` for Vercel OAuth or Sign in with Vercel flows.
- Use `payments` for Vercel commerce, checkout, subscription, or payment integration guidance.
- Use `email` for email sending, templates, and email workflows in Vercel apps.
- Use `cms` for CMS integrations and content workflows on Vercel.
- Use `marketplace` for Vercel Marketplace integrations.
- Use `cron-jobs` for scheduled jobs on Vercel.
- Use `vercel-functions` for Serverless Functions, Edge Functions, function limits, runtime behavior, and deployment issues.
- Use `routing-middleware` for Next.js/Vercel middleware, rewrites, redirects, headers, and routing behavior.
- Use `runtime-cache` for Vercel caching, runtime cache behavior, ISR/cache headers, and cache invalidation.
- Use `vercel-storage` for Vercel Blob, KV, Postgres, Edge Config, or other Vercel storage services.
- Use `vercel-queues` for queue-backed work on Vercel.
- Use `vercel-services` for managed Vercel service integrations.
- Use `env-vars` for Vercel environment variables and secret configuration.
- Use `deployments-cicd` for deployments, previews, production promotion, CI/CD, and release flow.
- Use `vercel-cli` for Vercel CLI commands and local CLI troubleshooting.
- Use `vercel-api` for Vercel REST/API usage.
- Use `vercel-firewall` for firewall, WAF, bot protection, and access control.
- Use `vercel-flags` for feature flags and Vercel Flags workflows.
- Use `observability` for logs, traces, metrics, monitoring, and debugging deployed Vercel apps.
- Use `investigation-mode` for structured Vercel platform investigations when the cause is unclear.
- Use `verification` for final Vercel verification before claiming deployment or behavior is correct.
- Use `swr` for SWR data fetching and cache patterns.
- Use `satori` for OG images and Satori-based image generation.
- Use `geist` and `geistdocs` for Geist design system and documentation-specific work.
- Use `v0-dev` for v0-related workflows and generated UI handoff.
- Use `micro` and `ncc` for legacy Vercel Node utility packages when explicitly relevant.

## Installation Notes

- Enabled plugins in `config.toml`: `browser-use`, `build-web-apps`, `computer-use`, `documents`, `game-studio`, `github`, `gmail`, `google-calendar`, `google-drive`, `hyperframes`, `remotion`, `spreadsheets`, `superpowers`, and `vercel`.
- Installed local skills under `$CODEX_HOME/skills`: `imagegen`, `openai-docs`, `playwright`, `plugin-creator`, `skill-creator`, and `skill-installer`.
- `presentations` is present in the primary runtime package but is not enabled in `config.toml`; do not treat it as installed unless it is enabled later.
