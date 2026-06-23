# using-git-worktrees — nano

**Trigger:** Before starting feature work or executing implementation plans.

**Non-negotiable:**
- Detect existing isolation first (Step 0). Never create nested worktree.
- Native tool before git fallback. Verify `.worktrees/` is gitignored.
- Finish with `adr-commit`, NOT `finishing-a-development-branch`.

**Output:** Isolated workspace at `<path>` with clean test baseline.

→ Full: `using-git-worktrees/SKILL.md`