import React,{useState,useEffect} from 'react';
import {useCreateWallet} from '@privy-io/react-auth';
export function Wallets({account,getAccessToken,onChanged}){
 const {createWallet}=useCreateWallet();const [busy,setBusy]=useState(false),[error,setError]=useState(''),[data,setData]=useState(null);
 useEffect(()=>{let active=true;(async()=>{try{const token=await getAccessToken();const r=await fetch('/api/wallets',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error);if(active)setData(d);}catch(e){if(active)setError(e.message);}})();return()=>{active=false;};},[account,getAccessToken]);
 async function create(){
  if(!window.confirm('Create your own Ethereum embedded wallet in Privy? This does not add an app signer, fund the wallet or authorize transactions.'))return;
  setBusy(true);setError('');try{await createWallet({createAdditional:false,signers:[]});onChanged();}catch{setError('Wallet creation not confirmed. Refresh your account before retrying.');}finally{setBusy(false);}
 }
 return <section aria-label="Wallet balances"><h3>Ethereum wallets</h3>{error&&<p role="alert">{error}</p>}
 {!account.wallets.some(w=>w.clientType==='privy')&&<button disabled={busy} onClick={create}>{busy?'Creating wallet…':'Create my Privy wallet'}</button>}
 {data?<><p>RPC block {data.blockNumber} · No signing authority granted</p><ul>{data.wallets.map(w=><li key={w.walletId||w.address}><strong>{w.address}</strong><p>{w.balances.ETH} ETH · {w.balances.USDC} USDC · {w.balances.WETH} WETH</p></li>)}</ul></>:<p>Wallet balances have not been verified yet.</p>}
 </section>;
}
