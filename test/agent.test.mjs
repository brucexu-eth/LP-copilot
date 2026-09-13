import test from 'node:test';import assert from 'node:assert/strict';
import {createAgent} from '../src/agent.mjs';
import {analyze,learningPosition} from '../src/math.mjs';
import {createRequire} from 'node:module';
const {TickMath}=createRequire(import.meta.url)('@uniswap/v3-sdk');
const state={fee:3000,blockNumber:'123',sqrtPriceX96:TickMath.getSqrtRatioAtTick(196200).toString(),tick:196200,liquidity:'1000000000000000000'};
const fixture={state,result:analyze(state,learningPosition(state)),history:{status:'mock',synthetic:true}};
const env={DEEPSEEK_API_KEY:'test-secret'};
const call={id:'call1',type:'function',function:{name:'compare_position',arguments:'{"mode":"learning","tokenId":""}'}};
function response(message,finish_reason='stop'){return new Response(JSON.stringify({choices:[{message,finish_reason}]}),{status:200});}
test('agent runs bounded real-shaped tool protocol and preserves mock provenance',async()=>{
 const requests=[];const a=createAgent({env,compare:async()=>fixture,fetcher:async(url,r)=>{requests.push(JSON.parse(r.body));return requests.length===1?response({role:'assistant',tool_calls:[call],content:null}):response({role:'assistant',content:JSON.stringify({focus:['inventory','history'],questions:['capital']})});}});
 const r=await a.run('Compare this position');assert.equal(r.syntheticHistory,true);assert.match(r.answer,/0\.3%/);assert.match(r.answer,/converts WETH into USDC/);assert.equal(r.reportVersion,1);assert.equal(r.execution,'disabled');assert.equal(requests[1].messages.at(-1).role,'tool');assert.deepEqual(requests[0].tool_choice,{type:'function',function:{name:'compare_position'}});assert.ok(!JSON.stringify(r).includes(env.DEEPSEEK_API_KEY));
});
test('missing key, arbitrary tool, invalid arguments, empty answer and provider leakage fail closed',async()=>{
 await assert.rejects(createAgent({env:{}}).run('q'),{status:503});
 for(const message of [{content:'ungrounded'}, {tool_calls:[{...call,function:{name:'send_transaction',arguments:'{}'}}]}, {tool_calls:[{...call,function:{name:'compare_position',arguments:'{"mode":"learning","tokenId":"","url":"evil"}'}}]}, {content:null}]){
  const a=createAgent({env,compare:()=>{throw Error('unexpected');},fetcher:async()=>response(message)});await assert.rejects(a.run('q'),{status:503});
 }
 const a=createAgent({env,fetcher:async()=>{throw Error('test-secret');}});await assert.rejects(a.run('q'),e=>e.status===503&&!e.message.includes('test-secret'));
});

test('reject model prose and invented report fields after a tool call',async()=>{
 for(const content of ['Pool fee is 0.05%',JSON.stringify({focus:['inventory'],questions:[],fee:'0.05%'}),JSON.stringify({focus:['invented'],questions:[]})]){
 let count=0;const a=createAgent({env,compare:async()=>fixture,fetcher:async()=>++count===1?response({tool_calls:[call]}):response({content})});
 await assert.rejects(a.run('q'),{status:503});
 }
});

import {parseResearchSelection} from '../src/research-report.mjs';
test('provider-appended prose is discarded, never rendered',()=>{const v=parseResearchSelection('{"focus":["inventory"],"questions":[]}\nPool fee is 0.05%');assert.deepEqual(v,{focus:['inventory'],questions:[]});});

test('invalid selection is retried without repeating the evidence read',async()=>{
 let requests=0,reads=0;
 const a=createAgent({env,compare:async()=>{reads++;return fixture;},fetcher:async(_url,r)=>{
  const body=JSON.parse(r.body);requests++;
  if(requests===1)return response({tool_calls:[call]});
  assert.equal(body.tool_choice,'none');
  return response({content:requests===2?'Invalid prose':JSON.stringify({focus:['inventory'],questions:[]})});
 }});
 const result=await a.run('What happens if ETH falls?');
 assert.equal(requests,3);assert.equal(reads,1);assert.equal(result.reportVersion,1);assert.ok(!result.answer.includes('Invalid prose'));
});
