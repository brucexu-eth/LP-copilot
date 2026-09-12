import test from 'node:test';import assert from 'node:assert/strict';import {researchPlans} from '../src/research-plans.mjs';
test('structured candidates preserve evidence provenance without inventing capital or authority',()=>{
 const plans=researchPlans([{history:{synthetic:true},result:{position:{kind:'hypothetical'},candidates:[{action:'WIDEN',label:'Widen',range:{low:2000,high:4000},explanation:'Same inventory'},{action:'EXIT',range:null}]}}]);
 assert.equal(plans.length,2);assert.equal(plans[0].source,'SERVER_TOOL_EVIDENCE');assert.equal(plans[0].syntheticHistory,true);assert.equal(plans[0].amount,null);assert.equal(plans[0].execution,'disabled');assert.equal(plans[1].range,null);
});
test('missing evidence and invalid range never get replacement fixtures',()=>{
 assert.deepEqual(researchPlans([]),[]);assert.deepEqual(researchPlans([{}]),[]);assert.deepEqual(researchPlans([{result:{candidates:[{action:'WIDEN',range:{low:4,high:2}},{action:'SEND'}]}}]),[]);
});
