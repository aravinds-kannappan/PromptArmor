import { jurisdictionCodes, jurisdictionOptions } from "../domain";
export function Jurisdictions({ value = "" }: { value?: string }) {
  return <fieldset className="jurisdiction-fields">
    <legend>Distribution states</legend>
    <p>Choose every state where this campaign will run. These are fictional policy fixtures, not legal guidance. Other or nationwide distribution requires a supported policy before approval.</p>
    {Object.entries(jurisdictionOptions).map(([code, name]) => <label key={code}>
      <input type="checkbox" name="state" value={code} defaultChecked={jurisdictionCodes(value).includes(code)} />{name}
    </label>)}
  </fieldset>;
}
