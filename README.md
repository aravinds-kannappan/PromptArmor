# ClearPath Review

**Fewer rounds per asset and less reviewer time per item.** That’s the goal: help the same compliance team clear more marketing work without weakening review.

**[Try the app](https://aravinds-kannappan.github.io/PromptArmor/)** · **[GitHub](https://github.com/aravinds-kannappan/PromptArmor)**

ClearPath Financial is a fictional consumer lender. Its Excel-and-email process slows growth because reviewers receive incomplete briefs, repeat checks, and chase revisions. I built a workspace where marketers catch obvious issues before submission and reviewers spend their attention on what changed.

Marketing owns the copy. Compliance owns the decision. Leads handle exceptions. You can use the samples or add your own team and campaigns—everything stays in your browser.

## What should make reviews faster?

| Feature | Work it removes |
| --- | --- |
| Live intake checks | Marketers fix guaranteed-approval and “no credit check” claims before review, or explicitly justify them. APR, mortgage, promotional-period and email opt-out flags surface early. Justification never resolves a reviewer finding. |
| Revision diff and a narrow fast lane | Reviewers see changed text first. Whitespace-only edits to a valid approved asset can reuse evidence and checks after the same reviewer approves the delta. New words, numbers, scope or destinations require full review. |
| A/B creative pairs | Two variants share one brief, evidence set and decision. Both texts are checked separately; an issue in either blocks the pair. Less duplicated setup, not half the scrutiny. |
| Least-loaded reviewer suggestion | Intake defaults to the independent reviewer with the fewest open commitments. Marketers can override it when expertise matters. |
| Quoted findings and one version history | Feedback can quote exact text from the current creative or landing page. The owner gets actionable feedback without hunting through email. |
| Visible throughput measures | The team can see whether rounds and waiting actually decrease, rather than assuming a cleaner interface made it faster. |

## A 60-second demo

1. **0–15s:** Open **Overview**. Read first-pass approval, decision rounds, time to first decision and queue age. Sample numbers are illustrative.
2. **15–30s:** Open **New submission** and type “Guaranteed approval. No credit check.” into the copy. See the fix-or-justify gate immediately. Add creative B to see checks for each variant, then cancel.
3. **30–45s:** Switch identity to **Taylor Reed**. Open **A more confident first step**, choose **Revise approved asset**, and replace the space after the first sentence with a line break. Submit.
4. **45–60s:** Switch to **Sarah Chen**. Inspect the visible whitespace diff, enter a rationale and **Approve delta**. The original expiration remains; the new version gets its own decision snapshot.

Use a fresh browser workspace for the sample path. To explore further, submit your own campaign, request changes as its assigned reviewer, revise as its owner, then revisit Overview.

## How I would judge success

The dashboard records approvals, requests for changes and rejections. First-pass approval means the first decision approved v1. Average decision rounds counts all recorded decisions per measured asset. First-decision time starts at original submission; round turnaround starts at each submission/reopen. Open rounds appear in queue age instead of looking like completed work. A paired A/B brief counts as one asset.

These are calendar-time measures, **not measured hands-on reviewer time**. Existing browser records with incomplete decision history are excluded rather than guessed. New submissions are tracked; fresh samples include illustrative history.

For a pilot, compare similar campaign mixes and staffing against Excel/email: fewer rounds, less observed reviewer effort, and more cleared assets per reviewer per week. Track post-approval corrections too. More decisions alone could mean more churn, not more throughput. No uplift is claimed here.

## Edge cases that matter

- **Small edits can have big consequences.** Fast-lane eligibility excludes wording, numbers, states, audience, destination, policy changes, expired evidence and reviewer handoffs. It cannot extend the original approval or bypass open findings.
- **Urgency is not permission.** Rush requires an independent lead and a justification. Repeat requests cannot game priority; distribution holds remain first.
- **Fixable versus unacceptable.** Request changes permits revision. Rejection closes the campaign; renaming an identical rejected proposal does not reopen it.
- **Approval has a scope and a shelf life.** Product/state checks combine across selected markets. Unsupported markets block approval. Evidence expiry, published policy updates and revocation stop clearance while retaining history.
- **Independence and persistence.** Authors cannot approve their own work. Stale-tab writes are rejected, failed saves preserve drafts, and damaged local records have a recovery path.

## Limits and deliberate tradeoffs

GitHub Pages hosts a React/TypeScript/Vite app with browser-local storage. Identities simulate roles; they are not authentication. There is no shared database, server-enforced access control or tamper-proof audit log.

Checks and CA/NY/TX policies are fictional fixtures, not legal advice. Literal text checks can miss context. Evidence, destinations and rate/rule updates are manual. Two variants must share their scope and receive one decision; split them into separate campaigns for independent clearance. Assignment uses counts, not reviewer expertise or estimated effort. SLA calendars and active-time tracking are outside this prototype.

## Run it

Node.js 22+: `npm ci`, `npm run dev`. Validate with `npm test` and `npm run build`.

87 tests cover workflow safeguards, intake gates, variants, delta approval, assignment, metrics and persistence. GitHub Actions tests and builds before deploying. Rules live in `src/domain.ts`, persistence in `src/storage.ts`, and forms/review UI in `src/components/`.
