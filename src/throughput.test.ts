import { describe, it, expect } from "vitest";
import { applyAction, dayOffset, deltaEligible, hardFinding, launchBlockers, localDay, scan, seedWorkspace, suggestedReviewer, textDiff, throughputMetrics, validateWorkspace, type Campaign, type Intake } from "./domain";
const note = "Verified the exact change against approved product terms.";
const brief: Intake = { title: "New measured campaign", copy: "Explore a personal loan. APR and eligibility vary. Unsubscribe in the footer.", product: "Personal loans", channel: "Email", partner: "In-house", scope: "Eligible adults in California", jurisdictions: "CA", due: dayOffset(3), destination: "", destinationCopy: "" };
const submit = (data = brief) => applyAction(seedWorkspace(), {type: "submit", data}, "Alex Morgan");
function revised(change: Partial<Campaign> = {}) {
  const w = seedWorkspace();
  const c = w.campaigns.find(c => c.status === "Approved" && c.product === "Mortgage")!;
  const next = applyAction(w, {type: "revise", id: c.id, copy: c.copy.replace(". ", ".\n\n"), scope: c.scope, destination: c.destination, destinationCopy: c.destinationCopy, ...change}, c.owner);
  return {w: next, c: next.campaigns.find(x => x.id === c.id)!};
}
describe("shift-left intake and variants", () => {
  it.each(["Guaranteed approval.", "No credit check."])("blocks %s without meaningful justification", claim => {
    expect(() => submit({...brief, copy: brief.copy + claim})).toThrow(/rationale/);
    const w = submit({...brief, copy: brief.copy + claim, justification: note});
    expect(w.campaigns[0].findings.some(f => hardFinding(f) && !f.resolved)).toBe(true);
    expect(w.campaigns[0].justification).toBe(note);
  });
  it("checks destination claims and every variant separately", () => {
    expect(() => submit({...brief, destinationCopy: "Guaranteed approval for this loan."})).toThrow(/rationale/);
    expect(() => submit({...brief, variantCopy: "No credit check. Explore personal loans."})).toThrow(/rationale/);
    const c = submit({...brief, variantCopy: "Try a loan with a rate of 9%. Unsubscribe."}).campaigns[0];
    expect(c.findings.some(f => f.id === "B:rate")).toBe(true);
    expect(c.variantCopy).toContain("9%");
  });
  it("keeps ambiguous checks advisory and recognizes email opt-out", () => {
    const c = submit({...brief, copy: "Explore a loan with a rate of 9%."}).campaigns[0];
    expect(c.findings.map(f => f.id)).toEqual(expect.arrayContaining(["A:rate", "A:opt-out"]));
    expect(scan(brief.copy, "Personal loans", "Email")).toEqual([]);
    expect(scan("You're approved for a mortgage", "Mortgage").some(f => f.id === "mortgage-approved")).toBe(true);
  });
  it("does not let destination APR text hide a rate issue in the creative", () => {
    const c = submit({...brief, copy: "Explore loans at an interest rate of 9%. Unsubscribe.", destinationCopy: "See APR and full loan terms on this page."}).campaigns[0];
    expect(c.findings.some(f => f.id === "A:rate")).toBe(true);
  });
  it("rejects duplicate and undersized variants", () => {
    for (const variantCopy of [brief.copy, "short"]) expect(() => submit({...brief, variantCopy})).toThrow(/Variant B/);
  });
  it("does not accept new hard claims on a requested revision without justification", () => {
    let w = submit(); const c = w.campaigns[0];
    w = applyAction(w, {type: "request", id: c.id, reason: note}, c.reviewer);
    expect(() => applyAction(w, {type: "revise", id: c.id, copy: brief.copy + " Guaranteed approval.", scope: c.scope, destination: "", destinationCopy: ""}, c.owner)).toThrow(/rationale/);
  });
});
describe("safe delta review", () => {
  it("approves an eligible layout delta with exact new snapshot and original expiration", () => {
    const {w,c} = revised();
    expect(deltaEligible(c, 2)).toBe(true);
    expect(c.evidence).toEqual([]);
    expect(launchBlockers(c, 2).length).toBeGreaterThan(0);
    const approved = applyAction(w, {type: "approveDelta", id: c.id, expires: c.deltaBase!.expires, note}, c.reviewer).campaigns.find(x => x.id === c.id)!;
    expect(approved.approvals).toHaveLength(2);
    expect(approved.approvals.at(-1)?.copy).toBe(c.copy);
    expect(approved.evidence[0].version).toBe(2);
    expect(launchBlockers(approved, 2)).toEqual([]);
  });
  it.each([{copy: "A different mortgage offer. Subject to underwriting."}, {scope: "Different audience"}, {jurisdictions: "NY"}, {destination: "https://example.com/new"}, {variantCopy: "Another mortgage creative for review."}])("routes material changes through full review: %j", change => {
    const {c} = revised(change); expect(deltaEligible(c, 2)).toBe(false);
  });
  it("blocks expiry extensions, authors, stale policy, expired evidence and reassignment", () => {
    const {w,c} = revised(); const a = {type: "approveDelta" as const, id: c.id, expires: c.deltaBase!.expires, note};
    expect(() => applyAction(w,a,c.owner)).toThrow(/independent/);
    expect(() => applyAction(w,{...a, expires: dayOffset(40)},c.reviewer)).toThrow(/extend/);
    expect(deltaEligible(c, 3)).toBe(false);
    c.deltaBase!.evidence[0].validThrough = dayOffset(-1);
    expect(deltaEligible(c,2)).toBe(false);
    const fresh = revised();
    const handoff = applyAction(fresh.w,{type:"assign",id:fresh.c.id,reviewer:"Jamie Lee",reason:note},fresh.c.reviewer);
    expect(deltaEligible(handoff.campaigns.find(x => x.id === fresh.c.id)!,2)).toBe(false);
  });
  it("invalidates fast lane when a reviewer adds a finding", () => {
    const {w,c} = revised();
    const n = applyAction(w,{type:"finding",id:c.id,title:"Layout issue",detail:note,quote:"Prequalification"},c.reviewer);
    const current = n.campaigns.find(x => x.id === c.id)!;
    expect(current.findings.at(-1)?.quote).toBe("Prequalification");
    expect(deltaEligible(current,2)).toBe(false);
    expect(() => applyAction(w,{type:"finding",id:c.id,title:"Invalid anchor",detail:note,quote:"absent text"},c.reviewer)).toThrow(/Quoted text/);
  });
  it("retains both variants in decision snapshots and detects later changes", () => {
    const {w,c} = revised({variantCopy:"A different mortgage creative with full terms."});
    c.findings = []; c.checks = c.deltaBase!.checks; c.evidence = c.deltaBase!.evidence.map(e => ({...e,version:c.version}));
    const n = applyAction(w,{type:"approve",id:c.id,expires:dayOffset(5),note},c.reviewer);
    const approved = n.campaigns.find(x => x.id === c.id)!;
    expect(approved.approvals.at(-1)?.variantCopy).toBe(c.variantCopy);
    approved.variantCopy += " Changed";
    expect(launchBlockers(approved,2)).toContain("No matching decision snapshot");
  });
});
describe("assignment, diff and measurements", () => {
  it("suggests the least loaded independent reviewer and respects explicit choices", () => {
    const w = seedWorkspace(); expect(suggestedReviewer(w,"Alex Morgan")).toBe("Jamie Lee");
    expect(submit().campaigns[0].reviewer).toBe("Jamie Lee");
    expect(submit({...brief,reviewer:"Sarah Chen"}).campaigns[0].reviewer).toBe("Sarah Chen");
    expect(suggestedReviewer(w,"Jamie Lee")).toBe("Sarah Chen");
  });
  it("computes first decision, failed first passes and rounds including request changes", () => {
    const start = "2026-11-05T00:00:00Z";
    let w = seedWorkspace(); w.campaigns = [];
    w = applyAction(w,{type:"submit",data:brief},"Alex Morgan",localDay(),start);
    const c = w.campaigns[0];
    w = applyAction(w,{type:"request",id:c.id,reason:note},c.reviewer,localDay(),"2026-11-05T02:00:00Z");
    w = applyAction(w,{type:"revise",id:c.id,copy:brief.copy+" Read terms.",scope:c.scope,destination:"",destinationCopy:""},c.owner,localDay(),"2026-11-05T04:00:00Z");
    expect(throughputMetrics(w,Date.parse("2026-11-05T07:00:00Z")).queueAge).toBe(3);
    w = applyAction(w,{type:"reject",id:c.id,reason:note},c.reviewer,localDay(),"2026-11-05T08:00:00Z");
    expect(throughputMetrics(w)).toMatchObject({sample:1,firstPass:0,rounds:2,firstDecision:2,roundHours:3,queueAge:null,decisions:2});
    validateWorkspace(w);
  });
  it("uses null for empty cohorts and excludes legacy records with no complete tracking", () => {
    const w = seedWorkspace(); w.campaigns.forEach(c => delete c.decisions);
    expect(throughputMetrics(w)).toMatchObject({sample:0,firstPass:null,rounds:null,firstDecision:null});
    validateWorkspace(w);
    (w.campaigns[0] as Campaign).decisions = [{kind:"approve",at:"invalid",startedAt:"invalid",version:1}];
    expect(() => validateWorkspace(w)).toThrow(/metrics/);
  });
  it("renders insertions, deletions, identical and empty text without losing content", () => {
    for (const [a,b] of [["APR 9%","APR 10%"],["same","same"],["","new"],["old",""]]) {
      const d = textDiff(a,b); expect(d.prefix+d.removed+d.suffix).toBe(a); expect(d.prefix+d.added+d.suffix).toBe(b);
    }
  });
});
