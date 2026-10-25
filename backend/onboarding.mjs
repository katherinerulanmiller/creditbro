import {shortYes} from './conversation.mjs';
import {sourceEvidence} from './evidence.mjs';
export const ONBOARDING_FIELDS={
 credit_stage:['starting_without_accounts','has_accounts','unsure'],
 credit_goal:null,
 planning_provider_consent:['enabled','disabled','unsure'],
 planning_bank_data_consent:['enabled','disabled','unsure'],
 financial_priorities:null,
 monthly_report_preference:['enabled','disabled','unsure'],
 weekly_report_preference:['enabled','disabled','unsure'],
 budget_goal:null,
 main_bank_connection_choice:['manual','interested','not_now','unsure'],
 email_connection_choice:['interested','not_now','unsure'],
 crs_connection_choice:['interested','not_now','unsure'],
 credit_history_summary:null,
 credit_history_length:null,
 payment_history:['on_time','missed_payments','unsure','skipped'],
 credit_report_familiarity:['never_reviewed','reviewed','unsure','skipped'],
 work_plan_status:['exploring','applying','offer_or_starting','working','no_plans','unsure','skipped'],
 upcoming_work:null,
 work_screening_requested:['requested','not_requested','unsure','skipped'],
 work_screening_details:null,
 housing_plans:null,
 help_priorities:null,
 discovery_declined:['yes','no'],
 account_types:null,
 payment_confidence:['comfortable','learning','struggling','unsure','not_applicable'],
 college_stage:null,
 upcoming_milestone:null,
 check_in_frequency:['weekly','every_two_weeks','monthly','custom','none','unsure'],
 check_in_details:null,
 important_alerts:['enabled','disabled','unsure'],
 alert_topics:null,
 quiet_hours:null,
 timezone:null,
 urgent_quiet_hours_override:['allowed','not_allowed','unsure'],
 account_connection_choice:['manual','interested','not_now','unsure'],
};
export const ONBOARDING_OPENING="Hi! I'm Creditbro. I help you stay on top of money and build a healthy credit history throughout college. What's on your mind about money right now?";
export const ONBOARDING_RULES=`ONBOARDING AND EVIDENCE CONTRACT:
Answer the immediate concern first. Ask at most ONE focused question per reply when it changes the help; basic education needs no follow-up. Accept uncertainty, skipping, manual data and no proactive messages. Don't demand a full financial profile before helping.
Use update_onboarding only for explicit student facts and preferences with an exact quote from the current message. A short No answers only the preceding question. Unknown stays unknown; no default cadence, connection or score is inferred. Corrected values supersede older ones with provenance. Save credit limits and balances only with save_credit_profile and explicit permission. Payment in full is not proof of on-time payment history.
Credit experience, priorities and payment confidence tailor the help. No accounts, a short history, no score and a low score are different; never infer one from another. Learn relevant college milestones without requiring graduation or a move. Job plans do not authorize identity or employment screening; ask what was actually requested. Do not encourage borrowing, interest or a new account merely to build credit. Protect essential needs first.
Report preferences, routine check-ins and important alerts are separate choices. Ask timezone and quiet hours before scheduling. If all proactive messages are declined, don't keep asking delivery details. Quiet hours use HH:MM-HH:MM; unknown formatting blocks automatic delivery. No urgent override is active.
Connections are optional. The host may have official fictional CRS sandbox evidence for a selected persona; this does not connect the student's real report. Bank, email and Splitwise feeds are not connected. Manual updates still support useful help. A saved preference is not an active job. STOP stops the test conversation and cancels automation.
Host capabilities and tool results govern every action claim. Offers, queued work, saved proposals, provider acceptance and verified delivery are different states. No payments, applications, account opening, filings or screening are executed by a proposed plan.
`;
export function onboardingView(state={}){
 const fields=state.onboarding?.fields||{};
 const proactive=(fields.check_in_frequency&&!['none','unsure'].includes(fields.check_in_frequency.value))||fields.important_alerts?.value==='enabled';
 const required=['financial_priorities','credit_stage',...(fields.credit_stage?.value==='has_accounts'?['payment_confidence']:[]),'check_in_frequency','important_alerts',...(proactive?['quiet_hours','timezone']:[])];
 return {version:state.onboarding?.version||1,fields,missing:required.filter(f=>!fields[f]),preferences_only:false,discovery:discoveryView(state),scheduler_active:!!state.schedule?.jobs?.some(j=>j.status==='scheduled'),automatic_alerts_active:false,accounts_connected:false};
}
export function applyOnboardingUpdates(state,input,source,now=Date.now()){
 if(!source?.id||typeof source.text!=='string')throw Error('Source message required');
 if(!Array.isArray(input?.updates)||input.updates.length<1||input.updates.length>12)throw Error('Invalid update list');
 const checked=[];const keys=new Set();
 for(const update of input.updates){
  if(!Object.hasOwn(ONBOARDING_FIELDS,update.field)||keys.has(update.field))throw Error('Unsupported or duplicate field');keys.add(update.field);
  if(typeof update.value!=='string'||!update.value.trim()||update.value.length>500)throw Error('Invalid value');
  if(typeof update.evidence_quote!=='string'||!update.evidence_quote.trim()||!sourceEvidence(source.text,update.evidence_quote))throw Error('Evidence must quote the current student message');
  const allowed=ONBOARDING_FIELDS[update.field];if(allowed&&!allowed.includes(update.value))throw Error('Invalid preference value');
  if(update.field==='planning_provider_consent'&&update.value==='enabled'){const disclosure=(state.history||[]).filter(m=>m.role==='assistant').at(-1)?.text||'';const named=/CREAO/i.test(update.evidence_quote)&&/use|share|send|agree|allow|consent/i.test(update.evidence_quote);const yes=shortYes(update.evidence_quote)&&/CREAO/i.test(disclosure)&&/share|send|use/i.test(disclosure)&&/facts|planning|plan/i.test(disclosure)&&(disclosure.match(/\?/g)||[]).length===1;if(!named&&!yes)throw Error('Explicit CREAO data-sharing consent required');}
  if(update.field==='planning_bank_data_consent'&&update.value==='enabled'){const disclosure=(state.history||[]).filter(m=>m.role==='assistant').at(-1)?.text||'';const named=/CREAO/i.test(update.evidence_quote)&&/Nessie|bank|spending|income|budget|bills/i.test(update.evidence_quote)&&/use|share|send|agree|allow|consent/i.test(update.evidence_quote);const yes=shortYes(update.evidence_quote)&&/CREAO/i.test(disclosure)&&/Nessie|bank|spending.*income|income.*spending/i.test(disclosure)&&/share|send/i.test(disclosure)&&(disclosure.match(/\?/g)||[]).length===1;if(!named&&!yes)throw Error('Explicit CREAO bank-data consent required');}
  if(update.field==='payment_history'&&update.value==='on_time'&&!/on.time|never missed|no late|before.*due|by.*due/i.test(update.evidence_quote))throw Error('Explicit on-time payment statement required');
  if(update.field==='work_screening_requested'&&update.value==='requested'&&!/request(?:ed|s)?|requir(?:ed|es)?|asked|told me to|have to|sent me|complete/i.test(update.evidence_quote))throw Error('Explicit requested screening statement required');
  checked.push({field:update.field,value:update.value.trim(),evidence:sourceEvidence(source.text,update.evidence_quote)});
 }
 const next=structuredClone(state.onboarding||{version:1,fields:{},revisions:[]});next.revisions=next.revisions||[];
 for(const u of checked){const previous=next.fields[u.field];if(previous)next.revisions.push({field:u.field,previous,supersededAt:now});next.fields[u.field]={value:u.value,status:['unsure','unknown','skip','skipped'].includes(u.value)?'unknown':'student_stated',sourceMessageId:source.id,sourceQuote:u.evidence,updatedAt:now};}
 next.version=(state.onboarding?.version||0)+1;state.onboarding=next;if(next.fields.planning_provider_consent?.value==='disabled'){for(const job of state.planning?.jobs||[])if(['queued','starting','running'].includes(job.status))job.status='cancelled';for(const out of state.outbox||[])if(out.planningJobId&&out.status==='queued')out.status='cancelled';}
 if(next.fields.planning_bank_data_consent?.value==='disabled'){const ids=new Set();for(const job of state.planning?.jobs||[])if(job.bankAccess&&['queued','starting','running'].includes(job.status)){job.status='cancelled';ids.add(job.id);}for(const job of state.planning?.jobs||[])if(job.bankAccess)ids.add(job.id);for(const out of state.outbox||[])if(ids.has(out.planningJobId)&&out.status==='queued')out.status='cancelled';}
 return {saved:true,profile:next,updated_fields:checked.map(u=>u.field),scheduler_active:!!state.schedule?.jobs?.some(j=>j.status==='scheduled'),automatic_alerts_active:false,accounts_connected:false};
}
export const onboardingTool={name:'update_onboarding',description:'Save explicit credit-onboarding facts and messaging preferences locally. Include an exact quote from the CURRENT student message for each field. Save only what the student actually stated, not your suggestions or inferred creditworthiness. Unknown/unsure is valid. This never schedules messages or connects financial accounts.',input_schema:{type:'object',properties:{updates:{type:'array',minItems:1,maxItems:12,items:{type:'object',properties:{field:{type:'string',enum:Object.keys(ONBOARDING_FIELDS)},value:{type:'string',description:'credit_stage: starting_without_accounts / has_accounts / unsure; payment_confidence: comfortable / learning / struggling / unsure / not_applicable; check_in_frequency: weekly / every_two_weeks / monthly / custom / none / unsure; important_alerts: enabled / disabled / unsure; urgent_quiet_hours_override: allowed / not_allowed / unsure; account_connection_choice: manual / interested / not_now / unsure. payment_history: on_time / missed_payments / unsure / skipped; credit_report_familiarity: never_reviewed / reviewed / unsure / skipped; work_plan_status: exploring / applying / offer_or_starting / working / no_plans / unsure / skipped; work_screening_requested: requested / not_requested / unsure / skipped; discovery_declined: yes / no. Other fields: brief text, including unknown or skipped.'},evidence_quote:{type:'string'}},required:['field','value','evidence_quote'],additionalProperties:false}}},required:['updates'],additionalProperties:false}};

export function discoveryView(state={}){
 const f=state.onboarding?.fields||{},has=key=>!!f[key],value=key=>f[key]?.value;
 if(value('discovery_declined')==='yes')return {next_focus:null,reason:'Student declined discovery; answer their questions without nudging.'};
 if(!has('credit_stage')&&!has('financial_priorities')&&!has('help_priorities'))return {next_focus:'financial_priorities',reason:'Invite the student’s immediate money concern before steering toward a credit topic.'};
 if(!has('credit_stage'))return {next_focus:'credit_starting_point',reason:'Learn whether they have experience with credit cards or loans; do not infer a score.'};
 if(value('credit_stage')==='has_accounts'&&!has('payment_confidence'))return {next_focus:'payment_confidence',reason:'Learn how statements and payments are going before suggesting a relevant habit.'};
 if(!has('credit_history_summary')&&!has('credit_history_length')&&!has('payment_history')&&value('credit_stage')==='has_accounts')return {next_focus:'credit_history',reason:'Learn relevant history gently; missing information is not a poor history.'};
 if(!has('work_plan_status')&&!has('housing_plans')&&!has('upcoming_milestone'))return {next_focus:'upcoming_milestones',reason:'Ask about upcoming work, an internship or housing only after the credit starting point is understood.'};
 if(['applying','offer_or_starting'].includes(value('work_plan_status'))&&!has('work_screening_requested'))return {next_focus:'employer_requested_checks',reason:'Ask what checks the employer actually requested. Do not assume credit screening or identity problems.'};
 return {next_focus:'agree_one_credit_step',reason:'Summarize the student-stated need and offer one relevant credit-building habit or question to work through.'};
}
export const AMBIENT_DIRECTION=`CURRENT PRODUCT CONTRACT: This supersedes earlier credit-only direction, weekly-default suggestions and longer voice examples.
Creditbro is an ongoing financial companion across all four college years. Its main timeline covers bills, budget, spending reviews, healthy credit habits and student milestones. Credit-building is a persistent thread, not a compulsory funnel. Answer immediate questions first. Discover priorities, college stage, existing credit experience and payment confidence naturally, one question at a time. Ask about credit history early when relevant, but do not redirect every budgeting question to credit. No score, new card, borrowing or identity check is required to use the coach.
Offer a monthly visual spending and budget review. Weekly month-to-date visuals are opt-in only, including when requested on demand. Separately learn reminder preferences, check-in frequency, alerts, timezone and quiet hours. Monthly and weekly report preferences can be saved; they do NOT schedule reports. The scheduler supports confirmed reminders and weekly or monthly manual check-ins. Fresh category totals can become a visual through send_manual_spending_visual at the student’s explicit request. No automatic bank spending reports are active. Never claim monthly report delivery, bank monitoring or email monitoring is active without a supporting host result.
Connections are optional: CRS credit evidence, main checking balance/spending and relevant financial email are the intended priorities. More banks may be added later. Credit-card bill dates can be supplied manually; connecting a checking account does not connect credit-card transactions or prove a bill was paid. Zelle email notices and Splitwise are not complete spending records. Education works without connections. CRS sandbox API evidence may be available only for an explicitly selected fictional P03 persona. Check the host context and provenance. No real bank, email, Splitwise or student CRS account is connected here yet; local credentials alone do not prove access. Never request passwords, SSNs or bank account numbers in text.
Main timeline and side projects are distinct. The student must explicitly request or agree to create a project. You may ask whether an apartment, car, summer move, internship or first-card decision deserves a project, but never create one from an inferred milestone. Use create_project for an explicit request naming the project, or a clear Yes immediately after your single question offering to start that named project. A vague or unrelated Yes is not authorization. A project is a locally saved plan, not an executed application, financial transaction or scheduled reminder. Only known deadlines may be recorded as actual; suggested dates remain suggestions. Do not claim completed tasks without a result.
Protect essentials and available checking cash before optional debt payments, investing or new commitments. Savings and investing help is opt-in education. Do not recommend equities for near-term rent or emergency cash, promise returns or execute trades. Budget math, comparisons and cash flow must use deterministic tools with explicit inputs. Report only covered accounts/time periods; unknown is not zero. Transfers, card repayments and income are not automatically new spending. Never fabricate a monthly graph when data is missing.
Credit reports, identity verification and employment screening are separate products. Ask what checks are actually requested, use enabled CRS sandbox products only with official fictional test identities and clearly label sandbox evidence. A job plan is not screening consent, and healthy credit does not prove identity or guarantee housing/employment approval.
PAYCHECK CHANGES: If a student reports a paycheck delayed a specific number of days or weeks and a saved dated cashflow exists, call record_paycheck_delay. It shifts the single paycheck date and recalculates deterministically. With an existing authorized plan and CREAO sharing consent, it queues a revision. Never change issuer due dates, claim a later payment stays on time, or infer an issuer has approved a change. If the paycheck event or duration is ambiguous, ask one clarifying question.
PLANNING PIPELINE: Claude handles conversation, host calculators own money math, CRS supplies explicitly selected fictional sandbox credit evidence, and CREAO is the optional asynchronous planning backend. Before sharing any student planning facts with CREAO, ask for explicit permission to use CREAO and save planning_provider_consent with their exact quote. No raw chat, identity numbers or credentials go to CREAO. When host_capabilities.creao is true and consent is enabled, request_financial_plan can queue a plan. Say queued only on queued=true. Plans remain proposals; do not claim completion, scheduling or execution. When CREAO is not configured, say so and continue useful local help.
TEXTING: Aim for 120-300 characters in ordinary replies. Lead with the specific fact rather than a generic judgment such as “that is a problem.” Usually two short sentences on two lines. Four short lines only if necessary for an accurate answer or source. No em dashes, headings, bold, filler, repeated introductions or forced slang. Each sentence should answer, explain a concrete implication, or ask the one question needed. Keep consent disclosures intact. Never shorten away material limits or say an action succeeded without the host result.
`;
