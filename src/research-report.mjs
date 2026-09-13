// Financial facts are rendered from deterministic tools, never copied from model prose.
export const focusCodes=['inventory','range','costs','history'];
export const questionCodes=['capital','horizon','drawdown'];
export function parseResearchSelection(content){
 // Some providers append prose despite JSON mode. Discard it; only the bounded JSON selection can affect the report.
 const match=typeof content==='string'&&content.match(/^\s*(?:```(?:json)?\s*)?(\{[^}]*\})/);
 let value;try{value=JSON.parse(match?match[1]:content);}catch{throw Error('Expected structured research selection');}
 if(!value||Object.keys(value).sort().join(',')!=='focus,questions'||!Array.isArray(value.focus)||!Array.isArray(value.questions)||value.focus.length<1||value.focus.length>4||value.questions.length>3||value.focus.some(x=>!focusCodes.includes(x))||value.questions.some(x=>!questionCodes.includes(x)))throw Error('Unsupported research selection');
 return {focus:[...new Set(value.focus)],questions:[...new Set(value.questions)]};
}
export function researchReport(evidence,selection){
 const e=evidence.at(-1),s=e?.state,r=e?.result;
 if(!s||s.fee!==3000||!r?.inventory||!Array.isArray(r.candidates)||!['HOLD','WIDEN','EXIT'].every(a=>r.candidates.some(c=>c.action===a)))throw Error('Incomplete calculation evidence');
 const n=(x,d=2)=>{if(!Number.isFinite(x))throw Error('Non-finite report value');return x.toFixed(d);};
 const lines=[`USDC/WETH · Uniswap v3 · pool fee ${n(s.fee/10000,1)}%`, `RPC block ${s.blockNumber} · ${r.position.kind==='hypothetical'?'Hypothetical learning position, not personal holdings':'Public NFT position; ownership by this user is not verified'}`,`Current price: ${n(r.priceUsdc)} USDC/WETH; inventory: ${n(r.inventory.usdc)} USDC + ${n(r.inventory.weth,6)} WETH. `,`Current range: ${n(r.range.low)}–${n(r.range.high)} USDC/WETH. `, '', 'Three comparisons with the same starting inventory:'];
 for(const action of ['HOLD','WIDEN','EXIT']){
  const c=r.candidates.find(c=>c.action===action);
  lines.push(`${action}: ${action==='HOLD'?'Keep the current range; no action':action==='WIDEN'?`Widen to ${n(c.range.low)}–${n(c.range.high)}; unused tokens remain idle`:'Withdraw from LP into USDC and WETH; this does not sell WETH'}. `);
  const low=c.scenarios.reduce((a,b)=>a.priceUsdc<b.priceUsdc?a:b),high=c.scenarios.reduce((a,b)=>a.priceUsdc>b.priceUsdc?a:b);
  lines.push(`  At WETH prices of ${n(low.priceUsdc)} / ${n(high.priceUsdc)} USDC, inventory values are respectively ${n(low.valueUsdc)} / ${n(high.valueUsdc)} USDC. `);
 }
 const history=e.history?.status==='verified'?`History: The Graph pool state was cross-checked against RPC at block ${e.history.blockNumber}. ${e.history.graphHashVerified===false?'Graph did not return a block hash. Hash verification is incomplete; this evidence cannot authorize execution.':''}`:e.history?.synthetic?'MOCK history: invented development data, not market evidence.':'History is unavailable; no fee earnings are estimated from missing data.';
 lines.push('',history,'Values describe inventory, not profit or return forecasts. Accrued/future fees, gas, swaps, slippage and execution timing are excluded.');
 const notes={inventory:'As the USDC price of WETH rises, an in-range LP gradually converts WETH into USDC. As it falls, USDC converts into WETH.',range:'A wider range does not automatically improve returns or reduce risk. Leaving the range does not mean an adjustment is required.',costs:'Compare costs before adjusting. HOLD remains a candidate.',history:'Historical pool volume and fees are not this position\'s earnings and do not guarantee future returns.'};
 lines.push('','AI-selected research focus (explanations rendered from reviewed rules):',...selection.focus.map(k=>notes[k]));
 const questions={capital:'How much capital do you plan to allocate?',horizon:'What is your intended holding period?',drawdown:'What drawdown and WETH exposure can you accept?'};
 if(selection.questions.length)lines.push('','Before developing a strategy, clarify:',...selection.questions.map(k=>questions[k]));
 lines.push('','These are comparisons, not strategy approvals. Signing and execution are disabled.');
 return lines.join('\n');
}
