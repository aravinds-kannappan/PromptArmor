import { describe, expect, it } from "vitest";
import { applyAction, approvalError, currentPolicy, dayOffset, hasApprovedRush, jurisdictionError, launchBlockers, localDay, queueRank, reviewChecks, scan, seedWorkspace, validateWorkspace, type Campaign, type Intake } from "./domain";
const why = "Launch commitment reviewed against current queue capacity.";
const id = "CP-1045";
const campaign = (w: ReturnType<typeof seedWorkspace>) => w.campaigns.find(c => c.id === id)!;
const brief: Intake = { title: "State-aware new offer", copy: "Explore your options. Eligibility and full terms apply.", product: "Personal loans", channel: "Email", partner: "Growth team", scope: "Eligible adults", due: dayOffset(3), destination: "", destinationCopy: "", jurisdictions: "CA,NY" };
describe("product and jurisdiction safeguards", () => {
  it("requires the union of selected states and the selected product checks", () => {
    const w = applyAction(seedWorkspace(), { type: "submit", data: brief }, "Alex Morgan");
    const c = w.campaigns[0];
    expect(reviewChecks(c).some(x => x.startsWith("CA fixture"))).toBe(true);
    expect(reviewChecks(c).some(x => x.startsWith("NY fixture"))).toBe(true);
    expect(reviewChecks(c).some(x => x.startsWith("Loan APR"))).toBe(true);
    expect(reviewChecks({ ...c, product: "Credit cards" }).some(x => x.startsWith("Card purchase"))).toBe(true);
  });
  it("blocks unsupported and legacy unspecified markets without deleting records", () => {
    const w = seedWorkspace(); const c = campaign(w);
    c.jurisdictions = "CA,OTHER";
    expect(approvalError(c, "Sarah Chen")).toContain("Unsupported");
    c.jurisdictions = undefined;
    validateWorkspace(w);
    expect(jurisdictionError(c)).toContain("Select distribution states");
    const approved = w.campaigns.find(c => c.status === "Approved")!;
    approved.jurisdictions = undefined;
    expect(launchBlockers(approved, currentPolicy(w, approved.product)).join()).toContain("Select distribution states");
  });
  it("rejects empty or invented jurisdiction codes at intake", () => {
    for (const jurisdictions of ["", "ZZ"]) expect(() => applyAction(seedWorkspace(), { type: "submit", data: { ...brief, jurisdictions } }, "Alex Morgan")).toThrow(/state/i);
  });
  it("a state-only revision increments the version and clears evidence, checks, and rush", () => {
    let w = seedWorkspace(); let c = campaign(w);
    w = applyAction(w, { type: "request", id, reason: why }, "Sarah Chen"); c = campaign(w);
    w = applyAction(w, { type: "revise", id, copy: c.copy, scope: c.scope, destination: c.destination, destinationCopy: c.destinationCopy, jurisdictions: "NY,CA,NY" }, c.owner);
    c = campaign(w);
    expect(c.version).toBe(2); expect(c.jurisdictions).toBe("CA,NY");
    expect(c.evidence).toEqual([]); expect(c.checks).toEqual([]); expect(c.rush).toBeUndefined();
    expect(c.versions[0].review?.jurisdictions).toBe("CA");
  });
  it("rejects unsafe destination URLs even outside affiliate campaigns", () => {
    expect(() => applyAction(seedWorkspace(), { type: "submit", data: { ...brief, destination: "http://example.com" } }, "Alex Morgan")).toThrow(/HTTPS/);
  });
  it("adds product-specific advisory findings without treating rewards as loan APR", () => {
    expect(scan("Get an introductory 0% APR offer", "Credit cards").some(f => f.id === "promotion")).toBe(true);
    expect(scan("Get prequalified for your next home", "Mortgage").some(f => f.id === "mortgage")).toBe(true);
    expect(scan("Earn 2% cash back", "Credit cards")).toEqual([]);
  });
});
describe("rush fairness", () => {
  it("requested deadlines and self-escalation cannot improve queue rank", () => {
    const w = seedWorkspace(); const c = campaign(w);
    expect(queueRank({ ...c, due: dayOffset(-5), escalated: why }, 2, localDay())).toBe(queueRank(c, 2, localDay()));
    const n = applyAction(w, { type: "rush", id, reason: why }, c.owner);
    expect(hasApprovedRush(campaign(n))).toBe(false);
    expect(queueRank(campaign(n), 2, localDay())).toBe(queueRank(c, 2, localDay()));
  });
  it("requires an independent lead and prevents repeat requests and duplicate decisions", () => {
    let w = seedWorkspace(); const owner = campaign(w).owner;
    w = applyAction(w, { type: "rush", id, reason: why }, owner);
    expect(() => applyAction(w, { type: "approveRush", id, reason: why }, owner)).toThrow(/independent/);
    expect(() => applyAction(w, { type: "approveRush", id, reason: why }, "Jamie Lee")).toThrow(/lead/);
    expect(() => applyAction(w, { type: "rush", id, reason: why }, owner)).toThrow(/already/);
    w = applyAction(w, { type: "approveRush", id, reason: why }, "Sarah Chen");
    expect(hasApprovedRush(campaign(w))).toBe(true);
    expect(approvalError(campaign(w), "Sarah Chen")).toContain("checks");
    expect(() => applyAction(w, { type: "denyRush", id, reason: why }, "Sarah Chen")).toThrow(/pending/);
  });
  it("denied requests cannot be resubmitted for the same version", () => {
    let w = seedWorkspace(); const owner = campaign(w).owner;
    w = applyAction(w, { type: "rush", id, reason: why }, owner);
    w = applyAction(w, { type: "denyRush", id, reason: why }, "Sarah Chen");
    expect(hasApprovedRush(campaign(w))).toBe(false);
    expect(() => applyAction(w, { type: "rush", id, reason: why }, owner)).toThrow();
  });
  it("compliance holds stay ahead of an approved rush", () => {
    const c = campaign(seedWorkspace());
    const rushed = { ...c, rush: { status: "Approved", requestedBy: c.owner, reason: why, version: c.version } } as Campaign;
    expect(queueRank({ ...c, status: "Revoked" }, 2, localDay())).toBeLessThan(queueRank(rushed, 2, localDay()));
    expect(hasApprovedRush({ ...rushed, version: 2 })).toBe(false);
  });
});
describe("rejection is distinct from revisions and withdrawal", () => {
  it("retains the exact rejected decision and prohibits reopening, approval, or withdrawal", () => {
    let w = seedWorkspace(); const c = campaign(w);
    expect(() => applyAction(w, { type: "reject", id, reason: why }, c.owner)).toThrow(/independent/);
    expect(() => applyAction(w, { type: "reject", id, reason: "no" }, "Sarah Chen")).toThrow(/rationale/);
    w = applyAction(w, { type: "reject", id, reason: why }, "Sarah Chen");
    expect(campaign(w).status).toBe("Rejected");
    expect(campaign(w).rejection?.copy).toBe(c.copy);
    expect(campaign(w).rejection?.note).toBe(why);
    validateWorkspace(w);
    for (const type of ["reopen", "withdraw", "request"] as const) expect(() => applyAction(w, { type, id, reason: why }, "Sarah Chen")).toThrow();
    expect(() => applyAction(w, { type: "approve", id, expires: dayOffset(5), note: why }, "Sarah Chen")).toThrow(/active/);
  });
  it("request changes leaves a revision path open and revokes rush priority", () => {
    let w = seedWorkspace();
    w = applyAction(w, { type: "rush", id, reason: why }, campaign(w).owner);
    w = applyAction(w, { type: "approveRush", id, reason: why }, "Sarah Chen");
    w = applyAction(w, { type: "request", id, reason: why }, "Sarah Chen");
    expect(campaign(w).status).toBe("Changes requested"); expect(campaign(w).rejection).toBeUndefined(); expect(hasApprovedRush(campaign(w))).toBe(false);
  });
});
describe("follow-up bypass prevention", () => {
  it("cannot rename an identical rejected offer to bypass its terminal decision", () => {
    let w = applyAction(seedWorkspace(), { type: "submit", data: brief }, "Alex Morgan");
    const newId = w.campaigns[0].id;
    w = applyAction(w, { type: "reject", id: newId, reason: why }, "Sarah Chen");
    expect(() => applyAction(w, { type: "submit", data: { ...brief, title: "A renamed identical offer" } }, "Alex Morgan")).toThrow(/were rejected/);
    const changed = applyAction(w, { type: "submit", data: { ...brief, copy: brief.copy + " New qualified offer terms." } }, "Alex Morgan");
    expect(changed.campaigns[0].status).toBe("In review");
  });
  it("a lead who authored the campaign cannot approve its rush", () => {
    let w = applyAction(seedWorkspace(), { type: "submit", data: { ...brief, reviewer: "Jamie Lee" } }, "Sarah Chen");
    const newId = w.campaigns[0].id;
    w = applyAction(w, { type: "rush", id: newId, reason: why }, "Sarah Chen");
    expect(() => applyAction(w, { type: "approveRush", id: newId, reason: why }, "Sarah Chen")).toThrow(/independent/);
  });
});
