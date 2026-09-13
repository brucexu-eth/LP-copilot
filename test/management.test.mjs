import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {createRequire} from 'node:module';
import {encodeFunctionData,parseAbi} from 'viem';
import {compareManagedPosition,managementGate} from '../src/management-math.mjs';
import {createManagement} from '../src/management.mjs';
import {boundedPlanPolicy} from '../src/managed-signer.mjs';
import {NETWORK} from '../src/testnet.mjs';
const {TickMath}=createRequire(import.meta.url)('@uniswap/v3-sdk');
const state={sqrtPriceX96:TickMath.getSqrtRatioAtTick(196200).toString(),tick:196200,liquidity:'1000000000000000000',price:3000,blockNumber:'123'};
const position={tokenId:'1',tickLower:195000,tickUpper:197400,liquidity:'1000000000000'};
const account={userId:'user',wallets:[{address:'0x1111111111111111111111111111111111111111'}]},wallet=account.wallets[0].address;
const graph={status:'verified',chainId:84532,hashVerified:true};
const model=async()=>({action:'HOLD',reason:'costs',explanation:'Costs unknown',rounds:1});
const fake={state:async()=>({network:NETWORK,state,positions:[position]})};
test('managed scenarios retain HOLD and exclude unearned fees',()=>{const a=compareManagedPosition(state,position);assert.deepEqual(a.scenarios.map(s=>s.action),['HOLD','WIDEN','EXIT']);for(const s of a.scenarios)assert.ok(s.rows.every(r=>Number.isFinite(r.valueUsdc)&&r.valueUsdc>=0));assert.ok(a.excludes.includes('gas'));});
test('same-chain evidence and current authority are mandatory',()=>{const a=compareManagedPosition(state,position),m={status:'WATCHING',tokenId:'1',expiresAt:Date.now()+10000,operations:0,maxOperations:1};assert.equal(managementGate(m,a,graph),null);assert.match(managementGate(m,a,{...graph,chainId:1}),/Graph/);assert.match(managementGate({...m,status:'REVOKED'},a,graph),/paused/);assert.match(managementGate({...m,operations:1},a,graph),/limit/);});
test('monitor persists history, skips unchanged data and honors pause/revoke',async()=>{let calls=0;const db=new Database(':memory:'),m=createManagement({testnet:fake,database:db,graph:async()=>graph,judge:async()=>{calls++;return model();}});try{const p=await m.create(account,{wallet,tokenId:'1'});await m.assess(account,p.id,{force:true});await m.assess(account,p.id);assert.equal(calls,1);assert.equal(m.list(account)[0].assessments.length,1);await m.change(account,p.id,'PAUSE');await assert.rejects(m.assess(account,p.id),/Resume/);await m.change(account,p.id,'REVOKE');await assert.rejects(m.change(account,p.id,'RESUME'),/revoked/);}finally{m.close();}});
test('pause during model work is not overwritten by completion',async()=>{let release;const wait=new Promise(r=>release=r),db=new Database(':memory:'),m=createManagement({testnet:fake,database:db,graph:async()=>graph,judge:async()=>{await wait;return model();}});try{const p=await m.create(account,{wallet,tokenId:'1'}),job=m.assess(account,p.id,{force:true});await m.change(account,p.id,'PAUSE');release();await job.catch(()=>{});assert.equal(m.list(account)[0].status,'PAUSED');}finally{m.close();}});
test('exact signer policies cap approvals and never allow arbitrary calls',()=>{const abi=parseAbi(['function approve(address spender,uint256 amount) returns(bool)']);const plan={id:'test-plan',chainId:84532,wallet,deadline:Math.floor(Date.now()/1000)+300,calls:[{label:'Approve exactly 2 test USDC with an intentionally long display label',to:NETWORK.usdc,value:'0',data:encodeFunctionData({abi,functionName:'approve',args:[NETWORK.manager,2000000n]})}]};const p=boundedPlanPolicy(account,plan);assert.equal(p.owner.user_id,'user');assert.ok(p.name.length<50);assert.ok(p.rules.every(r=>r.name.length<50));assert.ok(p.rules[0].conditions.some(c=>c.field==='approve.amount'&&c.value==='2000000'));assert.ok(p.rules[0].conditions.some(c=>c.field==='current_unix_timestamp'));assert.throws(()=>boundedPlanPolicy(account,{...plan,chainId:1}));assert.throws(()=>boundedPlanPolicy(account,{...plan,calls:[{...plan.calls[0],data:encodeFunctionData({abi,functionName:'approve',args:[NETWORK.manager,2n**255n]})}]}));});

test('chat management commands cannot smuggle amounts or signing actions',async()=>{
 const {validateChatPatch}=await import('../src/terminal-chat.mjs');
 for(const action of ['SIMULATE','WATCH','CHECK','PAUSE'])assert.equal(validateChatPatch({action}).action,action);
 assert.throws(()=>validateChatPatch({action:'SIGN'}));
 assert.throws(()=>validateChatPatch({action:'WATCH',privateKey:'x'}));
});

test('missing same-chain Graph prevents a reposition plan from being created',async()=>{
 let plans=0;const db=new Database(':memory:'),m=createManagement({testnet:{...fake,repositionPlan:async()=>{plans++;}},database:db,graph:async()=>({status:'not_configured',chainId:84532,hashVerified:false}),judge:model});
 try{const p=await m.create(account,{wallet,tokenId:'1'});await assert.rejects(m.proposal(account,p.id),/Graph/);assert.equal(plans,0);}finally{m.close();}
});

test('one-time managed execution records receipts, destroys the key and cannot restart',async()=>{
 let plan={id:'one-plan',calls:[{label:'Managed step',status:'not_sent'}]},sent=0,destroyed=0;
 const db=new Database(':memory:'),t={...fake,repositionPlan:async()=>plan,reconcile:async()=>structuredClone(plan),prepare:async()=>({estimatedGasEth:'0.000001'}),intent:async()=>{plan.calls[0].status='awaiting_wallet';return structuredClone(plan);},record:async(_a,_id,_i,hash)=>{plan.calls[0]={...plan.calls[0],hash,status:'confirmed',gasWei:'1000000000000'};return structuredClone(plan);}};
 const signer={prepare:async()=>({expiresAt:Date.now()+60000}),verify:async()=>true,send:async()=>{sent++;return '0xreceipt';},destroy:()=>destroyed++};
 const m=createManagement({testnet:t,database:db,graph:async()=>graph,judge:model,signer});
 try{const p=await m.create(account,{wallet,tokenId:'1'});await m.proposal(account,p.id);await m.configureSigner(account,p.id);await assert.rejects(m.proposal(account,p.id),/previous signer/);await m.activate(account,p.id);await assert.rejects(m.activate(account,p.id),/already been activated/);await m.advance(account,p.id);await m.advance(account,p.id);await m.advance(account,p.id);assert.equal(sent,1);assert.equal(destroyed,1);assert.equal(m.list(account)[0].status,'COMPLETED');assert.equal(m.list(account)[0].operations,1);await m.change(account,p.id,'PAUSE');await m.signerRemoved(account,p.id);assert.equal(m.list(account)[0].status,'COMPLETED');}finally{m.close();}
});

test('AI authority waits on HOLD and queues only the approved WIDEN plan',async()=>{
 let decision='HOLD';const db=new Database(':memory:');
 const signer={prepare:async()=>({expiresAt:Date.now()+60000}),verify:async()=>true,destroy:()=>{}};
 const m=createManagement({testnet:{...fake,repositionPlan:async()=>({id:'armed-plan',calls:[]})},database:db,graph:async()=>graph,judge:async()=>({action:decision,reason:'range',explanation:'Range assessment',rounds:1}),signer});
 try{const p=await m.create(account,{wallet,tokenId:'1'});await m.proposal(account,p.id);await m.configureSigner(account,p.id);await m.activate(account,p.id,'AI');await m.assess(account,p.id,{force:true});assert.equal(m.list(account)[0].job.status,'ARMED');decision='EXIT';await m.assess(account,p.id,{force:true});assert.equal(m.list(account)[0].job.status,'ARMED');decision='WIDEN';await m.assess(account,p.id,{force:true});assert.equal(m.list(account)[0].job.status,'QUEUED');}finally{m.close();}
});

test('removing access from a paused session permits a new session',async()=>{const db=new Database(':memory:'),m=createManagement({testnet:fake,database:db,graph:async()=>graph,judge:model,signer:{destroy:()=>{}}});try{const p=await m.create(account,{wallet,tokenId:'1'});await m.change(account,p.id,'PAUSE');await m.signerRemoved(account,p.id);assert.equal(m.list(account)[0].status,'REVOKED');const next=await m.create(account,{wallet,tokenId:'1'});assert.notEqual(next.id,p.id);}finally{m.close();}});

test('provider policy rejection pauses and preserves a clear recovery reason',async()=>{
 let plan={id:'rejected-plan',calls:[{label:'Mint',status:'not_sent'}]};const db=new Database(':memory:');
 const t={...fake,repositionPlan:async()=>plan,reconcile:async()=>structuredClone(plan),prepare:async()=>({estimatedGasEth:'0.000001'}),intent:async()=>{plan.calls[0].status='awaiting_wallet';return structuredClone(plan);}};
 const signer={prepare:async()=>({expiresAt:Date.now()+60000}),verify:async()=>true,send:async()=>{throw Object.assign(Error('Provider response'),{status:400,error:{code:'policy_violation'}});},destroy:()=>{}};
 const m=createManagement({testnet:t,database:db,graph:async()=>graph,judge:model,signer});try{const p=await m.create(account,{wallet,tokenId:'1'});await m.proposal(account,p.id);await m.configureSigner(account,p.id);await m.activate(account,p.id);await m.advance(account,p.id);const result=m.list(account)[0];assert.equal(result.status,'PAUSED');assert.equal(result.job.failure,'POLICY_REJECTED');assert.match(result.events.at(-1).detail,/owner wallet/);}finally{m.close();}
});

test('server pins full mint calldata including provider-unsupported small integers',async()=>{
 const {assertGrantedCall}=await import('../src/managed-signer.mjs');const {keccak256}=await import('viem');const {executionAbi}=await import('../src/transactions.mjs');
 const params={token0:NETWORK.usdc,token1:NETWORK.weth,fee:500,tickLower:198710,tickUpper:201610,amount0Desired:2000000n,amount1Desired:1000000000000000n,amount0Min:1900000n,amount1Min:900000000000000n,recipient:wallet,deadline:BigInt(Math.floor(Date.now()/1000)+300)};
 const data=encodeFunctionData({abi:executionAbi,functionName:'mint',args:[params]}),plan={id:'pinned-mint',chainId:84532,wallet,deadline:Number(params.deadline),calls:[{label:'Mint',to:NETWORK.manager,value:'0',data}]};
 const grant={planId:plan.id,calls:[{to:NETWORK.manager.toLowerCase(),value:'0',dataHash:keccak256(data)}]};assert.doesNotThrow(()=>assertGrantedCall(grant,plan,0));
 for(const patch of [{fee:3000},{tickLower:198700},{tickUpper:201620},{recipient:NETWORK.manager},{amount0Desired:2000001n}])assert.throws(()=>assertGrantedCall(grant,{...plan,calls:[{...plan.calls[0],data:encodeFunctionData({abi:executionAbi,functionName:'mint',args:[{...params,...patch}]})}]},0),/differs/);
 const policy=boundedPlanPolicy(account,plan);assert.ok(!policy.rules[0].conditions.some(c=>/\.(fee|tickLower|tickUpper)$/.test(c.field)));assert.ok(policy.rules[0].conditions.some(c=>c.field==='mint.params0.amount0Desired'&&c.value==='2000000'));
});

test('refreshing advice during reposition does not pause a temporarily closed source position',async()=>{
 let closed=false,reads=0,judgements=0;const db=new Database(':memory:');
 const t={state:async()=>{reads++;return {network:NETWORK,state,positions:[{...position,liquidity:closed?'0':position.liquidity}]};},repositionPlan:async()=>({id:'in-flight',calls:[]})};
 const m=createManagement({testnet:t,database:db,graph:async()=>graph,judge:async()=>{judgements++;return model();},signer:{prepare:async()=>({expiresAt:Date.now()+60000}),verify:async()=>true,destroy:()=>{}}});
 try{const p=await m.create(account,{wallet,tokenId:'1'});await m.proposal(account,p.id);await m.configureSigner(account,p.id);await m.activate(account,p.id);closed=true;const before=reads;
 for(const status of ['QUEUED','RUNNING']){const record=JSON.parse(db.prepare('SELECT body FROM mandates WHERE id=?').get(p.id).body);record.job.status=status;db.prepare('UPDATE mandates SET body=? WHERE id=?').run(JSON.stringify(record),p.id);const result=await m.assess(account,p.id,{force:true});assert.equal(result.execution,'in_progress');assert.equal(m.list(account)[0].status,'WATCHING');}
 assert.equal(reads,before);assert.equal(judgements,0);await m.change(account,p.id,'PAUSE');await assert.rejects(m.assess(account,p.id,{force:true}),/Resume/);
 }finally{m.close();}
});

test('owner-requested deposit uses one authorization and the existing guarded worker',async()=>{
 let sends=0,prepares=0,graphs=0;let p={id:'manual-deposit',action:'ENTER',wallet,chainId:84532,deadline:Math.floor(Date.now()/1000)+300,details:{usdc:'1',weth:'0.001'},calls:[{label:'Approve USDC'},{label:'Mint'}]};
 const db=new Database(':memory:'),t={getPlan:()=>structuredClone(p),prepare:async()=>{prepares++;return {estimatedGasEth:'0.000001'};},reconcile:async()=>structuredClone(p),intent:async(_a,_id,i)=>{p.calls[i].status='awaiting_wallet';return structuredClone(p);},record:async(_a,_id,i,hash)=>{p.calls[i]={...p.calls[i],hash,status:'confirmed',gasWei:'1000000000000'};return structuredClone(p);}};
 const m=createManagement({testnet:t,database:db,graph:async()=>{graphs++;return graph;},signer:{prepare:async()=>({expiresAt:Date.now()+60000}),verify:async()=>true,send:async()=>`0x${++sends}`,destroy:()=>{}},judge:async()=>{throw Error('Manual execution must not invoke AI');}});
 try{const a=await m.authorizeOperation(account,p.id);assert.equal(a.executionOnly,true);assert.equal((await m.authorizeOperation(account,p.id)).id,a.id);await m.activate(account,a.id);await m.advance(account,a.id);await m.assess(account,a.id,{force:true});await m.advance(account,a.id);await m.advance(account,a.id);assert.equal(sends,2);assert.equal(graphs,3);assert.equal(m.list(account)[0].status,'COMPLETED');assert.equal(m.list(account)[0].operations,1);assert.ok(prepares>=3);}finally{m.close();}
});
test('one-confirmation operation preserves Graph and token limits',async()=>{
 let p={id:'blocked-deposit',action:'ENTER',wallet,deadline:Math.floor(Date.now()/1000)+300,details:{usdc:'1',weth:'0.001'},calls:[{}]},grants=0;const db=new Database(':memory:'),m=createManagement({database:db,testnet:{getPlan:()=>p},graph:async()=>({status:'syncing'}),signer:{prepare:async()=>{grants++;}},judge:model});
 try{await assert.rejects(m.authorizeOperation(account,p.id),/Graph/);p.details.usdc='6';await assert.rejects(m.authorizeOperation(account,p.id),/at most 5/);assert.equal(grants,0);p.discardedAt=new Date().toISOString();await assert.rejects(m.authorizeOperation(account,p.id),/fresh unsigned/);}finally{m.close();}
});

test('demo signals remain labeled, require an armed plan and cannot bypass AI HOLD or live Graph checks',async()=>{
 let decision='HOLD',verified=true,seen;const db=new Database(':memory:');const signer={prepare:async()=>({expiresAt:Date.now()+60000}),verify:async()=>true,destroy:()=>{}};
 const m=createManagement({testnet:{...fake,repositionPlan:async()=>({id:'demo-plan',calls:[]})},database:db,graph:async()=>verified?graph:{...graph,status:'stale'},judge:async a=>{seen=a;return {action:decision,reason:'range',explanation:'demo',rounds:1};},signer});
 try{const p=await m.create(account,{wallet,tokenId:'1'});await assert.rejects(m.assess(account,p.id,{force:true,demo:true}),/armed/);await m.proposal(account,p.id);await m.configureSigner(account,p.id);await m.activate(account,p.id,'AI');await m.assess(account,p.id,{force:true,demo:true});assert.equal(seen.demo,true);assert.equal(seen.inRange,false);assert.equal(seen.observedPrice,state.price);assert.equal(m.list(account)[0].job.status,'ARMED');decision='WIDEN';verified=false;await m.assess(account,p.id,{force:true,demo:true});assert.equal(m.list(account)[0].job.status,'ARMED');verified=true;await m.assess(account,p.id,{force:true,demo:true});const result=m.list(account)[0];assert.equal(result.job.status,'QUEUED');assert.equal(result.job.planId,'demo-plan');assert.equal(result.job.demo,true);assert.equal(result.assessments[0].trigger,'DEMO_SCENARIO');}finally{m.close();}
});

test('explicit demo execution reuses the exact armed plan and records operator provenance',async()=>{const db=new Database(':memory:');let verified=true;const signer={prepare:async()=>({expiresAt:Date.now()+60000}),verify:async()=>true,destroy:()=>{}};const m=createManagement({testnet:{...fake,repositionPlan:async()=>({id:'reviewed',calls:[]})},database:db,graph:async()=>verified?graph:{...graph,status:'stale'},judge:model,signer});try{const p=await m.create(account,{wallet,tokenId:'1'});await assert.rejects(m.executeDemo(account,p.id),/armed/);await m.proposal(account,p.id);await m.configureSigner(account,p.id);await m.activate(account,p.id,'AI');verified=false;await assert.rejects(m.executeDemo(account,p.id),/Graph/);verified=true;const result=await m.executeDemo(account,p.id);assert.equal(result.job.planId,'reviewed');assert.equal(result.job.trigger,'DEMO_OPERATOR');assert.equal(result.job.status,'QUEUED');assert.equal(result.operations,0);await assert.rejects(m.executeDemo(account,p.id),/armed/);}finally{m.close();}});
