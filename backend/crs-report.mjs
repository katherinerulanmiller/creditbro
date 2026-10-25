import {RUNTIME_ROOT,SETTINGS_DIR} from './runtime-config.mjs';
// Official Cal Hacks portal sample only. Never accepts a real consumer identity.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomBytes,createCipheriv} from 'node:crypto';
const BASE='https://api-sandbox.stitchcredit.com/api';
const config={};for(const line of readFileSync(SETTINGS_DIR+'/CRS-Setup.txt','utf8').split(/\r?\n/)){if(line.startsWith('#')||!line.includes('='))continue;const i=line.indexOf('=');config[line.slice(0,i).trim()]=line.slice(i+1).trim().replace(/^['"]|['"]$/g,'');}
const persona=JSON.parse(readFileSync(new URL('./examples/crs-official-p03.json',import.meta.url)));
const request=persona.requests.find(r=>r.product==='credit_report'&&r.variant==='Equifax');
const sample=request.body;
async function post(path,body,token){const r=await fetch(BASE+path,{method:'POST',headers:{'content-type':'application/json',accept:'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(30000),redirect:'error'});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
try{
 const auth=await post('/users/login',{username:config.CRS_USERNAME,password:config.CRS_PASSWORD});if(!auth.token)throw Error('No token');
 const report=await post(request.path.replace('{config}',request.config),sample,auth.token);
 // Preserve the response encrypted for local normalization, never emit its values.
 const dir=RUNTIME_ROOT+'/imessage-state';mkdirSync(dir,{recursive:true,mode:0o700});const key=readFileSync(dir+'/key');const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);const encrypted=Buffer.concat([c.update(JSON.stringify(report)),c.final()]);writeFileSync(dir+'/crs-sample.enc',Buffer.concat([iv,c.getAuthTag(),encrypted]),{mode:0o600});
 const shape=(v,depth=0)=>depth>3?'…':Array.isArray(v)?{array_length:v.length,first:v.length?shape(v[0],depth+1):null}:v&&typeof v==='object'?Object.fromEntries(Object.entries(v).slice(0,70).map(([k,x])=>[k,shape(x,depth+1)])):typeof v;
 console.log(JSON.stringify({received_json:true,source:'Official CRS P03 Equifax sandbox persona',shape:shape(report)}));
}catch(e){console.log(JSON.stringify({received_json:false,status:/^HTTP \d+$/.test(e.message)?e.message:'request_unavailable'}));process.exitCode=1;}
