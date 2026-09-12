import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openSimulation} from '../src/simulation.mjs';
test('proposal revision approval is exact, one-shot and policy-bound',()=>{
 const db=openSimulation(':memory:');try{
 const id=db.create(),send=(action,args={})=>db.command(id,{requestId:randomUUID(),action,...args});
 send('FUND',{amount:100000});db.tick();db.tick();
 send('POLICY',{maxCapital:100000,maxFee:500,maxDaily:10,maxSlippageBps:100,expiresInMinutes:60,automatic:false});
 const draft={amount:80000,lower:2700,upper:3300,reason:'Manual research note — not verified evidence'};
 send('DRAFT',draft);send('CONFIRM_PLAN',{version:1});send('DRAFT',{...draft,amount:70000});
 assert.throws(()=>send('EXECUTE_PLAN',{version:1}),/version|confirm/);
 assert.throws(()=>send('EXECUTE_PLAN',{version:2}),/confirm/);
 send('CONFIRM_PLAN',{version:2});send('EXECUTE_PLAN',{version:2});
 assert.throws(()=>send('EXECUTE_PLAN',{version:2}),/confirm/);
 db.tick();db.tick();db.tick();assert.equal(db.get(id).deployed,70000);
 assert.deepEqual(db.get(id).range,{lower:2700,upper:3300});
 assert.equal(db.get(id).plan.realExecution,false);
 assert.equal(db.get(id).job.planVersion,2);
 }finally{db.close();}
});
