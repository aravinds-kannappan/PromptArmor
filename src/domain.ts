export type Status = 'In review' | 'Changes requested' | 'Approved';
export type Finding = { id: string; title: string; detail: string; resolved: boolean; note: string };
export type Campaign = { id: string; title: string; product: string; channel: string; partner: string; owner: string; reviewer: string; due: string; status: Status; version: number; copy: string; findings: Finding[]; checks: string[]; history: { at: string; text: string }[]; versions: { version: number; copy: string }[]; scope: string; expires?: string };
export const checks = ['Offer terms and disclosures verified', 'Claims substantiated against product terms', 'Audience, channel, and partner scope verified'];
export function scan(copy: string): Finding[] {
 const rules = [ [/guaranteed|everyone is approved|100% approval/i, 'Unqualified approval claim', 'Remove guarantees or provide substantiated, appropriately qualified language.'], [/\d+(\.\d+)?%/.test(copy) && !/APR/i.test(copy) ? /./s : /(?!) /, 'Rate without APR context', 'Verify rate presentation and applicable APR disclosures against approved product terms.'], [/no impact|won.t affect/i, 'Credit inquiry claim', 'Verify the soft-pull stage and explain when a hard inquiry may occur.'] ] as const;
 return rules.filter(([re])=>re.test(copy)).map(([,title,detail],i)=>({id:`finding-${i}`,title,detail,resolved:false,note:''}));
}
export function approvalError(c: Campaign, reviewer: string, today = new Date().toISOString().slice(0,10)): string | null {
 if(c.status !== 'In review') return 'Only an active review can be approved.';
 if(c.owner === reviewer) return 'Submitters cannot approve their own campaigns.';
 if(c.reviewer !== reviewer) return 'Assign this review to yourself before deciding.';
 if(c.findings.some(f=>!f.resolved)) return 'Resolve all open findings before approval.';
 if(checks.some(x=>!c.checks.includes(x))) return 'Complete all required review checks.';
 if(!c.expires || c.expires <= today) return 'Set an approval expiration date in the future.';
 return null;
}
const day = (offset:number) => {const d=new Date(); d.setDate(d.getDate()+offset); return d.toISOString().slice(0,10)};
export function seed(): Campaign[] {
 const rows = [
 ['A fresh start, with a little breathing room','Personal loans','Affiliate','NerdWallet','Alex Morgan',-1,'In review','Get a personal loan from $2,000 to $35,000. Guaranteed approval. Check your rate with no impact to your credit score.'],
 ['Make room for what’s next','Credit cards','Paid social','In-house','Jamie Lee',0,'In review','A card that fits your everyday. Earn 2% cash back on eligible purchases. See application for APR, fees, exclusions, and full rewards terms.'],
 ['Your home journey starts here','Mortgage','Email','In-house','Alex Morgan',1,'Changes requested','Explore your homebuying budget. Prequalification is an estimate, not a commitment to lend. Subject to verification and credit approval.'],
 ['One payment. A clearer path.','Personal loans','Paid search','In-house','Taylor Reed',2,'In review','Explore a fixed-rate personal loan. Rates and eligibility vary. View full APR and fee disclosures before applying.'],
 ['Everyday spending, rewarded','Credit cards','Affiliate','Bankrate','Jamie Lee',3,'In review','Get rewarded on eligible purchases. Guaranteed approval for everyone. Terms and exclusions apply.'],
 ['A more confident first step','Mortgage','Website','In-house','Taylor Reed',4,'Approved','Estimate your homebuying budget. Prequalification does not guarantee financing. Final approval is subject to underwriting.'],
 ['A plan for your next chapter','Personal loans','Email','In-house','Alex Morgan',5,'Approved','Explore personal loan options with fixed monthly payments. Eligibility, APR, and fees vary. See full terms.']
 ];
 return rows.map((r,i)=>({id:`CP-${1048-i}`,title:String(r[0]),product:String(r[1]),channel:String(r[2]),partner:String(r[3]),owner:String(r[4]),reviewer:'Sarah Chen',due:day(Number(r[5])),status:r[6] as Status,version:1,copy:String(r[7]),findings:scan(String(r[7])),checks:r[6]==='Approved'?[...checks]:[],scope:'United States · Adults 18+ · Approved product availability only',expires:r[6]==='Approved'?day(30):'',history:[{at:new Date().toISOString(),text:r[6]==='Approved'?'Sarah Chen approved version 1 for the recorded scope.':'Campaign submitted for review · version 1'}],versions:[]}));
}
