import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  CircleCheck,
  Clock3,
  Download,
  FileText,
  History,
  Inbox,
  LayoutDashboard,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
  AlertTriangle,
  FlaskConical,
} from "lucide-react";
import {
  currentPolicy,
  dayOffset,
  isReviewer,
  launchBlockers,
  localDay,
  people,
  products,
  channels,
  role,
  seedWorkspace,
  type Action,
  type Campaign,
  type Workspace,
} from "./domain";
import {
  commitAction,
  loadWorkspace,
  STORAGE_KEY,
  withWorkspaceLock,
} from "./storage";
import {
  Badge,
  Dialog,
  FeedbackContext,
  displayDate,
  download,
} from "./components/shared";
import { Submission } from "./components/Submission";
import { Review } from "./components/Review";
export default function App() {
  const initial = useRef(loadWorkspace());
  const [workspace, setWorkspace] = useState<Workspace>(
      initial.current.workspace,
    ),
    [warning, setWarning] = useState(initial.current.warning),
    [blocked, setBlocked] = useState(initial.current.blocked),
    [stale, setStale] = useState(false),
    [saving, setSaving] = useState(false);
  const [page, setPage] = useState("Review queue"),
    [selected, setSelected] = useState<string | null>(null),
    [tab, setTab] = useState("All campaigns"),
    [query, setQuery] = useState(""),
    [product, setProduct] = useState("All products"),
    [channel, setChannel] = useState("All channels"),
    [person, setPerson] = useState("Sarah Chen"),
    [modal, setModal] = useState(""),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [today, setToday] = useState(localDay());
  const savingRef = useRef(false);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [page, selected]);
  const refresh = () => {
    const loaded = loadWorkspace();
    setWorkspace(loaded.workspace);
    setWarning(loaded.warning);
    setBlocked(loaded.blocked);
    setStale(false);
    setError("");
  };
  useEffect(() => {
    const changed = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) setStale(true);
    };
    window.addEventListener("storage", changed);
    const timer = setInterval(() => setToday(localDay()), 30000);
    return () => {
      window.removeEventListener("storage", changed);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const run = async (action: Action) => {
    if (savingRef.current) return false;
    if (blocked || stale) {
      setError(
        stale
          ? "Another tab updated this workspace. Refresh before saving. Your typed form stays open."
          : "Recover or reset the workspace before editing.",
      );
      return false;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const next = await withWorkspaceLock(() =>
        commitAction(workspace.revision, action, person),
      );
      setWorkspace(next);
      setWarning("");
      setToast(
        action.type === "submit"
          ? "Campaign submitted for independent review."
          : "Change saved with an audit record.",
      );
      if (action.type === "submit") setSelected(next.campaigns[0].id);
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save. Your draft is still available.",
      );
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const campaigns = workspace.campaigns,
    c = campaigns.find((x) => x.id === selected);
  const active = campaigns.filter((c) => c.status === "In review"),
    overdue = active.filter((c) => c.due < today),
    ready = campaigns.filter(
      (c) =>
        launchBlockers(c, currentPolicy(workspace, c.product), today).length ===
        0,
    );
  const needsAttention = (c: Campaign) =>
    !!c.escalated ||
    c.status === "Changes requested" ||
    c.status === "Revoked" ||
    (c.status === "In review" && c.due < today) ||
    (c.status === "Approved" &&
      launchBlockers(c, currentPolicy(workspace, c.product), today).length > 0);
  const priority = (c: Campaign) =>
    c.status === "Revoked"
      ? 0
      : c.escalated
        ? 1
        : c.status === "Approved" && needsAttention(c)
          ? 2
          : c.status === "In review" && c.due < today
            ? 3
            : c.status === "In review"
              ? 4
              : c.status === "Changes requested"
                ? 5
                : 6;
  const filtered = campaigns
    .filter(
      (c) =>
        (tab === "All campaigns" ||
          (tab === "My reviews" &&
            c.reviewer === person &&
            c.status === "In review") ||
          (tab === "Needs attention" && needsAttention(c)) ||
          (tab === "Launch ready" && ready.includes(c)) ||
          (tab === "Closed" && c.status === "Withdrawn")) &&
        (product === "All products" || c.product === product) &&
        (channel === "All channels" || c.channel === channel) &&
        `${c.title} ${c.id} ${c.partner} ${c.owner}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => priority(a) - priority(b) || a.due.localeCompare(b.due));
  const navigate = (p: string) => {
    setPage(p);
    setSelected(null);
    setError("");
  };
  const select = (c: Campaign) => {
    setSelected(c.id);
    setError("");
  };
  const exportWorkspace = () =>
    download(
      {
        exportedAt: new Date().toISOString(),
        storage: "Browser-local demonstration; not regulatory evidence",
        ...workspace,
      },
      "clearpath-workspace-audit.json",
    );
  return (
    <FeedbackContext.Provider value={{ error, stale, refresh }}>
      <div className="shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <aside className="sidebar">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("Review queue");
            }}
          >
            <span className="brandmark">
              <ShieldCheck size={22} />
            </span>
            clearpath<span className="brand-dot">.</span>
          </a>
          <div className="workspace">
            <span className="workspace-icon">C</span>
            <div>
              ClearPath Financial<small>Marketing compliance</small>
            </div>
          </div>
          <div className="nav-label">WORKSPACE</div>
          <nav aria-label="Main navigation">
            {[
              { Icon: LayoutDashboard, label: "Overview" },
              { Icon: Inbox, label: "Review queue" },
              { Icon: BookOpen, label: "Policy library" },
              { Icon: History, label: "Audit trail" },
              { Icon: FlaskConical, label: "Demo scenarios" },
            ].map(({ Icon, label }) => (
              <button
                key={label}
                aria-current={page === label ? "page" : undefined}
                className={page === label ? "active" : ""}
                onClick={() => navigate(label)}
              >
                <Icon size={19} />
                {label}
                {label === "Review queue" && (
                  <span className="nav-count">{active.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="demo-card">
              <span className="live-dot" /> INTERACTIVE DEMO
              <p>
                A clearer path from
                <br />
                campaign to approval.
              </p>
              <small>Browser-local · No backend</small>
              <button onClick={() => setModal("reset")}>
                <RotateCcw size={13} /> Reset demo
              </button>
            </div>
            <label className="profile">
              <span className="avatar">
                {person
                  .split(" ")
                  .map((x) => x[0])
                  .join("")}
              </span>
              <span>
                <select
                  aria-label="Demo user"
                  value={person}
                  onChange={(e) => {
                    setPerson(e.target.value);
                    setError("");
                  }}
                >
                  {people.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <small>{role(person)} · Demo identity</small>
              </span>
            </label>
          </div>
        </aside>
        <div className="main">
          <header>
            <div>
              Workspace <ChevronRight size={14} />
              <span>{page}</span>
              {c && (
                <>
                  <ChevronRight size={14} />
                  <span>{c.id}</span>
                </>
              )}
            </div>
            <span className="header-right">
              <span className="live-dot" />
              {saving
                ? "Saving…"
                : stale
                  ? "Newer changes in another tab"
                  : blocked
                    ? "Read-only recovery mode"
                    : "Browser-local workspace"}
            </span>
          </header>
          {warning && (
            <div className="notice warning-tone global-notice">
              <AlertTriangle size={18} />
              <p>{warning}</p>
              <button
                className="secondary"
                onClick={() => {
                  try {
                    download(
                      {
                        v2: localStorage.getItem(STORAGE_KEY),
                        v1: localStorage.getItem("clearpath-review-v1"),
                      },
                      "clearpath-recovery.json",
                    );
                  } catch {
                    setError("Browser storage access is denied.");
                  }
                }}
              >
                Export recovery data
              </button>
            </div>
          )}
          {stale && (
            <div className="notice warning-tone global-notice" role="alert">
              <AlertTriangle size={18} />
              <div>
                <b>Another tab changed the workspace.</b>
                <p>
                  Refresh to review the latest records. Unsaved text stays in
                  the open form; no changes will be silently overwritten.
                </p>
              </div>
              <button className="primary" onClick={refresh}>
                Refresh workspace
              </button>
            </div>
          )}
          <main id="main-content">
            {c ? (
              <Review
                key={c.id}
                c={c}
                workspace={workspace}
                person={person}
                today={today}
                back={() => setSelected(null)}
                run={run}
              />
            ) : (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">CLEARPATH REVIEW</div>
                    <h1>
                      {page === "Review queue"
                        ? "Good work. Clear to go."
                        : page === "Overview"
                          ? "See what needs your attention."
                          : page === "Policy library"
                            ? "Consistent reviews start here."
                            : page === "Demo scenarios"
                              ? "Put the workflow to the test."
                              : "Every decision, accounted for."}
                    </h1>
                    <p>
                      {page === "Review queue"
                        ? "Prioritize the right work. Keep evidence and decisions together."
                        : page === "Overview"
                          ? "Operational signals from this workspace, with clear next actions."
                          : page === "Policy library"
                            ? "Versioned internal guidance. Policy changes trigger re-review before launch."
                            : page === "Demo scenarios"
                              ? "Realistic edge cases, the reasoning behind them, and a guided way to try each one."
                              : "A record of decisions, evidence, handoffs, and creative revisions."}
                    </p>
                  </div>
                  <button
                    className="primary"
                    onClick={() => setModal("submission")}
                  >
                    <Plus size={17} /> New submission
                  </button>
                </div>
                {(page === "Review queue" || page === "Overview") && (
                  <>
                    <div className="stats">
                      {[
                        {
                          Icon: Inbox,
                          title: "Ready for review",
                          n: active.length,
                          sub: "Awaiting a human decision",
                          color: "mint",
                        },
                        {
                          Icon: Clock3,
                          title: "Past due",
                          n: overdue.length,
                          sub: "Active reviews only",
                          color: "peach",
                        },
                        {
                          Icon: AlertTriangle,
                          title: "Needs attention",
                          n: campaigns.filter(needsAttention).length,
                          sub: "Escalations, revisions & holds",
                          color: "lavender",
                        },
                        {
                          Icon: CircleCheck,
                          title: "Launch ready",
                          n: ready.length,
                          sub: "Current approval, policy & evidence",
                          color: "mint",
                        },
                      ].map(({ Icon, title, n, sub, color }) => (
                        <div className="stat" key={title}>
                          <div className="stat-top">
                            {title}
                            <span className={color}>
                              <Icon size={18} />
                            </span>
                          </div>
                          <strong>{String(n).padStart(2, "0")}</strong>
                          <small>{sub}</small>
                        </div>
                      ))}
                    </div>
                    {page === "Overview" ? (
                      <Overview
                        workspace={workspace}
                        today={today}
                        select={select}
                      />
                    ) : (
                      <>
                        <div className="focus-banner">
                          <span className="focus-icon">
                            <ShieldCheck size={23} />
                          </span>
                          <div>
                            <b>Approved once doesn’t mean cleared forever.</b>
                            <p>
                              Policy changes, expired evidence, and revocations
                              stop launch clearance automatically.
                            </p>
                          </div>
                          <button onClick={() => setTab("Needs attention")}>
                            View priorities <ArrowRight size={16} />
                          </button>
                        </div>
                        <section className="panel queue">
                          <div className="queue-heading">
                            <div>
                              <h2>
                                Review queue{" "}
                                <span className="number-chip">
                                  {campaigns.length}
                                </span>
                              </h2>
                              <p>
                                Escalations and distribution holds first, then
                                due dates.
                              </p>
                            </div>
                            <button
                              className="secondary"
                              onClick={exportWorkspace}
                            >
                              <Download size={15} /> Export
                            </button>
                          </div>
                          <div className="queue-tabs">
                            {[
                              "All campaigns",
                              "My reviews",
                              "Needs attention",
                              "Launch ready",
                              "Closed",
                            ].map((t) => (
                              <button
                                key={t}
                                className={tab === t ? "selected" : ""}
                                onClick={() => setTab(t)}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                          <div className="filters">
                            <label className="search">
                              <Search size={17} />
                              <input
                                placeholder="Search campaigns, IDs, or partners…"
                                aria-label="Search campaigns"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                              />
                              {query && (
                                <button
                                  aria-label="Clear search"
                                  onClick={() => setQuery("")}
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </label>
                            <select
                              aria-label="Filter product"
                              value={product}
                              onChange={(e) => setProduct(e.target.value)}
                            >
                              {["All products", ...products].map((x) => (
                                <option key={x}>{x}</option>
                              ))}
                            </select>
                            <select
                              aria-label="Filter channel"
                              value={channel}
                              onChange={(e) => setChannel(e.target.value)}
                            >
                              {["All channels", ...channels].map((x) => (
                                <option key={x}>{x}</option>
                              ))}
                            </select>
                            <span className="sort">
                              <SlidersHorizontal size={15} /> Priority
                            </span>
                          </div>
                          <div className="table-scroll">
                            <table>
                              <thead>
                                <tr>
                                  <th>CAMPAIGN</th>
                                  <th>LAUNCH / REVIEW STATE</th>
                                  <th>CHANNEL</th>
                                  <th>REVIEWER</th>
                                  <th>REVIEW DUE</th>
                                  <th />
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.map((x) => (
                                  <tr key={x.id} onClick={() => select(x)}>
                                    <td>
                                      <button
                                        className="campaign-link"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          select(x);
                                        }}
                                      >
                                        <span
                                          className={
                                            "campaign-icon " +
                                            (x.product === "Mortgage"
                                              ? "lavender"
                                              : x.product === "Credit cards"
                                                ? "peach"
                                                : "mint")
                                          }
                                        >
                                          <FileText size={19} />
                                        </span>
                                        <span>
                                          <b>{x.title}</b>
                                          <small>
                                            {x.id} · {x.product} · v{x.version}
                                          </small>
                                        </span>
                                      </button>
                                    </td>
                                    <td>
                                      <Badge
                                        c={x}
                                        policy={currentPolicy(
                                          workspace,
                                          x.product,
                                        )}
                                        today={today}
                                      />
                                      {x.escalated && (
                                        <small className="red">
                                          Lead escalation
                                        </small>
                                      )}
                                    </td>
                                    <td>
                                      <span className="channel">
                                        {x.channel}
                                      </span>
                                      <small className="partner">
                                        {x.partner}
                                      </small>
                                    </td>
                                    <td>
                                      <div className="reviewer">
                                        <span className="avatar mini">
                                          {x.reviewer
                                            .split(" ")
                                            .map((a) => a[0])
                                            .join("")}
                                        </span>
                                        {x.reviewer.split(" ")[0]}
                                      </div>
                                    </td>
                                    <td>
                                      <span
                                        className={
                                          x.due < today &&
                                          x.status === "In review"
                                            ? "red"
                                            : "due"
                                        }
                                      >
                                        {displayDate(x.due)}
                                      </span>
                                      {x.due < today &&
                                        x.status === "In review" && (
                                          <small className="red">
                                            Past due
                                          </small>
                                        )}
                                    </td>
                                    <td>
                                      <ChevronRight
                                        size={16}
                                        className="muted"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {!filtered.length && (
                            <div className="empty">
                              <Search />
                              <h3>No campaigns match</h3>
                              <p>Try another search or reset your filters.</p>
                              <button
                                className="secondary"
                                onClick={() => {
                                  setQuery("");
                                  setProduct("All products");
                                  setChannel("All channels");
                                  setTab("All campaigns");
                                }}
                              >
                                Clear filters
                              </button>
                            </div>
                          )}
                          <div className="table-footer">
                            Showing {filtered.length} of {campaigns.length}{" "}
                            campaigns
                            <span>
                              Workspace revision {workspace.revision} · Changes
                              recorded locally
                            </span>
                          </div>
                        </section>
                      </>
                    )}
                  </>
                )}
                {page === "Policy library" && (
                  <>
                    <div className="notice neutral-tone">
                      <ShieldCheck size={19} />
                      <p>
                        Illustrative internal policies, not legal guidance.
                        Publishing a new version immediately holds older
                        approvals for re-review; it does not silently rewrite
                        their decision snapshots.
                      </p>
                    </div>
                    <div className="policy-grid">
                      {products.map((p) => {
                        const versions = workspace.policies
                          .filter((x) => x.product === p)
                          .sort((a, b) => b.version - a.version);
                        const affected = campaigns.filter(
                          (c) =>
                            c.product === p &&
                            c.status === "Approved" &&
                            c.policyVersion < versions[0].version,
                        );
                        return (
                          <article className="panel policy" key={p}>
                            <span>POLICY v{versions[0].version}</span>
                            <h2>{p}</h2>
                            <p>{versions[0].summary}</p>
                            <small>
                              {versions[0].by} ·{" "}
                              {new Date(versions[0].at).toLocaleDateString()}
                            </small>
                            <div>
                              <AlertTriangle size={16} />
                              {affected.length} approved campaign
                              {affected.length === 1 ? "" : "s"} need re-review
                            </div>
                            <details className="space-top">
                              <summary>Version history</summary>
                              {versions.map((v) => (
                                <div className="policy-history" key={v.version}>
                                  <b>v{v.version}</b>
                                  <p>{v.summary}</p>
                                  <small>
                                    {v.by} ·{" "}
                                    {new Date(v.at).toLocaleDateString()}
                                  </small>
                                </div>
                              ))}
                            </details>
                            {person === "Sarah Chen" && (
                              <button
                                className="secondary space-top"
                                onClick={() => setModal(`policy:${p}`)}
                              >
                                Publish next version
                              </button>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </>
                )}
                {page === "Audit trail" && (
                  <section className="panel audit">
                    <div className="panel-title">
                      <h2>Workspace activity</h2>
                      <button className="secondary" onClick={exportWorkspace}>
                        <Download size={15} /> Export audit
                      </button>
                    </div>
                    <p className="audit-disclaimer">
                      Decision snapshots preserve reviewed content in this app.
                      Browser storage remains user-editable and is not a
                      tamper-proof regulatory archive.
                    </p>
                    {campaigns
                      .flatMap((x) =>
                        x.history.map((h) => ({ ...h, campaign: x })),
                      )
                      .sort((a, b) => b.at.localeCompare(a.at))
                      .map((h, i) => (
                        <div className="audit-row" key={i}>
                          <span className="audit-icon">
                            <History size={18} />
                          </span>
                          <div>
                            <button
                              className="text-button"
                              onClick={() => select(h.campaign)}
                            >
                              {h.campaign.id} · {h.campaign.title}
                              <ArrowUpRight size={14} />
                            </button>
                            <p>{h.text}</p>
                            <small>{new Date(h.at).toLocaleString()}</small>
                          </div>
                        </div>
                      ))}
                  </section>
                )}
                {page === "Demo scenarios" && (
                  <Scenarios
                    campaigns={campaigns}
                    today={today}
                    open={(id, identity) => {
                      const item = campaigns.find((c) => c.id === id);
                      if (item) {
                        setPerson(identity);
                        select(item);
                      } else
                        setToast(
                          "This sample is not in your workspace. Export your work, then reset the demo to load all scenarios.",
                        );
                    }}
                    policies={() => navigate("Policy library")}
                  />
                )}
                <footer>
                  <ShieldCheck size={14} /> Thoughtful reviews. Clear evidence.
                  Human decisions.
                  <span>Browser-local demo · No real financial data</span>
                </footer>
              </>
            )}
          </main>
        </div>
        {modal === "submission" && (
          <Submission today={today} onClose={() => setModal("")} run={run} />
        )}
        {modal === "reset" && (
          <Dialog title="Reset demo workspace?" onClose={() => setModal("")}>
            <p>
              Export your work first. This replaces only this app’s browser
              records with eight sample campaigns, including expired approvals
              and a policy change. Other open tabs will be notified.
            </p>
            <div className="modal-actions">
              <button className="secondary" onClick={exportWorkspace}>
                Export first
              </button>
              <button className="secondary" onClick={() => setModal("")}>
                Cancel
              </button>
              <button
                className="danger-button"
                disabled={saving}
                onClick={async () => {
                  try {
                    await withWorkspaceLock(() => {
                      const loaded = loadWorkspace();
                      if (
                        !loaded.blocked &&
                        loaded.workspace.revision !== workspace.revision
                      )
                        throw new Error(
                          "Another tab has newer work. Refresh the workspace before resetting.",
                        );
                      const next = seedWorkspace();
                      next.revision = workspace.revision + 1;
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                      setWorkspace(next);
                    });
                    setSelected(null);
                    setStale(false);
                    setBlocked(false);
                    setWarning("");
                    setError("");
                    setModal("");
                    setToast("Demo restored. All eight scenarios are ready.");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Reset failed.");
                  }
                }}
              >
                Reset demo
              </button>
            </div>
          </Dialog>
        )}
        {modal.startsWith("policy:") && (
          <Dialog
            title={`Publish ${modal.slice(7)} policy`}
            onClose={() => setModal("")}
          >
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const summary = String(
                  new FormData(e.currentTarget).get("summary"),
                );
                if (
                  await run({
                    type: "policy",
                    product: modal.slice(7),
                    summary,
                  })
                )
                  setModal("");
              }}
            >
              <div className="form-note">
                This will hold{" "}
                {
                  campaigns.filter(
                    (c) =>
                      c.product === modal.slice(7) && c.status === "Approved",
                  ).length
                }{" "}
                currently approved campaign(s) for re-review. Historical
                decisions remain intact.
              </div>
              <label>
                What changed and what must reviewers verify?
                <textarea
                  name="summary"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={5}
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setModal("")}
                >
                  Cancel
                </button>
                <button className="primary" disabled={saving}>
                  Publish policy v{currentPolicy(workspace, modal.slice(7)) + 1}
                </button>
              </div>
            </form>
          </Dialog>
        )}
        {(toast || error) && (
          <div
            className={"toast " + (error ? "error-toast" : "")}
            role={error ? "alert" : "status"}
          >
            {error ? <AlertTriangle size={18} /> : <CircleCheck size={18} />}
            <span>
              {error || toast}
              {error.includes("Another tab") && (
                <button className="refresh-inline" onClick={refresh}>
                  Refresh workspace
                </button>
              )}
            </span>
            <button
              aria-label="Dismiss notification"
              onClick={() => {
                setToast("");
                setError("");
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </FeedbackContext.Provider>
  );
}
function Overview({
  workspace,
  today,
  select,
}: {
  workspace: Workspace;
  today: string;
  select: (c: Campaign) => void;
}) {
  const active = workspace.campaigns.filter((c) => c.status === "In review");
  const holds = workspace.campaigns.filter(
    (c) =>
      c.status === "Approved" &&
      launchBlockers(c, currentPolicy(workspace, c.product), today).length,
  );
  const decisions = workspace.campaigns
    .flatMap((c) =>
      c.approvals.map((a) =>
        Math.max(0, (Date.parse(a.at) - Date.parse(c.submittedAt)) / 3600000),
      ),
    )
    .sort((a, b) => a - b);
  const median = decisions.length
    ? decisions.length % 2
      ? decisions[Math.floor(decisions.length / 2)]
      : (decisions[decisions.length / 2 - 1] +
          decisions[decisions.length / 2]) /
        2
    : null;
  return (
    <div className="overview-grid">
      <section className="panel overview-panel">
        <div className="section-heading">
          <h2>Reviewer capacity</h2>
          <span className="pill blue">{active.length} open reviews</span>
        </div>
        <p className="small muted">
          Use a reasoned handoff when ownership needs to change.
        </p>
        {people.filter(isReviewer).map((p) => {
          const count = active.filter((c) => c.reviewer === p).length;
          return (
            <div className="workload" key={p}>
              <div>
                <b>{p}</b>
                <span>
                  {count} active ·{" "}
                  {
                    active.filter((c) => c.reviewer === p && c.due < today)
                      .length
                  }{" "}
                  past due
                </span>
              </div>
              <div className="meter">
                <span
                  style={{
                    width: `${active.length ? (count / active.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
        <div className="metric-pair">
          <div>
            <strong>{median === null ? "—" : `${median.toFixed(1)}h`}</strong>
            <small>Median submission → approval</small>
          </div>
          <div>
            <strong>
              {workspace.campaigns.filter((c) => c.version > 1).length}
            </strong>
            <small>Campaigns with revisions</small>
          </div>
        </div>
        <p className="small muted">
          Descriptive demo data, not a measured throughput improvement. Time
          includes all elapsed hours; no business-hours SLA is implied.
        </p>
      </section>
      <section className="panel overview-panel">
        <h2>Distribution holds</h2>
        <p className="small muted space-top">
          Previously approved campaigns that are no longer launch-ready.
        </p>
        {holds.length ? (
          holds.map((c) => (
            <button
              className="attention-item"
              key={c.id}
              onClick={() => select(c)}
            >
              <AlertTriangle size={18} />
              <span>
                <b>{c.title}</b>
                <small>
                  {launchBlockers(
                    c,
                    currentPolicy(workspace, c.product),
                    today,
                  ).join(" · ")}
                </small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))
        ) : (
          <div className="empty">
            <CircleCheck />
            <h3>No approval holds</h3>
            <p>Current approvals have valid policy and evidence.</p>
          </div>
        )}
      </section>
    </div>
  );
}
function Scenarios({
  campaigns,
  today,
  open,
  policies,
}: {
  campaigns: Campaign[];
  today: string;
  open: (id: string, person: string) => void;
  policies: () => void;
}) {
  const cards = [
    [
      "01",
      "Risky affiliate creative",
      "CP-1048",
      "Sarah Chen",
      "Open findings cover approval promises and credit inquiries. Request changes with a reason; switch to Alex Morgan to revise. Destination copy is reviewed alongside the ad.",
      "The ad can look safe while its landing page makes a misleading promise.",
    ],
    [
      "02",
      "Approval needs evidence",
      "CP-1045",
      "Sarah Chen",
      "The sample evidence is already attached. Complete the checklist, choose an expiry before " +
        displayDate(dayOffset(60)) +
        ", and add a decision rationale. Then inspect the exact snapshot in Versions.",
      "A checked box is not enough: reviewers need attributable, time-bound substantiation.",
    ],
    [
      "03",
      "The author cannot approve",
      "CP-1046",
      "Alex Morgan",
      "Submit a revised version as Alex. Approval stays unavailable until you switch to the assigned compliance reviewer. New copy clears prior evidence and checks.",
      "Separation of duties follows creative authorship, not just the original submitter.",
    ],
    [
      "04",
      "Escalated partner request",
      "CP-1044",
      "Jamie Lee",
      "Try reviewing the escalated creative. Switch to Sarah Chen to clear the escalation with documented guidance. The reviewer must still complete every approval prerequisite.",
      "Urgency or partner pressure must not bypass compliance gates.",
    ],
    [
      "05",
      "Policy changed after approval",
      "CP-1042",
      "Sarah Chen",
      "Inspect the policy hold and historical decision. Reopen the review, acknowledge current policy, and re-verify findings, evidence, and checks.",
      "Historical approval stays visible without falsely implying current launch clearance.",
    ],
    [
      "06",
      "The offer has expired",
      "CP-1041",
      "Sarah Chen",
      "Inspect the expired approval and evidence. Reopen, replace the evidence, and review again; simply extending a date cannot renew approval.",
      "Expiration is derived from the date, so returning to an old browser session still shows the hold.",
    ],
    [
      "07",
      "Stop an approved campaign",
      "CP-1043",
      "Sarah Chen",
      "Revoke with a specific reason. The campaign immediately loses launch clearance while the original decision snapshot stays exportable.",
      "Stopping distribution and deleting history are different operations.",
    ],
  ];
  return (
    <>
      <div className="notice neutral-tone">
        <FlaskConical size={21} />
        <p>
          Scenarios use the current workspace and preserve your progress. Reset
          the demo to replay them from the start. Dates are relative to your
          browser’s local calendar; today is {displayDate(today)}.
        </p>
      </div>
      <div className="scenario-grid">
        {cards.map(([n, title, id, identity, steps, why]) => (
          <article className="panel scenario" key={n}>
            <div className="scenario-number">{n}</div>
            <h2>{title}</h2>
            <p>{steps}</p>
            <div className="why">
              <b>Product thinking</b>
              <p>{why}</p>
            </div>
            <button className="text-button" onClick={() => open(id, identity)}>
              {campaigns.some((c) => c.id === id)
                ? "Try this scenario"
                : "Sample not loaded — reset to try"}
              <ArrowRight size={15} />
            </button>
          </article>
        ))}
        <article className="panel scenario">
          <div className="scenario-number">08</div>
          <h2>Two reviewers, one record</h2>
          <p>
            Open this site in two tabs. Save a checklist change in one; the
            other shows a stale-workspace notice and blocks writes until
            refreshed. Typed form text remains available.
          </p>
          <div className="why">
            <b>Product thinking</b>
            <p>
              Prevent lost updates with Web Locks and a workspace revision
              check. A failed save never pretends to be successful.
            </p>
          </div>
        </article>
        <article className="panel scenario">
          <div className="scenario-number">09</div>
          <h2>A change affects many campaigns</h2>
          <p>
            As Sarah Chen, publish a policy revision. Review its impact count
            before confirming. Existing approvals for that product become holds
            immediately.
          </p>
          <div className="why">
            <b>Product thinking</b>
            <p>
              Make policy change impact visible without silently approving or
              rewriting old decisions.
            </p>
          </div>
          <button className="text-button" onClick={policies}>
            Open policy library
            <ArrowRight size={15} />
          </button>
        </article>
      </div>
    </>
  );
}
