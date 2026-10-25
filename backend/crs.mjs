import {RUNTIME_ROOT,SETTINGS_DIR} from './runtime-config.mjs';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {randomBytes,createCipheriv} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const DIR=RUNTIME_ROOT+'/imessage-state';
const BASE='https://api-sandbox.stitchcredit.com/api';
const persona=JSON.parse(readFileSync(process.env.CREDITBRO_CRS_PERSONA_FILE||new URL('./examples/crs-official-p03.json',import.meta.url)));
export function officialRequest(bureau){if(!['Equifax','Experian','TransUnion'].includes(bureau))throw Error('Unsupported bureau');const r=persona.requests.find(r=>r.product==='credit_report'&&r.variant===bureau);if(!r||!r.path.startsWith('/'+bureau.toLowerCase()+'/credit-report/standard/'))throw Error('Invalid official request');return {path:r.path.replace('{config}',r.config),body:structuredClone(r.body)};}
export function dollarsToCents(value){if(typeof value!=='string'||!/^\d{1,10}(?:\.\d{1,2})?$/.test(value))return null;const [whole,part='']=value.split('.');const result=Number(whole)*100+Number(part.padEnd(2,'0'));return Number.isSafeInteger(result)?result:null;}
function date(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v?v:null;}
export function normalizeReport(raw,bureau,at=Date.now()){
 if(!['Equifax','Experian','TransUnion'].includes(bureau))throw Error('Unsupported bureau');
 const source={provider:'CRS',environment:'sandbox',persona_id:'P03',bureau,retrieved_at:at,official_persona:true};
 if(!raw||typeof raw!=='object'||raw.errorMessages?.length)return {...source,status:'report_error',usable:false,facts:null,error_codes:(raw?.errorMessages||[]).map(e=>String(e.creditErrorMessageCode||'UNKNOWN').replace(/[^A-Z0-9_]/g,'').slice(0,30)),assumptions:['Report errors cannot be used as financial evidence.']};
 if(!raw.creditFiles?.some(f=>f.creditFileDetail?.creditFileResultStatusType==='FileReturned')&&!raw.tradelines?.length&&!raw.scores?.length)return {...source,status:'no_usable_file',usable:false,facts:null};
 const scores=(raw.scores||[]).filter(x=>x.sourceType===bureau&&/^\d{3}$/.test(x.scoreValue||'')).map(x=>({value:Number(x.scoreValue),model:String(x.modelName||'Unspecified').slice(0,60),bureau,source_ref:`crs:P03:${bureau}:score`}));
 const accounts=(raw.tradelines||[]).filter(t=>t.sourceType===bureau).slice(0,100).map((t,i)=>{const balance=dollarsToCents(t.currentBalanceAmount),limit=dollarsToCents(t.creditLimitAmount);return {id:`${bureau}-account-${i+1}`,type:String(t.accountType||'Unknown').slice(0,40),status:String(t.accountStatusType||'Unknown').slice(0,30),balance_cents:balance,limit_cents:limit,past_due_cents:dollarsToCents(t.pastDueAmount),opened:date(t.accountOpenedDate),reported:date(t.accountReportedDate),utilization_percent:balance!==null&&limit>0&&t.accountType==='Revolving'?Math.round(balance/limit*10000)/100:null,source_ref:`crs:P03:${bureau}:tradeline:${i+1}`};});
 if(!scores.length&&!accounts.length)return {...source,status:'no_usable_facts',usable:false,facts:null};
 return {...source,status:'report_retrieved',usable:true,facts:{scores,accounts},assumptions:['Official fictional test persona, never the student’s real credit report.','Each bureau is a separate snapshot; do not average or merge scores across models.','Reported balances are not current checking cash, statement balances or payment deadlines.','No past-due amount in this snapshot does not prove an entire history of on-time payments.','Sandbox dates and persona summaries may disagree; use dated report fields and flag uncertainty.']};
}
export function loadCRS(){try{return JSON.parse(readFileSync(DIR+'/crs-normalized.json','utf8'));}catch{return {environment:'sandbox',persona_id:'P03',reports:[],usable_reports:0,status:'not_retrieved'};}}
export async function fetchOfficialReports(config,fetcher=fetch){
 async function post(path,body,token){const r=await fetcher(BASE+path,{method:'POST',headers:{'content-type':'application/json',accept:'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(30000),redirect:'error'});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
 if(!config.CRS_USERNAME||!config.CRS_PASSWORD)throw Error('Sandbox credentials missing');if(fetcher===fetch&&JSON.stringify(persona).includes('REPLACE_WITH_OFFICIAL_SANDBOX_VALUE'))throw Error('Set CREDITBRO_CRS_PERSONA_FILE to the sponsor-provided fictional sandbox request file; public identity fields are redacted.');
 const auth=await post('/users/login',{username:config.CRS_USERNAME,password:config.CRS_PASSWORD});if(typeof auth.token!=='string'||!auth.token)throw Error('Authentication failed');
 const reports=[];
 for(const bureau of ['Equifax','TransUnion','Experian']){const request=officialRequest(bureau);try{const raw=await post(request.path,request.body,auth.token);reports.push(normalizeReport(raw,bureau));}catch{reports.push({bureau,environment:'sandbox',persona_id:'P03',usable:false,status:'request_failed',facts:null});}}
 return {environment:'sandbox',persona_id:'P03',source:'Official @crscreditapi/crs-calhacks-mcp-server 1.1.2 persona data',retrieved_at:Date.now(),reports,usable_reports:reports.filter(r=>r.usable).length,status:'fetch_completed'};
}
export async function run(){
 const config={};for(const l of readFileSync(SETTINGS_DIR+'/CRS-Setup.txt','utf8').split(/\r?\n/)){if(l.startsWith('#')||!l.includes('='))continue;const i=l.indexOf('=');config[l.slice(0,i).trim()]=l.slice(i+1).trim().replace(/^['"]|['"]$/g,'');}
 try{const result=await fetchOfficialReports(config);writeFileSync(DIR+'/crs-normalized.json',JSON.stringify(result),{mode:0o600});writeFileSync(DIR+'/crs-status.json',JSON.stringify({authenticated:true,checkedAt:Date.now(),environment:'sandbox',report_access_verified:result.usable_reports>0,usable_reports:result.usable_reports,identity_verified:false}),{mode:0o600});console.log(JSON.stringify({authenticated:true,usable_reports:result.usable_reports,reports:result.reports.map(r=>({bureau:r.bureau,status:r.status})),identities_checked:false}));}catch{console.log('CRS sandbox fetch failed; private details omitted.');process.exitCode=1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)run();
