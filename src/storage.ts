import {
  applyAction,
  migrateLegacy,
  seedWorkspace,
  validateWorkspace,
  type Action,
  type Workspace,
} from "./domain";
export const STORAGE_KEY = "clearpath-review-v2";
const LEGACY_KEY = "clearpath-review-v1";
export type LoadResult = {
  workspace: Workspace;
  warning: string;
  blocked: boolean;
};
export function loadWorkspace(
  storage: Pick<Storage, "getItem"> = localStorage,
): LoadResult {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      validateWorkspace(parsed);
      return { workspace: parsed, warning: "", blocked: false };
    }
    const legacy = storage.getItem(LEGACY_KEY);
    if (legacy) {
      const workspace = migrateLegacy(JSON.parse(legacy));
      validateWorkspace(workspace);
      return {
        workspace,
        warning:
          "Existing campaigns preserved. Legacy approvals need fresh evidence and a decision snapshot before launch.",
        blocked: false,
      };
    }
    return { workspace: seedWorkspace(), warning: "", blocked: false };
  } catch {
    return {
      workspace: seedWorkspace(),
      warning:
        "Stored data is unavailable or damaged. Your original records have not been overwritten. Export recovery data or explicitly reset to continue.",
      blocked: true,
    };
  }
}
/** Called under a Web Lock. Compare the whole persisted revision before writing any command. */
export function commitAction(
  expected: number,
  action: Action,
  actor: string,
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
): Workspace {
  const current = loadWorkspace(storage);
  if (current.blocked) throw new Error(current.warning);
  if (current.workspace.revision !== expected)
    throw new Error(
      "Another tab changed the workspace. Refresh the workspace, review the latest state, then retry. Your typed draft is still here.",
    );
  const next = applyAction(current.workspace, action, actor);
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
export async function withWorkspaceLock<T>(
  run: () => T | Promise<T>,
): Promise<T> {
  if (!navigator.locks)
    throw new Error(
      "This browser cannot safely coordinate writes across tabs. Use a current browser with Web Locks support. You can still browse and export.",
    );
  return navigator.locks.request("clearpath-workspace-write", run);
}
