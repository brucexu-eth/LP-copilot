import React,{useState,useEffect} from 'react';
import {useCreateWallet} from '@privy-io/react-auth';
export function Wallets({account,getAccessToken,onChanged}){
 const {createWallet}=useCreateWallet();const [busy,setBusy]=useState(false),[error,setError]=useState(''),[data,setData]=useState(null);
 useEffect(()=>{let active=true;(async()=>{try{const token=await getAccessToken();const r=await fetch('/api/wallets',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error);if(active)setData(d);}catch(e){if(active)setError(e.message);}})();return()=>{active=false;};},[account,getAccessToken]);
 async function create(){
  if(!window.confirm('Create your own Ethereum embedded wallet in Privy? This does not add an app signer, fund the wallet or authorize transactions.'))return;
  setBusy(true);setError('');try{await createWallet({createAdditional:false,signers:[]});onChanged();}catch{setError('Wallet creation not confirmed. Refresh your account before retrying.');}finally{setBusy(false);}
 }
 return <section aria-label="Wallet balances" className="wallet-workspace"><p className="eyebrow">YOUR WALLET</p><h2>Connected. Always yours.</h2><p className="muted">Ethereum mainnet balances, verified through RPC. No signing authority is granted.</p>{error&&<p className="callout" role="alert">{error}</p>}
 {!account.wallets.some(w=>w.clientType==='privy')&&<button disabled={busy} onClick={create}>{busy?'Creating wallet…':'Create my Privy wallet'}</button>}
 {data?<>{data.wallets.map(w=><article className="wallet-card" key={w.walletId||w.address}><div className="wallet-card-top"><span className="wallet-address">{w.address.slice(0,8)}…{w.address.slice(-6)}</span><span className="badge">{w.clientType==='privy'?'PRIVY WALLET':'ETHEREUM WALLET'}</span></div><div className="balance-grid">{['ETH','USDC','WETH'].map(t=><div key={t}><small>{t}</small><strong>{Number(w.balances[t]).toLocaleString('en-US',{maximumFractionDigits:6})}</strong></div>)}</div><details><summary>Wallet address & verification</summary><p>{w.address}</p><p>RPC block {data.blockNumber}</p></details></article>)}{!data.wallets.length&&<p className="muted">Create a wallet to see your balances here.</p>}</>:<p role="status" className="muted">Verifying wallet balances…</p>}
 </section>;
}
