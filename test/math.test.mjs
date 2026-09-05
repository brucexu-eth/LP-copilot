import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {Position, TickMath} = createRequire(import.meta.url)('@uniswap/v3-sdk');
import { amountsRaw, makePool, analyze, validateTicks } from '../src/math.mjs';
const state = {sqrtPriceX96: TickMath.getSqrtRatioAtTick(196200).toString(), tick:196200, liquidity:'1000000000000000000'};
test('integer amounts agree with SDK across below, inside and above range', () => {
 for (const tick of [195000,195600,196200,196800,197400]) {
  const pool=makePool({...state,tick,sqrtPriceX96:TickMath.getSqrtRatioAtTick(tick).toString()});
  const p=new Position({pool,liquidity:'12345678901234',tickLower:195600,tickUpper:196800});
  const actual=amountsRaw(pool.sqrtRatioX96.toString(),'12345678901234',195600,196800);
  assert.equal(actual[0].toString(),p.amount0.quotient.toString());
  assert.equal(actual[1].toString(),p.amount1.quotient.toString());
 }
});
test('tick validation rejects reversed, unaligned and boundary ticks',()=>{
 for(const [l,u] of [[60,0],[1,60],[-887280,60],[0,887280]]) assert.throws(()=>validateTicks(l,u));
 validateTicks(195600,196800);
});
test('widen keeps the same inventory, including idle balances',()=>{
 const r=analyze(state,{liquidity:'12345678901234',tickLower:195600,tickUpper:196800});
 assert.equal(r.candidates.length,3);
 const [hold,widen,exit]=r.candidates;
 for(const c of [widen,exit]) assert.ok(Math.abs(c.currentValueUsdc-hold.currentValueUsdc)<0.001);
 assert.equal(exit.scenarios[2].valueUsdc,exit.currentValueUsdc);
 assert.ok(widen.idle.usdc>=0 && widen.idle.weth>=0);
 assert.equal(r.scenarios.length,5);
});
test('zero liquidity produces a clear empty position error',()=>assert.throws(()=>analyze(state,{liquidity:'0',tickLower:195600,tickUpper:196800}),/liquidity/i));
