// Continuous local-only USDC/WETH scenarios. Never signs or changes monitoring state.
export function evaluateScenarios(analysis,changePct,{fees=0,gas=0}={}){
 if(!Number.isFinite(changePct)||changePct< -80||changePct>150||![fees,gas].every(v=>Number.isFinite(v)&&v>=0&&v<=100000))throw Error('Invalid scenario assumptions.');
 const price=analysis.currentPrice*(1+changePct/100),initialValue=analysis.initial.usdc+analysis.initial.weth*analysis.currentPrice;
 return analysis.scenarios.map(s=>{let usdc=s.idle?.usdc||0,weth=s.idle?.weth||0;if(s.range){const lo=Math.sqrt(1e12/s.range.high),hi=Math.sqrt(1e12/s.range.low),sqrt=Math.max(lo,Math.min(hi,Math.sqrt(1e12/price))),L=Number(s.liquidity);if(!Number.isFinite(L))throw Error('Refresh the position analysis.');usdc+=L*(hi-sqrt)/(sqrt*hi)/1e6;weth+=L*(sqrt-lo)/1e18;}const inventoryValue=usdc+weth*price,value=inventoryValue+(s.action==='EXIT'?0:fees)-gas;return {action:s.action,price,usdc,weth,inventoryValue,value,change:value-initialValue,changePct:(value/initialValue-1)*100,breakEvenFees:Math.max(0,initialValue-inventoryValue+gas),inRange:!!s.range&&price>s.range.low&&price<=s.range.high,range:s.range};});
}

// Separate future LP withdrawal from exiting today and holding fixed token amounts.
export function withdrawalProjection(analysis,outcome,performance,{fees=0,costs=0}={}){
 const known=!!performance?.claimable,verified=performance?.accountingStatus==='verified';
 const claimUsdc=known?Number(performance.claimable.usdc):0,claimWeth=known?Number(performance.claimable.weth):0;
 const idle=analysis.scenarios.find(s=>s.action===outcome.action)?.idle||{usdc:0,weth:0};
 const claimableValue=known?claimUsdc+claimWeth*outcome.price:null,futureFees=outcome.action==='EXIT'?0:fees;
 const netValue=known?outcome.inventoryValue+claimableValue+futureFees-costs:null;
 const received=verified?performance.receivedValue:null,deposited=verified?performance.depositedValue:null;
 return {known,idle,currentPrincipal:analysis.initial.usdc+analysis.initial.weth*analysis.currentPrice,returnedUsdc:outcome.usdc+claimUsdc-(outcome.action==='WIDEN'?idle.usdc:0),returnedWeth:outcome.weth+claimWeth-(outcome.action==='WIDEN'?idle.weth:0),claimableValue,futureFees,netValue,received,deposited,pnl:verified&&netValue!==null?netValue+received-deposited:null};
}

// Sensitivity estimate: eligible trading volume, fixed active liquidity, no protocol deduction.
export function estimateVolumeFees(analysis,poolLiquidity,volume,action){
 if(!Number.isFinite(volume)||volume<0||volume>1000000)throw Error('Invalid volume assumption.');
 if(action==='EXIT')return {fees:0,share:0};
 if(!analysis.inRange)return null;
 const current=Number(analysis.scenarios.find(s=>s.action==='HOLD')?.liquidity),own=Number(analysis.scenarios.find(s=>s.action===action)?.liquidity),total=Number(poolLiquidity);
 if(!Number.isFinite(total)||total<=0||!Number.isFinite(own)||own<=0||current>total)return null;
 const denominator=total-current+own,share=own/denominator;
 return {share,fees:volume*.0005*share};
}

export function pnlPercent(pnl,deposited){return Number.isFinite(pnl)&&Number.isFinite(deposited)&&deposited>0?pnl/deposited*100:null;}
// Explicit path assumption: linear price movement, uniformly distributed trading volume.
export function eligibleVolumeFraction(start,end,range){
 if(!range)return 0;
 if(![start,end,range.low,range.high].every(Number.isFinite)||start<=0||end<=0||range.low>=range.high)throw Error('Invalid price path.');
 if(start===end)return start>range.low&&start<=range.high?1:0;
 const a=(range.low-start)/(end-start),b=(range.high-start)/(end-start);
 return Math.max(0,Math.min(1,Math.max(a,b))-Math.max(0,Math.min(a,b)));
}
