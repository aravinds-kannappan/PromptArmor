import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CircleCheck,
  Download,
  FileText,
  AlertTriangle,
  Plus,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import {
  approvalError,
  checks,
  currentPolicy,
  isReviewer,
  launchBlockers,
  membersOf,
  isLead,
  safeUrl,
  type Action,
  type Campaign,
  type Workspace,
} from "../domain";
import { Badge, Dialog, displayDate, download } from "./shared";
type Props = {
  c: Campaign;
  workspace: Workspace;
  person: string;
  today: string;
  back: () => void;
  run: (a: Action) => Promise<boolean>;
};
export function Review({ c, workspace, person, today, back, run }: Props) {
  const [tab, setTab] = useState("Findings"),
    [note, setNote] = useState(""),
    [expires, setExpires] = useState(c.expires || ""),
    [findingNotes, setFindingNotes] = useState<Record<string, string>>({}),
    [modal, setModal] = useState(""),
    [busy, setBusy] = useState(false);
  const policy = currentPolicy(workspace, c.product),
    blockers = launchBlockers(c, policy, today);
  const independent =
    isReviewer(person, workspace) &&
    c.reviewer === person &&
    !c.contributors.includes(person) &&
    c.owner !== person;
  const canReview = c.status === "In review" && independent;
  const error = approvalError(
    { ...c, expires },
    person,
    today,
    policy,
    workspace,
  );
  const perform = async (a: Action) => {
    if (busy) return false;
    setBusy(true);
    try {
      return await run(a);
    } finally {
      setBusy(false);
    }
  };
  const reasonAction = (type: string) => setModal(type);
  return (
    <>
      <button className="back" onClick={back}>
        <ArrowLeft size={16} /> Back to queue
      </button>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {c.id} / VERSION {c.version} / POLICY v{c.policyVersion}
          </div>
          <h1 className="detail-title">{c.title}</h1>
          <p>
            {c.product} · {c.channel} · {c.partner}
          </p>
        </div>
        <Badge c={c} policy={policy} today={today} />
      </div>
      <div className="detail-meta">
        <span>
          Owner <b>{c.owner}</b>
        </span>
        <span>
          Reviewer <b>{c.reviewer}</b>
        </span>
        <span>
          Due <b>{displayDate(c.due)}</b>
        </span>
        {["In review", "Changes requested", "Revoked"].includes(c.status) &&
          (isLead(person, workspace) || person === c.reviewer) && (
            <button className="text-button" onClick={() => setModal("assign")}>
              Hand off review
            </button>
          )}
        <button
          className="text-button"
          onClick={() =>
            download(
              {
                exportedAt: new Date().toISOString(),
                currentPolicy: policy,
                campaign: c,
              },
              `${c.id}-audit.json`,
            )
          }
        >
          <Download size={15} /> Export record
        </button>
      </div>
      {c.escalated && (
        <div className="notice warning-tone">
          <AlertTriangle size={20} />
          <div>
            <b>Escalated to compliance lead</b>
            <p>{c.escalated}</p>
          </div>
          {isLead(person, workspace) && (
            <button
              className="secondary"
              onClick={() => reasonAction("clearEscalation")}
            >
              Clear escalation
            </button>
          )}
        </div>
      )}
      {c.policyVersion !== policy && (
        <div className="notice warning-tone">
          <ShieldCheck size={20} />
          <div>
            <b>Policy changed since this review</b>
            <p>
              Reviewed against v{c.policyVersion}; current policy is v{policy}.
              This creative is not cleared for launch.
            </p>
          </div>
          {canReview && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => perform({ type: "ackPolicy", id: c.id })}
            >
              Acknowledge v{policy}
            </button>
          )}
        </div>
      )}
      {c.status === "Approved" && (
        <div
          className={
            "notice " + (blockers.length ? "warning-tone" : "success-tone")
          }
        >
          <ShieldCheck size={22} />
          <div>
            <b>
              {blockers.length
                ? "Hold distribution — re-review required"
                : "Launch ready for the recorded scope"}
            </b>
            <p>
              {blockers.length
                ? blockers.join(" · ")
                : `Approved through ${displayDate(c.expires!)}. New creative, scope, or destination requires another review.`}
            </p>
          </div>
        </div>
      )}
      <div className="review-layout">
        <section className="panel creative">
          <div className="panel-title">
            <span>
              <FileText size={17} /> Exact creative · v{c.version}
            </span>
            <span className="muted">Illustrative preview</span>
          </div>
          <div className="creative-stage">
            <div className="ad">
              <div className="ad-brand">
                <ShieldCheck size={20} /> clearpath.
              </div>
              <span className="ad-kicker">
                A LITTLE CLARITY. A LOT OF POSSIBILITY.
              </span>
              <h2>{c.title}</h2>
              <p>{c.copy}</p>
              <div className="ad-cta">
                Explore your options <ArrowUpRight size={18} />
              </div>
              <small>Illustrative creative · {c.channel}</small>
            </div>
          </div>
          <div className="scope">
            <h4>Approval scope</h4>
            <p>{c.scope}</p>
            <small>
              Bound to this product, channel, partner, creative version,
              destination, and policy version.
            </small>
          </div>
          {(c.destination || c.channel === "Affiliate") && (
            <div className="scope">
              <h4>Destination evidence</h4>
              {safeUrl(c.destination) ? (
                <a
                  href={c.destination}
                  target="_blank"
                  rel="noreferrer"
                  className="reference-link"
                >
                  {c.destination}
                  <ArrowUpRight size={14} />
                </a>
              ) : (
                <p>Destination not yet recorded.</p>
              )}
              <p className="preserve">
                {c.destinationCopy ||
                  "Captured landing-page copy is required before approval."}
              </p>
              <small>
                Manually captured copy. This app does not monitor the live page.
              </small>
            </div>
          )}
          {c.status === "Changes requested" && (
            <div className="revision">
              <h3>Revision requested</h3>
              <p>
                {c.history.find(
                  (h) =>
                    h.text.includes("Requested changes") ||
                    h.text.includes("requested changes"),
                )?.text || "Review the recorded feedback in Activity."}
              </p>
              {person === c.owner ? (
                <button className="primary" onClick={() => setModal("revise")}>
                  Revise creative and scope <ArrowRight size={16} />
                </button>
              ) : (
                <div className="form-note">
                  Switch demo identity to {c.owner} to submit the revision.
                  Reviewers cannot author and approve the same creative.
                </div>
              )}
            </div>
          )}
        </section>
        <section className="panel review-panel">
          <div
            className="detail-tabs"
            role="tablist"
            aria-label="Review sections"
          >
            {["Findings", "Checklist", "Evidence", "Activity", "Versions"].map(
              (t) => (
                <button
                  role="tab"
                  aria-selected={tab === t}
                  className={tab === t ? "selected" : ""}
                  key={t}
                  onClick={() => setTab(t)}
                >
                  {t}
                  {t === "Findings" && (
                    <span>{c.findings.filter((f) => !f.resolved).length}</span>
                  )}
                </button>
              ),
            )}
          </div>
          <div className="review-body" role="tabpanel" aria-label={tab}>
            {tab === "Findings" && (
              <>
                <div className="assist-label">
                  <ShieldCheck size={16} /> Automated pre-check{" "}
                  <span>Advisory only</span>
                </div>
                <p className="small muted">
                  Checks cover submitted creative and destination copy. No flags
                  does not mean compliant. Add issues the pre-check missed.
                </p>
                {!c.findings.length && (
                  <div className="no-findings">
                    <CircleCheck />
                    <h3>No automated flags</h3>
                    <p>
                      Human verification and current evidence are still
                      required.
                    </p>
                  </div>
                )}
                {c.findings.map((f) => (
                  <div
                    className={"finding " + (f.resolved ? "resolved" : "")}
                    key={f.id}
                  >
                    <div>
                      <span className="finding-icon">
                        {f.resolved ? (
                          <Check size={16} />
                        ) : (
                          <AlertTriangle size={16} />
                        )}
                      </span>
                      <h4>{f.title}</h4>
                      <span className="finding-status">
                        {f.resolved
                          ? "Resolved"
                          : f.source === "Reviewer"
                            ? "Manual"
                            : "Open"}
                      </span>
                    </div>
                    <p>{f.detail}</p>
                    <label>
                      Resolution rationale
                      <textarea
                        maxLength={2000}
                        disabled={!canReview || f.resolved}
                        value={findingNotes[f.id] ?? f.note}
                        placeholder="Explain the evidence and how the claim was verified…"
                        onChange={(e) =>
                          setFindingNotes({
                            ...findingNotes,
                            [f.id]: e.target.value,
                          })
                        }
                      />
                    </label>
                    <button
                      className="text-button"
                      disabled={
                        busy ||
                        !canReview ||
                        (findingNotes[f.id] ?? f.note).trim().length < 10
                      }
                      onClick={() =>
                        perform({
                          type: "resolve",
                          id: c.id,
                          findingId: f.id,
                          note: findingNotes[f.id] ?? f.note,
                          resolved: !f.resolved,
                        })
                      }
                    >
                      {f.resolved ? "Reopen finding" : "Mark resolved"}
                      <Check size={14} />
                    </button>
                  </div>
                ))}
                {canReview && (
                  <button
                    className="secondary space-top"
                    onClick={() => setModal("finding")}
                  >
                    <Plus size={15} /> Add manual finding
                  </button>
                )}
              </>
            )}
            {tab === "Checklist" && (
              <>
                <h3>Human review checklist</h3>
                <p className="muted small space-top">
                  Verify against current evidence and policy v{policy}.
                  Handoffs, evidence changes, and policy acknowledgements reset
                  these checks.
                </p>
                {checks.map((check) => (
                  <label className="check-row" key={check}>
                    <input
                      type="checkbox"
                      checked={c.checks.includes(check)}
                      disabled={!canReview || busy}
                      onChange={(e) =>
                        perform({
                          type: "check",
                          id: c.id,
                          check,
                          checked: e.target.checked,
                        })
                      }
                    />
                    {check}
                  </label>
                ))}
              </>
            )}
            {tab === "Evidence" && (
              <>
                <div className="section-heading">
                  <h3>Product terms & substantiation</h3>
                  {c.status === "In review" &&
                    (person === c.owner ||
                      person === c.reviewer ||
                      isLead(person, workspace)) && (
                      <button
                        className="secondary"
                        onClick={() => setModal("evidence")}
                      >
                        <Plus size={14} /> Add evidence
                      </button>
                    )}
                </div>
                <p className="small muted space-top">
                  Save the terms excerpt and its source. Evidence is tied to the
                  creative version and limits how long approval is valid.
                </p>
                {!c.evidence.length && (
                  <div className="empty">
                    <FileText />
                    <h3>Evidence needed</h3>
                    <p>Add the product terms that support this creative.</p>
                  </div>
                )}
                {c.evidence.map((e) => (
                  <article className="evidence-card" key={e.id}>
                    <div className="section-heading">
                      <h4>{e.title}</h4>
                      <span
                        className={
                          "pill " +
                          (e.validThrough < today ? "orange" : "green")
                        }
                      >
                        {e.validThrough < today ? "Expired" : `v${e.version}`}
                      </span>
                    </div>
                    <a
                      className="reference-link"
                      href={safeUrl(e.reference) ? e.reference : undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {e.reference}
                      <ArrowUpRight size={12} />
                    </a>
                    <p className="preserve">{e.excerpt}</p>
                    <small>
                      Valid through {displayDate(e.validThrough)} · Added by{" "}
                      {e.addedBy}
                    </small>
                    {canReview && (
                      <button
                        className="text-button space-top"
                        disabled={busy}
                        onClick={() =>
                          perform({
                            type: "removeEvidence",
                            id: c.id,
                            evidenceId: e.id,
                          })
                        }
                      >
                        Remove from current review
                      </button>
                    )}
                  </article>
                ))}
              </>
            )}
            {tab === "Activity" &&
              c.history.map((h, i) => (
                <div className="timeline" key={`${h.at}-${i}`}>
                  <span />
                  <div>
                    <p>{h.text}</p>
                    <small>{new Date(h.at).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            {tab === "Versions" && (
              <>
                {c.approvals.length > 0 && (
                  <>
                    <h3>Decision snapshots</h3>
                    <p className="small muted space-top">
                      Historical records are retained when approval is revoked
                      or superseded. Only the current launch-readiness check
                      permits distribution.
                    </p>
                    {c.approvals.map((a, i) => (
                      <article className="evidence-card" key={i}>
                        <h4>
                          Approved v{a.version} · Policy v{a.policyVersion}
                        </h4>
                        <p>{a.note}</p>
                        <small>
                          {a.by} · {new Date(a.at).toLocaleString()} · Expires{" "}
                          {displayDate(a.expires)}
                        </small>
                        <button
                          className="text-button space-top"
                          onClick={() =>
                            download(a, `${c.id}-decision-${i + 1}.json`)
                          }
                        >
                          <Download size={13} /> Export exact decision snapshot
                        </button>
                      </article>
                    ))}
                  </>
                )}
                {[
                  ...c.versions,
                  {
                    version: c.version,
                    copy: c.copy,
                    scope: c.scope,
                    destinationCopy: c.destinationCopy,
                    review: undefined,
                  },
                ]
                  .reverse()
                  .map((v) => (
                    <div className="version" key={v.version}>
                      <h4>
                        Version {v.version}{" "}
                        {v.version === c.version && (
                          <span className="pill green">Current</span>
                        )}
                      </h4>
                      <p className="preserve">{v.copy}</p>
                      {v.scope && <small>Scope: {v.scope}</small>}
                      {v.review && (
                        <button
                          className="text-button space-top"
                          onClick={() =>
                            download(
                              v.review,
                              `${c.id}-v${v.version}-review.json`,
                            )
                          }
                        >
                          <Download size={13} /> Export archived review evidence
                        </button>
                      )}
                      {v.destinationCopy && (
                        <details>
                          <summary>Captured destination copy</summary>
                          <p>{v.destinationCopy}</p>
                        </details>
                      )}
                    </div>
                  ))}
              </>
            )}
          </div>
          <div className="decision">
            {c.status === "In review" ? (
              <>
                <h3>Review decision</h3>
                <label>
                  Approval valid through
                  <input
                    type="date"
                    min={today}
                    value={expires}
                    onInput={(e) => setExpires(e.currentTarget.value)}
                    onChange={(e) => setExpires(e.target.value)}
                    disabled={!canReview}
                  />
                </label>
                <label>
                  Decision rationale
                  <textarea
                    maxLength={2000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Explain your decision (10+ characters)…"
                    disabled={!canReview}
                  />
                </label>
                <p className="decision-help">
                  <AlertTriangle size={14} />
                  {error ||
                    (note.trim().length < 10
                      ? "Add a decision rationale before approving."
                      : "All prerequisites complete. Review your decision before approving.")}
                </p>
                <div className="decision-buttons">
                  <button
                    className="secondary"
                    disabled={busy || !canReview || note.trim().length < 10}
                    onClick={async () => {
                      if (
                        await perform({
                          type: "request",
                          id: c.id,
                          reason: note,
                        })
                      ) {
                        setNote("");
                        setTab("Activity");
                      }
                    }}
                  >
                    Request changes
                  </button>
                  <button
                    className="primary"
                    disabled={busy || !!error || note.trim().length < 10}
                    onClick={async () => {
                      if (
                        await perform({
                          type: "approve",
                          id: c.id,
                          expires,
                          note,
                        })
                      ) {
                        setNote("");
                        setTab("Versions");
                      }
                    }}
                  >
                    <Check size={16} /> Approve
                  </button>
                </div>
                {!c.escalated &&
                  (person === c.owner || isReviewer(person, workspace)) && (
                    <button
                      className="text-button space-top"
                      onClick={() => reasonAction("escalate")}
                    >
                      Escalate for lead review
                    </button>
                  )}
              </>
            ) : (
              <>
                <h3>
                  {c.status === "Approved"
                    ? "Approval controls"
                    : c.status === "Revoked"
                      ? "Distribution must stop"
                      : c.status === "Withdrawn"
                        ? "Campaign closed"
                        : "Waiting for the campaign owner"}
                </h3>
                <p className="small muted">
                  {c.status === "Approved"
                    ? "Reopen for another review, or revoke immediately when approval is no longer valid. Historical decisions remain available."
                    : "No approval is active for distribution in this state."}
                </p>
                <div className="decision-buttons">
                  {["Approved", "Revoked"].includes(c.status) &&
                    (person === c.reviewer || isLead(person, workspace)) && (
                      <button
                        className="secondary"
                        onClick={() => reasonAction("reopen")}
                      >
                        Reopen review
                      </button>
                    )}
                  {c.status === "Approved" && isLead(person, workspace) && (
                    <button
                      className="danger-button"
                      onClick={() => reasonAction("revoke")}
                    >
                      Revoke approval
                    </button>
                  )}
                </div>
              </>
            )}
            {c.status !== "Withdrawn" &&
              (person === c.owner || isLead(person, workspace)) && (
                <button
                  className="text-button space-top"
                  onClick={() => reasonAction("withdraw")}
                >
                  Withdraw campaign
                </button>
              )}
          </div>
        </section>
      </div>
      {modal && (
        <Dialog
          title={
            modal === "assign"
              ? "Hand off review"
              : modal === "evidence"
                ? "Add supporting evidence"
                : modal === "finding"
                  ? "Add a human finding"
                  : modal === "revise"
                    ? "Submit a revised version"
                    : (
                        {
                          reopen: "Reopen for review",
                          revoke: "Revoke this approval",
                          withdraw: "Withdraw this campaign",
                          escalate: "Escalate to compliance lead",
                          clearEscalation: "Clear escalation",
                        } as Record<string, string>
                      )[modal]
          }
          onClose={() => setModal("")}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const d = Object.fromEntries(
                new FormData(e.currentTarget),
              ) as Record<string, string>;
              let action: Action;
              if (modal === "assign")
                action = {
                  type: "assign",
                  id: c.id,
                  reviewer: d.reviewer,
                  reason: d.reason,
                };
              else if (modal === "evidence")
                action = {
                  type: "evidence",
                  id: c.id,
                  data: {
                    title: d.title,
                    reference: d.reference,
                    excerpt: d.excerpt,
                    validThrough: d.validThrough,
                  },
                };
              else if (modal === "finding")
                action = {
                  type: "finding",
                  id: c.id,
                  title: d.title,
                  detail: d.detail,
                };
              else if (modal === "revise")
                action = {
                  type: "revise",
                  id: c.id,
                  copy: d.copy,
                  scope: d.scope,
                  destination: d.destination,
                  destinationCopy: d.destinationCopy,
                };
              else
                action = {
                  type: modal as
                    | "reopen"
                    | "revoke"
                    | "withdraw"
                    | "escalate"
                    | "clearEscalation",
                  id: c.id,
                  reason: d.reason,
                };
              if (await perform(action)) {
                setModal("");
                setTab(modal === "evidence" ? "Evidence" : "Activity");
                setFindingNotes({});
              }
            }}
          >
            {modal === "assign" ? (
              <>
                <p className="small muted">
                  The incoming reviewer starts a fresh checklist and re-verifies
                  findings. Existing evidence and history are retained.
                </p>
                <label>
                  New reviewer
                  <select name="reviewer" required>
                    {membersOf(workspace)
                      .map((m) => m.name)
                      .filter(
                        (p) =>
                          isReviewer(p, workspace) &&
                          p !== c.reviewer &&
                          p !== c.owner &&
                          !c.contributors.includes(p),
                      )
                      .map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                  </select>
                </label>
                <Rationale />
              </>
            ) : modal === "evidence" ? (
              <>
                <p className="small muted">
                  Use fictional evidence in this demo. The URL is a reference,
                  not automatically verified. Saving changes resets review
                  checks.
                </p>
                <label>
                  Evidence title
                  <input
                    name="title"
                    minLength={3}
                    maxLength={100}
                    required
                    placeholder="Approved personal loan terms · November"
                  />
                </label>
                <label>
                  Source URL
                  <input
                    name="reference"
                    type="url"
                    required
                    placeholder="https://example.com/product-terms"
                  />
                </label>
                <label>
                  Terms excerpt / claim substantiation
                  <textarea
                    name="excerpt"
                    minLength={20}
                    maxLength={5000}
                    rows={5}
                    required
                  />
                </label>
                <label>
                  Evidence valid through
                  <input name="validThrough" type="date" min={today} required />
                </label>
              </>
            ) : modal === "finding" ? (
              <>
                <label>
                  Finding title
                  <input name="title" minLength={3} maxLength={100} required />
                </label>
                <label>
                  What needs to change and why?
                  <textarea
                    name="detail"
                    minLength={10}
                    maxLength={2000}
                    required
                    rows={4}
                  />
                </label>
              </>
            ) : modal === "revise" ? (
              <>
                <div className="form-note">
                  Any change resets findings, evidence, and review checks. Prior
                  decisions remain in the audit.
                </div>
                <label>
                  Revised campaign copy
                  <textarea
                    name="copy"
                    defaultValue={c.copy}
                    minLength={20}
                    maxLength={5000}
                    rows={5}
                    required
                  />
                </label>
                <label>
                  Audience and geographic scope
                  <input
                    name="scope"
                    defaultValue={c.scope}
                    minLength={5}
                    maxLength={300}
                    required
                  />
                </label>
                <label>
                  Destination URL
                  <input
                    name="destination"
                    type="url"
                    defaultValue={c.destination}
                    required={c.channel === "Affiliate"}
                  />
                </label>
                <label>
                  Captured landing-page copy
                  <textarea
                    name="destinationCopy"
                    defaultValue={c.destinationCopy}
                    maxLength={5000}
                    minLength={c.channel === "Affiliate" ? 20 : undefined}
                    required={c.channel === "Affiliate"}
                  />
                </label>
              </>
            ) : (
              <>
                <p className="small muted">
                  {modal === "revoke" || modal === "withdraw"
                    ? "This immediately removes launch clearance. The decision history will be preserved."
                    : "The reason will be recorded in the campaign activity."}
                </p>
                <Rationale />
              </>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModal("")}
              >
                Cancel
              </button>
              <button
                className={
                  modal === "revoke" || modal === "withdraw"
                    ? "danger-button"
                    : "primary"
                }
                disabled={busy}
              >
                {modal === "revise"
                  ? `Submit version ${c.version + 1}`
                  : modal === "evidence"
                    ? "Save evidence"
                    : modal === "finding"
                      ? "Add finding"
                      : modal === "revoke"
                        ? "Revoke approval"
                        : modal === "withdraw"
                          ? "Withdraw campaign"
                          : "Confirm"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
function Rationale() {
  return (
    <label>
      Reason
      <textarea
        name="reason"
        required
        minLength={10}
        maxLength={2000}
        rows={4}
        placeholder="Document the reason and next step (10+ characters)…"
      />
    </label>
  );
}
