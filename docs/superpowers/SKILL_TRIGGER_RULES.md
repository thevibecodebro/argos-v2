# Superpowers Skills — Trigger Rules

These rules define when to invoke each Superpowers skill. **If there's even a 1% chance a skill applies, invoke it.** This is not optional.

---

## Universal Rule: `using-superpowers`

**Trigger:** At the start of every conversation, or any time any skill might apply.
**Rule:** Before clarifying questions, before exploration, before any action — check if any skill is relevant. Invoke it immediately.
**Red flags that mean STOP and check skills:**
- "Just a simple question"
- "Need more context first"
- "Let me explore the codebase"
- "This is overkill for this task"
- "I know what that means"

---

## `frontend-design`

**Trigger:** User asks to build web components, pages, artifacts, posters, or applications (websites, landing pages, dashboards, React components, HTML/CSS layouts, styling/beautifying any web UI).
**Rule:** Create distinctive, production-grade frontend interfaces with high design quality. Avoid generic AI aesthetics.
**What to do:**
1. **Design Thinking:** Before coding, define Purpose, Tone (pick a BOLD aesthetic direction), Constraints, and Differentiation
2. Commit to a clear conceptual direction — bold maximalism or refined minimalism, executed with precision
3. Focus on: distinctive typography (NEVER generic fonts like Inter/Roboto/Arial), cohesive color/theme, purposeful motion, unexpected spatial composition, atmospheric backgrounds/visual details
4. **NEVER** use generic AI aesthetics: overused fonts, cliched purple gradients on white, predictable layouts, cookie-cutter patterns
5. Match implementation complexity to the aesthetic vision

## `brainstorming`

**Trigger:** Creating features, building components, adding functionality, modifying behavior.
**Rule:** MUST be used before any implementation, scaffolding, or code. No "too simple to need a design" exception.
**What to do:**
1. Ask focused questions (one at a time, multiple choice preferred)
2. Propose 2-3 approaches with trade-offs
3. Write validated spec to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
4. Self-review, then get user approval
5. After approval → invoke `writing-plans` (ONLY next step)

## `writing-plans`

**Trigger:** You have an approved spec or requirements for a multi-step task.
**Rule:** Write a comprehensive plan assuming the reader has zero codebase context.
**What to do:**
1. Map file structure before defining tasks
2. Save to `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
3. Every task: exact file paths, complete code, exact commands with expected output
4. No placeholders (no TBD, TODO, "add tests", "similar to Task N")
5. Self-review for coverage, placeholders, type consistency
6. Offer execution options: Subagent-Driven (recommended) or Inline

## `executing-plans`

**Trigger:** You have a written implementation plan and need to execute it.
**Rule:** Execute task-by-task sequentially with review checkpoints.
**What to do:**
1. Load and review plan critically, raise concerns before starting
2. Execute sequentially: mark in_progress → follow steps exactly → run verifications → mark completed
3. Stop on blockers — ask, don't guess
4. After all tasks → invoke `finishing-a-development-branch`
5. MUST set up `using-git-worktrees` before starting

## `subagent-driven-development`

**Trigger:** You have an implementation plan with mostly independent tasks and want to execute in the current session.
**Rule:** Fresh subagent per task + two-stage review = high quality, fast iteration.
**Per-task flow:**
1. Dispatch implementer → implement/test/commit/self-review
2. Dispatch spec compliance reviewer → fix gaps if any
3. Dispatch code quality reviewer → fix quality issues if any
4. Mark task complete
**NEVER** dispatch multiple implementation subagents in parallel (conflicts).
MUST use `using-git-worktrees` before starting, `finishing-a-development-branch` after all tasks.

## `dispatching-parallel-agents`

**Trigger:** 2+ independent tasks with NO shared state or sequential dependencies.
**Rule:** Use when 3+ test files failing with different root causes, multiple subsystems broken independently.
**Do NOT use when:** Failures are related, need full system context, are exploratory, or share state.
**What to do:**
1. Each agent gets: specific scope, clear goal, constraints, expected output format
2. After agents return: review summaries, check for conflicts, run full test suite, integrate

## `systematic-debugging`

**Trigger:** Any bug, test failure, or unexpected behavior — BEFORE proposing fixes.
**Iron Law:** NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.
**Four phases (complete each before next):**
1. **Root Cause Investigation:** Read errors, reproduce, check recent changes, gather evidence, trace data flow
2. **Pattern Analysis:** Find working examples, compare against references, identify every difference
3. **Hypothesis and Testing:** Single hypothesis, test minimally (one variable), verify before continuing
4. **Implementation:** Create failing test first, implement single fix, verify
**If 3+ fixes failed:** STOP and question the architecture.
**Red flags:** "quick fix", "just try X", "skip the test", "probably X", "one more fix attempt"

## `test-driven-development`

**Trigger:** Implementing any feature or bugfix, before writing implementation code.
**Iron Law:** NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.
**Red-Green-Refactor cycle:**
1. **RED:** Write one minimal failing test
2. **Verify RED:** Test fails for expected reason (feature missing, not typo)
3. **GREEN:** Minimal code to pass — no over-engineering
4. **Verify GREEN:** Test passes, other tests still pass
5. **REFACTOR:** Clean up after green only, no new behavior
**Code written before test? Delete it. Start over. No exceptions.**

## `verification-before-completion`

**Trigger:** About to claim work is complete, fixed, or passing. Before committing or creating PRs.
**Iron Law:** NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.
**What to do:**
1. Identify verification command
2. Run it
3. Read output
4. Verify
5. Only then claim completion
**Red flags:** Using "should", "probably", "seems to", expressing satisfaction before verification.
**Agent delegation:** Independently verify via VCS diff, don't trust agent success reports.

## `requesting-code-review`

**Trigger:** Completing tasks, implementing major features, or before merging.
**Rule:** Mandatory after each task in subagent-driven development, after major features, before merge to main.
**What to do:**
1. Get git SHAs for base and head
2. Dispatch code-reviewer subagent with precisely crafted context
3. Act on feedback: fix Critical immediately, Important before proceeding, note Minor for later
**Never skip review because "it's simple". Never ignore Critical issues.**

## `receiving-code-review`

**Trigger:** Receiving code review feedback, before implementing suggestions.
**Rule:** Evaluate with technical rigor. No performative agreement or blind implementation.
**Order:** Read → Understand → Verify → Evaluate → Respond → Implement
**Forbidden:** "You're absolutely right!", "Great point!", "Let me implement that now" — before verification.
**If any item unclear:** STOP and clarify ALL items before implementing any.
**Push back when:** Suggestions break things, reviewer lacks context, violates YAGNI, or conflicts with decisions.
**Acknowledge correct feedback with action:** "Fixed. [description]" — no gratitude expressions.

## `finishing-a-development-branch`

**Trigger:** Implementation is complete, all tests pass, and you need to decide how to integrate the work.
**Rule:** Present exactly 4 structured options and execute the chosen workflow.
**Steps:**
1. Verify tests pass — if failing, STOP
2. Determine base branch
3. Present options: (1) Merge locally, (2) Push + create PR, (3) Keep as-is, (4) Discard
4. Execute choice
5. Cleanup worktree (except Option 3)
**Never proceed with failing tests. Never delete without confirmation.**

## `using-git-worktrees`

**Trigger:** Starting feature work that needs isolation, or before executing implementation plans.
**Rule:** Create isolated git workspace sharing the same repository.
**Safety:** MUST verify project-local directory is ignored via `git check-ignore` before creating worktree.
**Steps:**
1. Detect project name
2. Create worktree with new branch
3. Run auto-detected project setup
4. Verify clean test baseline
5. Report location
**Never create worktree without verifying ignore. Never skip baseline test verification.**

## `writing-skills`

**Trigger:** Creating new skills, editing existing skills, or verifying skills work before deployment.
**Rule:** This IS Test-Driven Development applied to process documentation.
**Iron Law:** NO SKILL WITHOUT FAILING TEST FIRST.
**RED-Green-Refactor:**
1. **RED:** Run pressure scenario WITHOUT skill, document baseline behavior and rationalizations
2. **GREEN:** Write minimal skill addressing those specific rationalizations, verify agent complies WITH skill
3. **REFACTOR:** Close loopholes, add explicit counters, build rationalization table, create red flags list
**STOP after writing ANY skill** — complete deployment checklist before moving to next.

---

## Skill Dependency Graph

```
using-superpowers (always first)
    ↓
brainstorming → writing-plans → {executing-plans | subagent-driven-development}
                                      ↓                        ↓
                            using-git-worktrees       using-git-worktrees
                                      ↓                        ↓
                            dispatching-parallel-agents (optional)
                                      ↓                        ↓
                            requesting-code-review    requesting-code-review
                                      ↓                        ↓
                            receiving-code-review     receiving-code-review
                                      ↓                        ↓
                            verification-before-completion
                                      ↓
                            finishing-a-development-branch

systematic-debugging (anytime a bug/failure occurs)
test-driven-development (anytime writing feature/bugfix code)
verification-before-completion (anytime claiming completion)
writing-skills (when creating/editing skills)
```
