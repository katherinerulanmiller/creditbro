import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {demoData as d} from '../public/dashboard/demo-data.mjs';
const sum=rows=>rows.reduce((n,x)=>n+x.amount_cents,0);
assert.equal(sum(d.spending.categories),d.spending.spending_cents);
assert.equal(sum(d.spending.weekly_categories),sum(d.spending.daily_spending));
assert.equal(d.spending.budget_cents-d.spending.spending_cents,d.spending.budget_remaining_cents);
for(const r of d.reports){assert.equal(sum(r.categories),r.total_cents);assert.ok(r.fictional);await access('public'+r.image_url)}
const client=await readFile('public/dashboard/app.js','utf8');
assert.doesNotMatch(client,/fetch\s*\(|\/api\/|BlueBubbles|ANTHROPIC_API_KEY|contactTag|localhost|127\.0\.0\.1/);
const adapter=await readFile('public/dashboard/dashboard-api.mjs','utf8');
assert.doesNotMatch(adapter,/fetch\s*\(|\/api\//);
assert.ok(d.credit.fictional&&d.spending.fictional);assert.equal(d.credit.identity_verified,false);
assert.ok(d.projects.every(p=>p.plan.external_actions_executed===false));
assert.equal(d.spending.safe_to_spend_cents,null);
console.log('Dashboard checks passed: reconciled reports/budget, fictional evidence, static-only data, and no private API or texting access.');
