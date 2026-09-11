import test from 'node:test';import assert from 'node:assert/strict';
import {mockHistory,historyFor,historyMode,requireLiveEvidence} from '../src/history.mjs';
test('mock is opt-in, stable, visibly synthetic and never execution eligible',async()=>{
 assert.equal(historyMode({}),'live');assert.throws(()=>historyMode({GRAPH_MODE:'fake'}));
 const h=await historyFor({}, {env:{GRAPH_MODE:'mock'},live:()=>{throw Error('must not query');}});
 assert.deepEqual(h,mockHistory());assert.equal(h.status,'mock');assert.equal(h.synthetic,true);assert.equal(h.blockNumber,null);assert.match(h.message,/invented/);assert.throws(()=>requireLiveEvidence(h));
});
test('live failures cannot silently become mock history',async()=>{
 const h=await historyFor({}, {env:{},live:async()=>({status:'unavailable'})});assert.equal(h.status,'unavailable');assert.throws(()=>requireLiveEvidence(h));assert.throws(()=>requireLiveEvidence({status:'verified',synthetic:true}));requireLiveEvidence({status:'verified'});
});
