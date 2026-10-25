import {RUNTIME_ROOT,SETTINGS_DIR} from './runtime-config.mjs';
import {dashboardData,dashboardReports} from './dashboard-data.mjs';
import {loadCRS} from './crs.mjs';
import {makeNessieService} from './nessie.mjs';
import {renderReport} from './report-image.mjs';
import {plannerReady} from './pipeline.mjs';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createDecipheriv,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {companionView} from './companion.mjs';
import {weeklyDemo} from './scheduler.mjs';
const DIR=RUNTIME_ROOT+'/imessage-state';
export function readState(){const b=readFileSync(DIR+'/session.enc'),d=createDecipheriv('aes-256-gcm',readFileSync(DIR+'/key'),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]));}
export function dashboardView(s,owner){
 if(!owner||s.contactTag!==owner)throw Error('Owner mismatch');
 const c=companionView(s);let crs={authenticated:false};try{crs=JSON.parse(readFileSync(DIR+'/crs-status.json'));}catch{}
 c.connections.push({id:'planner',name:'CREAO planning',status:plannerReady()?'configured':'not_configured',detail:plannerReady()?'Asynchronous planning backend. Sharing requires your explicit permission. Plans are proposals.':'Planner agent ID and server-side API key are not configured.'});
 c.connections[0]={...c.connections[0],status:crs.authenticated?'sandbox_authenticated':'not_connected',detail:crs.report_access_verified?'Official P03 sandbox report retrieved. Not a real student report.':crs.authenticated?'Sandbox login verified; no usable report verified.':'Sandbox not authenticated.'};
 const events=[...c.timeline,...Object.entries(s.onboarding?.fields||{}).map(([k,v])=>({id:'pref-'+k,type:'preference_saved',title:k.replaceAll('_',' ')+': '+v.value,at:v.updatedAt,source:'student_stated'})),...(s.schedule?.jobs||[]).map(j=>({id:j.id,type:'reminder',title:j.text||j.kind,at:typeof j.at==='number'?j.at:Date.parse(j.at),status:j.status,source:'confirmed_schedule'}))].sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,50);
 return {reports:(s.companion?.reports||[]).map(({sourceMessageId,...r})=>r),latest_plan:s.planning?.latestPlan||null,planning_status:s.planning?.jobs?.at(-1)?.status||'none',mode:s.mode,projects:c.projects.map(({sourceQuote,sourceMessageId,...p})=>p),timeline:events,connections:c.connections,report_preferences:c.report_preferences,report_delivery_active:false,preferences:Object.fromEntries(Object.entries(s.onboarding?.fields||{}).filter(([k])=>/frequency|report_preference|quiet_hours|timezone|important_alerts/.test(k)).map(([k,v])=>[k,v.value])),crs:{authenticated:!!crs.authenticated,report_access_verified:!!crs.report_access_verified,environment:'sandbox'},updatedAt:Date.now()};
}
export function makeDashboard({load=readState,token=randomBytes(24).toString('hex'),port=3000,bank=makeNessieService(),credit=loadCRS,plannerConfigured=plannerReady,operatorPaused=()=>{try{return JSON.parse(readFileSync(DIR+'/operator-control.json')).paused===true;}catch{return false;}}}={}){
 const cookieName=port===3000?'creditbro_session':'creditbro_preview_'+port;
 const owner=load().contactTag,sessions=new Map(),csrf=randomBytes(24).toString('hex');let remaining=true,attempts=0;const origin='http://127.0.0.1:'+port;
 const server=createServer(async(req,res)=>{
  res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');res.setHeader('referrer-policy','no-referrer');res.setHeader('content-security-policy',"default-src 'self'; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const send=(code,value,type='application/json')=>{res.writeHead(code,{'content-type':type});res.end(type==='application/json'?JSON.stringify(value):value);};
  if(req.headers.host!=='127.0.0.1:'+port)return send(403,{error:'Invalid host'});
  const path=new URL(req.url,origin).pathname;
  if(path==='/auth'&&req.method==='POST'){
   if(req.headers.origin&&req.headers.origin!==origin&&req.headers.origin!=='null')return send(403,{error:'Invalid origin'});
   if(++attempts>12)return send(429,{error:'Restart the local server to retry sign-in.'});
   let body='';for await(const chunk of req){body+=chunk;if(body.length>512)return send(413,{error:'Request too large'});}
   const form=new URLSearchParams(body);if(req.headers.origin!==origin&&form.get('csrf')!==csrf)return send(403,{error:'Invalid origin'});
   const value=(form.get('token')||'').trim();const hash=x=>createHash('sha256').update(x).digest();
   if(!remaining||!timingSafeEqual(hash(value),hash(token)))return send(401,{error:'Invalid or used access code'});
   remaining=false;const id=randomBytes(32).toString('hex');sessions.set(id,{owner,expires:Date.now()+8*3600000});res.writeHead(303,{'set-cookie':cookieName+'='+id+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800',location:'/'});return res.end();
  }
  const sid=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.split('=')[1];const session=sessions.get(sid);const authed=session&&session.expires>Date.now()&&session.owner===owner;
  if(path.startsWith('/api/bank/')){
   if(!authed)return send(401,{error:'Sign in first'});
   let owner;try{owner=load().contactTag;if(owner!==session.owner)return send(403,{error:'Owner mismatch'});}catch{return send(503,{error:'Conversation unavailable'});}
   try{
    if(req.method==='GET'&&path==='/api/bank/status')return send(200,bank.status(owner));
    if(req.method==='GET'&&path==='/api/bank/report'){
     const month=new URL(req.url,origin).searchParams.get('month');const report=bank.report(owner,month);
     if(new URL(req.url,origin).searchParams.get('image')==='1')return send(200,await renderReport(report),'image/png');
     return send(200,report);
    }
    if(req.method!=='POST')return send(405,{error:'Method not allowed'});
    if(req.headers.origin!==origin&&!((!req.headers.origin||req.headers.origin==='null')&&req.headers['x-creditbro-csrf']===csrf))return send(403,{error:'Invalid origin'});
    if(!String(req.headers['content-type']||'').startsWith('application/json'))return send(415,{error:'JSON required'});
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>2048)return send(413,{error:'Request too large'});}
    let input;try{input=JSON.parse(body||'{}');}catch{return send(400,{error:'Invalid JSON'});}
    let result;
    if(path==='/api/bank/link')result=await bank.link(owner,input.consent);
    else if(path==='/api/bank/seed')result=await bank.seed(owner,input.consent);

    else if(path==='/api/bank/sync')result=await bank.sync(owner);
    else if(path==='/api/bank/budget')result=await bank.budget(owner,input.month,input.amount_cents);
    else if(path==='/api/bank/demo-bill')result=await bank.addDemoBill(owner);
    else if(path==='/api/bank/sharing')result=await bank.share(owner,input.enabled);
    else if(path==='/api/bank/disconnect')result=await bank.disconnect(owner);
    else return send(404,{error:'Not found'});
    if(load().contactTag!==owner)return send(403,{error:'Conversation changed'});
    return send(200,result);
   }catch(e){const messages={INVALID_BUDGET:'Enter a monthly spending target between $0 and $1,000,000.',UNKNOWN_CREATE_OUTCOME:'The previous demo creation outcome is unknown. Do not retry automatically.',NOT_CONFIGURED:'Add your Nessie API key to the private settings file first.',CREATE_DEMO_FIRST:'Create the fictional demo, or configure a Nessie account ID.',AUTH_FAILED:'Nessie did not accept the API key. Check the private settings file.',DEMO_SETUP_INCOMPLETE:'Fictional demo setup did not finish. Imported data is not ready. Do not repeatedly create demos; check setup status first.',BUSY:'A bank update is already running. Try again shortly.',CONSENT_REQUIRED:'Choose whether to allow this connection first.',DISCONNECT_FIRST:'Disconnect the existing bank connection before adding another.',INVALID_LINK:'This connection session expired. Start again.',NOT_CONNECTED:'Connect and choose an account first.',INITIALIZING:'Plaid is preparing transactions. Try syncing again in a minute.',RECONNECT_REQUIRED:'Disconnect and reconnect to renew bank access.',REMOTE_REVOCATION_PENDING:'Local bank data is cleared and access is disabled. Provider removal is not confirmed. Retry Disconnect.',INVALID_PERIOD:'Choose a month in the recent 90-day history window.',ACCOUNT_SETUP_FAILED:'Account setup failed. Disconnect, then try again.'};return send(e.code==='BUSY'?409:400,{error:messages[e.code]||'Bank request could not finish. No connection or sync success is claimed.'});}
  }
  if(path==='/api/dashboard'||path.startsWith('/api/dashboard/reports/')){
   if(req.method!=='GET')return send(405,{error:'Read only'});if(!authed)return send(401,{error:'Sign in first'});
   let state;try{state=load();}catch{return send(503,{error:'Conversation unavailable'});}if(state.contactTag!==session.owner)return send(403,{error:'Owner mismatch'});
   const month=new URL(req.url,origin).searchParams.get('month')||new Date().toISOString().slice(0,7);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return send(400,{error:'Use YYYY-MM'});
   let status={status:'unavailable'},money=null,daily=[];try{status=bank.status(session.owner);}catch{}if(status.status==='connected')try{money=bank.summary(session.owner,month);daily=bank.daily?.(session.owner,month)||[];}catch{}
   if(path==='/api/dashboard'){try{let crs={reports:[]};try{crs=credit();}catch{}const data=dashboardData(state,session.owner,{month,bankStatus:status,money,daily,credit:crs,plannerConfigured:plannerConfigured(),operatorPaused:operatorPaused()});if(load().contactTag!==session.owner)return send(403,{error:'Owner mismatch'});return send(200,data);}catch{return send(503,{error:'Dashboard data unavailable'});}}
   const match=path.match(/^\/api\/dashboard\/reports\/([^/]+)\/image$/);if(!match)return send(404,{error:'Report not found'});
   let id;try{id=decodeURIComponent(match[1]);}catch{return send(400,{error:'Invalid report ID'});}const report=dashboardReports(state,status.status==='connected').find(r=>r.id===id);if(!report)return send(404,{error:'Report not found'});
   try{const png=await renderReport(report);if(load().contactTag!==session.owner)return send(403,{error:'Owner mismatch'});if(['nessie_simulation','plaid_sandbox'].includes(report.source)&&bank.status(session.owner).status!=='connected')return send(410,{error:'Connection no longer available'});return send(200,png,'image/png');}catch{return send(503,{error:'Report image unavailable'});}
  }
  if(path==='/api/state'){
   if(req.method!=='GET')return send(405,{error:'Read only'});if(!authed)return send(401,{error:'Sign in first'});try{const view=dashboardView(load(),session.owner);view.bank=bank.status(session.owner);const c=view.connections.find(c=>c.id==='bank');Object.assign(c,{status:view.bank.status,detail:'Capital One Nessie: fictional banking simulation. '+(view.bank.bill_import_status==='provider_unavailable'?'Bill-list endpoint unavailable. ':'')+(view.bank.ai_sharing?'Monthly category totals may be shared with Claude.':'Data sharing with Claude is off.')});return send(200,view);}catch{return send(403,{error:'Session does not own this conversation'});}
  }
  if(path.startsWith('/api/report/')&&req.method==='GET'){if(!authed)return send(401,{error:'Sign in first'});try{const s=load();if(s.contactTag!==session.owner)return send(403,{error:'Owner mismatch'});const report=(s.companion?.reports||[]).find(r=>r.id===path.slice('/api/report/'.length));if(!report)return send(404,{error:'Report not found'});const png=await renderReport(report);return send(200,png,'image/png');}catch{return send(503,{error:'Report image unavailable'});}}
  if(path==='/api/demo'&&req.method==='GET')return send(200,weeklyDemo());
  if(path==='/dashboard.css'&&req.method==='GET')return send(200,readFileSync(new URL('./dashboard.css',import.meta.url),'utf8'),'text/css');
  if(path.startsWith('/assets/')&&req.method==='GET'){const name=path.slice('/assets/'.length);if(!/^[A-Za-z0-9-]+\.svg$/.test(name))return send(404,{error:'Not found'});try{return send(200,readFileSync(new URL('./ui-assets/'+name,import.meta.url)),'image/svg+xml');}catch{return send(404,{error:'Not found'});}}
  if(path.startsWith('/report-assets/')&&req.method==='GET'){const name=path.slice('/report-assets/'.length);if(!/^(?:icons\/)?[a-z0-9-]+\.(?:svg|png)$/.test(name))return send(404,{error:'Not found'});try{return send(200,readFileSync(new URL('./report-assets/'+name,import.meta.url)),name.endsWith('.png')?'image/png':'image/svg+xml');}catch{return send(404,{error:'Not found'});}}
  if(path==='/figtree.ttf'&&req.method==='GET')return send(200,readFileSync(new URL('./fonts/figtree.ttf',import.meta.url)),'font/ttf');
  if(path==='/bank.js'&&req.method==='GET'){if(!authed)return send(401,{error:'Sign in first'});return send(200,readFileSync(new URL('./bank.js',import.meta.url),'utf8'),'text/javascript');}
  if(path==='/dashboard-api.mjs'&&req.method==='GET'){if(!authed)return send(401,{error:'Sign in first'});return send(200,readFileSync(new URL('./dashboard-api.mjs',import.meta.url),'utf8'),'text/javascript');}
  if(path==='/app.js'&&req.method==='GET')return send(200,readFileSync(new URL('./dashboard.js',import.meta.url),'utf8'),'text/javascript');
  if(path==='/'&&req.method==='GET')return send(200,authed?readFileSync(new URL('./dashboard.html',import.meta.url),'utf8').replace('</head>','<meta name="creditbro-csrf" content="'+csrf+'"></head>'):login.replace('<form method=','<input type="hidden" id="login-csrf" value="'+csrf+'"><form method=').replace('<label for="token">','<input type="hidden" name="csrf" value="'+csrf+'"><label for="token">'),'text/html');
  return send(404,{error:'Not found'});
 });return {server,token,bank};
}
const login=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Creditbro private dashboard</title><style>@font-face{font-family:Figtree;src:url('/figtree.ttf');font-weight:300 900}body{font:18px Figtree,system-ui;background:#F8F4EE;color:#1E2A25;max-width:440px;margin:12vh auto;padding:24px}h1{font-size:44px;letter-spacing:-2px}input,button{font:inherit;padding:14px;box-sizing:border-box;width:100%;margin:10px 0;border:1px solid #c5d2c9;border-radius:10px}button{background:#437C62;color:white}p{line-height:1.6}small{color:#596c63}</style><img src="/report-assets/contact-photo.png" alt="Creditbro" width="52" height="52"><h1>creditbro</h1><p>Your money, in one place.</p><p>This private local dashboard reads your coach’s saved timeline and projects. Enter the one-time access code from the private local settings file.</p><form method="post" action="/auth"><label for="token">Access code</label><input id="token" name="token" type="password" autocomplete="off" required><button>Open my dashboard</button></form><small>Local to this Mac. Banking and credit data are fictional demo data. Email is not connected.</small></html>`;
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){mkdirSync(DIR,{recursive:true,mode:0o700});const app=makeDashboard();const pollBank=setInterval(async()=>{try{const s=readState(),b=app.bank.status(s.contactTag);if(s.mode==='active'&&b.status==='connected'&&(!b.last_sync||Date.now()-b.last_sync>5*60000))await app.bank.sync(s.contactTag);}catch{}},30000);pollBank.unref();app.server.on('close',()=>clearInterval(pollBank));writeFileSync(DIR+'/Dashboard-Access.txt',app.token,{mode:0o600});app.server.listen(3000,'127.0.0.1',()=>console.log('Creditbro local dashboard: http://127.0.0.1:3000 (private access code saved locally)'));}
