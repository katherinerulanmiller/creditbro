// Ported from the teammate's planning.py. Integer cents; unknown stays unknown.
function amount(value){if(value===undefined||value===null)return null;if(!Number.isSafeInteger(value)||value<0||value>10000000000)throw Error('Use a finite nonnegative integer-cent amount');return value;}
export function moveInFacts(input){
 const keys=['monthly_rent_cents','deposit_cents','moving_cost_cents','available_savings_cents'];
 const values=Object.fromEntries(keys.map(k=>[k,amount(input[k])]));
 const missing=keys.filter(k=>values[k]===null);
 const upfront=keys.slice(0,3).every(k=>values[k]!==null)?keys.slice(0,3).reduce((n,k)=>n+values[k],0):null;
 const gap=upfront!==null&&values.available_savings_cents!==null?Math.max(0,upfront-values.available_savings_cents):null;
 return {estimated_upfront_cents:upfront,savings_gap_cents:gap,missing,assumptions:['One month of stated rent plus stated deposit and moving cost.','Excludes utilities, fees, other living costs and income before moving.','Available savings must be explicitly stated as available after essentials; total savings is not substituted.','No money is deducted from savings by this calculation.'],payment_enabled:false};
}
export const moveInTool={name:'movein_costs',description:'Estimate first-month rent plus deposit plus moving cost, and any gap against explicitly available savings AFTER essentials. Missing fields stay unknown. Never substitute total savings or interpret a recommendation as spending.',input_schema:{type:'object',properties:Object.fromEntries(['monthly_rent_cents','deposit_cents','moving_cost_cents','available_savings_cents'].map(k=>[k,{type:['integer','null'],minimum:0}])),additionalProperties:false}};
