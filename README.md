# ClearPath Review

**[Live project](https://aravinds-kannappan.github.io/PromptArmor/)** · **[GitHub repository](https://github.com/aravinds-kannappan/PromptArmor)**

A browser-local compliance review product for the fictional ClearPath Financial take-home. No account, backend, or API key required. Watch the **[captioned product walkthrough](https://aravinds-kannappan.github.io/PromptArmor/walkthrough.html)** for a story-driven tour of the actual product. No audio required.

## Short product report

**Problem.** Excel and email fragment intake, ownership, feedback, and approval evidence. Reviewers spend time reconstructing context; marketing teams cannot reliably tell whether a creative is ready to launch.

**Audience.** Compliance reviewers own decisions, marketing owners supply and revise creative, and the compliance lead handles escalations, policy changes, and revocations. Demo identities let an evaluator experience each role; they are not authentication.

**Core decision.** Optimize the flow of well-supported human decisions. Automated checks are advisory, not legal clearance. Separate “was approved” from “is launch-ready”: a campaign can have a historical approval and still be on hold because policy, evidence, or eligibility changed.

### What is implemented

- **Bring your own work:** add custom local team members (owner, reviewer, lead), select an independent reviewer at intake, and paste or import `.txt`/`.md` campaign copy. Samples remain available. Names, copy, partners, audience, and scope are editable inputs, not fixed demo paths. Imports stay local, validate encoding/type/size, and confirm before replacing existing copy.
- **Captioned video:** a story-led walkthrough of real app interactions with visual explanations of edge cases, workflow tradeoffs, and production boundaries; available from the sidebar or the standalone watch link above.
- **Structured intake:** product, channel, partner, audience/geographic scope, deadline, exact creative, and affiliate destination capture. Normalized duplicate checks prevent repeated briefs and identical creative in the same distribution scope.
- **Prioritized review queue:** escalations and distribution holds ahead of overdue reviews, then due dates; search, product/channel filters, assigned work, launch-ready and closed views.
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

- **53 automated tests** cover decision gates, date boundaries, evidence lifecycle, policy changes, escalation, authorship, handoff, revisions, revocation, withdrawal, duplicate intake, advisory precision, URL safety, record migration, corruption recovery, stale writes, quota failures, custom team roles, independent custom-reviewer approval, and text-file import validation.
- TypeScript and production build pass.
- Browser verification covers launch-ready approval and snapshots, revocation, policy-change holds, cross-tab notifications, modal draft-discard protection, custom team setup, local text import, and video playback/chapter seeking.

No real customer data or lending decisions belong in this fictional demo.

## Walkthrough media

The MP4 is served directly by GitHub Pages from `public/media/`. On-screen captions carry the narration; a WebVTT track and chapter navigation are also provided. The video uses actual captured product states, editorial cuts, focus crops, and animated explanatory text. It is not an unedited screen recording or a simulation of unimplemented features.

Source captures are in `media-source/frames/`; `scripts/render_walkthrough.py` assembles them with Pillow and imageio-ffmpeg. These are authoring dependencies, not app/runtime dependencies. The renderer supports macOS Arial or Linux DejaVu fonts.
