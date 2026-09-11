import test from 'node:test';import assert from 'node:assert/strict';import {decodeFunctionData} from 'viem';import {createRequire} from 'node:module';import {buildUnsignedOperation,executionAbi} from '../src/transactions.mjs';import {POOL,USDC,WETH,FEE,MANAGER} from '../src/config.mjs';
const {TickMath}=createRequire(import.meta.url)('@uniswap/v3-sdk');const wallet='0x0000000000000000000000000000000000000001',now=Math.floor(Date.now()/1000);
const state={chainId:1,pool:POOL,token0:USDC,token1:WETH,fee:FEE,tick:196200,sqrtPriceX96:TickMath.getSqrtRatioAtTick(196200).toString(),liquidity:'1000000000000000000',blockNumber:'1',blockTimestamp:now};
const input={action:'ENTER',wallet,slippageBps:50,deadline:now+300,tickLower:195000,tickUpper:197400,usdcRaw:'1000000000',wethRaw:'1000000000000000000'};
test('typed mint uses exact approvals, bounded amounts and fixed recipient/manager',()=>{
 const p=buildUnsignedOperation(input,{state,owner:wallet});assert.equal(p.status,'UNSIGNED');assert.equal(p.calls.length,3);const call=p.calls.at(-1);assert.equal(call.to,MANAGER);const d=decodeFunctionData({abi:executionAbi,data:call.data});assert.equal(d.functionName,'mint');assert.equal(d.args[0].recipient,wallet);assert.ok(d.args[0].amount0Desired<=BigInt(input.usdcRaw));assert.ok(d.args[0].amount1Desired<=BigInt(input.wethRaw));
});
test('wrong owner/chain/pool/stale source, overslippage and out-of-range entry fail',()=>{
 for(const options of [{state},{state,owner:MANAGER},{state:{...state,chainId:137},owner:wallet},{state:{...state,pool:MANAGER},owner:wallet},{state:{...state,blockTimestamp:1},owner:wallet}])assert.throws(()=>buildUnsignedOperation(input,options));
 for(const extra of [{slippageBps:101},{deadline:now-1},{tickLower:197400,tickUpper:198000},{usdcRaw:'1e9'}])assert.throws(()=>buildUnsignedOperation({...input,...extra},{state,owner:wallet}));
});
test('owned NFT decrease and collect are distinct, recipient cannot drift',()=>{
 const position={kind:'onchain',tokenId:'12',liquidity:'10000000000000',tickLower:195000,tickUpper:197400};
 const p=buildUnsignedOperation({...input,action:'DECREASE',tokenId:'12',fractionBps:5000},{state,position,owner:wallet});assert.equal(p.calls.length,1);assert.equal(decodeFunctionData({abi:executionAbi,data:p.calls[0].data}).functionName,'decreaseLiquidity');
 const c=buildUnsignedOperation({...input,action:'COLLECT',tokenId:'12'},{state,position,owner:wallet});assert.equal(decodeFunctionData({abi:executionAbi,data:c.calls[0].data}).args[0].recipient,wallet);
 assert.throws(()=>buildUnsignedOperation({...input,action:'COLLECT',tokenId:'13'},{state,position,owner:wallet}));
});
