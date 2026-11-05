import { describe, it, expect } from "vitest";
import {
  applyAction,
  approvalError,
  checks,
  currentPolicy,
  dayOffset,
  launchBlockers,
  localDay,
  migrateLegacy,
  normalize,
  safeUrl,
  scan,
  seedWorkspace,
  validateWorkspace,
  validDay,
  type Action,
  type Intake,
  type Workspace,
} from "./domain";
const get = (w: Workspace, id = "CP-1045") =>
  w.campaigns.find((c) => c.id === id)!;
const note = "Verified exact terms, eligibility, and scope.";
const prepared = () => {
  const w = seedWorkspace();
  get(w).checks = [...checks];
  get(w).expires = dayOffset(20);
  return w;
};
const act = (w: Workspace, a: Action, p = "Sarah Chen") => applyAction(w, a, p);
const brief: () => Intake = () => ({
  title: "A new qualified offer",
  copy: "Explore product options subject to credit approval. Full APR and fees apply.",
  scope: "California · eligible adults 18+",
  partner: "In-house",
  product: "Personal loans",
  channel: "Email",
  due: dayOffset(3),
  destination: "",
  destinationCopy: "",
});
describe("approval and evidence boundaries", () => {
  it("blocks unresolved findings, incomplete checks, and missing evidence", () => {
    const w = seedWorkspace();
    const c = get(w, "CP-1048");
    expect(approvalError(c, "Sarah Chen")).toContain("findings");
    c.findings.forEach((f) => {
      f.resolved = true;
      f.note = note;
    });
    expect(approvalError(c, "Sarah Chen")).toContain("checks");
    c.checks = [...checks];
    expect(approvalError(c, "Sarah Chen")).toContain("evidence");
  });
  it("requires an independent assigned compliance reviewer", () => {
    const c = get(prepared());
    expect(approvalError(c, "Alex Morgan")).toContain("compliance");
    expect(approvalError(c, "Jamie Lee")).toContain("assigned");
    c.contributors.push("Sarah Chen");
    expect(approvalError(c, "Sarah Chen")).toContain("contributors");
  });
  it("rejects original submitter even if contributor list is incomplete", () => {
    const c = get(prepared());
    c.owner = "Sarah Chen";
    expect(approvalError(c, "Sarah Chen")).toContain("Authors");
  });
  it.each(["", "2026-02-30", "not-a-date", localDay(), dayOffset(-1)])(
    "rejects invalid/nonfuture approval date %s",
    (expires) => {
      const c = get(prepared());
      c.expires = expires;
      expect(approvalError(c, "Sarah Chen")).toContain("expiration");
    },
  );
  it("does not let an approval outlive evidence", () => {
    const c = get(prepared());
    c.expires = dayOffset(61);
    expect(approvalError(c, "Sarah Chen")).toContain("outlive");
  });
  it("rejects expired or wrong-version evidence", () => {
    const c = get(prepared());
    c.evidence[0].validThrough = dayOffset(-1);
    expect(approvalError(c, "Sarah Chen")).toContain("Replace");
    c.evidence[0].validThrough = dayOffset(60);
    c.evidence[0].version = 0;
    expect(approvalError(c, "Sarah Chen")).toContain("Replace");
  });
  it("requires meaningful decision rationale", () => {
    const w = prepared();
    expect(() =>
      act(w, {
        type: "approve",
        id: "CP-1045",
        expires: dayOffset(10),
        note: "ok",
      }),
    ).toThrow("rationale");
  });
  it("takes a detached decision snapshot and rejects duplicate approval", () => {
    const w = prepared();
    const next = act(w, {
      type: "approve",
      id: "CP-1045",
      expires: dayOffset(10),
      note,
    });
    const c = get(next);
    expect(c.status).toBe("Approved");
    expect(launchBlockers(c, 2)).toEqual([]);
    c.evidence[0].excerpt = "Changed";
    expect(c.approvals[0].evidence[0].excerpt).not.toBe("Changed");
    expect(launchBlockers(c, 2)).toContain("No matching decision snapshot");
    expect(() =>
      act(next, { type: "approve", id: c.id, expires: dayOffset(10), note }),
    ).toThrow("active");
    expect(get(w).status).toBe("In review");
  });
  it("requires destination and capture for affiliate review", () => {
    const c = get(prepared());
    c.channel = "Affiliate";
    c.destination = "javascript:alert(1)";
    expect(approvalError(c, "Sarah Chen")).toContain("Affiliate");
  });
  it("does not change historical snapshots when evidence is removed in re-review", () => {
    let w = act(prepared(), {
      type: "approve",
      id: "CP-1045",
      expires: dayOffset(10),
      note,
    });
    const old = structuredClone(get(w).approvals[0]);
    w = act(w, { type: "reopen", id: "CP-1045", reason: note });
    w = act(w, {
      type: "removeEvidence",
      id: "CP-1045",
      evidenceId: "sample-terms",
    });
    expect(get(w).approvals[0]).toEqual(old);
    expect(get(w).evidence).toEqual([]);
  });
});
describe("policy, expiration, and distribution", () => {
  it("seeds launch-ready, expired, escalated, and stale-policy examples", () => {
    const w = seedWorkspace();
    expect(launchBlockers(get(w, "CP-1043"), 2)).toEqual([]);
    expect(launchBlockers(get(w, "CP-1041"), 2).join()).toContain("expired");
    expect(launchBlockers(get(w, "CP-1042"), 2).join()).toContain(
      "Policy changed",
    );
    expect(get(w, "CP-1044").escalated).toBeTruthy();
  });
  it("allows approval through its expiration day but not the next day", () => {
    const c = get(seedWorkspace(), "CP-1043");
    expect(launchBlockers(c, 2, c.expires!)).toEqual([]);
    expect(launchBlockers(c, 2, dayOffset(31)).join()).toContain("expired");
  });
  it("publishing policy holds approvals without mutating decisions", () => {
    const w = seedWorkspace();
    const before = structuredClone(get(w, "CP-1043").approvals);
    const n = act(w, {
      type: "policy",
      product: "Mortgage",
      summary: "Verify the updated eligibility and destination disclosures.",
    });
    expect(currentPolicy(n, "Mortgage")).toBe(3);
    expect(get(n, "CP-1043").approvals).toEqual(before);
    expect(launchBlockers(get(n, "CP-1043"), 3).join()).toContain(
      "Policy changed",
    );
  });
  it("restricts policy publishing and revocation to lead", () => {
    expect(() =>
      act(
        seedWorkspace(),
        { type: "policy", product: "Mortgage", summary: note },
        "Jamie Lee",
      ),
    ).toThrow("lead");
    expect(() =>
      act(
        seedWorkspace(),
        { type: "revoke", id: "CP-1043", reason: note },
        "Jamie Lee",
      ),
    ).toThrow("lead");
  });
  it("revocation immediately stops launch but preserves snapshot", () => {
    const w = act(seedWorkspace(), {
      type: "revoke",
      id: "CP-1043",
      reason: "Product terms changed. Stop distribution pending verification.",
    });
    const c = get(w, "CP-1043");
    expect(c.status).toBe("Revoked");
    expect(c.approvals).toHaveLength(1);
    expect(launchBlockers(c, 2)[0]).toContain("revoked");
  });
  it("acknowledging policy resets previous signoffs", () => {
    const w = prepared();
    get(w).policyVersion = 1;
    const n = act(w, { type: "ackPolicy", id: "CP-1045" });
    expect(get(n).checks).toEqual([]);
    expect(get(n).policyVersion).toBe(2);
  });
  it("escalation blocks approval until lead clears it with rationale", () => {
    let w = act(prepared(), {
      type: "escalate",
      id: "CP-1045",
      reason: "Offer eligibility needs compliance lead guidance.",
    });
    expect(approvalError(get(w), "Sarah Chen")).toContain("escalation");
    expect(() =>
      act(
        w,
        { type: "clearEscalation", id: "CP-1045", reason: note },
        "Jamie Lee",
      ),
    ).toThrow("lead");
    w = act(w, { type: "clearEscalation", id: "CP-1045", reason: note });
    expect(approvalError(get(w), "Sarah Chen")).toBeNull();
  });
});
describe("revisions, roles, and intake", () => {
  it("requires the campaign owner to revise; same copy/scope is rejected", () => {
    const w = seedWorkspace(),
      c = get(w, "CP-1046");
    const a: Action = {
      type: "revise",
      id: c.id,
      copy: c.copy,
      scope: c.scope,
      destination: c.destination,
      destinationCopy: c.destinationCopy,
    };
    expect(() => act(w, a)).toThrow("owner");
    expect(() => act(w, a, c.owner)).toThrow("Change");
  });
  it("scope-only changes create a version and invalidate evidence and checks", () => {
    const w = seedWorkspace(),
      c = get(w, "CP-1046");
    c.checks = [...checks];
    c.evidence = structuredClone(get(w).evidence);
    const n = act(
      w,
      {
        type: "revise",
        id: c.id,
        copy: c.copy,
        scope: "California only · adults 18+",
        destination: "",
        destinationCopy: "",
      },
      c.owner,
    );
    const result = get(n, c.id);
    expect(result.version).toBe(2);
    expect(result.versions[0].scope).toBe(c.scope);
    expect(result.evidence).toEqual([]);
    expect(result.checks).toEqual([]);
    expect(result.status).toBe("In review");
  });
  it("handoff excludes authors and resets reviewer attestations", () => {
    const w = prepared();
    const n = act(w, {
      type: "assign",
      id: "CP-1045",
      reviewer: "Jamie Lee",
      reason: "Sarah is out; Jamie owns the launch review.",
    });
    expect(get(n).checks).toEqual([]);
    expect(get(n).reviewer).toBe("Jamie Lee");
    expect(() =>
      act(w, {
        type: "assign",
        id: "CP-1045",
        reviewer: "Taylor Reed",
        reason: note,
      }),
    ).toThrow("independent");
  });
  it("manual findings require rationale before resolution", () => {
    let w = act(prepared(), {
      type: "finding",
      id: "CP-1045",
      title: "Disclosure placement",
      detail: "Move key qualifications next to the primary claim.",
    });
    const c = get(w),
      id = c.findings[0].id;
    expect(() =>
      act(w, {
        type: "resolve",
        id: c.id,
        findingId: id,
        note: "ok",
        resolved: true,
      }),
    ).toThrow("rationale");
    w = act(w, {
      type: "resolve",
      id: c.id,
      findingId: id,
      note,
      resolved: true,
    });
    expect(get(w).findings[0].resolved).toBe(true);
  });
  it("withdrawal is role restricted and preserves campaign history", () => {
    expect(() =>
      act(
        seedWorkspace(),
        { type: "withdraw", id: "CP-1045", reason: note },
        "Alex Morgan",
      ),
    ).toThrow("owner");
    const w = act(
      seedWorkspace(),
      {
        type: "withdraw",
        id: "CP-1045",
        reason: "Campaign launch cancelled by the marketing team.",
      },
      "Taylor Reed",
    );
    expect(get(w).status).toBe("Withdrawn");
    expect(get(w).history.length).toBeGreaterThan(1);
  });
  it("rejects duplicate normalized title and duplicate creative in same scope", () => {
    const w = act(
      seedWorkspace(),
      { type: "submit", data: brief() },
      "Alex Morgan",
    );
    expect(() =>
      act(
        w,
        {
          type: "submit",
          data: { ...brief(), title: "  A NEW   qualified offer  " },
        },
        "Alex Morgan",
      ),
    ).toThrow("exists");
    expect(() =>
      act(
        w,
        { type: "submit", data: { ...brief(), title: "Different title" } },
        "Alex Morgan",
      ),
    ).toThrow("exists");
  });
  it("allows same creative in a distinct distribution scope but requires new approval", () => {
    const w = act(
      seedWorkspace(),
      { type: "submit", data: brief() },
      "Alex Morgan",
    );
    const n = act(
      w,
      {
        type: "submit",
        data: {
          ...brief(),
          title: "Distinct social campaign",
          channel: "Paid social",
        },
      },
      "Alex Morgan",
    );
    expect(n.campaigns[0].approvals).toEqual([]);
  });
  it("requires affiliate partner, secure destination, and substantive capture", () => {
    expect(() =>
      act(seedWorkspace(), {
        type: "submit",
        data: { ...brief(), channel: "Affiliate" },
      }),
    ).toThrow("Affiliate");
  });
  it("does not accept malformed due dates or impossible dates", () => {
    expect(() =>
      act(seedWorkspace(), {
        type: "submit",
        data: { ...brief(), due: "2026-02-30" },
      }),
    ).toThrow("date");
    expect(validDay("2026-02-30")).toBe(false);
  });
});
describe("pre-check precision and safe records", () => {
  it("does not mistake cash-back rewards for borrowing rates or negative guarantees", () => {
    expect(scan("Earn 2% cash back on eligible purchases.")).toEqual([]);
    expect(scan("Prequalification does not guarantee financing.")).toEqual([]);
    expect(scan("Rate of 6%")).toHaveLength(1);
  });
  it("flags guarantee, urgency, and credit claims independently", () =>
    expect(
      scan("Guaranteed approval. Today only. No impact to credit."),
    ).toHaveLength(3));
  it("normalizes Unicode and whitespace for duplicate detection", () =>
    expect(normalize(" Ａ  NEW offer ")).toBe("a new offer"));
  it.each([
    "javascript:alert(1)",
    "http://example.com",
    "https://user:secret@example.com",
    "https://localhost/path",
  ])("rejects unsafe reference %s", (url) => expect(safeUrl(url)).toBe(false));
  it("accepts normal HTTPS references", () =>
    expect(safeUrl("https://example.com/terms")).toBe(true));
  it("validates seeded and updated workspace and rejects malformed records", () => {
    expect(() => validateWorkspace(seedWorkspace())).not.toThrow();
    const w = seedWorkspace();
    (get(w) as unknown as { evidence: unknown }).evidence = null;
    expect(() => validateWorkspace(w)).toThrow("record");
  });
  it("preserves legacy records and deliberately withholds launch clearance", () => {
    const c = get(seedWorkspace(), "CP-1043");
    const migrated = migrateLegacy([c]);
    expect(migrated.campaigns[0].copy).toBe(c.copy);
    expect(migrated.campaigns[0].approvals).toEqual([]);
    expect(launchBlockers(migrated.campaigns[0], 2).length).toBeGreaterThan(0);
  });
});
