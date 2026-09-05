const $=id=>document.getElementById(id);
const number=(v,max=2)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:max}).format(v);
const text=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;};
let generation=0,controller=null,loadedAt=null;
function reset() {
 generation++;controller?.abort();$('results').hidden=true;$('analyze').disabled=false;loadedAt=null;
 $('status').className='';$('status').textContent='Inputs changed. Read again to get a new comparison.';
}
$('mode').addEventListener('change',()=>{reset();const nft=$('mode').value==='nft';$('nft-field').hidden=!nft;$('token-id').required=nft;$('source-help').textContent=nft?'Read a public position only. Ownership is not checked; this grants no transaction permission.':'Hypothetical position, real onchain price. No wallet connection, no funds, no transactions.';});
$('token-id').addEventListener('input',reset);
function chart(r) {
 const root=$('scenario-chart');root.replaceChildren();
 const legend=text('div','','legend');for(const [i,label] of ['HOLD','WIDEN + idle','EXIT to tokens'].entries())legend.append(text('span',label,['hold','widen','exit'][i]));root.append(legend);
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 900 200');
 const values=r.candidates.flatMap(c=>c.scenarios.map(s=>s.valueUsdc));const lo=Math.min(...values)*.99,hi=Math.max(...values)*1.01;
 for(let i=0;i<3;i++){const y=20+i*70,l=document.createElementNS(ns,'line');l.setAttribute('x1','20');l.setAttribute('x2','880');l.setAttribute('y1',y);l.setAttribute('y2',y);l.setAttribute('stroke','#e5e8de');svg.append(l);}
 r.candidates.forEach((c,i)=>{const line=document.createElementNS(ns,'polyline');line.setAttribute('fill','none');line.setAttribute('stroke',['#315644','#9d713c','#8095a0'][i]);line.setAttribute('stroke-width','2.5');line.setAttribute('points',c.scenarios.map((s,k)=>`${20+k*215},${170-(s.valueUsdc-lo)/(hi-lo||1)*140}`).join(' '));svg.append(line);});
 root.append(svg);
}
function render(data) {
 const {state:s,result:r,history:h}=data;
 loadedAt=s.blockTimestamp;
 $('position-kind').textContent=r.position.kind==='onchain'?`ONCHAIN NFT #${r.position.tokenId}`:'HYPOTHETICAL POSITION · LIVE PRICE';
 $('facts').replaceChildren();for(const [label,value] of [['WETH price / USDC',number(r.priceUsdc)],['USDC in position',number(r.inventory.usdc)],['WETH in position',number(r.inventory.weth,6)]]) {const d=text('div','','fact');d.append(text('small',label),text('strong',value));$('facts').append(d);}
 $('range-label').textContent=`Current range: ${number(r.range.low)} – ${number(r.range.high)} USDC per WETH`;
 $('range-status').textContent=r.position.inRange?'In range at the observed block. Fee accrual is possible, not guaranteed.':'Out of range at the observed block. No automatic action is recommended.';
 $('position-note').textContent=r.position.note;
 $('provenance').textContent=`${s.source} · Chain ${s.chainId} · Block ${s.blockNumber} · ${new Date(s.blockTimestamp*1000).toISOString()} · Observed ${s.observedAt} · Tick ${s.tick}.`;
 $('pool-link').href=`https://etherscan.io/address/${s.pool}`;
 $('graph-status').textContent=h.status==='verified'?`The Graph verified at block ${h.blockNumber}. ${h.note}`:h.message;
 $('history').replaceChildren();if(h.status==='verified')for(const d of h.days)$('history').append(text('p',`${new Date(d.date*1000).toISOString().slice(0,10)}: pool volume ${number(Number(d.volumeUSD))} USD · TVL ${number(Number(d.tvlUSD))} USD · pool fees ${number(Number(d.feesUSD))} USD`));
 $('candidates').replaceChildren();for(const c of r.candidates){const e=text('article','','candidate');e.append(text('div',c.action,'action'),text('h3',c.label),text('p',`${number(c.currentValueUsdc)} USDC`,'value'),text('p','Current inventory value, before costs'),text('p',c.explanation));const dl=document.createElement('dl');for(const [k,v] of [['Range',c.range?`${number(c.range.low)} – ${number(c.range.high)} USDC/WETH`:'No active liquidity'],['Idle inventory',`${number(c.idle.usdc)} USDC + ${number(c.idle.weth,6)} WETH`],['Execution costs',c.action==='HOLD'?'No transaction required':'Unknown — not included']])dl.append(text('dt',k),text('dd',v));e.append(dl);$('candidates').append(e);}
 $('scenarios').replaceChildren();r.scenarios.forEach((s,i)=>{const row=document.createElement('tr');row.append(text('td',`${number(s.priceUsdc)} (${s.changePct>=0?'+':''}${number(s.changePct,1)}%)`));for(const c of r.candidates)row.append(text('td',number(c.scenarios[i].valueUsdc)));$('scenarios').append(row);});
 $('disclaimer').textContent=r.disclaimer;$('explanation-mode').textContent=data.explanationMode;chart(r);$('results').hidden=false;
 $('status').textContent='Comparison ready. Read-only snapshot — not an execution plan.';
}
$('analyze-form').addEventListener('submit',async event=>{
 event.preventDefault();reset();const run=generation;controller=new AbortController();$('analyze').disabled=true;$('status').textContent='Reading the live pool and verifying its identity…';
 try {const input={mode:$('mode').value};if(input.mode==='nft')input.tokenId=$('token-id').value;
 const res=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:controller.signal});const data=await res.json();if(run!==generation)return;if(!res.ok)throw new Error(data.error||'Unable to analyze');render(data);
 }catch(error){if(run!==generation||error.name==='AbortError')return;$('results').hidden=true;$('status').className='error';$('status').textContent=error.message;}
 finally{if(run===generation)$('analyze').disabled=false;}
});
setInterval(()=>{if(loadedAt&&Date.now()/1000-loadedAt>180){$('status').className='error';$('status').textContent='This snapshot is now stale. Read again for a current comparison. Values below are historical.';}},10000);
