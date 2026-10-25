import {createHash} from 'node:crypto';
import {bankVault} from './bank.mjs';
import {nessieMoneySummary} from './nessie.mjs';
export const readPlanningBank=()=>{try{return bankVault().read();}catch{return null;}};
export function planningBankEvidence(state,bank,now=Date.now()){
 if(state.onboarding?.fields?.planning_bank_data_consent?.value!=='enabled')throw Error('CREAO bank-data consent required');
 if(!bank||bank.owner!==state.contactTag||bank.provider!=='nessie'||bank.status!=='connected'||!bank.aiSharing||bank.sharingVersion!==2)throw Error('Nessie summary sharing required');
 const month=new Date(now).toISOString().slice(0,7),{weekly_categories,week_start,week_end,...summary}=nessieMoneySummary(bank,state.contactTag,month,now);
 return {source_ref:'nessie:monthly_summary',source:'Capital One Nessie API simulation',fictional:true,...summary,upcoming_bills:summary.upcoming_bills.map((b,i)=>({...b,source_ref:'nessie:bill:'+i})),limitations:['Not a real student bank account.','Budget remaining and imported net flow are not available cash.','Imported deposits do not confirm future paychecks.','Bill payment dates are planned dates, not issuer due dates; a creation receipt does not verify current status.','Selected CRS P03 evidence and Nessie are separate fictional demo sources; no identity match is established.']};
}
function fingerprint(e){const {as_of,partial,...stable}=e;return createHash('sha256').update(JSON.stringify(stable)).digest('hex');}
export function planningBankAccess(state,bank,now=Date.now()){const e=planningBankEvidence(state,bank,now);return {connection_at:bank.connectedAt,sharing_revision:bank.sharingRevision||null,month:e.month,fingerprint:fingerprint(e)};}
export function planningBankStillValid(state,access,bank,now=Date.now()){
 if(!access)return true;
 try{const current=planningBankAccess(state,bank,now);return current.connection_at===access.connection_at&&current.sharing_revision===access.sharing_revision&&current.month===access.month&&current.fingerprint===access.fingerprint;}catch{return false;}
}
export function bankChanges(previous,current){if(!previous||!current)return [];
 return ['posted_income_cents','tagged_spending_cents','budget_cents','budget_remaining_cents','net_imported_flow_cents','planned_bill_total_cents'].filter(k=>previous[k]!==current[k]).map(field=>({field,previous:previous[field]??null,current:current[field]??null,source_ref:'nessie:monthly_summary'}));
}
