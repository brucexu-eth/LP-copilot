import {createAgent} from '../src/agent.mjs';
import {readPool,readPosition} from '../src/data.mjs';
import {historyFor} from '../src/history.mjs';
import {analyze,learningPosition} from '../src/math.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const agent=createAgent({compare:async({mode,tokenId})=>{
 const state=await readPool();const position=mode==='nft'?await readPosition(tokenId,state):learningPosition(state);
 return {state,result:analyze(state,position),history:await historyFor(state),execution:'disabled'};
}});
const result=await agent.run('Investigate the hypothetical learning position. Compare HOLD, WIDEN and EXIT when ETH falls. Describe history provenance and verification limits, cite the RPC block, and do not execute transactions.');
if(result.reportVersion!==1||!result.evidence.length||result.plans.length!==3||result.plans.some(p=>p.execution!=='disabled'||p.source!=='SERVER_TOOL_EVIDENCE')||result.execution!=='disabled')throw Error('Missing evidence');
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
await writeFile(new URL('../artifacts/agent-live.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({model:result.model,toolCalls:result.calls.length,blocks:result.evidence.map(e=>e.state.blockNumber),history:result.evidence.map(e=>e.history.status),answer:result.answer,execution:result.execution}));
