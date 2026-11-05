# ClearPath Review

**[Live app](https://aravinds-kannappan.github.io/PromptArmor/)** · **[Video walkthrough](https://aravinds-kannappan.github.io/PromptArmor/walkthrough.html)** · **[Repository](https://github.com/aravinds-kannappan/PromptArmor)**

A marketing compliance workspace for fictional consumer finance company ClearPath Financial. Try the sample campaigns or add your own team and paste/import campaign copy. No account or API key required.

## Product thinking

**The bottleneck:** Excel and email scatter briefs, feedback, ownership, and approval evidence. Reviewers spend time chasing information and reconstructing context, delaying campaign launches as marketing volume grows.

**The hypothesis:** reducing that coordination work lets the same compliance team complete more reviews and helps marketing launch sooner. This assumes avoidable back-and-forth is a meaningful constraint; software alone will not solve a shortage of specialist reviewers.

The product serves three roles: marketing owners submit and revise, compliance reviewers make independent decisions, and leads handle escalations, rush priority, policy updates, and revocations.

| Decision | Why it helps |
| --- | --- |
| Structured intake with exact creative and distribution scope | Fewer clarification loops before review can begin. |
| One record for findings, evidence, revisions, and decisions | Less context reconstruction and repeated checking. |
| Clear ownership, workload visibility, and controlled priority | Less waiting between people; urgency cannot silently bypass the queue. |
| Advisory pre-checks plus mandatory human review | Routine issues surface early while judgment stays with the reviewer. |
| Separate historical approval from current launch readiness | Marketing can see whether the exact campaign is still cleared to run. |

**Measure the outcome:** compare completed decisions per reviewer per week, decision time, and revision cycles against an Excel/email baseline with similar staffing and campaign complexity. Report approvals and requests for changes separately; track decision quality and post-approval corrections so revision churn or errors do not look like productivity. The prototype demonstrates the workflow, not a measured throughput or revenue increase.

## Edge cases that shaped the product

| Situation | Implemented response |
| --- | --- |
| Disclosure requirements differ by product and state | Combine product checks with every selected state's checks. CA, NY, and TX use explicitly fictional policy fixtures; unsupported/nationwide scope blocks approval. |
| An affiliate ad is acceptable but its landing page overpromises | Capture and review both texts together. Require a named partner and HTTPS destination. |
| A rush request tries to jump the queue | Requested deadlines and self-escalations do not change priority. An independent lead must approve rush treatment with a reason; repeat requests are blocked. Distribution holds stay first, followed by approved rushes, then normal reviews in submission order. |
| A brief needs revisions versus a proposal that must not proceed | Request changes keeps the revision path open. Reject closes the campaign and retains an exportable decision snapshot. Renaming an otherwise identical rejected offer/scope cannot bypass rejection. |
| Creative stays unchanged but states, audience, or destination change | Create a new version and invalidate evidence and sign-offs. State-only revisions also require fresh review; rush priority does not carry forward. |
| Evidence expires or rates/rules change after approval | Approval cannot outlive evidence. A lead-published product policy/offer-terms update removes older approvals' clearance. Immediate revocation preserves the original decision. |
| An author tries to approve their own work, or a reviewer leaves | Block author/contributor approval. Require an independent reviewer and a reasoned handoff; reset reviewer attestations. |
| Automated screening misses a problem | Reviewers add manual findings. Product-specific flags cover promotional periods and mortgage prequalification limitations; rewards percentages alone are not treated as loan rates. |
| Two tabs write simultaneously, or browser storage fails | Reject stale writes under a shared lock. Preserve open drafts on save failures and offer recovery for corrupt data instead of silently replacing it. |

## Scope and tradeoffs

This is a **GitHub Pages, browser-local prototype**. Custom identities demonstrate permissions; they are not authenticated accounts. Data is not shared across devices, and local audit records are not tamper-proof. Older records without structured states remain readable but need revised scope before clearance.

Policy fixtures and pre-checks are illustrative, not legal guidance. Evidence is manually captured. Rate/rule updates require explicit publication; there is no live rate feed or affiliate monitoring, and publishing policy prose does not generate executable rules. A real team pilot needs shared persistent storage, server-enforced roles, durable audit history, and notifications.

The **3:53 captioned video** shows real cursor interactions and campaign creation. It predates the state, rush, and rejection additions; test those in the live app.

## Build and validation

React, TypeScript, and Vite. Node.js 22+:

```sh
npm ci
npm run dev
npm test
npm run build
```

**67 automated tests** cover workflow gates, domain edge cases, and browser persistence. Production build and desktop/mobile browser checks passed, including multi-state intake, rush approval, state-only revisions, rejection snapshots, and mobile form layout. GitHub Actions tests and builds before deployment.

Workflow rules: `src/domain.ts` · Persistence: `src/storage.ts` · UI: `src/components/` · Video source/rendering: `media-source/` and `scripts/render_walkthrough.py`.
