import {RUNTIME_ROOT,SETTINGS_DIR} from './runtime-config.mjs';
// Explicit live evals use synthetic data and call Claude only. No BlueBubbles calls.
import {readFileSync,existsSync,writeFileSync} from 'node:fs';import {makeState} from './core.mjs';import {claudeReply} from './bridge.mjs';import {coachAction} from './host-actions.mjs';import {applyOnboardingUpdates} from './onboarding.mjs';
if(!process.argv.includes('--live')){console.log('Use --live to run five fictional Claude checks. No phone messages are sent.');process.exit(0);}
const config={};const path=[RUNTIME_ROOT+'/Anthropic-Setup.txt'].find(existsSync);
if(!path){console.log('Private Claude configuration unavailable.');process.exit(1);}
for(const line of readFileSync(path,'utf8').split(/\r?\n/)){const i=line.indexOf('=');if(i>0)config[line.slice(0,i).trim()]=line.slice(i+1).trim().replace(/^['"]|['"]$/g,'');}
const tests=[
 {name:'beginner-no-intake',text:'I’m a freshman and I honestly don’t know what credit is.',check:(t,s,c)=>!t.includes('?')&&/borrow/i.test(t)},
 {name:'carrying-interest-myth',text:'My roommate says leaving $20 unpaid helps my score. Is that true?',check:t=>/no|not|don.t need/i.test(t)&&!/guarantee/i.test(t)},
 {name:'manual-spending-total',text:'Say I spent $48 on food, $15 on transit, and $22 on other stuff this week.',check:(t,s,c)=>c.includes('spending_summary')&&/85/.test(t)},
 {name:'authorized-credit-correction',text:'Yes. The balance is still $465.',before:[{role:'user',sourceMessageId:'correction',text:'You keep saying my limit is $1,500. It’s $1,000.'},{role:'assistant',text:'I’ll use $1,000 in this conversation. Do you want me to replace the saved limit too?'}],check:(t,s,c)=>s.creditProfile?.fields?.credit_limit_cents?.value_cents===100000&&c.includes('credit_utilization')&&/46.5/.test(t)},
 {name:'weekly-manual-checkin-proposal',text:'Weekly. Sundays at 5 p.m. Pacific, starting November 1, 2026. Ask me for the week’s totals.',before:[{role:'user',sourceMessageId:'pref',text:'I want help staying on top of spending, but not daily texts.'},{role:'assistant',text:'Would you like a weekly check-in asking for the totals you share?'}],check:(t,s,c)=>s.schedule?.pending?.kind==='weekly_checkin'&&s.schedule.jobs.length===0&&!/\b(?:scheduled|set it up|it.s set)\b/i.test(t)}
];
const previousFile=new URL('./examples/live-eval-results.json',import.meta.url);const previous=existsSync(previousFile)?JSON.parse(readFileSync(previousFile)).checks:[];const selected=process.argv.includes('--failed-only')?tests.filter(t=>!previous.find(r=>r.name===t.name)?.passed):tests;const results=[];
for(const item of selected){const s=makeState('fictional-eval');s.mode='active';const source={id:'current-'+item.name,text:item.text};s.history=[...(item.before||[]),{role:'user',text:source.text,sourceMessageId:source.id}];const calls=[],toolFailures=[];try{
 const text=await claudeReply(config,s.history,fetch,s,input=>{calls.push('update_onboarding');return applyOnboardingUpdates(s,input,source)},(input,name)=>{calls.push(name);try{return coachAction(s,name,input,source,s.history)}catch(error){toolFailures.push({name,reason:error.message,input});throw error}},(name)=>calls.push(name));
 results.push({name:item.name,passed:!!item.check(text,s,calls),calls,toolFailures,response:text});
 }catch(e){results.push({name:item.name,passed:false,calls,toolFailures,error:/^(Calculator turn limit|Reply too long|Incomplete Claude response|Claude HTTP \d+)$/.test(e.message)?e.message:'Model/tool evaluation did not finish; private details omitted.'});}
 console.log(JSON.stringify({scenario:item.name,passed:results.at(-1).passed}));
}
const report={synthetic_only:true,phone_messages_sent:0,checks:tests.map(t=>results.find(r=>r.name===t.name)||previous.find(r=>r.name===t.name))};writeFileSync(new URL('./examples/live-eval-results.json',import.meta.url),JSON.stringify(report,null,2));if(results.some(r=>!r.passed))process.exitCode=1;
