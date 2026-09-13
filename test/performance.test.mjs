import test from 'node:test';import assert from 'node:assert/strict';
import {accruedFees,summarizeCashflows} from '../src/position-performance.mjs';
import {evaluateScenarios} from '../src/scenario-values.mjs';
import {compareManagedPosition} from '../src/management-math.mjs';
import {createRequire} from 'node:module';
const {TickMath}=createRequire(import.meta.url)('@uniswap/v3-sdk'),Q=1n<<128n;
test('fee growth handles inside, below, above and uint256 rollover',()=>{const base={tick:5,lower:0,upper:10,liquidity:3n,global:20n*Q,belowOutside:2n*Q,aboveOutside:3n*Q,last:10n*Q};assert.equal(accruedFees(base),15n);assert.equal(accruedFees({...base,tick:-1,belowOutside:18n*Q}),15n);assert.equal(accruedFees({...base,tick:10,aboveOutside:17n*Q}),15n);assert.equal(accruedFees({...base,liquidity:1n,global:Q,belowOutside:0n,aboveOutside:0n,last:(1n<<256n)-Q}),2n);});
test('returned principal is not mistaken for trading fee income',()=>{const events=[{eventName:'IncreaseLiquidity',blockNumber:1n,args:{amount0:10000000n,amount1:0n}},{eventName:'Collect',blockNumber:2n,args:{amount0:5100000n,amount1:0n}}];const result=summarizeCashflows(events,{'1':2000,'2':2000},5.2,[200000n,0n],[5000000n,0n],2000);assert.equal(result.depositedValue,10);assert.equal(result.receivedValue,5.1);assert.ok(Math.abs(result.pnlBeforeGas-.3)<1e-10);assert.equal(result.fees.usdc,'0.3');assert.throws(()=>summarizeCashflows(events,{'1':2000,'2':2000},5,[0n,0n],[6000000n,0n],2000),/Incomplete/);});
test('continuous price scenarios agree with SDK inventory and support arbitrary prices',()=>{const tick=200000,price=1e12/1.0001**tick,state={tick,price,sqrtPriceX96:TickMath.getSqrtRatioAtTick(tick).toString(),liquidity:'1000000000000000',blockNumber:'1'},position={tokenId:'1',liquidity:'100000000000',tickLower:198000,tickUpper:202000},analysis=compareManagedPosition(state,position);const zero=evaluateScenarios(analysis,0);assert.ok(Math.abs(zero[0].inventoryValue-analysis.scenarios[0].rows[2].valueUsdc)<.0001);const changed=evaluateScenarios(analysis,-13.7);assert.equal(changed[0].price,price*.863);assert.ok(changed.every(r=>Number.isFinite(r.value)));const fees=evaluateScenarios(analysis,0,{fees:1});assert.ok(Math.abs(fees[0].value-zero[0].value-1)<1e-10);assert.equal(fees[2].value,zero[2].value);const down=evaluateScenarios(analysis,-80)[0];assert.equal(down.inRange,false);assert.equal(down.usdc,0);assert.throws(()=>evaluateScenarios(analysis,Infinity));});

test('withdrawal totals include claimable tokens once and distinguish wider idle tokens',async()=>{
 const {withdrawalProjection}=await import('../src/scenario-values.mjs');
 const a={currentPrice:2000,initial:{usdc:5,weth:.0025},scenarios:[{action:'HOLD',idle:{usdc:0,weth:0}},{action:'WIDEN',idle:{usdc:.2,weth:.0001}},{action:'EXIT',idle:{usdc:5,weth:.0025}}]};
 const performance={accountingStatus:'verified',claimable:{usdc:'.1',weth:'.0001'},receivedValue:2,depositedValue:10};
 const outcome={action:'HOLD',price:2200,usdc:7,weth:.0015,inventoryValue:10.3};
 const p=withdrawalProjection(a,outcome,performance,{fees:.2,costs:.1});
 assert.ok(Math.abs(p.returnedUsdc-7.1)<1e-10);assert.equal(p.returnedWeth,.0016);assert.ok(Math.abs(p.netValue-10.72)<1e-10);assert.ok(Math.abs(p.pnl-2.72)<1e-10);
 const w=withdrawalProjection(a,{...outcome,action:'WIDEN'},performance);assert.ok(Math.abs(w.returnedUsdc-6.9)<1e-10);assert.ok(Math.abs(w.returnedWeth-.0015)<1e-10);
 const exit=withdrawalProjection(a,{action:'EXIT',price:2200,usdc:5,weth:.0025,inventoryValue:10.5},performance,{fees:99});assert.equal(exit.futureFees,0);assert.equal(exit.returnedUsdc,5.1);
 assert.equal(withdrawalProjection(a,outcome,null).pnl,null);
});

test('rising prices convert WETH into USDC inside an LP but not after an immediate exit',()=>{
 const tick=200000,price=1e12/1.0001**tick,state={tick,price,sqrtPriceX96:TickMath.getSqrtRatioAtTick(tick).toString(),liquidity:'1000000000000000',blockNumber:'1'},position={tokenId:'1',liquidity:'100000000000',tickLower:198000,tickUpper:202000};
 const analysis=compareManagedPosition(state,position),now=evaluateScenarios(analysis,0),up=evaluateScenarios(analysis,5);
 assert.ok(up[0].usdc>now[0].usdc);assert.ok(up[0].weth<now[0].weth);assert.equal(up[2].usdc,now[2].usdc);assert.equal(up[2].weth,now[2].weth);
 const above=evaluateScenarios(analysis,150)[0];assert.equal(above.weth,0);assert.equal(above.inRange,false);
});

test('volume fees scale with active liquidity and exclude immediate exits',async()=>{
 const {estimateVolumeFees:f}=await import('../src/scenario-values.mjs');const a={inRange:true,scenarios:[{action:'HOLD',liquidity:'100'},{action:'WIDEN',liquidity:'50'},{action:'EXIT',liquidity:'0'}]};
 assert.equal(f(a,'1000',10000,'HOLD').fees,.5);assert.equal(f(a,'1000',20000,'HOLD').fees,1);assert.equal(f(a,'1000',0,'HOLD').fees,0);assert.equal(f(a,'1000',10000,'EXIT').fees,0);assert.ok(Math.abs(f(a,'1000',10000,'WIDEN').fees-5*50/950)<1e-12);assert.equal(f({...a,inRange:false},'1000',10000,'HOLD'),null);assert.equal(f(a,'10',10000,'HOLD'),null);assert.throws(()=>f(a,'1000',NaN,'HOLD'));
});

test('linear price paths allocate only in-range volume and PnL uses deposited capital',async()=>{
 const {eligibleVolumeFraction:f,pnlPercent:p}=await import('../src/scenario-values.mjs');const r={low:1800,high:2200};
 assert.equal(f(2000,2400,r),.5);assert.equal(f(2000,1600,r),.5);assert.equal(f(2000,2100,r),1);assert.equal(f(2000,2000,r),1);assert.equal(f(2400,2400,r),0);assert.equal(f(1600,2400,r),.5);assert.equal(f(2000,2400,null),0);assert.equal(p(2,10),20);assert.equal(p(-2,10),-20);assert.equal(p(0,10),0);assert.equal(p(2,0),null);assert.equal(p(null,10),null);
});
