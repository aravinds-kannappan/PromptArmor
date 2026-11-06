import { campaignScan, hardFinding } from "../domain";
export function Precheck({ copy, variantCopy = "", destinationCopy, product, channel, justification, onJustification }: { copy: string; variantCopy?: string; destinationCopy: string; product: string; channel: string; justification: string; onJustification: (value: string) => void }) {
  const findings = campaignScan({ copy, variantCopy, destinationCopy, product, channel });
  const blocked = findings.some(hardFinding);
  if (!copy && !variantCopy && !destinationCopy) return null;
  return <section className="precheck" aria-label="Live intake checks" aria-live="polite">
    <h3>Catch issues before review</h3>
    <p className="small muted">Checks update as you type. No flags is not a compliance clearance. Both variants and the captured destination are checked separately.</p>
    {findings.length ? findings.map(f => <div className="precheck-item" key={f.id}><b>{hardFinding(f) ? "Fix or justify" : "Advisory"} · {f.title}</b><p>{f.detail}</p></div>) : <p>No automated flags. An independent reviewer still verifies the offer.</p>}
    {blocked && <label>Why should the reviewer consider these claims?
      <textarea name="justification" required minLength={10} maxLength={2000} value={justification} onChange={e => onJustification(e.target.value)} placeholder="Address each flagged claim and cite its supporting terms, or edit the copy above." />
      <small>Justification permits submission, not approval. Findings stay open for the reviewer.</small>
    </label>}
  </section>;
}
