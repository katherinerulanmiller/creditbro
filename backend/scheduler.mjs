import {localParts,nextWeek,nextMonth} from './schedule-time.mjs';
export {nextMonth} from './schedule-time.mjs';
import {bankVault} from './bank.mjs';
import {nessieReport,nessieMoneySummary} from './nessie.mjs';
import {sourceEvidence} from './evidence.mjs';
import {reportOutbox} from './report-image.mjs';
import {randomUUID} from 'node:crypto';
export function initSchedule(s){s.schedule??={jobs:[],pending:null};return s.schedule;}
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
export function weeklyDemo(now=Date.now()){
 const end=new Date(now).toISOString().slice(0,10),start=new Date(now-7*86400000).toISOString().slice(0,10);
 // Fictional posted purchases; no transfers, income or card payments counted as spending.
 const transactions=[{category:'Groceries',cents:6850},{category:'Eating out',cents:4200},{category:'Transport',cents:1800},{category:'Subscriptions',cents:1299}];
 const total=transactions.reduce((n,t)=>n+t.cents,0);
 return {source:'synthetic_demo',period_start_inclusive:start,period_end_exclusive:end,transactions,total_cents:total,text:`Demo weekly spending · ${start} to ${end} (end date excluded). Fictional data, not your accounts.\n\n${money(total)} in sample spending: ${transactions.map(t=>`${t.category.toLowerCase()} ${money(t.cents)}`).join(', ')}.\n\nOne useful next step: review your card's statement balance and due date. This sample does not show a real bill or payment status.`};
}
export function proposeSchedule(s,input,source,now=Date.now(),readBank=()=>bankVault().read()){
 if(s.mode!=='active'||!sourceEvidence(source?.text,input.evidence_quote)||!input.evidence_quote?.trim())throw Error('Explicit source required');
 const a=initSchedule(s);if(a.jobs.filter(j=>j.status==='scheduled').length>=20)throw Error('Reminder limit');
 if(!['reminder','weekly_demo','weekly_checkin','monthly_checkin','monthly_bank_report'].includes(input.kind))throw Error('Invalid kind');
 const at=Date.parse(input.at);if(!/Z$|[+-]\d\d:\d\d$/.test(input.at)||!Number.isFinite(at)||at<=now||at>now+366*86400000)throw Error('Use a future absolute ISO time within a year');
 new Intl.DateTimeFormat('en-US',{timeZone:input.timezone}).format(at);
 if(typeof input.text!=='string'||!input.text.trim()||input.text.length>200)throw Error('Invalid text');
 if(input.kind==='weekly_demo'&&!/demo|sample|synthetic/i.test(source.text))throw Error('Demo report must be explicitly requested');
 if(['monthly_checkin','monthly_bank_report'].includes(input.kind)&&!/month/i.test(source.text))throw Error('Explicit monthly request required');
 if(input.kind==='weekly_checkin'&&!/week|sunday|monday|tuesday|wednesday|thursday|friday|saturday/i.test(source.text))throw Error('Explicit weekly request required');
 if(input.kind==='monthly_bank_report'){const b=readBank();if(b?.owner!==s.contactTag||b?.status!=='connected'||b?.provider!=='nessie'||(!b?.aiSharing||b.sharingVersion!==2))throw Error('Enable Nessie summary sharing in the dashboard first');if(!/(?:graph|report|breakdown|visual)/i.test(source.text))throw Error('Explicit monthly graph request required');}
 const j={id:randomUUID(),kind:input.kind,at,timezone:input.timezone,text:input.text.trim(),status:'pending',sourceMessageId:source.id,createdAt:now,...(['monthly_checkin','monthly_bank_report'].includes(input.kind)?{dayOfMonth:Number(localParts(at,input.timezone).day)}:{})};
 a.pending=j;
 return {saved:false,awaiting_confirmation:true,proposal:j,instruction:'Tell the student the exact local date, time and timezone, purpose, and that delivery needs this Mac awake and bridge running. For weekly_demo explain fictional data and weekly recurrence at the same local time. Ask if they want it scheduled; a plain Yes can confirm the immediately presented proposal, or CONFIRM REMINDER. Nothing is scheduled until confirmation.'};
}
export function confirmSchedule(s,now=Date.now(),readBank=()=>bankVault().read()){
 const a=initSchedule(s),j=a.pending;if(s.mode!=='active'||!j||j.at<=now||now-j.createdAt>15*60000){a.pending=null;return 'There is no current reminder to confirm. Tell me what you want to be reminded about and when.';}
 if(j.kind==='monthly_bank_report'){let bank;try{bank=readBank();}catch{}if(bank?.owner!==s.contactTag||bank?.provider!=='nessie'||bank?.status!=='connected'||bank?.aiSharing!==true||bank?.sharingVersion!==2){a.pending=null;return 'The demo account or sharing permission changed. Nothing was scheduled. Check Connections, then ask for the monthly report again.';}}
 a.jobs.push({...j,status:'scheduled'});a.pending=null;
 return `Set for ${new Intl.DateTimeFormat('en-US',{dateStyle:'full',timeStyle:'short',timeZone:j.timezone}).format(j.at)} (${j.timezone})${j.kind==='weekly_demo'?', repeating weekly with fictional demo spending':j.kind==='weekly_checkin'?', repeating weekly to ask for your totals':j.kind==='monthly_bank_report'?', repeating monthly with a fictional Nessie graph when data is available':j.kind==='monthly_checkin'?', repeating monthly to review the totals you share':''}. This Mac must stay awake with Creditbro running. Reply REMINDERS to review or CANCEL REMINDERS to stop them.`;
}
export function cancelSchedules(s,scope='all'){
 if(!['all','checkins','reminders','monthly_checkins','weekly_checkins'].includes(scope))throw Error('Invalid cancellation scope');
 const a=initSchedule(s),matches=j=>scope==='all'||(scope==='monthly_checkins'?['monthly_checkin','monthly_bank_report'].includes(j.kind):scope==='weekly_checkins'?['weekly_checkin','weekly_demo'].includes(j.kind):scope==='checkins'?j.kind!=='reminder':j.kind==='reminder');
 if(a.pending&&matches(a.pending))a.pending=null;
 const ids=new Set();for(const j of a.jobs)if(matches(j)){ids.add(j.id);if(['scheduled','queued'].includes(j.status))j.status='cancelled';}
 for(const o of s.outbox||[])if(ids.has(o.jobId)&&o.status==='queued')o.status='cancelled';
 return {cancelled:true,scope,already_transmitted_messages_recalled:false};
}
function nextOccurrence(j,now){const p=localParts(j.at,j.timezone);j.localTime??={hour:+p.hour,minute:+p.minute};return ['monthly_checkin','monthly_bank_report'].includes(j.kind)?nextMonth(j.at,j.timezone,now,j.dayOfMonth,j.localTime):nextWeek(j.at,j.timezone,now,j.localTime);}
export function quiet(s,j,now){const pref=s.onboarding?.fields?.quiet_hours?.value;const local=localParts(now,j.timezone),minute=+local.hour*60+ +local.minute;
 if(!pref)return minute<9*60||minute>=21*60;
 const m=pref.match(/^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/);if(!m)return true; // Unknown preference blocks automatic delivery until clarified.
 const a=+m[1]*60+ +m[2],b=+m[3]*60+ +m[4];if(+m[1]>23||+m[3]>23||+m[2]>59||+m[4]>59||a===b)return true;return a<b?minute>=a&&minute<b:minute>=a||minute<b;
}
export function tickSchedule(s,now=Date.now(),readBank=()=>bankVault().read()){
 if(s.mode!=='active')return 0;const a=initSchedule(s);let count=0;
 for(const j of a.jobs){if(j.status!=='scheduled'||j.at>now)continue;
 const occurrence=j.at,id=`scheduled-${j.id}-${occurrence}`;
 if(now-occurrence>86400000){if(j.kind!=='reminder')j.at=nextOccurrence(j,now);else j.status='expired';continue;}
 if(quiet(s,j,now))continue;
 if(!s.outbox.some(o=>o.id===id||o.id===id+'-chart')){if(j.kind==='monthly_bank_report'){let report;try{const b=readBank();if(!b?.aiSharing||b.sharingVersion!==2)throw Error();const p=localParts(occurrence,j.timezone),month=new Date(Date.UTC(+p.year,+p.month-2,1)).toISOString().slice(0,7);report={...nessieReport(b,s.contactTag,month,now),money_summary:nessieMoneySummary(b,s.contactTag,month,now)};if(report.partial||!report.transactions.length)throw Error();}catch{report=null;}if(report)s.outbox.push(...reportOutbox(id,report,j.id,occurrence));else s.outbox.push({id,jobId:j.id,scheduledFor:occurrence,text:'Your monthly demo report is not ready. The connection may be off, history incomplete, or no categorized spending may be available. Check Connections or share totals for a manual review.',status:'queued'});}else if(j.kind==='weekly_demo')s.outbox.push(...reportOutbox(id,weeklyDemo(now),j.id,occurrence));else s.outbox.push({id,jobId:j.id,scheduledFor:occurrence,text:j.kind==='monthly_checkin'?"Your monthly money review: want to share last month’s spending totals and see how they compare with your budget? I haven’t checked your accounts.":j.kind==='weekly_checkin'?"Your weekly check-in: would you like to share this week's spending totals, or ask about a bill or credit? I haven't checked your accounts.":`A reminder you asked for: ${j.text}\nI haven't checked your accounts or whether this is already done.`,status:'queued'});count++;}
 if(j.kind!=='reminder')j.at=nextOccurrence(j,now);else j.status='queued';
 }
 return count;
}
export function scheduleView(s){return {scheduler_available:true,delivery_requires:'Mac awake, BlueBubbles and bridge running; one approved tester only',quiet_hours_default:'21:00-09:00 in job timezone; unparseable saved quiet hours blocks delivery',jobs:initSchedule(s).jobs,pending:s.schedule.pending,real_accounts_connected:false};}
export const scheduleTool={name:'propose_reminder',description:'Propose a one-time reminder, a weekly_checkin asking for manual totals, a monthly_checkin asking for a monthly review, an explicitly requested monthly_bank_report from fictional Nessie data, or a weekly_demo SYNTHETIC report. No schedule until the student confirms the presented proposal. Ask for ambiguous time or timezone. Never infer recurring report consent from a saved cadence.',input_schema:{type:'object',properties:{kind:{type:'string',enum:['reminder','weekly_demo','weekly_checkin','monthly_checkin','monthly_bank_report']},at:{type:'string',description:'Absolute ISO timestamp with Z or numeric UTC offset'},timezone:{type:'string',description:'Explicit IANA timezone, e.g. America/Los_Angeles'},text:{type:'string',maxLength:200,description:'Short reminder subject without balances or identifying details'},evidence_quote:{type:'string',description:'Exact quote from current student request'}},required:['kind','at','timezone','text','evidence_quote'],additionalProperties:false}};
export const SCHEDULER_RULES=`LATEST SCHEDULING CAPABILITIES (supersede earlier unavailable-reminder instructions):
The host can propose reminders, persist confirmed jobs and send them while this Mac and bridge run. Saving onboarding preferences alone never schedules anything. Use propose_reminder only at the student's request. Ask for the time and IANA timezone if unknown. Show the exact local date/time/timezone and purpose, then ask whether to schedule it (plain Yes or CONFIRM REMINDER); never claim it is set until the host confirms. For changes cancel the intended scope with cancel_scheduled_messages, then propose a new schedule. monthly_checkin sends a monthly question requesting totals for a spending/budget review, preserving the requested calendar day and local time, clamping to the last day in short months. It does not automatically create a graph without fresh data. weekly_checkin sends one weekly question asking for manually shared totals; it does not invent spending or require a bank connection. No automatic important alerts or account monitoring. Quiet hours default 21:00-09:00; if a requested time is within quiet hours, explain it will be deferred and ask for a daytime time instead; if saving custom hours use HH:MM-HH:MM, clarify ambiguous hours before saving. Urgent alerts never bypass quiet hours in this version. DEMO REPORT sends a synthetic weekly category-bar PNG with a short caption; if rendering fails a text fallback is used. Report images are sent as attachments, never public links. Do not claim image delivery without provider confirmation. Recurring synthetic reports require an explicit demo request and confirmation. They use fictional data, never bank transactions. REMINDERS lists jobs, CANCEL REMINDERS cancels them, STOP cancels all automation; START does not restore jobs. Do not imply a credit score, real balance, real due date, payment or connection was verified. monthly_bank_report sends a graph for the previous calendar month from the connected fictional Nessie account, only after explicit monthly graph request, enabled Claude summary sharing, and schedule confirmation. If the connection or sharing is disabled, history is stale/incomplete, or no tagged spending exists, it sends an availability notice instead. It does not create real bank access. Current UTC time is provided in application context for date interpretation. Recurring times use the requested local clock. If daylight saving skips that time, shift that occurrence forward and retain the original clock for later weeks or months. On repeated clock times, choose the earlier occurrence once. Monthly reports use the month before their scheduled occurrence even if quiet hours defer delivery across a month boundary. All delivery is best effort, with late one-time reminders expiring after 24 hours.`;

// Recheck immediately before transmission, including after downtime or chart rendering.
export function canDeliverScheduled(s,o,now=Date.now()){
 if(o.status!=='queued'||!s.outbox.includes(o))return false;
 if(!o.jobId)return true;
 const j=initSchedule(s).jobs.find(j=>j.id===o.jobId);
 if(s.mode!=='active'||!j||!['scheduled','queued'].includes(j.status)){o.status='cancelled';return false;}
 const occurrence=o.scheduledFor??Number(o.id.match(/-(\d{13})(?:-chart|-caption)?$/)?.[1]);
 if(!Number.isFinite(occurrence)||now-occurrence>86400000){o.status='expired';if(j.kind==='reminder')j.status='expired';return false;}
 return now>=occurrence&&!quiet(s,j,now);
}
