import test from 'node:test';import assert from 'node:assert/strict';
import {createAgent} from '../src/agent.mjs';
const env={DEEPSEEK_API_KEY:'test-secret'};
const call={id:'call1',type:'function',function:{name:'compare_position',arguments:'{"mode":"learning","tokenId":""}'}};
function response(message,finish_reason='stop'){return new Response(JSON.stringify({choices:[{message,finish_reason}]}),{status:200});}
test('agent runs bounded real-shaped tool protocol and preserves mock provenance',async()=>{
 const requests=[];const a=createAgent({env,compare:async()=>({history:{status:'mock',synthetic:true},block:123}),fetcher:async(url,r)=>{requests.push(JSON.parse(r.body));return requests.length===1?response({role:'assistant',tool_calls:[call],content:null}):response({role:'assistant',content:'MOCK history; no trade.'});}});
 const r=await a.run('Compare this position');assert.equal(r.syntheticHistory,true);assert.equal(r.execution,'disabled');assert.equal(requests[1].messages.at(-1).role,'tool');assert.equal(requests[0].tool_choice,'required');assert.ok(!JSON.stringify(r).includes(env.DEEPSEEK_API_KEY));
});
test('missing key, arbitrary tool, invalid arguments, empty answer and provider leakage fail closed',async()=>{
 await assert.rejects(createAgent({env:{}}).run('q'),{status:503});
 for(const message of [{content:'ungrounded'}, {tool_calls:[{...call,function:{name:'send_transaction',arguments:'{}'}}]}, {tool_calls:[{...call,function:{name:'compare_position',arguments:'{"mode":"learning","tokenId":"","url":"evil"}'}}]}, {content:null}]){
  const a=createAgent({env,compare:()=>{throw Error('unexpected');},fetcher:async()=>response(message)});await assert.rejects(a.run('q'),{status:503});
 }
 const a=createAgent({env,fetcher:async()=>{throw Error('test-secret');}});await assert.rejects(a.run('q'),e=>e.status===503&&!e.message.includes('test-secret'));
});
