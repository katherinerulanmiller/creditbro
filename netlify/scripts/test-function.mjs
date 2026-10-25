import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
const dir=await mkdtemp(join(tmpdir(),'creditbro-netlify-test-'));
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
try{
 await writeFile(join(dir,'voice.mjs'),compile(await readFile('src/lib/voice.ts','utf8')));
 await writeFile(join(dir,'chat.mjs'),compile((await readFile('netlify/functions/chat.ts','utf8')).replace('../../src/lib/voice','./voice.mjs')));
 const {default:handler}=await import('file://'+join(dir,'chat.mjs'));
 const originalFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({content:[{type:'text',text:'A short fictional reply.'}],stop_reason:'end_turn'})};
 const oldKey=process.env.ANTHROPIC_API_KEY,oldModel=process.env.ANTHROPIC_MODEL;
 try{
  delete process.env.ANTHROPIC_API_KEY;delete process.env.ANTHROPIC_MODEL;
  const request=(body,origin='https://example.test')=>new Request('https://example.test/api/chat',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await handler(new Request('https://example.test/api/chat'))).status,405);
  assert.equal((await handler(request({}))).status,503);
  process.env.ANTHROPIC_API_KEY='fictional-test-key';process.env.ANTHROPIC_MODEL='test-model';
  assert.equal((await handler(request({},'https://other.test'))).status,403);
  assert.equal((await handler(request({messages:[{role:'user',content:'What is credit?'}]}))).status,400);
  assert.equal((await handler(request({consent:true,messages:[{role:'user',content:'x'.repeat(2001)}]}))).status,400);
  assert.equal(calls,0);
  const response=await handler(request({consent:true,messages:[{role:'user',content:'What is credit?'}]}));
  assert.equal(response.status,200);assert.equal((await response.json()).reply,'A short fictional reply');assert.equal(calls,1);
  console.log('Function checks passed: method, setup, origin, consent, size, and mocked model reply. No network calls.');
 }finally{globalThis.fetch=originalFetch;for(const [k,v] of [['ANTHROPIC_API_KEY',oldKey],['ANTHROPIC_MODEL',oldModel]])if(v===undefined)delete process.env[k];else process.env[k]=v;}
}finally{await rm(dir,{recursive:true,force:true})}
