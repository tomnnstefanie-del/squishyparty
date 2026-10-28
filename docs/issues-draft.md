# GitHub Issues

> Issues that need **no unresolved business decision** were created on GitHub on 28 Oct 2026 (table below). Everything else stays a **draft** here until the owner decides. No issue has `ai-approved` yet: the owner adds it per issue.
>
> Each issue is small enough for one agent, one branch and one pull request, and lists the files it may touch so parallel agents don't collide (see [`AGENTS_WORKFLOW.md`](AGENTS_WORKFLOW.md)).

## Created on GitHub
| ID | Issue | Priority | Notes |
|---|---|---|---|
| I1 | [#3 CI on pull requests](https://github.com/tomnnstefanie-del/squishyparty/issues/3) | P0 | Implemented in [PR #2](https://github.com/tomnnstefanie-del/squishyparty/pull/2) |
| I2 | (no issue) branch protection on `main` | P0 | Configured in repository settings; see AGENTS_WORKFLOW |
| Q2 | [#4 Tests for company quotation options](https://github.com/tomnnstefanie-del/squishyparty/issues/4) | P1 | `tests/unit.mjs` only |
| D1 | [#5 Dashboard filters and search](https://github.com/tomnnstefanie-del/squishyparty/issues/5) | P1 | `src/admin.html`, `src/styles.css` |
| D2 | [#6 Private note per booking](https://github.com/tomnnstefanie-del/squishyparty/issues/6) | P1 | touches `lib/stats.js`: not with #8 |
| D3 | [#7 Digest: overdue balances first](https://github.com/tomnnstefanie-del/squishyparty/issues/7) | P1 | `lib/digest.js` |
| R1 | [#8 Referred bookings' stage, "referred and paid"](https://github.com/tomnnstefanie-del/squishyparty/issues/8) | P1 | touches `lib/stats.js`: not with #6 |
| S1 | [#9 Partner data files (pure refactor)](https://github.com/tomnnstefanie-del/squishyparty/issues/9) | P2 | touches `src/app.js` |

Still drafts (blocked by an owner decision): Q1, Q3, D4, S2, S3, R2, B1, B2, X1.

## Labels (created on GitHub)
| Label | Meaning |
|---|---|
| `priority:P0` | Safety net; do first |
| `priority:P1` | High value, no business decision needed |
| `priority:P2` | Valuable, waits on a decision or another issue |
| `priority:P3` | Later |
| `blocked:owner-decision` | Cannot start until the owner decides (Oxx in [ROADMAP](ROADMAP.md#decisions-the-owner-needs-to-make)) |
| `area:infra` `area:quote` `area:dashboard` `area:partners` `area:referrals` `area:rebooking` `area:docs` | Area |
| `ai-approved` | Owner agrees an AI agent may pick it up and open a draft PR (the PR still needs owner review) |
| `ai-in-progress` | An agent is working on it in its own worktree |
| `needs-review` | PR ready, CI green, waiting for the owner |

## Dependency overview
```
I1 CI ──▶ I2 branch protection
I1 ──▶ every other issue (PRs need green CI)
Q2, D1, D2, D3, R1 ── independent of each other (different files)
Q1 ◀── O2
Q3 ◀── O1, O2           D4 ◀── O8
S1 ──▶ S2 ──▶ S3 (◀── O3, O4)
R1 ──▶ R2 (◀── O6, O7)
D2 ──▶ B1 ──▶ B2 (◀── O8, O9)
```

---

### I1 · Add GitHub Actions CI running `npm run check`
Labels: `priority:P0` `area:infra` `ai-approved`
Depends on: owner approval O11.
Files: `.github/workflows/ci.yml` (new) only.
- Trigger on `pull_request` and `push` to non-`main` branches. Node 20, `npm ci`, `npx playwright install --with-deps chromium`, `npm run check`.
- No secrets needed (tests use mock Telegram, file mailbox, `STATS_MEMORY=1`). `permissions: contents: read`.
- Fail if `git status --porcelain` shows `public/index.html` or `lib/catalogue.js` differ from the committed versions after the build (proves they were rebuilt).
Done when: a PR shows a green "check" job; a PR with a broken unit test shows red.

### I2 · Protect `main`
Labels: `priority:P0` `area:infra`
Depends on: I1. **Owner does this in GitHub settings** (agents can't and shouldn't).
- Require a pull request, require the CI check, block force pushes and deletion, no bypass for agents' tokens.
Done when: a direct `git push origin main` is rejected.

### Q1 · Show "Valid until" on the PDF quotation
Labels: `priority:P2` `area:quote` `blocked:owner-decision` (O2: number of days)
Files: `lib/quote-pdf.js`, `tests/unit.mjs`.
Done when: PDF shows "Valid until <date>" in Singapore time; unit test covers a year boundary. See [PRD 01](prds/01-corporate-pdf-quotations.md) Q-F3.

### Q2 · Tests for company quotation options (PO reference, package line, procurement)
Labels: `priority:P1` `area:quote` `ai-approved`
The features shipped in `718fe5d`; this issue only adds tests. No behaviour change.
Files: `tests/unit.mjs` only.
Done when: unit tests cover a PO reference containing `( ) \ <script>` (PDF still valid, text literal), package-line total = itemised total for family and company, `corporate.detailed` itemises, `procurement` adds the dashboard to-do; `npm run check` passes.

### Q3 · Payment terms and deposit on the quotation
Labels: `priority:P2` `area:quote` `blocked:owner-decision` (O1, O2)
Files: `lib/quote-pdf.js`, `lib/emails.js`, `tests/unit.mjs`.
Done when: terms text approved by the owner appears word for word.

### D1 · Dashboard filters and search
Labels: `priority:P1` `area:dashboard` `ai-approved`
Files: `src/admin.html`, `src/styles.css` (new `vNN` block). Rebuild `public/admin.html`.
Done when: filter by stage and month, search by `SP-` reference, all client-side, works at 375px wide.

### D2 · Private note per booking
Labels: `priority:P1` `area:dashboard` `ai-approved`
Files: `api/admin.js`, `lib/stats.js`, `src/admin.html`, `tests/*`.
Done when: note ≤ 280 chars saved per ref, shown with `textContent`, XSS test from PRD 02 passes, same-origin + password required.

### D3 · Digest: overdue balances first
Labels: `priority:P1` `area:dashboard` `ai-approved`
Files: `lib/digest.js`, `tests/unit.mjs`.
Done when: bookings with "Balance overdue" appear in their own top group; length limit still respected.

### D4 · Retention: delete booking records after N months
Labels: `priority:P2` `area:dashboard` `blocked:owner-decision` (O8)
Files: `lib/stats.js`, `api/admin.js`, `tests/*`.

### S1 · Partner data files (one per partner) generating `P` and `STORES`
Labels: `priority:P2` `area:partners` `ai-approved`
Files: `dev/partners/*.json` (new), `dev/partners.mjs` (new), `src/app.js` (generated section only), `lib/catalogue.js` (generated).
Done when: output is byte-identical to today's `P`/`STORES` for all four partners (pure refactor, no price change).
Note: touches `src/app.js`; don't run in parallel with B1.

### S2 · `photosApproved` flag; build refuses unapproved partner photos
Labels: `priority:P2` `area:partners`
Depends on: S1. Default value per partner is **O4: owner decision**.

### S3 · Replace demo prices with agreed prices, partner by partner
Labels: `priority:P2` `area:partners` `blocked:owner-decision` (O3)
Depends on: S1. One PR per partner.

### R1 · "Who referred whom" shows each referred booking's stage; count "referred and paid"
Labels: `priority:P1` `area:referrals` `ai-approved`
Files: `lib/stats.js` (read side only), `src/admin.html`, `tests/*`.
Note: touches `lib/stats.js` like D2; run after D2 merges or coordinate.

### R2 · Sharer credit ledger (amount 0 until approved)
Labels: `priority:P3` `area:referrals` `blocked:owner-decision` (O6, O7)
Depends on: R1.

### B1 · Signed rebook link with pre-filled planner
Labels: `priority:P3` `area:rebooking`
Depends on: owner approval of PRD 05; D2 not required.
Files: `lib/rebook.js` (new), `api/rebook.js` (new), `src/app.js`, `tests/*`.

### B2 · Opt-in marketing consent
Labels: `priority:P3` `area:rebooking` `blocked:owner-decision` (O8)

### X1 · NOMI Clicker Bar: write a PRD
Labels: `priority:P3` `area:docs` `blocked:owner-decision` (O10)
Today the header link points to `stores.html`; nothing else exists.
