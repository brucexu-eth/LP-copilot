import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Token } = require('@uniswap/sdk-core');
const { Pool, Position, TickMath } = require('@uniswap/v3-sdk');
import { USDC, WETH, FEE } from './config.mjs';
const token0 = new Token(1, USDC, 6, 'USDC');
const token1 = new Token(1, WETH, 18, 'WETH');
const Q96 = 1n << 96n;
export function makePool(state) {
 return new Pool(token0,token1,FEE,state.sqrtPriceX96,state.liquidity,state.tick);
}
export function validateTicks(lower,upper) {
 if(!Number.isInteger(lower)||!Number.isInteger(upper)||lower%60||upper%60||lower>=upper||lower < -887220||upper>887220) throw new Error('Range must use ordered, valid ticks aligned to spacing 60.');
}
export function amountsRaw(sqrtPrice, liquidity, lower, upper) {
 validateTicks(lower,upper);
 const l=BigInt(liquidity), s=BigInt(sqrtPrice);
 if(l<0n) throw new Error('Negative liquidity');
 const a=BigInt(TickMath.getSqrtRatioAtTick(lower).toString()), b=BigInt(TickMath.getSqrtRatioAtTick(upper).toString());
 const p=s<a?a:s>b?b:s;
 return [l*(b-p)*Q96/(p*b),l*(p-a)/Q96];
}
function units(raw) { return {usdc:Number(raw[0])/1e6,weth:Number(raw[1])/1e18}; }
function price(sqrt) { const ratio=Number(sqrt)/Number(Q96); return 1e12/(ratio*ratio); }
function priceAtTick(tick) {return price(TickMath.getSqrtRatioAtTick(tick).toString());}
function value(a,p) { return a.usdc+a.weth*p; }
export function analyze(state, position) {
 const {tickLower:lower,tickUpper:upper,liquidity}=position;
 validateTicks(lower,upper);
 if(!/^[0-9]{1,39}$/.test(String(liquidity)) || BigInt(liquidity)<=0n || BigInt(liquidity)>((1n<<128n)-1n)) throw new Error('Position must have nonzero uint128 liquidity. Empty NFTs have no active LP inventory.');
 const pool=makePool(state), initialRaw=amountsRaw(state.sqrtPriceX96,liquidity,lower,upper), initial=units(initialRaw), currentPrice=price(state.sqrtPriceX96);
 const wideLower=Math.max(-887220,lower-600), wideUpper=Math.min(887220,upper+600);
 const wide=Position.fromAmounts({pool,tickLower:wideLower,tickUpper:wideUpper,amount0:initialRaw[0].toString(),amount1:initialRaw[1].toString(),useFullPrecision:true});
 const wideRaw=amountsRaw(state.sqrtPriceX96,wide.liquidity.toString(),wideLower,wideUpper);
 const idle=units(initialRaw.map((v,i)=>v-wideRaw[i]));
 const scenarios=[2000,1000,0,-1000,-2000].map(delta=>{
  const tick=Math.max(TickMath.MIN_TICK,Math.min(TickMath.MAX_TICK-1,state.tick+delta));
  const sqrt=delta===0?state.sqrtPriceX96:TickMath.getSqrtRatioAtTick(tick).toString();
  const p=price(sqrt);return {tick,sqrt,priceUsdc:p,changePct:(p/currentPrice-1)*100};
 });
 const definitions=[
  {action:'HOLD',label:'Keep the range',lower,upper,liquidity,idle:{usdc:0,weth:0},explanation:'No transaction. Being out of range alone is not a reason to rebalance.'},
  {action:'WIDEN',label:'Widen without swapping',lower:wideLower,upper:wideUpper,liquidity:wide.liquidity.toString(),idle,explanation:'Use the same inventory in a wider range. Unused tokens remain idle. Wider does not automatically mean safer or more profitable.'},
  {action:'EXIT',label:'Hold both tokens',liquidity:'0',idle:initial,explanation:'Withdraw into USDC and WETH. This does not sell WETH or remove its price exposure.'}
 ];
 const baseline=value(initial,currentPrice);
 const candidates=definitions.map(c=>{
  const rows=scenarios.map(s=>{
   const active=c.action==='EXIT'?{usdc:0,weth:0}:units(amountsRaw(s.sqrt,c.liquidity,c.lower,c.upper));
   const total={usdc:active.usdc+c.idle.usdc,weth:active.weth+c.idle.weth};
   return {priceUsdc:s.priceUsdc,...total,valueUsdc:value(total,s.priceUsdc),changeFromNowUsdc:value(total,s.priceUsdc)-baseline};
  });
  return {...c,range:c.action==='EXIT'?null:{low:priceAtTick(c.upper),high:priceAtTick(c.lower)},currentValueUsdc:rows[2].valueUsdc,scenarios:rows};
 });
 return {priceUsdc:currentPrice,inventory:initial,position:{...position,inRange:state.tick>=lower&&state.tick<upper},range:{low:priceAtTick(upper),high:priceAtTick(lower)},scenarios:scenarios.map(({sqrt,...s})=>s),candidates,disclaimer:'Inventory-only scenarios, not profit or return forecasts. Excludes accrued fees, future fees, gas, swaps, slippage and execution timing. USDC is the unit of account; its dollar peg is not guaranteed. WIDEN and EXIT are hypothetical, not executable plans.'};
}
export function learningPosition(state) {
 const center=Math.round(state.tick/60)*60;
 const lower=Math.max(-887220,center-1200), upper=Math.min(887220,center+1200);
 const pool=makePool(state);
 const p=Position.fromAmounts({pool,tickLower:lower,tickUpper:upper,amount0:'1000000000',amount1:'1000000000000000000',useFullPrecision:true});
 return {tickLower:lower,tickUpper:upper,liquidity:p.liquidity.toString(),kind:'hypothetical',note:'Hypothetical liquidity using up to 1,000 USDC and 1 WETH at the live price. Not a wallet or a real NFT.'};
}
