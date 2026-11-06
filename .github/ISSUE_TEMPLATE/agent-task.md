---
name: Agent task
about: A small task one coding agent can do in one branch and one pull request
labels: []
---

**PRD:** docs/prds/…  ·  **Priority:** P0 / P1 / P2 / P3  ·  **Depends on:** #… or none

### Goal
<!-- One sentence. -->

### Approved file scope
<!-- The only files this task may change. Generated files (public/*, lib/catalogue.js) are rebuilt by npm run check. -->
- `…`

### Acceptance criteria
- [ ] …
- [ ] `npm run check` passes

### Out of scope / owner decisions
<!-- Anything marked "Needs owner approval" stays out. -->

---
Agent rules: start only when this issue has `ai-approved`; switch it to `ai-in-progress` when you start; work in your own worktree (`npm run agent:worktree -- <issue> <slug>`); open a draft PR; add `needs-review` when CI is green. Never push to or merge into `main`.
