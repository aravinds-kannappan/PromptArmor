/** Pure workflow rules shared by the UI and tests. Demo identities are not authentication. */
export const people = [
  "Sarah Chen",
  "Alex Morgan",
  "Jamie Lee",
  "Taylor Reed",
] as const;
export const products = ["Personal loans", "Credit cards", "Mortgage"] as const;
export const channels = [
  "Affiliate",
  "Paid social",
  "Paid search",
  "Email",
  "Website",
] as const;
export type Status =
  | "In review"
  | "Changes requested"
  | "Approved"
  | "Revoked"
  | "Withdrawn"
  | "Rejected";
export type Finding = {
  id: string;
  title: string;
  detail: string;
  resolved: boolean;
  note: string;
  source?: "Pre-check" | "Reviewer";
  quote?: string;
};
export type Evidence = {
  id: string;
  title: string;
  reference: string;
  excerpt: string;
  validThrough: string;
  version: number;
  addedBy: string;
  addedAt: string;
};
export type Snapshot = {
  version: number;
  title: string;
  copy: string;
  variantCopy?: string;
  justification?: string;
  scope: string;
  jurisdictions?: string;
  product: string;
  channel: string;
  partner: string;
  destination: string;
  destinationCopy: string;
  policyVersion: number;
  findings: Finding[];
  checks: string[];
  evidence: Evidence[];
  expires: string;
  at: string;
  by: string;
  note: string;
};
export type Campaign = {
  id: string;
  title: string;
  product: string;
  channel: string;
  partner: string;
  owner: string;
  reviewer: string;
  due: string;
  status: Status;
  version: number;
  copy: string;
  variantCopy?: string;
  justification?: string;
  findings: Finding[];
  checks: string[];
  history: { at: string; text: string }[];
  versions: {
    version: number;
    copy: string;
    variantCopy?: string;
    justification?: string;
    scope?: string;
    destinationCopy?: string;
    review?: Snapshot;
  }[];
  scope: string;
  jurisdictions?: string;
  expires?: string;
  policyVersion: number;
  evidence: Evidence[];
  approvals: Snapshot[];
  contributors: string[];
  destination: string;
  destinationCopy: string;
  escalated: string;
  submittedAt: string;
  rush?: { status: "Pending" | "Approved" | "Denied"; requestedBy: string; reason: string; version: number; decidedBy?: string; decision?: string };
  rejection?: Snapshot;
  deltaBase?: Snapshot;
  roundStartedAt?: string;
  decisions?: { kind: "approve" | "request" | "reject"; at: string; startedAt: string; version: number }[];
};
export type Policy = {
  product: string;
  version: number;
  summary: string;
  at: string;
  by: string;
};
export const memberRoles = [
  "Marketing owner",
  "Compliance reviewer",
  "Compliance lead",
] as const;
export type Member = { name: string; role: (typeof memberRoles)[number] };
export type Workspace = {
  members?: Member[];
  schema: 2;
  revision: number;
  campaigns: Campaign[];
  policies: Policy[];
};
export const checks = [
  "Offer terms and disclosures verified",
  "Claims substantiated against product terms",
  "Audience, channel, and partner scope verified",
];
export const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dayOffset = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDay(d);
};
export const validDay = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(s)) &&
  new Date(s).toISOString().slice(0, 10) === s;
export const normalize = (s: string) =>
  s.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
export const defaultMembers: Member[] = people.map((name) => ({
  name,
  role:
    name === "Sarah Chen"
      ? "Compliance lead"
      : name === "Jamie Lee"
        ? "Compliance reviewer"
        : "Marketing owner",
}));
export const membersOf = (w?: Workspace): Member[] =>
  w?.members ?? defaultMembers;
export const role = (name: string, w?: Workspace) =>
  membersOf(w).find((m) => m.name === name)?.role ?? "Unknown identity";
export const isLead = (name: string, w?: Workspace) =>
  role(name, w) === "Compliance lead";
export const isReviewer = (name: string, w?: Workspace) =>
  ["Compliance reviewer", "Compliance lead"].includes(role(name, w));
export function safeUrl(s: string) {
  try {
    const u = new URL(s);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !!u.hostname &&
      !["localhost", "127.0.0.1"].includes(u.hostname)
    );
  } catch {
    return false;
  }
}
export function scan(copy: string, product?: string, channel?: string): Finding[] {
  const text = copy.normalize("NFKC");
  const rules: [string, boolean, string, string][] = [
    ["no-credit", /no\s+credit\s+check/i.test(text), "No credit check claim", "Remove this claim or explain the specific stage and supporting terms for independent review."],
    ["opt-out", channel === "Email" && !/unsubscribe|opt[ -]?out/i.test(text), "Email opt-out not captured", "Include the unsubscribe mechanism or explain where the email template provides it."],
    ["mortgage-approved", product === "Mortgage" && /(?:you(?:'re| are) approved|already approved|mortgage approved)/i.test(text), "Prequalification presented as approval", "Prequalification is not a final lending decision. Verify and correct the claim."],
    ["promotion", product === "Credit cards" && /(?:introductory|intro|promotional|0%)/i.test(text) && !/(?:months?|until|through|expires)/i.test(text), "Promotional period not captured", "Capture the promotional end date or duration, qualifying transactions, and the terms that apply afterward. A reviewer must verify these against the offer terms."],
    ["mortgage", product === "Mortgage" && /(?:prequalified|prequalification|preapproved)/i.test(text) && !/(?:not a commitment|not guaranteed|subject to|does not guarantee)/i.test(text), "Prequalification limitations not captured", "Verify that the copy distinguishes prequalification from a lending commitment and explains the remaining conditions."],

    [
      "guarantee",
      /(?:guaranteed\s+(?:approval|financing)|everyone is approved|100%\s*approval)/i.test(
        text,
      ),
      "Unqualified approval claim",
      "Verify the claim against approved eligibility criteria. Remove or appropriately qualify unsubstantiated approval promises.",
    ],
    [
      "rate",
      /(?:rate|interest|financing)[^.]*\d+(?:\.\d+)?%/i.test(text) &&
        !/\bAPR\b/i.test(text),
      "Rate without APR context",
      "Verify rate presentation and applicable APR context against approved product terms. Rewards percentages alone are not borrowing rates.",
    ],
    [
      "credit",
      /no impact|won[’']?t affect/i.test(text),
      "Credit inquiry claim",
      "Verify the soft-pull stage and explain when a hard inquiry may occur.",
    ],
    [
      "urgency",
      /(?:last chance|today only|limited time)/i.test(text),
      "Time-limited offer",
      "Substantiate the deadline and ensure the campaign and approval end before the offer expires.",
    ],
  ];
  return rules
    .filter(([, matched]) => matched)
    .map(([id, , title, detail]) => ({
      id,
      title,
      detail,
      resolved: false,
      note: "",
      source: "Pre-check",
    }));
}
// Fictional policy fixtures demonstrate jurisdiction routing, not actual state law.
export const jurisdictionOptions = { CA: "California", NY: "New York", TX: "Texas", OTHER: "Other / nationwide / not yet supported" };
export const jurisdictionCodes = (value?: string) => (value || "").split(",").filter(Boolean);
export function jurisdictionError(c: Pick<Campaign, "jurisdictions">): string | null {
  const codes = jurisdictionCodes(c.jurisdictions);
  if (!codes.length) return "Select distribution states in a revised brief before approval.";
  if (codes.some(x => !["CA", "NY", "TX"].includes(x))) return "Unsupported jurisdiction: narrow the distribution scope or obtain a supported policy before approval.";
  return null;
}
export function reviewChecks(c: Pick<Campaign, "product" | "jurisdictions">): string[] {
  const product = c.product === "Personal loans" ? "Loan APR, fees, repayment example, and eligibility verified" : c.product === "Credit cards" ? "Card purchase APR, annual fee, and promotional end terms verified" : "Prequalification limits, lender identity, and non-guarantee disclosure verified";
  const fixtures: Record<string, string> = { CA: "CA fixture: state availability and lender identity disclosure verified", NY: "NY fixture: state-specific offer limitations and fee disclosure verified", TX: "TX fixture: state contact and complaint disclosure verified" };
  return [...checks, product, ...jurisdictionCodes(c.jurisdictions).filter(x => fixtures[x]).map(x => fixtures[x])];
}
export function hasApprovedRush(c: Campaign) {
  return c.status === "In review" && c.rush?.status === "Approved" && c.rush.version === c.version;
}
export function queueRank(c: Campaign, policy: number, today: string) {
  if (c.status === "Revoked" || (c.status === "Approved" && launchBlockers(c, policy, today).length)) return 0;
  if (hasApprovedRush(c)) return 1;
  if (c.status === "In review") return 2;
  if (c.status === "Changes requested") return 3;
  return 4;
}
export function currentPolicy(w: Workspace, product: string) {
  return Math.max(
    1,
    ...w.policies.filter((p) => p.product === product).map((p) => p.version),
  );
}
export function launchBlockers(
  c: Campaign,
  policyVersion: number,
  today = localDay(),
): string[] {
  const errors: string[] = [];
  if (c.status !== "Approved")
    errors.push(
      c.status === "Revoked"
        ? "Approval revoked — stop distribution"
        : c.status === "Rejected" ? "Campaign rejected — distribution prohibited" : c.status === "Withdrawn"
          ? "Campaign withdrawn"
          : "Human approval required",
    );
  if (!c.expires || !validDay(c.expires) || c.expires < today)
    errors.push("Approval expired or not yet recorded");
  if (c.policyVersion !== policyVersion)
    errors.push(
      `Policy changed: reviewed v${c.policyVersion}, current v${policyVersion}`,
    );
  if (
    !c.evidence.length ||
    c.evidence.some((e) => e.validThrough < today || e.version !== c.version)
  )
    errors.push("Evidence missing, expired, or from another version");
  if (jurisdictionError(c)) errors.push(jurisdictionError(c)!);
  if (c.status === "Approved" && reviewChecks(c).some(x => !c.checks.includes(x))) errors.push("Product/state review checks require re-review");
  if (c.escalated) errors.push("Escalation requires compliance lead clearance");
  if (c.status === "Approved") {
    const decision = c.approvals.at(-1);
    const current = snapshot(c, c.reviewer, "");
    const content = (s: Snapshot) => {
      const { at: _at, note: _note, ...rest } = s;
      return rest;
    };
    if (
      !decision ||
      JSON.stringify(content(decision)) !== JSON.stringify(content(current))
    )
      errors.push("No matching decision snapshot");
  }
  return errors;
}
export function approvalError(
  c: Campaign,
  reviewer: string,
  today = localDay(),
  policyVersion = c.policyVersion,
  workspace?: Workspace,
): string | null {
  if (c.status !== "In review") return "Only an active review can be approved.";
  if (!isReviewer(reviewer, workspace))
    return "Only compliance reviewers can approve.";
  if (c.owner === reviewer || c.contributors.includes(reviewer))
    return "Authors and contributors cannot approve their own creative.";
  if (c.reviewer !== reviewer) return "Only the assigned reviewer can decide.";
  if (c.escalated)
    return "A compliance lead must clear the escalation with a rationale.";
  if (c.policyVersion !== policyVersion)
    return "Acknowledge the current policy before approval.";
  if (c.findings.some((f) => !f.resolved || !f.note.trim()))
    return "Resolve all open findings with rationale before approval.";
  if (jurisdictionError(c)) return jurisdictionError(c);
  if (reviewChecks(c).some((x) => !c.checks.includes(x)))
    return "Complete all required review checks.";
  if (!c.evidence.length)
    return "Add a product-terms evidence record before approval.";
  if (
    c.evidence.some(
      (e) =>
        e.version !== c.version ||
        !validDay(e.validThrough) ||
        e.validThrough < today,
    )
  )
    return "Replace expired evidence or evidence from an older version.";
  if (
    c.channel === "Affiliate" &&
    (!safeUrl(c.destination) || !c.destinationCopy.trim())
  )
    return "Affiliate reviews require an HTTPS destination and captured landing-page copy.";
  if (!c.expires || !validDay(c.expires) || c.expires <= today)
    return "Set an approval expiration date in the future.";
  if (c.evidence.some((e) => e.validThrough < c.expires!))
    return "Approval cannot outlive its supporting evidence.";
  return null;
}
export function snapshot(
  c: Campaign,
  by: string,
  note: string,
  at = new Date().toISOString(),
): Snapshot {
  return structuredClone({
    version: c.version,
    title: c.title,
    copy: c.copy,
    ...(c.variantCopy ? { variantCopy: c.variantCopy } : {}),
    ...(c.justification ? { justification: c.justification } : {}),
    scope: c.scope,
    jurisdictions: c.jurisdictions,
    product: c.product,
    channel: c.channel,
    partner: c.partner,
    destination: c.destination,
    destinationCopy: c.destinationCopy,
    policyVersion: c.policyVersion,
    findings: c.findings,
    checks: c.checks,
    evidence: c.evidence,
    expires: c.expires || "",
    by,
    note,
    at,
  });
}
export type Intake = {
  reviewer?: string;
  title: string;
  copy: string;
  variantCopy?: string;
  justification?: string;
  product: string;
  channel: string;
  partner: string;
  scope: string;
  jurisdictions?: string;
  due: string;
  destination: string;
  destinationCopy: string;
};
export type Action =
  | { type: "member"; name: string; role: Member["role"] }
  | { type: "submit"; data: Intake }
  | { type: "assign"; id: string; reviewer: string; reason: string }
  | {
      type: "resolve";
      id: string;
      findingId: string;
      note: string;
      resolved: boolean;
    }
  | { type: "finding"; id: string; title: string; detail: string; quote?: string }
  | { type: "check"; id: string; check: string; checked: boolean }
  | {
      type: "evidence";
      id: string;
      data: Omit<Evidence, "id" | "version" | "addedBy" | "addedAt">;
    }
  | { type: "removeEvidence"; id: string; evidenceId: string }
  | { type: "approve" | "approveDelta"; id: string; expires: string; note: string }
  | {
      type:
        | "request"
        | "reject"
        | "rush"
        | "approveRush"
        | "denyRush"
        | "reopen"
        | "revoke"
        | "withdraw"
        | "escalate"
        | "clearEscalation";
      id: string;
      reason: string;
    }
  | {
      type: "revise";
      id: string;
      copy: string;
      variantCopy?: string;
      justification?: string;
      scope: string;
      jurisdictions?: string;
      destination: string;
      destinationCopy: string;
    }
  | { type: "ackPolicy"; id: string }
  | { type: "policy"; product: string; summary: string };
const requireThat = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};
const reason = (s: string) =>
  requireThat(
    s.trim().length >= 10 && s.length <= 2000,
    "Provide a meaningful rationale (10–2,000 characters).",
  );
export function applyAction(
  state: Workspace,
  action: Action,
  actor: string,
  today = localDay(),
  at = new Date().toISOString(),
): Workspace {
  requireThat(
    membersOf(state).some((m) => m.name === actor),
    "Unknown demo identity.",
  );
  const w = structuredClone(state);
  const event = (c: Campaign, text: string) =>
    c.history.unshift({ at, text: `${actor}: ${text}` });
  if (action.type === "member") {
    const name = action.name.normalize("NFKC").trim().replace(/\s+/g, " ");
    requireThat(
      name.length >= 2 && name.length <= 60,
      "Use a name between 2 and 60 characters.",
    );
    requireThat(
      memberRoles.includes(action.role),
      "Select a supported workspace role.",
    );
    requireThat(
      !membersOf(w).some((m) => normalize(m.name) === normalize(name)),
      "A team member with this name already exists.",
    );
    requireThat(
      membersOf(w).length < 50,
      "This browser workspace supports up to 50 local identities.",
    );
    w.members = [...membersOf(w), { name, role: action.role }];
  } else if (action.type === "policy") {
    requireThat(
      isLead(actor, w),
      "Only the compliance lead can publish policy changes.",
    );
    requireThat(
      products.includes(action.product as (typeof products)[number]),
      "Unknown product.",
    );
    reason(action.summary);
    const version = currentPolicy(w, action.product) + 1;
    w.policies.push({
      product: action.product,
      version,
      summary: action.summary.trim(),
      by: actor,
      at,
    });
    w.campaigns
      .filter((c) => c.product === action.product && c.status !== "Withdrawn")
      .forEach((c) =>
        event(
          c,
          `Published policy v${version}: ${action.summary}. Existing approval requires re-review.`,
        ),
      );
  } else if (action.type === "submit") {
    const d = Object.fromEntries(
      Object.entries(action.data).map(([k, v]) => [k, v.trim()]),
    ) as Intake;
    requireThat(typeof d.jurisdictions === "string" && jurisdictionCodes(d.jurisdictions).length > 0 && jurisdictionCodes(d.jurisdictions).every(x => x in jurisdictionOptions), "Select at least one distribution state.");
    d.jurisdictions = [...new Set(jurisdictionCodes(d.jurisdictions))].sort().join(",");
    requireThat(!d.destination || safeUrl(d.destination), "Destination must be a valid HTTPS URL without credentials.");
    requireThat(
      d.title.length >= 3 &&
        d.title.length <= 100 &&
        d.copy.length >= 20 &&
        d.copy.length <= 5000 &&
        d.scope.length >= 5 &&
        d.scope.length <= 300 &&
        d.partner.length >= 2 &&
        d.partner.length <= 80,
      "Complete the brief: title (3–100), copy (20–5,000), scope (5–300), partner (2–80 characters).",
    );
    requireThat(
      products.includes(d.product as (typeof products)[number]) &&
        channels.includes(d.channel as (typeof channels)[number]),
      "Select a supported product and channel.",
    );
    requireThat(
      validDay(d.due) && d.due >= today,
      "Review due date must be today or later.",
    );
    requireThat(
      d.destinationCopy.length <= 5000,
      "Landing-page copy must be 5,000 characters or fewer.",
    );
    if (d.channel === "Affiliate")
      requireThat(
        safeUrl(d.destination) &&
          d.destinationCopy.length >= 20 &&
          normalize(d.partner) !== "in-house",
        "Affiliate campaigns require a named partner, HTTPS destination, and landing-page copy (20+ characters).",
      );
    validateIntakeChecks(d);
    rejectRepeatedProposal(w, d);
    requireThat(
      !w.campaigns.some(
        (c) =>
          !["Withdrawn", "Rejected"].includes(c.status) &&
          (normalize(c.title) === normalize(d.title) ||
            (normalize(c.copy) === normalize(d.copy) &&
              c.product === d.product &&
              c.channel === d.channel &&
              normalize(c.partner) === normalize(d.partner) &&
              c.jurisdictions === d.jurisdictions && normalize(c.scope) === normalize(d.scope))),
      ),
      "This title or exact creative already exists for this distribution scope. Open the existing campaign or use a distinct brief.",
    );
    requireThat(
      membersOf(w).some(
        (m) =>
          m.name !== actor &&
          isReviewer(m.name, w) &&
          (!d.reviewer || m.name === d.reviewer),
      ),
      "Choose an independent compliance reviewer.",
    );
    const c: Campaign = {
      ...d,
      id: `CP-${Math.max(1048, ...w.campaigns.map((x) => Number(x.id.slice(3)))) + 1}`,
      owner: actor,
      contributors: [actor],
      reviewer:
        d.reviewer ||
        suggestedReviewer(w, actor)!,
      status: "In review",
      version: 1,
      policyVersion: currentPolicy(w, d.product),
      findings: campaignScan(d),
      decisions: [],
      roundStartedAt: at,
      checks: [],
      evidence: [],
      approvals: [],
      expires: "",
      escalated: "",
      submittedAt: at,
      history: [],
      versions: [],
    };
    event(c, "Submitted version 1. Human review and evidence required.");
    w.campaigns.unshift(c);
  } else {
    const c = w.campaigns.find((c) => c.id === action.id);
    requireThat(c, "Campaign no longer exists. Refresh the workspace.");
    if (!c) return w;
    const active = () =>
      requireThat(
        c.status === "In review",
        "This action requires an active review.",
      );
    const reviewer = () => {
      active();
      requireThat(
        isReviewer(actor, w) &&
          c.reviewer === actor &&
          !c.contributors.includes(actor) &&
          c.owner !== actor,
        "Only the assigned, independent compliance reviewer can perform this action.",
      );
    };
    switch (action.type) {
      case "assign":
        requireThat(
          isLead(actor, w) || actor === c.reviewer,
          "Only the lead or current reviewer can hand off a review.",
        );
        requireThat(
          ["In review", "Changes requested", "Revoked"].includes(c.status),
          "Reopen the campaign before changing ownership.",
        );
        requireThat(
          isReviewer(action.reviewer, w) &&
            !c.contributors.includes(action.reviewer) &&
            c.owner !== action.reviewer &&
            c.reviewer !== action.reviewer,
          "Choose another independent compliance reviewer.",
        );
        reason(action.reason);
        c.deltaBase = undefined;
        c.reviewer = action.reviewer;
        c.checks = [];
        c.findings.forEach((f) => {
          f.resolved = false;
          f.note = "";
        });
        event(
          c,
          `Handed off to ${action.reviewer}; review checks reset. ${action.reason}`,
        );
        break;
      case "check":
        reviewer();
        requireThat(reviewChecks(c).includes(action.check), "Unknown checklist item.");
        c.checks = action.checked
          ? [...new Set([...c.checks, action.check])]
          : c.checks.filter((x) => x !== action.check);
        event(
          c,
          `${action.checked ? "Completed" : "Cleared"} check: ${action.check}`,
        );
        break;
      case "resolve": {
        reviewer();
        const f = c.findings.find((f) => f.id === action.findingId);
        requireThat(f, "Finding no longer exists.");
        reason(action.note);
        if (f) {
          f.resolved = action.resolved;
          f.note = action.note.trim();
          event(
            c,
            `${f.resolved ? "Resolved" : "Reopened"} ${f.title}: ${f.note}`,
          );
        }
        break;
      }
      case "finding":
        c.deltaBase = undefined;
        requireThat(!action.quote || c.copy.includes(action.quote) || !!c.variantCopy?.includes(action.quote) || c.destinationCopy.includes(action.quote), "Quoted text must exist in this version.");
        reviewer();
        reason(action.detail);
        requireThat(
          action.title.trim().length >= 3 && action.title.length <= 100,
          "Provide a finding title (3–100 characters).",
        );
        c.findings.push({
          id: `manual-${c.history.length}`,
          title: action.title.trim(),
          detail: action.detail.trim(),
          note: "",
          resolved: false,
          source: "Reviewer",
          quote: action.quote,
        });
        event(c, `Added manual finding: ${action.title}`);
        break;
      case "evidence":
        c.deltaBase = undefined;
        requireThat(
          c.status === "In review" &&
            (actor === c.owner || actor === c.reviewer || isLead(actor, w)),
          "Evidence can be added by the owner or assigned reviewer during review.",
        );
        requireThat(
          action.data.title.trim().length >= 3 &&
            action.data.title.length <= 100 &&
            action.data.excerpt.trim().length >= 20 &&
            action.data.excerpt.length <= 5000,
          "Evidence requires a title and substantive terms excerpt (20–5,000 characters).",
        );
        requireThat(
          safeUrl(action.data.reference),
          "Evidence reference must be an HTTPS URL without credentials.",
        );
        requireThat(
          validDay(action.data.validThrough) &&
            action.data.validThrough >= today,
          "Evidence validity cannot be in the past.",
        );
        c.evidence.push({
          ...action.data,
          id: `ev-${c.history.length}`,
          version: c.version,
          addedBy: actor,
          addedAt: at,
        });
        c.checks = [];
        event(
          c,
          `Added evidence “${action.data.title}”; checks reset to verify the new evidence.`,
        );
        break;
      case "removeEvidence":
        c.deltaBase = undefined;
        reviewer();
        requireThat(
          c.evidence.some((e) => e.id === action.evidenceId),
          "Evidence not found.",
        );
        c.evidence = c.evidence.filter((e) => e.id !== action.evidenceId);
        c.checks = [];
        event(
          c,
          "Removed evidence; review checks reset. Historical decision snapshots retained.",
        );
        break;
      case "approveDelta":
        reviewer();
        requireThat(deltaEligible(c, currentPolicy(w, c.product), today), "Delta approval is no longer eligible; use full review.");
        requireThat(action.expires <= c.deltaBase!.expires, "Delta approval cannot extend the original expiration.");
        c.checks = [...c.deltaBase!.checks];
        c.evidence = c.deltaBase!.evidence.map(e => ({ ...e, version: c.version }));
        // Fall through: the same independence, evidence, expiry and policy gates apply.
      case "approve": {
        c.expires = action.expires;
        const error = approvalError(
          c,
          actor,
          today,
          currentPolicy(w, c.product),
          w,
        );
        requireThat(!error, error || "Approval blocked.");
        reason(action.note);
        recordDecision(c, "approve", at);
        c.status = "Approved";
        c.approvals.push(snapshot(c, actor, action.note, at));
        event(
          c,
          `Approved version ${c.version}, policy v${c.policyVersion}, through ${c.expires}: ${action.note}`,
        );
        break;
      }
      case "rush":
        active();
        requireThat(actor === c.owner, "Only the campaign owner can request a rush.");
        requireThat(!c.rush || c.rush.version !== c.version, "A rush decision already exists for this version; repeated requests do not change priority.");
        reason(action.reason);
        c.rush = { status: "Pending", requestedBy: actor, reason: action.reason, version: c.version };
        event(c, `Requested rush (priority unchanged): ${action.reason}`);
        break;
      case "approveRush":
      case "denyRush":
        active();
        requireThat(isLead(actor, w) && actor !== c.owner && !c.contributors.includes(actor), "Only an independent compliance lead can decide rush requests.");
        requireThat(c.rush?.status === "Pending" && c.rush.version === c.version, "No pending rush request for this version.");
        reason(action.reason);
        c.rush = { ...c.rush!, status: action.type === "approveRush" ? "Approved" : "Denied", decidedBy: actor, decision: action.reason };
        event(c, `${c.rush.status} rush: ${action.reason}. Review safeguards unchanged.`);
        break;
      case "reject":
        reviewer();
        reason(action.reason);
        c.rejection = snapshot(c, actor, action.reason, at);
        recordDecision(c, "reject", at);
        c.status = "Rejected";
        c.rush = undefined;
        event(c, `Rejected campaign (closed, no revision or launch): ${action.reason}`);
        break;
      case "request":
        reviewer();
        reason(action.reason);
        recordDecision(c, "request", at);
        c.deltaBase = undefined;
        c.status = "Changes requested";
        c.rush = undefined;
        event(c, `Requested changes on v${c.version}: ${action.reason}`);
        break;
      case "revise":
        requireThat(
          ["Changes requested", "Approved"].includes(c.status) && actor === c.owner,
          "Only the campaign owner can revise an approved asset or a requested revision.",
        );
        requireThat(
          action.copy.trim().length >= 20 &&
            action.copy.length <= 5000 &&
            action.scope.trim().length >= 5 &&
            action.scope.length <= 300 &&
            action.destinationCopy.length <= 5000,
          "Provide valid copy and audience scope.",
        );
        if (c.channel === "Affiliate")
          requireThat(
            safeUrl(action.destination) &&
              action.destinationCopy.trim().length >= 20,
            "Affiliate revisions require HTTPS destination and landing-page copy.",
          );
        validateIntakeChecks({ ...c, ...action });
        const base = c.status === "Approved" && !launchBlockers(c, currentPolicy(w, c.product), today).length ? snapshot(c, c.reviewer, "Delta baseline", at) : undefined;
        const states = action.jurisdictions ?? c.jurisdictions;
        requireThat(typeof states === "string" && jurisdictionCodes(states).length > 0 && jurisdictionCodes(states).every(x => x in jurisdictionOptions), "Select distribution states for the revision.");
        requireThat(!action.destination || safeUrl(action.destination), "Destination must be a valid HTTPS URL without credentials.");
        const normalizedStates = [...new Set(jurisdictionCodes(states))].sort().join(",");
        rejectRepeatedProposal(w, { ...c, ...action, jurisdictions: normalizedStates });
        requireThat(
          (action.variantCopy ?? c.variantCopy ?? "") !== (c.variantCopy ?? "") ||
          normalizedStates !== c.jurisdictions ||
          action.copy.trim() !== c.copy ||
            action.scope.trim() !== c.scope ||
            action.destination !== c.destination ||
            action.destinationCopy !== c.destinationCopy,
          "Change the creative, scope, or destination before resubmitting.",
        );
        c.versions.push({
          version: c.version,
          copy: c.copy,
          scope: c.scope,
          destinationCopy: c.destinationCopy,
          review: snapshot(c, actor, "Prior review state before revision", at),
        });
        c.version++;
        c.deltaBase = base;
        c.roundStartedAt = at;
        c.variantCopy = action.variantCopy ?? c.variantCopy;
        c.justification = action.justification;
        c.jurisdictions = normalizedStates;
        c.rush = undefined;
        c.copy = action.copy.trim();
        c.scope = action.scope.trim();
        c.destination = action.destination;
        c.destinationCopy = action.destinationCopy.trim();
        c.contributors = [...new Set([...c.contributors, actor])];
        c.status = "In review";
        c.checks = [];
        c.evidence = [];
        c.findings = campaignScan(c);
        c.expires = "";
        c.policyVersion = currentPolicy(w, c.product);
        event(
          c,
          `Submitted v${c.version}; previous evidence and sign-offs invalidated.`,
        );
        break;
      case "reopen":
        requireThat(
          (actor === c.reviewer || isLead(actor, w)) &&
            ["Approved", "Revoked"].includes(c.status),
          "Only the reviewer or lead can reopen an approved or revoked campaign.",
        );
        reason(action.reason);
        c.status = "In review";
        c.deltaBase = undefined;
        c.roundStartedAt = at;
        c.checks = [];
        c.expires = "";
        c.findings.forEach((f) => {
          f.resolved = false;
          f.note = "";
        });
        event(c, `Reopened for re-review. ${action.reason}`);
        break;
      case "revoke":
        requireThat(
          isLead(actor, w) && c.status === "Approved",
          "Only the compliance lead can revoke an approved campaign.",
        );
        reason(action.reason);
        c.status = "Revoked";
        event(c, `REVOKED approval. Stop distribution. ${action.reason}`);
        break;
      case "withdraw":
        requireThat(
          (actor === c.owner || isLead(actor, w)) && !["Withdrawn", "Rejected"].includes(c.status),
          "Only the owner or lead can withdraw a campaign.",
        );
        reason(action.reason);
        c.status = "Withdrawn";
        event(
          c,
          `Withdrew campaign; distribution no longer permitted. ${action.reason}`,
        );
        break;
      case "escalate":
        requireThat(
          c.status === "In review" &&
            (actor === c.owner || isReviewer(actor, w)),
          "Only active reviews can be escalated.",
        );
        reason(action.reason);
        c.escalated = action.reason;
        event(c, `Escalated to compliance lead: ${action.reason}`);
        break;
      case "clearEscalation":
        active();
        requireThat(
          isLead(actor, w) && !!c.escalated,
          "Only the compliance lead can clear an escalation.",
        );
        reason(action.reason);
        c.escalated = "";
        event(c, `Cleared escalation: ${action.reason}`);
        break;
      case "ackPolicy":
        reviewer();
        requireThat(
          c.policyVersion !== currentPolicy(w, c.product),
          "Already reviewing the current policy.",
        );
        c.policyVersion = currentPolicy(w, c.product);
        c.checks = [];
        c.findings.forEach((f) => {
          f.resolved = false;
          f.note = "";
        });
        event(
          c,
          `Acknowledged policy v${c.policyVersion}; checks and findings require re-review.`,
        );
        break;
    }
  }
  w.revision++;
  return w;
}
export function seed(): Campaign[] {
  const rows = [
    [
      "A fresh start, with a little breathing room",
      "Personal loans",
      "Affiliate",
      "NerdWallet",
      "Alex Morgan",
      -1,
      "In review",
      "Get a personal loan from $2,000 to $35,000. Guaranteed approval. Check your rate with no impact to your credit score.",
    ],
    [
      "Make room for what’s next",
      "Credit cards",
      "Paid social",
      "In-house",
      "Taylor Reed",
      0,
      "In review",
      "A card that fits your everyday. Earn 2% cash back on eligible purchases. See application for APR, fees, exclusions, and full rewards terms.",
    ],
    [
      "Your home journey starts here",
      "Mortgage",
      "Email",
      "In-house",
      "Alex Morgan",
      1,
      "Changes requested",
      "Explore your homebuying budget. Prequalification is an estimate, not a commitment to lend. Subject to verification and credit approval.",
    ],
    [
      "One payment. A clearer path.",
      "Personal loans",
      "Paid search",
      "In-house",
      "Taylor Reed",
      2,
      "In review",
      "Explore a fixed-rate personal loan. Rates and eligibility vary. View full APR and fee disclosures before applying.",
    ],
    [
      "Everyday spending, rewarded",
      "Credit cards",
      "Affiliate",
      "Bankrate",
      "Alex Morgan",
      3,
      "In review",
      "Get rewarded on eligible purchases. Guaranteed approval for everyone. Terms and exclusions apply.",
    ],
    [
      "A more confident first step",
      "Mortgage",
      "Website",
      "In-house",
      "Taylor Reed",
      4,
      "Approved",
      "Estimate your homebuying budget. Prequalification does not guarantee financing. Final approval is subject to underwriting.",
    ],
    [
      "A plan for your next chapter",
      "Personal loans",
      "Email",
      "In-house",
      "Alex Morgan",
      5,
      "Approved",
      "Explore personal loan options with fixed monthly payments. Eligibility, APR, and fees vary. See full terms.",
    ],
    [
      "A limited-time welcome offer",
      "Credit cards",
      "Email",
      "In-house",
      "Taylor Reed",
      -3,
      "Approved",
      "Explore our welcome offer. Eligibility, APR and fees vary. Review full offer terms.",
    ],
  ];
  return rows.map((r, i) => {
    const approved = r[6] === "Approved";
    const at = new Date(
      Date.now() - (i === 6 ? 21 : i + 1) * 86400000,
    ).toISOString();
    const c: Campaign = {
      id: `CP-${1048 - i}`,
      title: String(r[0]),
      product: String(r[1]),
      channel: String(r[2]),
      partner: String(r[3]),
      owner: String(r[4]),
      reviewer: "Sarah Chen",
      due: dayOffset(Number(r[5])),
      status: r[6] as Status,
      version: 1,
      copy: String(r[7]),
      findings: scan(String(r[7]), String(r[1])),
      checks: approved ? [...checks] : [],
      scope: "California · Adults 18+ · Approved product availability only",
      jurisdictions: "CA",
      expires: approved ? dayOffset(i === 7 ? -1 : 30) : "",
      history: [
        {
          at,
          text:
            r[6] === "Changes requested"
              ? "Sarah Chen requested changes: clarify that prequalification does not guarantee final approval."
              : approved
                ? "Sarah Chen approved version 1 for the recorded scope."
                : "Campaign submitted for review · version 1",
        },
      ],
      versions: [],
      policyVersion: i === 6 ? 1 : 2,
      evidence: [],
      approvals: [],
      contributors: [String(r[4])],
      destination:
        r[2] === "Affiliate" ? "https://example.com/clearpath-offer" : "",
      destinationCopy:
        r[2] === "Affiliate"
          ? "Illustrative partner landing page. Eligibility and APR vary. See full product terms before applying."
          : "",
      escalated:
        i === 4
          ? "Partner is requesting a guaranteed-approval headline. Lead guidance needed."
          : "",
      submittedAt: approved
        ? new Date(Date.parse(at) - 86400000).toISOString()
        : at,
    };
    if (approved)
      c.history.push({
        at: c.submittedAt,
        text: `${c.owner} submitted version 1 for review.`,
      });
    if (approved || i === 3)
      c.evidence = [
        {
          id: "sample-terms",
          title: "Illustrative approved product terms",
          reference: "https://example.com/clearpath-terms",
          excerpt:
            "Fictional terms evidence for the demo. Eligibility depends on underwriting; APR and fees vary. Product availability is limited to approved markets. This example is not a real lending offer.",
          validThrough: dayOffset(i === 7 ? -1 : 60),
          version: 1,
          addedBy: "Sarah Chen",
          addedAt: at,
        },
      ];
    c.roundStartedAt = c.submittedAt;
    c.decisions = approved ? [{kind: "approve", at, startedAt: c.submittedAt, version: 1}] : c.status === "Changes requested" ? [{kind: "request", at: new Date(Date.parse(at) + 3600000).toISOString(), startedAt: c.submittedAt, version: 1}] : [];
    if (approved) c.checks = reviewChecks(c);
    if (approved)
      c.approvals = [
        snapshot(
          c,
          "Sarah Chen",
          "Sample decision: terms, scope, and disclosures verified.",
          at,
        ),
      ];
    return c;
  });
}
export function seedWorkspace(): Workspace {
  return {
    schema: 2,
    members: structuredClone(defaultMembers),
    revision: 0,
    campaigns: seed(),
    policies: products.flatMap((product) => [
      {
        product,
        version: 1,
        summary: "Initial illustrative review policy.",
        at: new Date(Date.now() - 60 * 86400000).toISOString(),
        by: "Sarah Chen",
      },
      {
        product,
        version: 2,
        summary:
          "Require current evidence and version-specific destination review. Re-review prior approvals before launch.",
        at: new Date(Date.now() - 14 * 86400000).toISOString(),
        by: "Sarah Chen",
      },
    ]),
  };
}
/** Preserve old browser records; legacy approvals intentionally need fresh evidence and a recorded decision. */
export function migrateLegacy(records: unknown): Workspace {
  requireThat(Array.isArray(records), "Legacy workspace is not a list.");
  const w = seedWorkspace();
  w.campaigns = (records as Campaign[]).map((c) => {
    requireThat(
      c &&
        typeof c.id === "string" &&
        typeof c.copy === "string" &&
        typeof c.title === "string" &&
        typeof c.product === "string" &&
        typeof c.owner === "string" &&
        Array.isArray(c.history) &&
        Array.isArray(c.versions) &&
        Array.isArray(c.findings) &&
        Array.isArray(c.checks),
      "Legacy records could not be migrated.",
    );
    return {
      ...c,
      policyVersion: 1,
      evidence: [],
      approvals: [],
      contributors: [c.owner],
      destination: "",
      destinationCopy: "",
      escalated: "",
      submittedAt: c.history.at(-1)?.at || new Date().toISOString(),
    };
  });
  return w;
}
export function validateWorkspace(value: unknown): asserts value is Workspace {
  const w = value as Workspace;
  requireThat(
    w &&
      w.schema === 2 &&
      Number.isSafeInteger(w.revision) &&
      w.revision >= 0 &&
      Array.isArray(w.policies) &&
      w.policies.length > 0 &&
      Array.isArray(w.campaigns),
    "Workspace format is invalid.",
  );
  if (w.members !== undefined)
    requireThat(
      Array.isArray(w.members) &&
        w.members.length > 0 &&
        w.members.every(
          (m) =>
            typeof m.name === "string" &&
            m.name.length >= 2 &&
            memberRoles.includes(m.role),
        ) &&
        new Set(w.members.map((m) => normalize(m.name))).size ===
          w.members.length,
      "Invalid workspace team.",
    );
  const ids = new Set<string>();
  for (const c of w.campaigns) {
    requireThat(
      c && /^CP-\d+$/.test(c.id) && !ids.has(c.id),
      "Duplicate or invalid campaign ID.",
    );
    ids.add(c.id);
    requireThat(c.jurisdictions === undefined || (typeof c.jurisdictions === "string" && jurisdictionCodes(c.jurisdictions).every(x => x in jurisdictionOptions)), "Invalid jurisdiction data.");
    for (const key of ["variantCopy", "justification", "roundStartedAt"] as const) requireThat(c[key] === undefined || typeof c[key] === "string", `Invalid ${key}.`);
    if (c.decisions !== undefined) requireThat(Array.isArray(c.decisions) && c.decisions.every(d => ["approve", "request", "reject"].includes(d.kind) && Number.isFinite(Date.parse(d.at)) && Number.isFinite(Date.parse(d.startedAt)) && Date.parse(d.at) >= Date.parse(d.startedAt) && Number.isInteger(d.version)), "Invalid decision metrics.");
    if (c.deltaBase) requireThat(typeof c.deltaBase.copy === "string" && Array.isArray(c.deltaBase.checks) && Array.isArray(c.deltaBase.evidence), "Invalid delta baseline.");
    if (c.rush) requireThat(["Pending", "Approved", "Denied"].includes(c.rush.status) && typeof c.rush.reason === "string" && typeof c.rush.requestedBy === "string" && Number.isInteger(c.rush.version), "Invalid rush record.");

    for (const key of [
      "title",
      "copy",
      "scope",
      "product",
      "channel",
      "partner",
      "owner",
      "reviewer",
      "due",
      "destination",
      "destinationCopy",
      "escalated",
      "submittedAt",
    ] as const)
      requireThat(typeof c[key] === "string", `Invalid campaign ${key}.`);
    requireThat(
      [
        "In review",
        "Changes requested",
        "Approved",
        "Revoked",
        "Withdrawn",
        "Rejected",
      ].includes(c.status) &&
        Number.isInteger(c.version) &&
        c.version > 0 &&
        Number.isInteger(c.policyVersion),
      "Invalid campaign state.",
    );
    requireThat(
      Array.isArray(c.history) &&
        c.history.every(
          (h) => typeof h.at === "string" && typeof h.text === "string",
        ) &&
        Array.isArray(c.findings) &&
        c.findings.every(
          (f) =>
            typeof f.id === "string" &&
            typeof f.note === "string" &&
            typeof f.title === "string" &&
            typeof f.detail === "string" &&
            typeof f.resolved === "boolean",
        ) &&
        Array.isArray(c.checks) &&
        c.checks.every((x) => typeof x === "string") &&
        Array.isArray(c.evidence) &&
        c.evidence.every(
          (e) =>
            typeof e.id === "string" &&
            typeof e.title === "string" &&
            typeof e.reference === "string" &&
            typeof e.excerpt === "string" &&
            validDay(e.validThrough) &&
            Number.isInteger(e.version),
        ) &&
        Array.isArray(c.approvals) &&
        c.approvals.every(
          (a) =>
            typeof a.copy === "string" &&
            typeof a.at === "string" &&
            typeof a.by === "string" &&
            Array.isArray(a.evidence) &&
            Array.isArray(a.findings),
        ) &&
        Array.isArray(c.contributors) &&
        c.contributors.every((x) => typeof x === "string") &&
        Array.isArray(c.versions) &&
        c.versions.every(
          (v) => Number.isInteger(v.version) && typeof v.copy === "string",
        ),
      "Invalid campaign record.",
    );
  }
  requireThat(
    w.policies.every(
      (p) =>
        products.includes(p.product as (typeof products)[number]) &&
        Number.isInteger(p.version) &&
        p.version > 0 &&
        typeof p.summary === "string" &&
        typeof p.at === "string" &&
        typeof p.by === "string",
    ),
    "Invalid policy record.",
  );
}

/** Literal pre-checks are intake gates, never automatic compliance decisions. */
export const hardFinding = (f: Finding) => ["guarantee", "no-credit"].includes(f.id.split(":").at(-1)!);
export function campaignScan(c: { copy: string; variantCopy?: string; destinationCopy: string; product: string; channel: string }): Finding[] {
  return [
    ...scan(c.copy, c.product, c.channel).map(f => ({ ...f, id: `A:${f.id}`, title: `Creative A · ${f.title}` })),
    ...(c.variantCopy ? scan(c.variantCopy, c.product, c.channel).map(f => ({ ...f, id: `B:${f.id}`, title: `Creative B · ${f.title}` })) : []),
    ...scan(c.destinationCopy, c.product).map(f => ({ ...f, id: `page:${f.id}`, title: `Destination · ${f.title}` })),
  ];
}
function validateIntakeChecks(c: { copy: string; variantCopy?: string; destinationCopy: string; product: string; channel: string; justification?: string }) {
  requireThat(!c.variantCopy || (c.variantCopy.trim().length >= 20 && c.variantCopy.length <= 5000 && normalize(c.variantCopy) !== normalize(c.copy)), "Variant B must be distinct and contain 20–5,000 characters.");
  if (campaignScan(c).some(hardFinding)) reason(c.justification || "");
}
export function reviewerLoad(w: Workspace, name: string) {
  return w.campaigns.filter(c => c.reviewer === name && ["In review", "Changes requested", "Revoked"].includes(c.status)).length;
}
export function suggestedReviewer(w: Workspace, author: string) {
  return membersOf(w).filter(m => m.name !== author && isReviewer(m.name, w)).sort((a, b) => reviewerLoad(w, a.name) - reviewerLoad(w, b.name) || a.name.localeCompare(b.name))[0]?.name;
}
/** Preserve every non-whitespace character: numbers, punctuation and wording cannot qualify. */
export function deltaEligible(c: Campaign, policy: number, today = localDay()) {
  const b = c.deltaBase;
  if (!b || c.status !== "In review" || c.escalated || b.by !== c.reviewer || b.version + 1 !== c.version || b.policyVersion !== policy || c.policyVersion !== policy || b.expires <= today || c.findings.length) return false;
  const stable = ["title", "product", "channel", "partner", "scope", "jurisdictions", "destination", "destinationCopy"] as const;
  return stable.every(k => b[k] === c[k]) &&
    c.copy.replace(/\s+/g, " ").trim() === b.copy.replace(/\s+/g, " ").trim() &&
    (c.variantCopy || "") === (b.variantCopy || "") &&
    b.evidence.length > 0 && b.evidence.every(e => e.validThrough >= today) &&
    reviewChecks(c).every(x => b.checks.includes(x));
}
function recordDecision(c: Campaign, kind: "approve" | "request" | "reject", at: string) {
  if (!c.decisions) return; // Do not invent missing historical rounds for legacy records.
  c.decisions.push({ kind, at, startedAt: c.roundStartedAt || c.submittedAt, version: c.version });
}
export function elapsedHours(start: string, now = Date.now()) {
  const hours = (now - Date.parse(start)) / 3600000;
  return Number.isFinite(hours) ? Math.max(0, hours) : 0;
}
export function throughputMetrics(w: Workspace, now = Date.now()) {
  const measured = w.campaigns.filter(c => c.decisions?.length);
  const times = measured.map(c => elapsedHours(c.submittedAt, Date.parse(c.decisions![0].at))).sort((a,b) => a-b);
  const median = (v: number[]) => v.length ? (v[Math.floor((v.length - 1)/2)] + v[Math.floor(v.length/2)]) / 2 : null;
  const rounds = measured.flatMap(c => c.decisions!);
  const ages = w.campaigns.filter(c => c.status === "In review").map(c => elapsedHours(c.roundStartedAt || c.submittedAt, now)).sort((a,b) => a-b);
  return {
    sample: measured.length,
    firstPass: measured.length ? measured.filter(c => c.decisions![0].kind === "approve" && c.decisions![0].version === 1).length / measured.length * 100 : null,
    rounds: measured.length ? rounds.length / measured.length : null,
    firstDecision: median(times),
    roundHours: rounds.length ? rounds.reduce((n,d) => n + elapsedHours(d.startedAt, Date.parse(d.at)), 0) / rounds.length : null,
    queueAge: median(ages),
    decisions: rounds.length,
  };
}
/** Compact contiguous diff. Unchanged prefix/suffix remain available for context. */
export function textDiff(before: string, after: string) {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = 0;
  while (end < before.length-start && end < after.length-start && before[before.length-1-end] === after[after.length-1-end]) end++;
  return { prefix: before.slice(0,start), removed: before.slice(start, before.length-end), added: after.slice(start,after.length-end), suffix: end ? before.slice(-end) : "" };
}

/** A pair shares one terminal decision; moving rejected copy between A/B is not a new proposal. */
function rejectRepeatedProposal(w: Workspace, proposal: Pick<Campaign, "copy" | "variantCopy" | "product" | "channel" | "partner" | "jurisdictions" | "scope">) {
  const creatives = (c: Pick<Campaign, "copy" | "variantCopy">) => [c.copy, c.variantCopy].filter((text): text is string => !!text?.trim()).map(normalize);
  const incoming = creatives(proposal);
  requireThat(!w.campaigns.some(c => c.status === "Rejected" &&
    c.product === proposal.product && c.channel === proposal.channel &&
    normalize(c.partner) === normalize(proposal.partner) && c.jurisdictions === proposal.jurisdictions &&
    normalize(c.scope) === normalize(proposal.scope) && creatives(c).some(copy => incoming.includes(copy))),
    "This exact offer and distribution scope were rejected. Submit a materially different proposal; renaming it or moving it between variants does not reopen the decision.");
}
