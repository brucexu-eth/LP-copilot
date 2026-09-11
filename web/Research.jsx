import React,{useEffect,useRef,useState} from 'react';
export function Research({getAccessToken}){
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
 return <section aria-label="LP research"><h2>Investigate this position</h2>
 <p className="muted">AI reads evidence and calls deterministic calculations. It cannot approve or execute transactions. Questions and results are saved privately to this account.</p>
 <form onSubmit={submit}><label htmlFor="research-question">Your question</label><textarea id="research-question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={4000} rows={4} placeholder="If ETH falls, compare keeping, widening and exiting the learning position." disabled={busy}/><button disabled={busy||!question.trim()}>{busy?'Investigating…':'Ask LP Copilot'}</button></form>
 {error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={()=>refresh().catch(e=>setError(e.message))}>Refresh saved research</button>
 <div aria-live="polite">{items.map(item=><article className="research-answer" key={item.requestId}><h3>{item.question}</h3><p>{item.state}</p>{item.result&&<>
 {item.result.syntheticHistory&&<p className="callout">MOCK HISTORY — invented development data. Not live market evidence. Execution disabled.</p>}
 <p className="muted">Model: {item.result.model} · Signing disabled</p><div className="research-text">{item.result.answer}</div>
 <details><summary>Tool evidence and calculations</summary><pre>{JSON.stringify(item.result.evidence,null,2)}</pre></details></>}
 {item.state==='INTERRUPTED'&&<p>Process interruption or timeout. No completed answer was recorded. Submit a new question to retry.</p>}</article>)}</div>
 </section>;
}
