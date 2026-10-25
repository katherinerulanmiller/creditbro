import {intentText,shortYes} from './conversation.mjs';
import {readNessieContext} from './nessie.mjs';
import {randomUUID} from 'node:crypto';
import {sourceEvidence} from './evidence.mjs';
export function companionView(state={}){
 const c=state.companion||{},bank=readNessieContext(state.contactTag);
 return {projects:c.projects||[],timeline:c.timeline||[],report_preferences:{monthly:state.onboarding?.fields?.monthly_report_preference?.value||'not_chosen',weekly:state.onboarding?.fields?.weekly_report_preference?.value||'not_chosen'},report_delivery_active:false,connections:[{id:'crs',name:'CRS credit evidence',status:state.crsSandbox?.authenticated?'sandbox_authenticated':'not_connected',detail:state.crsSandbox?.authenticated?'Sandbox authentication verified. Report access is separate.':'Sandbox setup pending. No credit report retrieved.'},{id:'bank',name:'Main bank account',status:bank.status,detail:'Optional fictional Capital One Nessie account. Claude summary sharing is '+(bank.ai_sharing?'enabled.':'off.')},{id:'email',name:'Financial email',status:'not_connected',detail:'Optional. App OAuth connection is not configured.'},{id:'splitwise',name:'Splitwise',status:'not_connected',detail:'Optional follow-on. Shared expenses are not a full bank ledger.'}]};
}
export function createProject(state,input,source,now=Date.now(),history=[]){
 if(state.mode!=='active')throw Error('Conversation not active');
 if(!source?.id||typeof source.text!=='string'||typeof input.evidence_quote!=='string'||!sourceEvidence(source.text,input.evidence_quote))throw Error('Source message required');
 const evidence=sourceEvidence(source.text,input.evidence_quote);const intent=intentText(evidence);
 const title=typeof input.title==='string'?input.title.trim():'';
 if(title.length<3||title.length>90||/[\r\n]/.test(title))throw Error('Invalid project title');
 const words=title.toLowerCase().match(/[a-z]{3,}/g)?.filter(w=>!['first','new','the','project','for','plan'].includes(w))||[];
 const negative=/\b(?:don['’]t|do not|not ready to|maybe|might|should we)\b/i.test(intent);
 const direct=(/\b(?:start|create|set up|track|make)\b[^.!?]{0,100}\bproject\b/i.test(intent)||/\bhelp me (?:plan|prepare for|work on)\b/i.test(intent))&&words.some(w=>intent.includes(w));
 const offer=history.filter(m=>m.role==='assistant').at(-1)?.text||'';
 const confirmed=shortYes(evidence)&&/\b(?:start|create|set up|track)\b[^.!?]{0,100}\bproject\b/i.test(offer)&&(offer.match(/\?/g)||[]).length===1&&!/don['’]t|do not|shouldn['’]t/i.test(offer)&&words.some(w=>offer.toLowerCase().includes(w));
 if(negative||(!direct&&!confirmed))throw Error('Explicit project request required');
 state.companion??={projects:[],timeline:[]};
 const duplicate=state.companion.projects.find(p=>p.sourceMessageId===source.id);
 if(duplicate)return {saved:true,project:duplicate,companion:structuredClone(state.companion),already_saved:true};
 if(state.companion.projects.length>=30)throw Error('Project limit reached');
 const p={id:randomUUID(),title,status:'active',createdAt:now,sourceMessageId:source.id,sourceQuote:evidence,...(confirmed?{authorizationOffer:offer}:{}),tasks:[],actualDeadline:null,suggestedDeadline:null};
 state.companion.projects.push(p);
 state.companion.timeline.push({id:randomUUID(),type:'project_created',title,at:now,projectId:p.id,source:'student_request'});
 return {saved:true,project:structuredClone(p),companion:structuredClone(state.companion),reminders_scheduled:false,external_actions_executed:false};
}
export const projectTool={name:'create_project',description:'Save a local side project only when the current student explicitly requests starting/creating/tracking a project or asks help planning a named goal, such as help me plan my apartment. Common typos and apt shorthand are accepted, but quote the exact uncorrected message. Never infer permission from a life event, a question or an assistant suggestion. Requires an exact quote of that request. No reminders, tasks, external actions or deadlines are created by this tool.',input_schema:{type:'object',properties:{title:{type:'string',maxLength:90},evidence_quote:{type:'string'}},required:['title','evidence_quote'],additionalProperties:false}};
export function monthlySummary(entries,month,budgetCents=null){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!Array.isArray(entries)||entries.length>10000)throw Error('Invalid report input');
 if(budgetCents!==null&&(!Number.isSafeInteger(budgetCents)||budgetCents<0))throw Error('Invalid budget');
 const categories=new Map();let covered=0;
 for(const e of entries){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||isNaN(Date.parse(e.date))||new Date(e.date).toISOString().slice(0,10)!==e.date||!Number.isSafeInteger(e.amount_cents)||e.amount_cents<0||!['expense','refund','income','transfer','card_payment'].includes(e.type))throw Error('Invalid transaction');
  if(!e.date.startsWith(month))continue;
  if(!['expense','refund'].includes(e.type))continue;
  if(typeof e.category!=='string'||!e.category.trim()||e.category.length>60)throw Error('Invalid category');
  const delta=e.type==='refund'?-e.amount_cents:e.amount_cents;
  categories.set(e.category,(categories.get(e.category)||0)+delta);covered++;
 }
 const rows=Array.from(categories,([category,amount_cents])=>({category,amount_cents}));const total=rows.reduce((n,e)=>n+e.amount_cents,0);
 if(!Number.isSafeInteger(total))throw Error('Total out of range');
 return {month,total_cents:total,categories:rows,budget_cents:budgetCents,remaining_cents:budgetCents===null?null:budgetCents-total,covered_entries:covered,coverage:'Only supplied entries. Transfers, card repayments and income excluded; refunds subtract in their posted month. Not a complete account balance.'};
}
