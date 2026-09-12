import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {openSimulation} from '../src/simulation.mjs';
test('confirmed plans survive database restart but expire and cannot cross sessions',()=>{
 const dir=mkdtempSync(join(tmpdir(),'lp-plan-'));let now=1000000,db=openSimulation(join(dir,'db'),{clock:()=>now});
 try{const id=db.create(),other=db.create();const send=(action,args={})=>db.command(id,{action,requestId:randomUUID(),...args});
 const policy={maxCapital:100000,maxFee:500,maxDaily:10,maxSlippageBps:100,expiresInMinutes:60,automatic:false};
 const draft={amount:80000,lower:2700,upper:3300,reason:'fixture'};
 send('POLICY',policy);send('DRAFT',draft);send('CONFIRM_PLAN',{version:1});
 db.close();db=openSimulation(join(dir,'db'),{clock:()=>now});assert.equal(db.get(id).plan.status,'CONFIRMED');assert.equal(db.get(other).plan,undefined);
 assert.throws(()=>db.command(other,{action:'CONFIRM_PLAN',version:1,requestId:randomUUID()}),/version/);
 now+=300001;assert.throws(()=>send('EXECUTE_PLAN',{version:1}),/expired/);
 send('DRAFT',draft);send('CONFIRM_PLAN',{version:2});send('POLICY',policy);assert.throws(()=>send('EXECUTE_PLAN',{version:2}),/policy changed/);
 send('DRAFT',draft);send('CONFIRM_PLAN',{version:3});send('REVOKE');assert.throws(()=>send('EXECUTE_PLAN',{version:3}));assert.equal(db.get(id).job,null);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
