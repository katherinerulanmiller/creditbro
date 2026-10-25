import {bankVault} from './bank.mjs';
import {nessieReport,nessieMoneySummary} from './nessie.mjs';
import {sourceEvidence} from './evidence.mjs';
import {reportOutbox} from './report-image.mjs';
export function connectedReport(state,input,source,now=Date.now(),vault=bankVault()){
 if(state.mode!=='active'||!sourceEvidence(source?.text||'',input.evidence_quote||'')||!input.evidence_quote?.trim()||!/(?:show|send|make|give|graph|report|breakdown|visual)/i.test(input.evidence_quote)||/\b(?:don't|do not|no|not now|maybe)\b/i.test(input.evidence_quote))throw Error('Explicit report request required');
 const b=vault.read();if(!b||b.owner!==state.contactTag||(!b.aiSharing||b.sharingVersion!==2))throw Error('Bank summary sharing not enabled');
 const r={...nessieReport(b,state.contactTag,input.month,now),money_summary:nessieMoneySummary(b,state.contactTag,input.month,now)};if(!r.transactions.length)return {queued:false,status:'no_posted_spending',coverage:r.text};
 if((state.outbox||[]).some(o=>o.id==='bank-request-'+source.id+'-chart'))return {queued:false,status:'already_created'};
 state.outbox.push(...reportOutbox('bank-request-'+source.id,r));return {queued:true,status:'image_queued',source:r.source,fictional:true,total_cents:r.total_cents,coverage:r.text,instruction:'Queued, not delivered. These are fictional Nessie simulated withdrawals, not the student’s real spending.'};
}
export const connectedReportTool={name:'send_connected_spending_visual',description:'Queue a monthly graph from the one selected Capital One Nessie simulation account only after the student requests it. Requires existing dashboard bank connection and explicit Claude summary sharing permission. Fictional data only. Does not access real accounts or infer bill payment status.',input_schema:{type:'object',properties:{month:{type:'string',pattern:'^\\d{4}-(0[1-9]|1[0-2])$'},evidence_quote:{type:'string'}},required:['month','evidence_quote'],additionalProperties:false}};

export function canDeliverBankReport(state,outbox,vault=bankVault()){
 if(!outbox.bankAccess)return true;
 try{const b=vault.read();return state.mode==='active'&&b?.owner===state.contactTag&&b.provider==='nessie'&&b.status==='connected'&&b.aiSharing===true&&b.sharingVersion===2&&b.connectedAt===outbox.bankAccess.connection_at&&(b.sharingRevision||null)===outbox.bankAccess.sharing_revision;}catch{return false;}
}

export function connectedMoneySummary(state,input,source,now=Date.now(),vault=bankVault()){
 if(state.mode!=='active'||!sourceEvidence(source?.text||'',input.evidence_quote||'')||!input.evidence_quote?.trim())throw Error('Explicit source required');
 const b=vault.read();if(!b||b.owner!==state.contactTag||(!b.aiSharing||b.sharingVersion!==2))throw Error('Bank summary sharing not enabled');return nessieMoneySummary(b,state.contactTag,input.month,now);
}
export const connectedMoneyTool={name:'get_connected_money_summary',description:'Read deterministic monthly income, tagged spending, budget remainder, net imported flow and upcoming simulated bill records from the connected Nessie account after dashboard Claude-sharing consent. Required before answering questions about those amounts. Fictional data only; net flow is not available cash. Bill creation receipts do not verify current payment status or issuer due dates. Does not change a budget, schedule reminders or pay anything.',input_schema:{type:'object',properties:{month:{type:'string',pattern:'^\\d{4}-(0[1-9]|1[0-2])$'},evidence_quote:{type:'string'}},required:['month','evidence_quote'],additionalProperties:false}};
