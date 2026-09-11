import {createAgent} from '../src/agent.mjs';
import {readPool,readPosition} from '../src/data.mjs';
import {historyFor} from '../src/history.mjs';
import {analyze,learningPosition} from '../src/math.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const agent=createAgent({compare:async({mode,tokenId})=>{
 const state=await readPool();const position=mode==='nft'?await readPosition(tokenId,state):learningPosition(state);
 return {state,result:analyze(state,position),history:await historyFor(state),execution:'disabled'};
}});
const result=await agent.run('请调查当前学习仓位：如果 ETH 继续下跌，保留区间、扩大区间、退出持有两种代币分别会怎样？请明确标记 mock 历史，引用真实 RPC block，不提出资金操作。');
if(!result.evidence.length||result.execution!=='disabled')throw Error('Missing evidence');
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
await writeFile(new URL('../artifacts/agent-live.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({model:result.model,toolCalls:result.calls.length,blocks:result.evidence.map(e=>e.state.blockNumber),history:result.evidence.map(e=>e.history.status),answer:result.answer,execution:result.execution}));
