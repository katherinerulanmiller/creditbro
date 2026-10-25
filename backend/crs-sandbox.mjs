import {RUNTIME_ROOT,SETTINGS_DIR} from './runtime-config.mjs';
// Credentials and token stay in this process. No response bodies are logged or saved.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const CONFIG=SETTINGS_DIR+'/CRS-Setup.txt';
export async function verifySandbox(config,fetcher=fetch){
 if(!config.CRS_USERNAME||!config.CRS_PASSWORD)return {authenticated:false,status:'credentials_missing'};
 try{
  const response=await fetcher('https://api-sandbox.stitchcredit.com/api/users/login',{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({username:config.CRS_USERNAME,password:config.CRS_PASSWORD}),redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok)return {authenticated:false,status:'login_rejected',http_status:response.status};
  const result=await response.json();
  return typeof result.token==='string'&&result.token.length>0?{authenticated:true,status:'sandbox_authenticated',reports_retrieved:0}:{authenticated:false,status:'no_usable_token'};
 }catch{return {authenticated:false,status:'connection_unavailable'};}
}
export async function run(){
 const config={};try{for(const line of readFileSync(CONFIG,'utf8').split(/\r?\n/)){if(line.startsWith('#')||!line.includes('='))continue;const i=line.indexOf('=');config[line.slice(0,i).trim()]=line.slice(i+1).trim().replace(/^['"]|['"]$/g,'');}}catch{}
 const status={...await verifySandbox(config),checkedAt:Date.now(),environment:'sandbox',report_access_verified:false,identity_verified:false};
 const dir=RUNTIME_ROOT+'/imessage-state';mkdirSync(dir,{recursive:true,mode:0o700});writeFileSync(dir+'/crs-status.json',JSON.stringify(status),{mode:0o600});console.log(JSON.stringify(status));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)run();
