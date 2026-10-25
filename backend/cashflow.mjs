function cents(x){if(!Number.isSafeInteger(x)||x<0||x>10000000000)throw Error('Invalid integer-cent amount');return x;}
export function datedCashflow(input){
  cents(input.cash_cents);if(!Array.isArray(input.events)||input.events.length>100)throw Error('Invalid event list');let balance=input.cash_cents;
  const events=input.events.map(e=>{cents(e.amount_cents);if(!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||isNaN(Date.parse(e.date))||new Date(e.date).toISOString().slice(0,10)!==e.date||!['income','expense'].includes(e.type))throw Error('Invalid event');return {date:e.date,label:String(e.label).slice(0,80),delta:e.type==='income'?e.amount_cents:-e.amount_cents};}).sort((a,b)=>a.date.localeCompare(b.date)||a.delta-b.delta);
  const timeline=events.map(e=>({...e,balance_cents:balance+=e.delta}));return {starting_cash_cents:input.cash_cents,lowest_cash_cents:Math.min(input.cash_cents,...timeline.map(e=>e.balance_cents)),ending_cash_cents:balance,timeline,assumptions:['Only supplied events are included.','Same-day expenses are counted before income.','No later paychecks, interest or fees are inferred.']};
}
