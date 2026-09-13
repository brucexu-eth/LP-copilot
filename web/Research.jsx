import React,{useEffect,useRef,useState} from 'react';
import {PlanRehearsal} from './PlanRehearsal.jsx';
export function Research({getAccessToken,simulationEnabled=false}){
 const [question,setQuestion]=useState(''),[items,setItems]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const mounted=useRef(true),controller=useRef(null);
 async function api(path,options={}){
  const token=await getAccessToken();if(!token)throw Error('Sign in again.');
  const r=await fetch(path,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers},cache:'no-store'});
  const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed.');return data;
 }
 async function refresh(){const data=await api('/api/conversations');if(mounted.current)setItems(data.items);}
 useEffect(()=>{mounted.current=true;refresh().catch(e=>{if(mounted.current)setError(e.message);});return()=>{mounted.current=false;controller.current?.abort();};},[]);
 async function submit(e){
  e.preventDefault();if(busy||!question.trim())return;setBusy(true);setError('');controller.current=new AbortController();
  try{await api('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,requestId:crypto.randomUUID()}),signal:controller.current.signal});if(mounted.current){setQuestion('');await refresh();}}
  catch(e){if(mounted.current)setError(e.name==='AbortError'?'Browser request stopped; the server may still finish. Refresh history before retrying.':e.message);}
  finally{if(mounted.current)setBusy(false);}
 }
 const prompts=['What happens if ETH falls?','Compare holding, widening and exiting.','Explain the costs and missing evidence.'];
 return <section aria-label="LP research" className="research-workspace">
 <div className="research-intro"><div><p className="eyebrow">ASK. COMPARE. UNDERSTAND.</p><h2>Explore the possibilities.</h2><p>Live pool data. The same starting inventory. Three ways forward.</p></div><span className="badge">AI + ONCHAIN EVIDENCE</span></div>
 <form onSubmit={submit} className="research-composer"><label htmlFor="research-question">Your question</label><textarea id="research-question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={4000} rows={3} placeholder="If ETH drops, how would my LP position change?" disabled={busy}/><div className="composer-bottom"><span>Research only · No transactions</span><button disabled={busy||!question.trim()}>{busy?'Investigating…':'Ask LP Copilot ↗'}</button></div></form>
 <div className="prompt-chips">{prompts.map(p=><button key={p} disabled={busy} onClick={()=>setQuestion(p)}>{p}</button>)}</div>
 {error&&<p className="callout" role="alert">{error}</p>}
 <div className="section-head history-heading"><h3>Saved research <span className="count">{items.length}</span></h3><button className="text-button" disabled={busy} onClick={()=>refresh().catch(e=>setError(e.message))}>Refresh</button></div>
 {!items.length&&<div className="empty-state"><span>↗</span><h3>Your next insight starts here.</h3><p>Ask about a hypothetical position or a public NFT. Your research is saved to your account.</p></div>}
 <div aria-live="polite">{[...items].reverse().map((item,index)=>{const evidence=item.result?.evidence?.at(-1),state=evidence?.state,result=evidence?.result;return <article className="research-answer" key={item.requestId}>
 <div className="report-heading"><div><p className="eyebrow">RESEARCH NOTE {String(index+1).padStart(2,'0')}</p><h3>{/[^\x00-\x7F]/.test(item.question)?'Position outlook & alternatives':item.question}</h3></div><span className="badge">{item.state==='COMPLETE'?'READY TO REVIEW':item.state}</span></div>
 {item.result&&<>
 <div className="report-metrics"><div><small>Pool</small><strong>USDC / WETH</strong></div><div><small>Fee tier</small><strong>{state?state.fee/10000+'%':'—'}</strong></div><div><small>WETH price</small><strong>{Number.isFinite(result?.priceUsdc)?new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(result.priceUsdc)+' USDC':'—'}</strong></div><div><small>Evidence</small><strong>{evidence?.history?.synthetic?'Mock history':evidence?.history?.status==='verified'?'Live RPC + Graph':'Live RPC only'}</strong></div></div>
 {item.result.syntheticHistory&&<p className="callout">MOCK history is invented development data, not market evidence.</p>}
 {item.result.plans?.length>0&&<section aria-label="Evidence-backed candidates"><div className="plan-grid">{item.result.plans.map(plan=><article className={'plan-card plan-'+plan.action.toLowerCase()} key={plan.action}><span className="plan-label">{plan.action}</span><h4>{plan.action==='HOLD'?'Stay the course':plan.action==='WIDEN'?'Give it more room':'Step out of liquidity'}</h4><p>{plan.explanation}</p><div className="plan-range"><small>{plan.range?'PRICE RANGE · USDC / WETH':'WITHDRAWAL INVENTORY'}</small><strong>{plan.range?`${plan.range.low.toLocaleString('en-US',{maximumFractionDigits:0})} — ${plan.range.high.toLocaleString('en-US',{maximumFractionDigits:0})}`:'USDC + WETH'}</strong></div>{simulationEnabled&&plan.action==='WIDEN'&&plan.range&&<PlanRehearsal plan={plan}/>}</article>)}</div><p className="muted">Same starting inventory. Comparisons only; fees and execution costs are excluded.</p></section>}
 <details className="report-detail"><summary>Read the analysis <span>↗</span></summary><div className="research-text">{item.result.reportVersion===1?item.result.answer:'This legacy report needs a new investigation to pass the current fact checks.'}</div></details>
 <details className="report-detail"><summary>Sources & verification</summary><dl className="source-list"><dt>RPC block</dt><dd>{state?.blockNumber||'Unavailable'}</dd><dt>History</dt><dd>{evidence?.history?.status||'Unavailable'}</dd><dt>Block hash</dt><dd>{evidence?.history?.graphHashVerified?'Verified':'Not provided by Graph; execution is ineligible'}</dd><dt>Model</dt><dd>{item.result.model}</dd><dt>Position</dt><dd>{result?.position?.kind==='hypothetical'?'Hypothetical learning position':'Public NFT; ownership is not established'}</dd></dl></details>
 </>}
 {item.state==='FAILED'&&<p className="muted">This attempt did not pass verification. Submit your question again to start a new investigation.</p>}
 {item.state==='INTERRUPTED'&&<p>Research was interrupted. Submit a new question to retry.</p>}
 </article>})}</div></section>;
}
