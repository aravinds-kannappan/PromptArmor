import { describe, it, expect } from "vitest";
import { commitAction, loadWorkspace, STORAGE_KEY } from "./storage";
import { seedWorkspace } from "./domain";
function store(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
}
describe("browser persistence and stale-write protection", () => {
  it("does not overwrite damaged data with a seeded workspace", () => {
    const storage = store({ [STORAGE_KEY]: "{broken" });
    const loaded = loadWorkspace(storage);
    expect(loaded.blocked).toBe(true);
    expect(() =>
      commitAction(
        0,
        {
          type: "check",
          id: "CP-1045",
          check: "Offer terms and disclosures verified",
          checked: true,
        },
        "Sarah Chen",
        storage,
      ),
    ).toThrow("damaged");
    expect(storage.getItem(STORAGE_KEY)).toBe("{broken");
  });
  it("rejects a stale tab instead of losing another reviewer’s update", () => {
    const storage = store({ [STORAGE_KEY]: JSON.stringify(seedWorkspace()) });
    const a = {
      type: "check" as const,
      id: "CP-1045",
      check: "Offer terms and disclosures verified",
      checked: true,
    };
    const next = commitAction(0, a, "Sarah Chen", storage);
    expect(next.revision).toBe(1);
    expect(() =>
      commitAction(0, { ...a, checked: false }, "Sarah Chen", storage),
    ).toThrow("Another tab");
    expect(
      loadWorkspace(storage).workspace.campaigns.find(
        (c) => c.id === "CP-1045",
      )!.checks,
    ).toContain(a.check);
  });
  it("reports quota failures without advancing persisted state", () => {
    const initial = JSON.stringify(seedWorkspace());
    const storage = {
      getItem: () => initial,
      setItem: () => {
        throw new Error("Quota exceeded");
      },
    };
    expect(() =>
      commitAction(
        0,
        {
          type: "check",
          id: "CP-1045",
          check: "Offer terms and disclosures verified",
          checked: true,
        },
        "Sarah Chen",
        storage,
      ),
    ).toThrow("Quota");
    expect(JSON.parse(storage.getItem()).revision).toBe(0);
  });
  it("does not write when a workflow transition fails", () => {
    const storage = store({ [STORAGE_KEY]: JSON.stringify(seedWorkspace()) });
    expect(() =>
      commitAction(
        0,
        {
          type: "revoke",
          id: "CP-1045",
          reason: "No approval exists to revoke.",
        },
        "Sarah Chen",
        storage,
      ),
    ).toThrow("approved");
    expect(loadWorkspace(storage).workspace.revision).toBe(0);
  });
  it("migrates legacy records without changing the legacy storage key", () => {
    const old = JSON.stringify(seedWorkspace().campaigns);
    const storage = store({ "clearpath-review-v1": old });
    expect(loadWorkspace(storage).warning).toContain("preserved");
    commitAction(
      0,
      {
        type: "check",
        id: "CP-1045",
        check: "Offer terms and disclosures verified",
        checked: true,
      },
      "Sarah Chen",
      storage,
    );
    expect(storage.getItem("clearpath-review-v1")).toBe(old);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});
