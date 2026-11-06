import { Precheck } from "./Precheck";
import { Jurisdictions } from "./Jurisdictions";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import {
  channels,
  suggestedReviewer,
  reviewerLoad,
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
  const [product, setProduct] = useState<string>(products[0]);
  const [variantCopy, setVariantCopy] = useState("");
  const [destinationCopy, setDestinationCopy] = useState("");
  const [justification, setJustification] = useState("");
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
          d.jurisdictions = new FormData(e.currentTarget).getAll("state").join(",");
          delete (d as unknown as Record<string, string>).state;
          setBusy(true);
          if (await run({ type: "submit", data: d })) onClose();
          setBusy(false);
        }}
      >
        <label>
          Suggested reviewer · least open commitments
          <select name="reviewer" required defaultValue={suggestedReviewer(workspace, person)}>
            {membersOf(workspace)
              .filter((m) => m.name !== person && isReviewer(m.name, workspace))
              .map((m) => (
                <option key={m.name} value={m.name}>{m.name} · {reviewerLoad(workspace, m.name)} open commitments</option>
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
            <select name="product" value={product} onChange={e => setProduct(e.target.value)}>
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
        <Jurisdictions />
        <p className="small muted">Requested due dates do not grant queue priority. Rush requests require independent lead approval.</p>
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
        <label>Creative B (optional A/B variant)
          <textarea name="variantCopy" value={variantCopy} onChange={e => setVariantCopy(e.target.value)} minLength={20} maxLength={5000} rows={3} placeholder="One alternate creative, sharing the same product, destination, audience and terms." />
          <small>Both creatives receive one decision. Any unresolved issue blocks the pair.</small>
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
            value={destinationCopy}
            onChange={e => setDestinationCopy(e.target.value)}
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
        <Precheck {...{copy, variantCopy, destinationCopy, product, channel, justification}} onJustification={setJustification} />
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
