import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp,createNotifier,inputSchema,details} from './server.mjs';

test('notification is plain text, deduplicated and bounded',async()=>{
 let calls=0,body;
 const notify=createNotifier({token:'test-token',chatId:'test-chat',fetcher:async(_url,opts)=>{calls++;body=JSON.parse(opts.body);return {ok:true,json:async()=>({ok:true})};}});
 const input={company:'Example Company (TEST)',position:'Senior Engineer (TEST)',focus:'ai'};
 assert.equal(await notify(input),'sent');
 assert.equal(await notify(input),'duplicate_suppressed');
 assert.equal(calls,1); assert.equal(body.parse_mode,undefined);
 assert.match(body.text,/Example Company/); assert.match(body.text,/unverified/);
 for(let i=0;i<29;i++) await notify({...input,company:`Example ${i}`});
 assert.equal(await notify({...input,company:'Over limit'}),'rate_limited');
});
test('failure does not leak secrets or block career details',async()=>{
 const notify=createNotifier({token:'secret',chatId:'secret',fetcher:async()=>{throw new Error('secret');}});
 assert.equal(await notify({company:'Test',position:'Test',focus:'general'}),'delivery_failed');
 assert.equal(details({focus:'ai'},'delivery_failed').candidate.links.email,'igor.shadurin@gmail.com');
});
test('input rejects missing, oversized and multiline context',()=>{
 for(const x of [{},{company:'x',position:'Test'},{company:'a'.repeat(161),position:'Test'},{company:'Test\nspoof',position:'Test'}]) assert.equal(inputSchema.safeParse(x).success,false);
});
test('HTTP MCP discovery, validation, tool call, resources and privacy',async()=>{
 let calls=0;
 const {app,close}=createApp({notify:async()=>{calls++;return 'sent';}});
 const srv=app.listen(0,'127.0.0.1'); await new Promise(r=>srv.once('listening',r));
 const base=`http://127.0.0.1:${srv.address().port}`;
 async function rpc(method,params={},modern=false){
  if(modern) params={...params,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientCapabilities':{}}};
  const r=await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream',...(modern?{'MCP-Protocol-Version':'2026-07-28','Mcp-Method':method}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  const t=await r.text(); return JSON.parse(t.startsWith('event:')? t.split('\n').find(l=>l.startsWith('data:')).slice(5):t);
 }
 try {
  assert.equal((await fetch(base+'/health')).status,200);
  const homepage=await (await fetch(base+'/')).text();
  assert.doesNotMatch(homepage,/Telegram/i);
  assert.match(homepage,/shared with Igor/);
  assert.match(await (await fetch(base+'/llms.txt')).text(),/Telegram/);
  assert.equal(calls,0);
  const list=await rpc('tools/list'); assert.equal(list.result.tools[0].name,'get_candidate_details');
  assert.equal(list.result.tools[0].annotations.readOnlyHint,false);
  const modern=await rpc('tools/list',{},true); assert.ok(modern.result?.tools,JSON.stringify(modern));
  await rpc('tools/call',{name:'get_candidate_details',arguments:{}});assert.equal(calls,0);
  const answer=await rpc('tools/call',{name:'get_candidate_details',arguments:{company:'Dummy Test',position:'Test Engineer',focus:'video'}});
  assert.equal(answer.result.structuredContent.notification,'sent');assert.equal(calls,1);
  assert.match(answer.result.structuredContent.candidate.links.linkedin,/linkedin/);
  assert.doesNotMatch(answer.result.structuredContent.experienceMarkdown,/grant|visa|8,900/i);
  const resource=await rpc('resources/read',{uri:'career://ihar-shaduryn/experience'});
  assert.match(resource.result.contents[0].text,/Ethereum Swarm/);assert.equal(calls,1);
  assert.equal((await fetch(base+'/mcp',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({x:'a'.repeat(20000)})})).status,400);
 }finally{await close();srv.closeAllConnections();await new Promise(r=>srv.close(r));}
});
