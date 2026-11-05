# ClearPath Review

A focused marketing-compliance workspace for the fictional ClearPath Financial take-home.

**Live project:** https://aravinds-kannappan.github.io/PromptArmor/

**Repository:** https://github.com/aravinds-kannappan/PromptArmor

## Short product report

### Problem and audience
Excel and email fragment intake, reviewer ownership, feedback, and approval evidence. The primary user is a compliance reviewer managing a growing queue; marketing owners and affiliate managers need a clear path from submission to actionable feedback to approval. The product increases throughput by reducing coordination and repeat review work, rather than automatically approving financial advertising.

### What I built
- A due-date-ordered queue with search, product/channel filters, assigned reviews, priority views, and summary counts.
- Structured intake capturing the exact copy, product, distribution channel, affiliate/team, audience/geographic scope, and review deadline.
- A creative preview next to advisory findings, human review checks, version history, and activity.
- Explicit changes-requested and approval decisions. Findings require a written resolution; approval requires every checklist item, a future expiry date, an assigned reviewer, and separation from the submitter.
- Revised submissions preserve previous copy, increment the version, rerun pre-checks, and invalidate prior sign-offs. Approved campaigns must be reopened before changing their creative.
- Version- and scope-specific approvals, expired approval labels, record exports, policy summaries, browser persistence, and a confirmed demo reset.
- Responsive layouts, locally bundled fonts, keyboard-operable controls, labeled forms, and native submission-dialog focus management.

### Assumptions and tradeoffs
This is an interactive product prototype using fictional data, not a production compliance system. Each evaluator gets a private copy of sample records in their own browser. The identity switcher demonstrates workflow rules; it is **not authentication or an authorization boundary**. No real customer or financial data is required.

The pre-check is a small, deterministic rule engine: it flags approval guarantees, percentage claims without APR context, and credit-inquiry claims. It is deliberately labeled advisory. It neither determines legal compliance nor comprehensively interprets offers. Policy cards are illustrative internal guidance, not a legal ruleset. Creative previews render submitted text; they do not capture live partner pages or uploaded artwork.

The demo focuses on text creative and one reviewer per campaign. Policy-library editing, file uploads/OCR, email notifications, affiliate-site monitoring, and bulk approvals are intentionally outside this slice. Approvals cannot silently carry across creative revisions, channels, or partners; a new scope requires a separate submission.

### Edge cases covered
- Unresolved findings, missing checklist items, expired/missing approval dates, self-approval, and repeat approval attempts are blocked.
- Changes requests require a reason; resolution requires rationale; unchanged/empty revisions cannot be submitted.
- Intake requires material fields, rejects past due dates and duplicate active campaign names, and limits text lengths.
- Search/filter combinations have a recoverable empty state. Past-due active reviews are highlighted; expired approvals are labeled and excluded from the current approval count.
- Storage failures surface a warning. Invalid stored JSON falls back to sample data. All entered copy renders as text, not HTML.
- An audit export includes original versions, finding rationale, scope, checks, and activity. Reset requires explicit confirmation.

### Production next steps
Replace browser storage with authenticated APIs and a transactional database. Enforce permissions and state transitions server-side, use optimistic concurrency/version checks, and maintain immutable decision snapshots in append-only audit storage. Browser records are editable and are not suitable as regulatory evidence; multiple open tabs can overwrite one another. Add policy versioning owned by counsel, product-term evidence attachments, malware-scanned asset storage, notification delivery, approval revocation/expiry jobs, and partner destination snapshots. Validate accessibility with assistive technology and expand integration/security tests before operational use.

Measure median review time, first-pass completeness, revision cycles, aged queue volume, and reviewer throughput; pair speed metrics with sampled decision quality. No throughput improvements are claimed without measured usage.

## Try the workflow
1. Open **A fresh start, with a little breathing room**. Inspect its two advisory findings; approval is blocked.
2. Enter a decision note and **Request changes**. Revise the copy to remove unqualified claims and submit version 2.
3. Inspect **Versions** and **Activity**. Complete required checks, resolve any remaining findings with rationale, set a future approval expiry, and approve.
4. Switch the demo identity to a submitter to see self-approval protection, or submit a new campaign and switch to its assigned reviewer.
5. Export a campaign or the workspace audit. Use **Reset demo** to start again.

## Run locally

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

React + TypeScript + Vite; Lucide icons; DM Sans and Manrope bundled locally. No API keys or environment secrets. GitHub Actions runs tests and the production build before publishing `dist` to GitHub Pages on pushes to `main`.

## Validation

- TypeScript checking and production build pass.
- Vitest covers approval prerequisites, self-approval, reviewer assignment, repeat decisions, and advisory rule behavior.
- Browser checks cover queue rendering, review navigation, blocked approval, checklist completion, future expiration entry, and successful approval.

The demo is intentionally browser-local. It should not be used to make real compliance or lending decisions.
