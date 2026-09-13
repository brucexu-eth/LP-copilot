// Scenario calculations use the selected chain's actual pool and position state.
import {createRequire} from 'node:module';
import {NETWORK} from './testnet.mjs';
const require=createRequire(import.meta.url),{Token}=require('@uniswap/sdk-core'),{Pool,Position,TickMath}=require('@uniswap/v3-sdk');
const usdc=new Token(84532,NETWORK.usdc,6,'USDC'),weth=new Token(84532,NETWORK.weth,18,'WETH');
export function compareManagedPosition(state,position){
 if(!position||BigInt(position.liquidity)<=0n)throw Error('Select an active position.');
 const pool=new Pool(usdc,weth,500,state.sqrtPriceX96,state.liquidity,state.tick);
 const current=new Position({pool,liquidity:position.liquidity,tickLower:position.tickLower,tickUpper:position.tickUpper});
 const a0=current.amount0.quotient.toString(),a1=current.amount1.quotient.toString();
 const center=Math.round(state.tick/10)*10,half=Math.max(200,Math.ceil((position.tickUpper-position.tickLower)*0.75/10)*10);
 const lower=Math.max(-887270,center-half),upper=Math.min(887270,center+half);
 const wider=Position.fromAmounts({pool,tickLower:lower,tickUpper:upper,amount0:a0,amount1:a1,useFullPrecision:true});
 const initial={usdc:Number(a0)/1e6,weth:Number(a1)/1e18};
 const idle={usdc:Math.max(0,initial.usdc-Number(wider.amount0.toExact())),weth:Math.max(0,initial.weth-Number(wider.amount1.toExact()))};
 const definitions=[{action:'HOLD',position:current,idle:{usdc:0,weth:0}},{action:'WIDEN',position:wider,idle},{action:'EXIT',position:null,idle:initial}];
 const scenarios=definitions.map(d=>({action:d.action,liquidity:d.position?.liquidity.toString()||'0',idle:d.idle,range:d.position?{low:1e12/1.0001**d.position.tickUpper,high:1e12/1.0001**d.position.tickLower}:null,rows:[-20,-10,0,10,20].map(change=>{
  const price=state.price*(1+change/100),tick=Math.max(-887270,Math.min(887270,Math.round(Math.log(1e12/price)/Math.log(1.0001))));
  const future=new Pool(usdc,weth,500,TickMath.getSqrtRatioAtTick(tick).toString(),state.liquidity,tick);
  const p=d.position?new Position({pool:future,liquidity:d.position.liquidity.toString(),tickLower:d.position.tickLower,tickUpper:d.position.tickUpper}):null;
  const tokens={usdc:(p?Number(p.amount0.toExact()):0)+d.idle.usdc,weth:(p?Number(p.amount1.toExact()):0)+d.idle.weth};
  return {changePct:change,price,...tokens,valueUsdc:tokens.usdc+tokens.weth*price};
 })}));
 const span=position.tickUpper-position.tickLower,edgeDistancePct=Math.min(state.tick-position.tickLower,position.tickUpper-state.tick)/span*100;
 return {sourceBlock:state.blockNumber,chainId:84532,tokenId:position.tokenId,currentPrice:state.price,initial,edgeDistancePct,inRange:state.tick>=position.tickLower&&state.tick<position.tickUpper,scenarios,reposition:{tickLower:lower,tickUpper:upper,usdcRaw:a0,wethRaw:a1},excludes:['accrued and future fees','gas','swaps','slippage','execution timing'],note:'Real testnet position; hypothetical price scenarios. Inventory values are not profit forecasts.'};
}
export function managementGate(m,analysis,graph,now=Date.now()){
 if(m.status!=='WATCHING')return 'Monitoring is paused or not enabled.';
 if(now>=m.expiresAt)return 'Management window expired.';
 if(m.operations>=m.maxOperations)return 'Operation limit reached.';
 if(m.lastActionAt&&now-m.lastActionAt<m.cooldownMs)return 'Cooldown is active.';
 if(!analysis||analysis.chainId!==84532||analysis.tokenId!==m.tokenId)return 'Position identity mismatch.';
 if(graph.status!=='verified'||graph.chainId!==84532||!graph.hashVerified)return 'Same-chain Graph verification is required for execution.';
 return null;
}

export function outOfRangeDemo(state,position){
 const price=1e12/1.0001**position.tickLower*1.02;
 const tick=Math.max(-887270,Math.min(887270,Math.round(Math.log(1e12/price)/Math.log(1.0001))));
 return {...compareManagedPosition({...state,price,tick,sqrtPriceX96:TickMath.getSqrtRatioAtTick(tick).toString()},position),demo:true,observedPrice:state.price,note:'Hypothetical out-of-range signal. The real pool price is unchanged. Any execution uses the previously reviewed live-price plan.'};
}
