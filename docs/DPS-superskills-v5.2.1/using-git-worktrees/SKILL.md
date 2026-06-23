---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace, or before executing implementation plans — ensures an isolated workspace exists, with harness-aware setup and adr-commit on finish.
---

# Using Git Worktrees

Ensure work happens in an isolated workspace. Prefer native harness tools. Fall back
to git worktrees only when no native tool is available.

**Core principle:** Detect isolation first. Use native tools. Then fall back to git.
Never fight the harness.

**Announce:** "Using using-git-worktrees to set up an isolated workspace."

---

## Pre-Check: Harness Capability

Read `docs/superskills/.skill-init` before creating anything:

```bash
cat docs/superskills/.skill-init 2>/dev/null || echo "skill-init not run — run it first"
```

Check `TASK_TOOL` field. If `TASK_TOOL: NO` → subagent dispatch won't work in this harness.
Check `HARNESS` field — affects which native worktree tool to try in Step 1a.

---

## Step 0: Detect Existing Isolation

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:**
```bash
git rev-parse --show-superproject-working-tree 2>/dev/null
# If this returns a path → you're in a submodule, treat as normal repo
```

**If `GIT_DIR != GIT_COMMON` (and not submodule):** Already in linked worktree → skip to Step 3.

Report:
- On branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace (detached HEAD, externally managed)."

**If `GIT_DIR == GIT_COMMON`:** Normal repo. Ask consent before creating worktree:
> "Would you like me to set up an isolated worktree? It protects your current branch."

Honor any existing preference without asking again. If user declines → skip to Step 3.

---

## Step 1: Create Isolated Workspace

### 1a. Native Worktree Tool (preferred)

Check for: `EnterWorktree`, `WorktreeCreate`, `/worktree`, `--worktree`.
If available → use it. Skip to Step 3.

Using `git worktree add` when a native tool exists creates phantom state. Don't.

### 1b. Git Worktree Fallback (only if no native tool)

**Directory selection (priority order):**
1. User-declared preference in instructions → use it
2. `.worktrees/` exists at project root → use it (verify ignored)
3. `worktrees/` exists → use it (verify ignored)
4. `~/.config/superskills/worktrees/<project>/` exists → use it
5. No guidance → default to `.worktrees/`

**Safety verification (project-local only):**
```bash
git check-ignore -q .worktrees 2>/dev/null || echo "NOT IGNORED"
```
If NOT ignored → add to .gitignore, commit, then proceed.

**Create:**
```bash
project=$(basename "$(git rev-parse --show-toplevel)")
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Sandbox fallback:** If `git worktree add` fails with permission error →
tell user, work in current directory instead, continue to Step 3.

---

## Step 2: Project Setup

```bash
[ -f package.json ]       && npm install
[ -f Cargo.toml ]         && cargo build
[ -f requirements.txt ]   && pip install -r requirements.txt
[ -f pyproject.toml ]     && poetry install
[ -f go.mod ]             && go mod download
```

---

## Step 3: Verify Clean Baseline

```bash
npm test / cargo test / pytest / go test ./...
```

**Tests fail:** Report failures. Ask whether to proceed or investigate first.
**Tests pass:** Report ready.

```
Worktree ready at <full-path>
Tests: N passing, 0 failures
Baseline: CLEAN
Ready to implement <feature-name>
```

---

## Finishing: `adr-commit` replaces `finishing-a-development-branch`

When work is complete, **do NOT invoke `finishing-a-development-branch`**.
Instead invoke `adr-commit` — it includes the ADR Gate and PATTERN-DEBT lifecycle
check before presenting merge options, then handles worktree cleanup identically.

---

## Quick Reference

| Situation | Action |
|---|---|
| Already in linked worktree | Skip to Step 3 |
| In submodule | Treat as normal repo |
| Native tool available | Use it (Step 1a) |
| No native tool | Git fallback (Step 1b) |
| `.worktrees/` exists | Use it (verify ignored) |
| `worktrees/` exists | Use it (verify ignored) |
| Neither exists | Default `.worktrees/` |
| Directory not ignored | Add to .gitignore + commit |
| Permission error | Sandbox fallback, work in place |
| Tests fail at baseline | Report + ask before proceeding |
| Finishing feature | Use `adr-commit`, NOT `finishing-a-development-branch` |

## Red Flags — Never

- Create a worktree when Step 0 detects existing isolation
- Use `git worktree add` when native tool exists
- Skip safety verification for project-local directories
- Proceed with failing baseline tests without asking
- Call `finishing-a-development-branch` at the end — use `adr-commit`
- Run `git worktree remove` from inside the worktree

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound skill after cycles where this skill underperformed -->
<!-- Format: [YYYY-MM-DD] What failed | Root cause | What to do instead -->
<!-- DO NOT pre-populate with speculation — real observations only -->
<!-- Example: [2026-06-01] Agent skipped risk scoring for "trivial" CSS task that touched auth config | Triage gate not read carefully | Triage gate now checks file content, not just task description -->
