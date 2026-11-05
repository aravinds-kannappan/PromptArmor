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
  PlayCircle,
  Users,
} from "lucide-react";
import {
  currentPolicy,
  isReviewer,
  launchBlockers,
  localDay,
  membersOf,
  memberRoles,
  isLead,
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
      if (action.type === "submit") {
        setPage("Review queue");
        setSelected(next.campaigns[0].id);
      }
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
              { Icon: PlayCircle, label: "Product walkthrough" },
              { Icon: Users, label: "Workspace team" },
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
                  aria-label="Workspace identity"
                  value={person}
                  onChange={(e) => {
                    setPerson(e.target.value);
                    setError("");
                  }}
                >
                  {membersOf(workspace)
                    .map((m) => m.name)
                    .map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                </select>
                <small>{role(person, workspace)} · Local identity</small>
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
                back={() => navigate("Review queue")}
                run={run}
              />
            ) : (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">CLEARPATH REVIEW</div>
                    <h1>
                      {page === "Review queue"
                        ? "Less back-and-forth. More ready to launch."
                        : page === "Overview"
                          ? "See what needs your attention."
                          : page === "Policy library"
                            ? "Consistent reviews start here."
                            : page === "Product walkthrough"
                              ? "From first review to confident launch."
                              : page === "Workspace team"
                                ? "Make the workspace yours."
                                : "Every decision, accounted for."}
                    </h1>
                    <p>
                      {page === "Review queue"
                        ? "Move campaigns through compliance with complete briefs, clear ownership, and one review record."
                        : page === "Overview"
                          ? "Find review bottlenecks, rebalance work, and see what is holding up campaign launches."
                          : page === "Policy library"
                            ? "Versioned internal guidance. Policy changes trigger re-review before launch."
                            : page === "Product walkthrough"
                              ? "A captioned product walkthrough. Follow one campaign through the decisions that matter."
                              : page === "Workspace team"
                                ? "Add your own names and choose who submits, reviews, and leads compliance."
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
                    <div className="own-work-banner">
                      <div>
                        <b>Make room for growth with the same review team.</b>
                        <p>
                          Spend less time chasing emails and rebuilding context,
                          so reviewers can focus on decisions. Try the workflow
                          with your own team and campaign copy.
                        </p>
                      </div>
                      <button
                        className="secondary"
                        onClick={() => navigate("Workspace team")}
                      >
                        Set up your team <ArrowRight size={14} />
                      </button>
                    </div>
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
                            {isLead(person, workspace) && (
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
                {page === "Product walkthrough" && (
                  <section className="panel walkthrough-player">
                    <video
                      controls
                      preload="metadata"
                      poster="./media/clearpath-walkthrough-poster.jpg?v=live-cursor-2"
                      playsInline
                      aria-label="ClearPath Review captioned product walkthrough"
                    >
                      <source
                        src="./media/clearpath-walkthrough.mp4?v=live-cursor-2"
                        type="video/mp4"
                      />
                      <track
                        kind="captions"
                        src="./media/clearpath-walkthrough.vtt?v=live-cursor-2"
                        srcLang="en"
                        label="English"
                      />
                      Your browser does not support video playback.{" "}
                      <a href="./media/clearpath-walkthrough.mp4?v=live-cursor-2">
                        Download the walkthrough
                      </a>
                      .
                    </video>
                    <div className="walkthrough-details">
                      <div>
                        <h2>One campaign. A clear chain of decisions.</h2>
                        <p>
                          Live browser recording with a visible cursor and timed
                          explanations. Includes creating a custom campaign. No
                          audio required.
                        </p>
                      </div>
                      <a
                        className="secondary"
                        href="./media/clearpath-walkthrough.mp4?v=live-cursor-2"
                        download
                      >
                        <Download size={15} /> Download video
                      </a>
                    </div>
                  </section>
                )}
                {page === "Workspace team" && (
                  <section className="panel team-panel">
                    <div className="notice neutral-tone">
                      <Users size={20} />
                      <p>
                        Use your own names and campaigns. These are local
                        workflow identities, not accounts or invitations; data
                        stays in this browser. Sample people remain available.
                      </p>
                    </div>
                    <div className="section-heading">
                      <h2>
                        {membersOf(workspace).length} workspace identities
                      </h2>
                      <button
                        className="primary"
                        onClick={() => setModal("member")}
                      >
                        <Plus size={16} /> Add team member
                      </button>
                    </div>
                    <div className="team-grid">
                      {membersOf(workspace).map((m) => (
                        <article className="team-card" key={m.name}>
                          <span className="avatar">
                            {m.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <div>
                            <h3>{m.name}</h3>
                            <p>{m.role}</p>
                          </div>
                          <button
                            className="secondary"
                            disabled={person === m.name}
                            onClick={() => {
                              setPerson(m.name);
                              setToast(`Now working as ${m.name}.`);
                            }}
                          >
                            {person === m.name
                              ? "Current identity"
                              : "Use identity"}
                          </button>
                        </article>
                      ))}
                    </div>
                    <p className="small muted">
                      Owners submit and revise. Reviewers decide on assigned
                      work. Leads also publish policy and revoke approvals.
                      Authors cannot approve their own creative.
                    </p>
                  </section>
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
          <Submission
            today={today}
            onClose={() => setModal("")}
            run={run}
            workspace={workspace}
            person={person}
          />
        )}
        {modal === "member" && (
          <Dialog title="Add a local team member" onClose={() => setModal("")}>
            <p>
              Use a real or fictional name. No invitation is sent; this identity
              exists only in your browser workspace.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                if (
                  await run({
                    type: "member",
                    name: String(d.get("name")),
                    role: String(d.get("role")) as (typeof memberRoles)[number],
                  })
                )
                  setModal("");
              }}
            >
              <label>
                Name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={60}
                  placeholder="e.g. Priya Shah"
                />
              </label>
              <label>
                Workspace role
                <select name="role">
                  {memberRoles.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
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
                  Add team member
                </button>
              </div>
            </form>
          </Dialog>
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
                    setPerson("Sarah Chen");
                    setToast("Demo workspace restored.");
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
      <section className="panel throughput-panel" aria-labelledby="throughput-heading">
        <div className="eyebrow">FROM REVIEW CAPACITY TO GROWTH</div>
        <h2 id="throughput-heading">Less coordination work. More capacity for campaigns.</h2>
        <p className="throughput-intro">
          The goal is more completed reviews with the same team, helping marketing
          launch sooner while keeping evidence and independent human review required.
        </p>
        <div className="throughput-steps">
          <div><span>01 / COMPLETE INTAKE</span><h3>Fewer clarification loops</h3><p>Capture copy, audience, channel, and ownership before review starts.</p></div>
          <div><span>02 / FOCUSED REVIEW</span><h3>Less time reconstructing context</h3><p>Keep advisory flags, evidence, feedback, and revisions in one campaign record.</p></div>
          <div><span>03 / CLEAR NEXT ACTION</span><h3>Less waiting between people</h3><p>See overdue work and reviewer load; hand off reviews and identify launch blockers.</p></div>
        </div>
        <div className="throughput-validation">
          <b>How we would validate the benefit</b>
          <p>Compare completed reviews per reviewer per week, time to decision,
          and revision cycles against the Excel/email baseline. Track decision
          quality and post-approval corrections alongside speed.</p>
          <small>Expected benefits, not measured gains. This browser-local prototype
          demonstrates the workflow; a real team needs shared storage, authenticated
          roles, and notifications.</small>
        </div>
      </section>
      <section className="panel overview-panel">
        <div className="section-heading">
          <h2>Reviewer capacity</h2>
          <span className="pill blue">{active.length} open reviews</span>
        </div>
        <p className="small muted">
          Use a reasoned handoff when ownership needs to change.
        </p>
        {membersOf(workspace)
          .map((m) => m.name)
          .filter((p) => isReviewer(p, workspace))
          .map((p) => {
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
