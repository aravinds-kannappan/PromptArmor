import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import {
  channels,
  products,
  type Intake,
  type Action,
  type Workspace,
  membersOf,
  isReviewer,
} from "../domain";
import { importCopy } from "../import-copy";
import { Dialog } from "./shared";
export function Submission({
  today,
  onClose,
  run,
  workspace,
  person,
}: {
  workspace: Workspace;
  person: string;
  today: string;
  onClose: () => void;
  run: (a: Action) => Promise<boolean>;
}) {
  const [channel, setChannel] = useState("Affiliate"),
    [busy, setBusy] = useState(false);
  const [copy, setCopy] = useState(""),
    [importError, setImportError] = useState(""),
    [pendingCopy, setPendingCopy] = useState("");
  return (
    <Dialog title="Start with a clear brief." onClose={onClose}>
      <p className="muted">
        Capture the exact creative and distribution scope. Evidence can be added
        during review.
      </p>
      <div className="import-copy">
        <label>
          Import your campaign copy (.txt / .md)
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setImportError("");
              try {
                const text = await importCopy(file);
                if (copy.trim()) setPendingCopy(text);
                else setCopy(text);
              } catch (err) {
                setImportError(
                  err instanceof Error
                    ? err.message
                    : "File could not be imported.",
                );
              }
            }}
          />
        </label>
        <small>
          Read locally, never uploaded. Plain text only, up to 5,000 characters.
        </small>
        {importError && (
          <p role="alert" className="inline-error">
            {importError}
          </p>
        )}
        {pendingCopy && (
          <div className="inline-error">
            Replace your existing copy with this file?
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setPendingCopy("")}
              >
                Keep existing copy
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setCopy(pendingCopy);
                  setPendingCopy("");
                }}
              >
                Replace copy
              </button>
            </div>
          </div>
        )}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const d = Object.fromEntries(new FormData(e.currentTarget)) as Intake;
          setBusy(true);
          if (await run({ type: "submit", data: d })) onClose();
          setBusy(false);
        }}
      >
        <label>
          Assigned reviewer
          <select name="reviewer" required>
            {membersOf(workspace)
              .filter((m) => m.name !== person && isReviewer(m.name, workspace))
              .map((m) => (
                <option key={m.name}>{m.name}</option>
              ))}
          </select>
        </label>
        <label>
          Campaign name
          <input
            name="title"
            required
            minLength={3}
            maxLength={100}
            placeholder="e.g. A fresh start for the new year"
          />
        </label>
        <div className="form-grid">
          <label>
            Product
            <select name="product">
              {products.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Channel
            <select
              name="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {channels.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Partner / team
            <input
              name="partner"
              required
              minLength={2}
              maxLength={80}
              placeholder={
                channel === "Affiliate" ? "Named affiliate partner" : "In-house"
              }
            />
          </label>
          <label>
            Review due date
            <input type="date" name="due" min={today} required />
          </label>
        </div>
        <label>
          Audience and geographic scope
          <input
            name="scope"
            required
            minLength={5}
            maxLength={300}
            placeholder="e.g. California · Adults 18+ · Eligible borrowers"
          />
        </label>
        <label>
          Exact campaign copy
          <textarea
            name="copy"
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            required
            minLength={20}
            maxLength={5000}
            rows={5}
            placeholder="Include offer, claims, qualifications, and disclosures."
          />
        </label>
        <label>
          Destination URL {channel !== "Affiliate" && "(optional)"}
          <input
            name="destination"
            type="url"
            required={channel === "Affiliate"}
            placeholder="https://example.com/offer"
          />
        </label>
        <label>
          Captured landing-page copy {channel !== "Affiliate" && "(optional)"}
          <textarea
            name="destinationCopy"
            required={channel === "Affiliate"}
            minLength={channel === "Affiliate" ? 20 : undefined}
            maxLength={5000}
            rows={3}
            placeholder="Paste the exact offer and disclosures on the destination page."
          />
        </label>
        <div className="form-note">
          <ShieldCheck size={18} />
          Affiliate creative and destination are reviewed together. No website
          is fetched automatically.
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Submitting…" : "Submit for review"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}
