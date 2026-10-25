import {connectedReport,connectedMoneySummary} from './bank-report.mjs';
import {delayPaycheck} from './paycheck.mjs';
import {createManualReport} from './manual-report.mjs';
import {requestPlan} from './pipeline.mjs';
import {createProject} from './companion.mjs';
import {sourceEvidence} from './evidence.mjs';
import {proposeSchedule,cancelSchedules} from './scheduler.mjs';
import {saveCreditProfile} from './coaching.mjs';
export function coachAction(state,name,input,source,history=[],now=Date.now()){
 if(state.mode!=='active')throw Error('Conversation not active');
 if(name==='get_connected_money_summary')return connectedMoneySummary(state,input,source,now);
 if(name==='send_connected_spending_visual')return connectedReport(state,input,source,now);
 if(name==='record_paycheck_delay')return delayPaycheck(state,input,source,now);
 if(name==='send_manual_spending_visual')return createManualReport(state,input,source,now);
 if(name==='request_financial_plan')return requestPlan(state,input,source,now);
 if(name==='create_project')return createProject(state,input,source,now,history);
 if(name==='propose_reminder')return {...proposeSchedule(state,input,source,now),schedule:structuredClone(state.schedule)};
 if(name==='save_credit_profile')return saveCreditProfile(state,input,source,history,now);
 if(name==='cancel_scheduled_messages'){
  if(!['all','checkins','reminders','monthly_checkins','weekly_checkins'].includes(input.scope))throw Error('Explicit scope required');
  if(typeof input.evidence_quote!=='string'||!input.evidence_quote.trim()||!sourceEvidence(source.text,input.evidence_quote)||!/\b(cancel|stop|off|none)\b|\bno\s+(?:(?:weekly|monthly)\s+)?(?:reminders|check.ins|messages|reports)/i.test(source.text)||/\b(?:don't|do not)\s+(?:cancel|stop|turn off)/i.test(source.text))throw Error('Explicit cancellation required');
  return {...cancelSchedules(state,input.scope),schedule:structuredClone(state.schedule)};
 }
 throw Error('Unknown action');
}
