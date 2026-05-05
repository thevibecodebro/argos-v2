# Argos Deep Page Simplicity Pass

Stitch project: `7663541137437451553`

Design system: `Argos Operational`

Goal: use Stitch as the design source for the authenticated drill-down pages before translating the layouts into the existing Argos React components. Direction stays compact, simple, and operational: dense tables, short page toolbars, split workbenches, internal subnavs, and no marketing-style hero treatment.

## Generated Screens

| Page | Stitch screen id | Screenshot file | HTML file | Status |
| --- | --- | --- | --- | --- |
| Call Detail / Review Bench | `c44391917bab4cee8b908d970525a914` | `109aece459a049799fd648121e37f432` | `f651e0cf26864b2582163de0c69fb892` | Generated |
| Upload Call / Capture | `c712654ce4bd452098d49c8dbc323f5e` | `1f247ffdef5a46929eb4b925407b4be3` | `e2cb72ea078147239087a57dde312396` | Generated |
| Team Rep Profile / Coaching Detail | `3fc9d2c449dc49cb855a18e85ba985ec` | `0698ddf363854dcaa0b3c94e269d9bc3` | `9cc54af5b8be41f0a529450015ceba4c` | Generated |
| Settings People | `f0e35e679b9f4e17aa555ffbc8d5015e` | `fd588adb10264184a695ace69bd72a59` | `2f2d81c2971c45e2b3a3d36eba3f203e` | Generated |

## Stitch Suggestions

| Page | Suggested follow-ups |
| --- | --- |
| Call Detail / Review Bench | Add a video player preview above the transcript; increase the insight drawer width; show Summary tab content instead. |
| Upload Call / Capture | Design the Analysis Ready notification view; show the Call Library screen; add a retry state for failed uploads. |
| Team Rep Profile / Coaching Detail | Show the Focus areas tab; adjust the metric strip data; add a Team average comparison to the charts. |
| Settings People | Add a bulk action menu to the table; show the Invite User modal layout; refine the filter bar for more complex queries. |

## Implementation Translation

### Call Detail / Review Bench

- Replace the current large `PageFrame`/surface header with `OperationalWorkspace`, `OperationalToolbar`, and a compact metric strip.
- Keep the existing product concepts: `Call Library`, `Review bench`, score, status, rep, duration, transcript, moments, summary, notes, highlighted moments, coaching note, `Generate roleplay`, and `Open Highlights`.
- Translate the Stitch layout into a 65/35 workbench: transcript/moments/summary/notes tabs on the left, sticky score/category/moment drawer on the right.
- Do not add a video player until the product exposes real playback. The Stitch video-player suggestion is intentionally deferred.

### Upload Call / Capture

- Replace the `PageFrame` wrapper with an operational toolbar and 3-step status strip.
- Preserve the current honest upload lifecycle: selected file, validation from `upload-contract`, XHR progress, cancel/retry, analysis state, and redirect to `/calls/[id]`.
- Use a 60/40 split: upload form and progress state on the left, limits/checklist/readiness drawer on the right.
- Keep failed-upload retry inside the existing panel state, not as a separate route.

### Team Rep Profile / Coaching Detail

- Replace the current rep profile hero with an operational toolbar, breadcrumbs, status chips, and a metric strip.
- Translate the profile body into a 65/35 coaching workbench: focus categories, weekly trend, recent calls table, and badge progress on the left; rep summary/action drawer on the right.
- Only implement a team-average comparison if the dashboard service already exposes that data or the user approves adding it.

### Settings Detail Pages

- Use the generated Settings People screen as the source template for all Settings detail pages: internal settings subnav on the left, dense main workspace in the middle, status/preview drawer on the right.
- People: member table, invite action, pending invites drawer.
- Teams: team table with managers, members, reps, and assignment state.
- Permissions: compact grants/presets matrix with role scopes and team/rep boundaries.
- Integrations: provider catalog/table for Zoom and GoHighLevel with connect/disconnect state.
- Rubrics: active rubric summary, category weights table, history list, and publish/edit actions.
- Compliance: consent/recording/safeguards status rows with the current compliance record in the drawer.

## Deferred Stitch Variants

The Stitch `generate_variants` call rejected the multi-variant settings request before generation started. If exact separate Stitch screens are needed for every settings subpage, generate them one by one from the Settings People template rather than relying on batch variants.

Recommended one-by-one prompts:

1. `Settings Teams`: Use the Settings People layout, make Teams active, and replace the table with Team, Manager, Members, Reps, Updated, Action.
2. `Settings Permissions`: Use the Settings People layout, make Permissions active, and replace the main content with a compact grants/presets matrix.
3. `Settings Integrations`: Use the Settings People layout, make Integrations active, and show Zoom and GoHighLevel provider status rows.
4. `Settings Rubrics`: Use the Settings People layout, make Rubrics active, and show active rubric, category weights, history, and publish state.
5. `Settings Compliance`: Use the Settings People layout, make Compliance active, and show consent, retention, recording, and safeguards status rows.

## Implementation Rule

Implement these deeper pages by translating the generated Stitch layouts into existing Argos primitives. Preserve route behavior, services, data models, validation, redirects, and product language.
