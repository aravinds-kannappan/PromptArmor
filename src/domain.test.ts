import { describe, it, expect } from 'vitest';
import { seed, scan, approvalError, checks } from './domain';
describe('decision safeguards',()=>{
 it('requires resolved findings and completed checks',()=>{const c=seed()[0];expect(approvalError(c,'Sarah Chen')).toContain('findings');c.findings.forEach(f=>f.resolved=true);expect(approvalError(c,'Sarah Chen')).toContain('checks');c.checks=[...checks];expect(approvalError(c,'Sarah Chen')).toContain('expiration');c.expires='2099-01-01';expect(approvalError(c,'Sarah Chen')).toBeNull()});
 it('prevents self approval, unassigned decisions and repeat decisions',()=>{const c=seed()[0];expect(approvalError(c,c.owner)).toContain('own');expect(approvalError(c,'Other')).toContain('Assign');c.status='Approved';expect(approvalError(c,'Sarah Chen')).toContain('active')});
 it('flags risky wording but does not treat all numbers as rates',()=>{expect(scan('Guaranteed approval with no impact to credit')).toHaveLength(2);expect(scan('Rate of 6%')).toHaveLength(1);expect(scan('Loan up to $2000. APR varies.')).toHaveLength(0)});
});
