import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {validateDraft,calculateDeposit,ownedWallet,NETWORK} from '../src/testnet.mjs';
import {validateChatPatch} from '../src/terminal-chat.mjs';
const {TickMath}=createRequire(import.meta.url)('@uniswap/v3-sdk');
const state={sqrtPriceX96:TickMath.getSqrtRatioAtTick(196200).toString(),tick:196200,liquidity:'1000000000000000000'};
test('testnet deposit enforces amount, range and ownership boundaries',()=>{
 assert.equal(NETWORK.chainId,84532);
 for(const amountUsdc of ['0','21','-1','1e2','NaN','1.0000001'])assert.throws(()=>validateDraft({action:'ENTER',amountUsdc,widthPct:10}));
 assert.throws(()=>validateDraft({action:'ENTER',amountUsdc:'5',widthPct:Infinity}));
 assert.throws(()=>validateDraft({action:'WRAP',amountEth:'0.02'}));
 assert.throws(()=>ownedWallet({wallets:[]},NETWORK.pool));
 validateDraft({action:'ENTER',amountUsdc:'5',widthPct:10});
 const p=calculateDeposit(state,{amountUsdc:'5',widthPct:10});
 assert.ok(BigInt(p.amount0)<=5000000n);assert.ok(BigInt(p.amount1)>0n);assert.equal(p.tickLower%10,0);assert.equal(p.tickUpper%10,0);assert.ok(p.low<p.high);
});
test('chat cannot authorize transactions, inject fields or exceed test budget',()=>{
 for(const p of [{action:'SIGN'},{action:'EDIT',amountUsdc:'100'},{action:'EDIT',widthPct:0},{action:'EDIT',to:NETWORK.pool}])assert.throws(()=>validateChatPatch(p));
 assert.deepEqual(validateChatPatch({action:'EDIT',amountUsdc:'5',widthPct:20}),{action:'EDIT',amountUsdc:'5',widthPct:20});
});

import Database from 'better-sqlite3';
import {createTestnet} from '../src/testnet.mjs';
const account={userId:'test-user',wallets:[{address:'0x1111111111111111111111111111111111111111'}]};
function fixtureService(){
 const db=new Database(':memory:');let lastCall,wrongSender=false;
 const client={getChainId:async()=>84532,getBlock:async()=>({number:123n,timestamp:BigInt(Math.floor(Date.now()/1000)),hash:'0x123'}),getBalance:async()=>10n**18n,getGasPrice:async()=>1n,estimateGas:async()=>100000n,call:async()=>({}),getTransactionCount:async()=>4,
 readContract:async({address,functionName})=>({slot0:[BigInt(state.sqrtPriceX96),state.tick,0,0,0,0,true],liquidity:BigInt(state.liquidity),token0:NETWORK.usdc,token1:NETWORK.weth,fee:500,tickSpacing:10,getPool:NETWORK.pool,decimals:address===NETWORK.usdc?6:18,balanceOf:address===NETWORK.usdc?20000000n:10n**18n}[functionName]),
 getTransaction:async()=>({from:wrongSender?NETWORK.pool:account.wallets[0].address,to:lastCall.to,input:lastCall.data,value:BigInt(lastCall.value),nonce:4}),getTransactionReceipt:async()=>({status:'success',blockNumber:124n,gasUsed:21000n,effectiveGasPrice:1n})};
 return {service:createTestnet({client,database:db}),db,setCall:c=>lastCall=c,setWrong:()=>wrongSender=true};
}
test('execution cannot skip approvals or resend an uncertain wallet request',async()=>{
 const f=fixtureService();try{
 const p=await f.service.preview(account,{wallet:account.wallets[0].address,action:'ENTER',amountUsdc:'5',widthPct:10});
 await assert.rejects(f.service.prepare(account,p.id,2),/Reconcile earlier/);
 await f.service.intent(account,p.id,0);
 await assert.rejects(f.service.prepare(account,p.id,0),/Reconcile earlier/);
 f.setCall(p.calls[0]);const r=await f.service.record(account,p.id,0,'0x'+'1'.repeat(64));
 assert.equal(r.calls[0].status,'confirmed');await f.service.prepare(account,p.id,1);
 await assert.rejects(f.service.prepare({...account,userId:'someone-else'},p.id,1),/Plan not found/);
 }finally{f.service.close();}
});
test('recovery rejects mismatched sender and retains hash to prevent a blind resend',async()=>{
 const f=fixtureService();try{
 const p=await f.service.preview(account,{wallet:account.wallets[0].address,action:'WRAP',amountEth:'0.001'});f.setCall(p.calls[0]);f.setWrong();
 await assert.rejects(f.service.record(account,p.id,0,'0x'+'2'.repeat(64)),/does not match/);
 await assert.rejects(f.service.prepare(account,p.id,0),/Reconcile earlier/);
 }finally{f.service.close();}
});
test('expired preview cannot prepare a transaction',async()=>{
 const f=fixtureService();try{
 const p=await f.service.preview(account,{wallet:account.wallets[0].address,action:'WRAP',amountEth:'0.001'});p.deadline=1;f.db.prepare('UPDATE testnet_plans SET body=? WHERE id=?').run(JSON.stringify(p),p.id);
 await assert.rejects(f.service.prepare(account,p.id,0),/expired/);
 }finally{f.service.close();}
});


test('only exact zero allowances are eligible for cleanup after preview expiry',async()=>{
 const {isAllowanceCleanup}=await import('../src/testnet.mjs');const {encodeFunctionData,parseAbi}=await import('viem');const abi=parseAbi(['function approve(address,uint256) returns(bool)']);const c={to:NETWORK.usdc,value:'0',data:encodeFunctionData({abi,functionName:'approve',args:[NETWORK.manager,0n]})};assert.equal(isAllowanceCleanup(c),true);assert.equal(isAllowanceCleanup({...c,value:'1'}),false);assert.equal(isAllowanceCleanup({...c,to:NETWORK.manager}),false);assert.equal(isAllowanceCleanup({...c,data:encodeFunctionData({abi,functionName:'approve',args:[NETWORK.manager,1n]})}),false);
});

test('custom deposit bounds become aligned onchain ticks and stay within the USDC budget',()=>{
 const price=1e12/1.0001**state.tick,input={action:'ENTER',amountUsdc:'5',lowerPrice:price*.85,upperPrice:price*1.12};
 validateDraft(input);const p=calculateDeposit(state,input);
 assert.ok(p.low<=input.lowerPrice);assert.ok(p.high>=input.upperPrice);assert.ok(p.low>input.lowerPrice*.998);assert.ok(p.high<input.upperPrice*1.002);assert.equal(p.tickLower%10,0);assert.equal(p.tickUpper%10,0);assert.ok(BigInt(p.amount0)<=5000000n);
 for(const bounds of [{lowerPrice:0,upperPrice:price},{lowerPrice:price,upperPrice:price},{lowerPrice:price},{lowerPrice:NaN,upperPrice:price}])assert.throws(()=>validateDraft({...input,...bounds,upperPrice:bounds.upperPrice}));
 assert.throws(()=>calculateDeposit(state,{...input,lowerPrice:price*1.05,upperPrice:price*1.2}),/two-sided/);
 const existing={tickLower:195000,tickUpper:197400};const increase=calculateDeposit(state,input,existing);assert.equal(increase.tickLower,existing.tickLower);assert.equal(increase.tickUpper,existing.tickUpper);
});

test('discarded plans persist in history and cannot prepare or start another step',async()=>{
 const f=fixtureService();try{const p=await f.service.preview(account,{wallet:account.wallets[0].address,action:'ENTER',amountUsdc:'5',widthPct:10});const cancelled=await f.service.discard(account,p.id);assert.ok(cancelled.discardedAt);assert.equal(f.service.getPlan(account,p.id).discardedAt,cancelled.discardedAt);assert.equal((await f.service.discard(account,p.id)).discardedAt,cancelled.discardedAt);await assert.rejects(f.service.prepare(account,p.id,0),/cancelled/);await assert.rejects(f.service.intent(account,p.id,0),/cancelled/);await assert.rejects(f.service.discard({...account,userId:'another-user'},p.id),/not found/);}finally{f.service.close();}
});
test('cancel plan preserves confirmed receipts and refuses an unresolved wallet request',async()=>{
 const f=fixtureService();try{const p=await f.service.preview(account,{wallet:account.wallets[0].address,action:'ENTER',amountUsdc:'5',widthPct:10});await f.service.intent(account,p.id,0);await assert.rejects(f.service.discard(account,p.id),/in flight/);f.setCall(p.calls[0]);const hash='0x'+'7'.repeat(64);await f.service.record(account,p.id,0,hash);const discarded=await f.service.discard(account,p.id);assert.equal(discarded.calls[0].hash,hash);assert.equal(discarded.calls[0].status,'confirmed');await assert.rejects(f.service.prepare(account,p.id,1),/cancelled/);}finally{f.service.close();}
});
