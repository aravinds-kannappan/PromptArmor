# ClearPath Review

**[Live project](https://aravinds-kannappan.github.io/PromptArmor/)** · **[GitHub repository](https://github.com/aravinds-kannappan/PromptArmor)**

A browser-local compliance review product for the fictional ClearPath Financial take-home. No account, backend, or API key required. Watch the **[captioned product walkthrough](https://aravinds-kannappan.github.io/PromptArmor/walkthrough.html)** for a story-driven tour of the actual product. No audio required.

## Short product report

**Problem.** Excel and email fragment intake, ownership, feedback, and approval evidence. Reviewers spend time reconstructing context and chasing missing information. As campaign volume grows, those coordination costs consume review capacity, delay launches, and make compliance a bottleneck to growth. Marketing teams also cannot reliably tell whether a creative is ready to launch.

**Audience.** Compliance reviewers own decisions, marketing owners supply and revise creative, and the compliance lead handles escalations, policy changes, and revocations. Demo identities let an evaluator experience each role; they are not authentication.

**Core decision.** Optimize the flow of well-supported human decisions. Automated checks are advisory, not legal clearance. Separate “was approved” from “is launch-ready”: a campaign can have a historical approval and still be on hold because policy, evidence, or eligibility changed.

### How this addresses growth and throughput

**Product hypothesis:** reduce avoidable coordination work so the same compliance team can complete more reviews, allowing marketing to launch more eligible campaigns sooner. This enables growth; it does not establish increased acquisition or revenue. The assumption is that missing information, scattered feedback, and unclear ownership are material sources of delay—not simply a shortage of specialist reviewers.

| Excel/email bottleneck | Product intervention | Expected operational benefit |
| --- | --- | --- |
| Incomplete briefs trigger follow-up emails | Structured intake captures copy, distribution scope, owner, and reviewer | Fewer clarification cycles before a useful review |
| Feedback, evidence, and versions live in separate threads | One versioned campaign record with findings, supporting terms, and decisions | Less time reconstructing context and repeating checks |
| Common copy issues consume repetitive screening time | Advisory pre-checks flag potential issues; reviewers can add missed findings | More reviewer attention available for judgment |
| Work waits because the next owner or priority is unclear | Prioritized queue, reviewer workload, explicit revision ownership, and reasoned handoffs | Shorter waits between review steps |
| Marketing cannot distinguish past approval from current clearance | Launch readiness reflects current version, policy, evidence, and revocation status | Clearer launch decisions and less avoidable post-approval rework |

**Validate in a pilot:** establish an Excel/email baseline, then compare comparable product/channel/risk mixes and reviewer staffing over equal observation windows. Primary metric: completed review decisions per active reviewer per week, with approvals and requests for changes reported separately so revision churn cannot masquerade as progress. Also measure submission-to-first-decision time (median and p90), submission-to-launch-ready time, first-pass completeness, revision cycles, and backlog age. Track sampled decision quality and post-approval corrections as guardrails. Faster decisions are not a win if error or rework rates increase.

**What is demonstrated vs. proven:** the app implements the proposed workflow and displays descriptive workspace counts and elapsed approval time. It does not yet measure a before/after throughput uplift, reviewer effort, or revenue impact. Seeded records are examples, not pilot results. The browser-only prototype cannot coordinate a real team across devices; shared persistent storage, authenticated role enforcement, and notifications are prerequisites for an operational pilot.

### What is implemented

- **Bring your own work:** add custom local team members (owner, reviewer, lead), select an independent reviewer at intake, and paste or import `.txt`/`.md` campaign copy. Samples remain available. Names, copy, partners, audience, and scope are editable inputs, not fixed demo paths. Imports stay local, validate encoding/type/size, and confirm before replacing existing copy.
- **Captioned video:** a live browser recording with a visible cursor, clicks, scrolling, and timed side captions explaining edge cases, workflow tradeoffs, and production boundaries; available from the sidebar or the standalone watch link above.
- **Structured intake:** product, channel, partner, audience/geographic scope, deadline, exact creative, and affiliate destination capture. Normalized duplicate checks prevent repeated briefs and identical creative in the same distribution scope.
- **Fair review queue:** distribution holds first, then independently lead-approved rushes, then ordinary active reviews in submission order; requested due dates and self-escalations do not buy priority. Overdue work stays visible; search, product/channel filters, assigned work, launch-ready and closed views.
- **Product/state requirements:** select all distribution states at intake and revision. The checklist combines general checks, the selected product's requirements, and each state's requirements. CA, NY, and TX are explicitly fictional internal policy fixtures, not a legal rules database. Other/nationwide scope can be submitted for review but cannot be approved. State-only changes create a new version and invalidate evidence/checks. Existing records without states remain readable and need a revised brief before approval.
- **Controlled rush requests:** owners provide a business justification; only an independent lead can approve or deny it with a reason. Pending/denied requests do not change priority, repeated requests and duplicate decisions are blocked, and rush status cannot waive evidence, independence, policy, or disclosure gates. Requests for changes and new versions clear rush status. Lead capacity allocation is a deliberate human decision; this prototype does not enforce a rush quota or promise an SLA.
- **Reject vs. request changes:** assigned independent reviewers request revisions for fixable briefs or reject proposals that must not proceed. Rejection closes the record, preserves an exportable exact snapshot and reason, and cannot be reopened, approved, or disguised as withdrawal. A renamed but otherwise identical rejected offer/scope cannot be resubmitted; a materially changed proposal starts a new campaign.
- **Evidence-based decisions:** version-bound source references and terms excerpts, evidence expiration, manual findings, reasoned resolutions, required human checks, and approval rationale. Approval cannot outlive its evidence.
- **Ownership and revision controls:** only the owner revises; authors/contributors cannot approve; assigned compliance reviewers decide. Reasoned handoffs reset reviewer attestations. Creative, audience, and destination changes create a new version and invalidate evidence and sign-offs.
- **Policy lifecycle:** version history, lead-only publication, affected approval count before publishing, immediate holds on older approvals, and explicit policy acknowledgement with fresh review checks.
- **Post-approval controls:** expiration, revocation, re-review, withdrawal, and launch readiness derived from current state. No approval is silently extended. Revoking a campaign preserves the original decision.
- **Audit evidence:** exact approval snapshots include creative, scope, destination, findings, checklist, evidence, policy, actor, rationale, and expiry. Revision archives retain the previous review state. Per-decision and workspace JSON exports are available.
- **Operational overview:** reviewer workload, overdue counts, distribution holds, revision counts, and descriptive median elapsed submission-to-approval time. No unmeasured throughput improvement is claimed.
- **Browser reliability:** Web Locks serialize writes; revision checks reject stale tabs. Storage errors do not claim success. Corrupt data is preserved in read-only recovery mode; existing v1 campaigns migrate without deleting their original storage. Modal forms warn before discarding edits.

### Edge cases → product response

| Situation                                                         | Implemented response                                                                                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| An affiliate ad looks acceptable but its destination overpromises | Capture both texts; scan and review them together. HTTPS destination, named partner, and landing-page copy required.                             |
| Automated checks miss an issue                                    | Reviewer adds a manual finding and records its resolution rationale.                                                                             |
| “2% cash back” is mistaken for a loan rate                        | Rate detection requires borrowing-rate context; rewards percentages alone are not flagged.                                                       |
| A reviewer changes the copy and then approves it                  | Only the marketing owner can submit revisions; author/contributor approval is blocked by the command layer.                                      |
| A reviewer leaves mid-review                                      | Handoff requires a reason and an independent reviewer; checks and finding resolutions reset.                                                     |
| A stakeholder pressures the team to expedite a risky claim        | Explicit escalation blocks approval until lead clearance with documented rationale. Clearance does not waive other prerequisites.                |
| Terms expire before the requested approval period                 | Approval is blocked until its end date is within evidence validity.                                                                              |
| Policy changes after approval                                     | Launch clearance is removed immediately; historical approval remains exportable.                                                                 |
| An approved offer must stop immediately                           | Lead revocation records a reason and removes clearance; re-review is required to approve again.                                                  |
| Creative stays the same but audience or destination changes       | A scope-only or destination-only revision creates a new version and clears previous evidence/sign-offs.                                          |
| Two browser tabs save against different revisions                 | Stale writes are rejected under a shared Web Lock. Refresh keeps the open form’s typed draft; the command is revalidated against current state.  |
| Storage quota is exceeded or persistence fails                    | No success notification and no in-memory “saved” state. Draft remains available.                                                                 |
| Stored JSON or record structure is damaged                        | Do not overwrite it with samples; offer raw recovery export and explicit reset.                                                                  |
| A repeated click tries to approve twice                           | Busy guard plus valid-state transition checks reject duplicate decisions.                                                                        |
| A campaign is cancelled                                           | Owner or lead withdraws it with a reason; the closed record remains in the audit.                                                                |
| A tab remains open past midnight                                  | Expiration recalculates on the local date, refreshed every 30 seconds and on every command. Approval is inclusive through its recorded end date. |

### Additional domain cases exercised

| Situation | Response |
| --- | --- |
| One creative runs in two states | Both states' fixture checks are required; one state's sign-off does not cover the other. |
| Nationwide scope includes unsupported markets | Approval stays blocked; there is no generic fallback that implies coverage. |
| The owner changes only distribution states | New version, fresh evidence/checks, archived prior scope, and no inherited rush priority. |
| A submitter picks today's deadline or raises an escalation | Neither grants queue priority; normal work stays FIFO. Escalation still blocks approval until lead clearance and remains visible under Needs attention. |
| An owner asks repeatedly for rush treatment | One request per version; denial cannot be overwritten by another request. Leads must document priority tradeoffs. |
| A lead is also the campaign author | They cannot approve their own rush request or creative. Another independent lead is required. |
| A campaign is rejected, then renamed and resubmitted unchanged | The same offer and distribution scope are blocked from re-entry. |
| A card promotion omits its end conditions | Product-specific advisory flag prompts verification of duration and post-promotion terms. |
| Mortgage prequalification omits its limitations | Product-specific advisory flag calls for verification that it is not a lending commitment. |
| A non-affiliate destination uses an unsafe URL | Any supplied destination must use HTTPS and contain no embedded credentials. |
| Existing browser data predates structured states | Preserve the record and block clearance until the missing state scope and current checks are reviewed; never invent state coverage. |

**Rate and rule updates:** the lead publishes a product policy/offer-terms update to remove clearance from older approvals. This is explicit manual publication, not live rate-feed detection, scheduled effective dates, or state-specific policy versioning. Publishing prose does not automatically generate new executable disclosure rules; the fixture catalog is defined in code. These boundaries are intentional and visible rather than implied automation.

### Scope and honest limitations

Per the requested hosting constraint, the application remains on **GitHub Pages with browser-local storage**. It has no backend, real authentication, cross-device sharing, scheduled jobs, external notifications, OCR, remote file upload, or live affiliate monitoring. The local identity switcher and workflow restrictions demonstrate product behavior; users can edit browser storage or source, so neither roles nor audit records are a security boundary. Supporting evidence is a manually captured excerpt plus reference URL, not a fetched or independently verified document. Policy content and pre-checks are illustrative, not legal guidance or a complete compliance ruleset.

All mutations pass through the same tested workflow command layer. Browser-local locking prevents accidental cross-tab lost updates; it does not protect against hostile clients or other users/devices. Web Locks requires a current browser in a secure context (HTTPS or localhost); unsupported browsers remain read-only rather than silently saving unsafely. Drafts are retained in open forms after save errors and stale-state refreshes, but are not durable draft storage. Closing or navigating away can lose unsaved text; modal forms provide discard/unload warnings.

A production version would need authenticated role assignments, server-side authorization and workflow enforcement, transactional persistent storage, append-only audit retention, trusted term/policy sources, attachment scanning, notifications, and partner snapshots. Those services were intentionally not deployed after the browser-only hosting direction. Measure review time, first-pass completeness, revision loops, and queue age alongside sampled decision quality before claiming increased throughput.

## Development

Node.js 22+ and npm:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

React + TypeScript + Vite, Lucide icons, locally bundled DM Sans and Manrope. No secrets or external APIs. `src/domain.ts` owns workflow rules; `src/storage.ts` owns migration and persistence; `src/components/` contains review, intake, and shared UI. GitHub Actions tests and builds before publishing `dist` on pushes to `main`.

## Verification

- **67 automated tests** cover decision gates, date boundaries, evidence lifecycle, policy changes, escalation, authorship, handoff, revisions, revocation, withdrawal, duplicate intake, advisory precision, URL safety, record migration, corruption recovery, stale writes, quota failures, custom team roles, independent custom-reviewer approval, text-file import validation, product/state requirements, unsupported jurisdictions, rush fairness, terminal rejection, rejected-offer resubmission, and product-specific advisory checks.
- TypeScript and production build pass.
- Browser verification covers launch-ready approval and snapshots, revocation, policy-change holds, cross-tab notifications, modal draft-discard protection, custom team setup, local text import, and video playback/chapter seeking.

No real customer data or lending decisions belong in this fictional demo.

## Walkthrough media

The MP4 is served directly by GitHub Pages from `public/media/`. On-screen captions carry the narration; a WebVTT track and chapter navigation are also provided. The 3:53 video is a real Chrome tab recording, including the visible cursor, clicks, menus, scrolling, edits, and creation of a custom campaign. Timed side captions explain the workflow and edge cases. Idle pauses are trimmed and playback is slowed to 80% speed for readability. A cursor overlay follows actual pointer events and highlights clicks; the footage comes from a live tab capture.

The video predates the product/state, rush, and rejection enhancements; evaluate those flows in the current live app.

The original video stream and action timing log are in `media-source/`; `scripts/render_walkthrough.py` composites the footage and timed captions using Pillow and imageio-ffmpeg. `scripts/recording-studio.html` is a local authoring utility using Chrome’s tab-sharing picker and MediaRecorder; it is not shipped with the app. These are authoring dependencies, not app/runtime dependencies. The renderer supports macOS Arial or Linux DejaVu fonts.
