import {mkdir,writeFile} from 'node:fs/promises';
import {readPool,readPosition,readHistory} from '../src/data.mjs';
import {analyze,learningPosition} from '../src/math.mjs';
const evidence={at:new Date().toISOString(),kind:'live-read-only'};
try {
 const state=await readPool();const position=process.env.SAMPLE_TOKEN_ID?await readPosition(process.env.SAMPLE_TOKEN_ID,state):learningPosition(state);
 Object.assign(evidence,{state,position,analysis:analyze(state,position),history:await readHistory(state),rpc:'verified',execution:'not implemented; no transactions sent'});
 console.log(JSON.stringify(evidence,null,2));
} catch(e) {evidence.rpc='blocked';evidence.error=e.shortMessage||'Live verification failed; check RPC availability and freshness.';console.error(JSON.stringify(evidence,null,2));process.exitCode=1;}
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});await writeFile(new URL('../artifacts/live-verification.json',import.meta.url),JSON.stringify(evidence,null,2));
