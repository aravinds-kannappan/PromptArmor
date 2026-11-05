import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { launchBlockers, type Campaign } from "../domain";
export const FeedbackContext = createContext<{
  error: string;
  stale: boolean;
  refresh: () => void;
}>({ error: "", stale: false, refresh: () => {} });
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const feedback = useContext(FeedbackContext);
  const [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false);
  const close = () => {
    if (dirty) setDiscard(true);
    else onClose();
  };
  useEffect(() => {
    if (!dirty) return;
    const prevent = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClickCapture={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button")?.textContent === "Cancel" && dirty) {
          e.preventDefault();
          e.stopPropagation();
          setDiscard(true);
        }
      }}
      onInputCapture={() => setDirty(true)}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      {feedback.error && (
        <div className="inline-error" role="alert">
          {feedback.error}
        </div>
      )}
      {feedback.stale && (
        <div className="inline-error">
          A newer workspace revision is available.{" "}
          <button
            type="button"
            className="text-button"
            onClick={feedback.refresh}
          >
            Refresh workspace and keep this draft
          </button>
        </div>
      )}
      {discard && (
        <div className="inline-error">
          Discard unsaved form changes?
          <div className="modal-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setDiscard(false)}
            >
              Keep editing
            </button>
            <button type="button" className="danger-button" onClick={onClose}>
              Discard draft
            </button>
          </div>
        </div>
      )}
      {children}
    </dialog>
  );
}
export function Badge({
  c,
  policy,
  today,
}: {
  c: Campaign;
  policy: number;
  today: string;
}) {
  const blockers = launchBlockers(c, policy, today);
  const label =
    c.status === "Approved"
      ? blockers.length
        ? c.expires && c.expires < today
          ? "Expired"
          : c.policyVersion !== policy
            ? "Policy changed"
            : "Re-review needed"
        : "Launch ready"
      : c.status;
  return (
    <span
      className={
        "pill " +
        (label === "Launch ready"
          ? "green"
          : label === "In review"
            ? "blue"
            : "orange")
      }
    >
      <span />
      {label}
    </span>
  );
}
export function download(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const displayDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? new Date(`${s}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not set";
