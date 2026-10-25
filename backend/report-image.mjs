import {prepareReport} from './report-layout.mjs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const PYTHON=process.env.CREDITBRO_PYTHON||'python3';
export function reportOutbox(id,report,jobId,scheduledFor){
 const shared={...(jobId?{jobId,scheduledFor}:{}),...(report.access_stamp?{bankAccess:report.access_stamp}:{})};
 const caption=report.source==='student_reported'?'Here’s the breakdown from the totals you shared. It may not include all your spending.':'Here’s your spending breakdown (sample data). These are fictional totals, not your accounts.';
 // Disclose synthetic data before the image, since the v7 image has no badge.
 return [{id:id+'-caption',...shared,text:caption,status:'queued'},{id:id+'-chart',...shared,disclosureId:report.source==='student_reported'?null:id+'-caption',kind:'spending_chart',report,text:report.text,status:'queued'}];
}
export function reportDisclosureReady(state,item){return !item.disclosureId||state.outbox.some(o=>o.id===item.disclosureId&&['accepted','delivered'].includes(o.status));}
export async function renderReport(report){report=prepareReport(report);return new Promise((resolve,reject)=>{
 const child=spawn(PYTHON,[fileURLToPath(new URL('./render_report.py',import.meta.url))],{stdio:['pipe','pipe','pipe']});let bytes=0;const chunks=[];let failed=false;
 const timer=setTimeout(()=>{failed=true;child.kill();reject(Error('Report rendering timed out'));},15000);
 child.stdout.on('data',b=>{bytes+=b.length;if(bytes>2*1024*1024){failed=true;child.kill();reject(Error('Report too large'));}else chunks.push(b)});
 child.stderr.resume();child.on('error',()=>{clearTimeout(timer);reject(Error('Report renderer unavailable'))});
 child.on('close',code=>{clearTimeout(timer);if(failed)return;const data=Buffer.concat(chunks);if(code!==0||!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))reject(Error('Invalid report image'));else resolve(data)});
 child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(report));
});}
export async function sendReportImage({password,chatGuid,tempGuid,png},fetcher=fetch){
 if(!chatGuid||!password||!tempGuid||!Buffer.isBuffer(png)||png.length>2*1024*1024)throw Error('Invalid image request');
 const u=new URL('http://127.0.0.1:1234/api/v1/message/attachment');u.searchParams.set('password',password);
 const form=new FormData();form.set('chatGuid',chatGuid);form.set('tempGuid',tempGuid);form.set('method','apple-script');form.set('name','creditbro-weekly-spending.png');form.set('attachment',new Blob([png],{type:'image/png'}),'creditbro-weekly-spending.png');
 // Let the runtime supply the multipart boundary. No path, contact or report data is logged.
 const r=await fetcher(u,{method:'POST',body:form,signal:AbortSignal.timeout(90000),redirect:'error'});
 if(!r.ok)throw Error('Image send unavailable');const body=await r.json();if(!body.data?.guid||body.data.error)throw Error('Image send not confirmed');return body;
}
