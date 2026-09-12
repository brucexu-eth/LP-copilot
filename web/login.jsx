import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PrivyProvider,usePrivy} from '@privy-io/react-auth';
import {Research} from './Research.jsx';
import {Wallets} from './Wallets.jsx';
import {Funding} from './Funding.jsx';

function Account(){
 const {ready,authenticated,login,logout,getAccessToken,user}=usePrivy();
 const [account,setAccount]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true;setAccount(null);setError('');
  if(ready&&authenticated) (async()=>{
   try {
    const token=await getAccessToken();
    if(!token) throw Error('Session unavailable. Sign in again.');
    const response=await fetch('/api/me',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
    const data=await response.json();if(!response.ok) throw Error(data.error||'Account unavailable.');
    if(active)setAccount(data);
   }catch(e){if(active)setError(e.message);}
  })();
  return ()=>{active=false;};
 },[ready,authenticated,user?.id,getAccessToken,attempt]);
 if(!ready)return <p role="status">Loading Privy…</p>;
 return <><div className="section-head"><h2>Your account</h2><span className="badge">SIGNING DISABLED</span></div>
 {!authenticated?<button onClick={login}>Sign in with Privy</button>:<>
 <p>Signed in: {user?.id}</p><button onClick={()=>{setAccount(null);setError('');logout();}}>Sign out</button>
 {error?<p role="alert">{error} <button onClick={()=>setAttempt(x=>x+1)}>Retry account lookup</button></p>:(!account||account.userId!==user?.id)?<p role="status">Verifying account…</p>:<>
 <p>Backend-verified account. {account.wallets.length?'Linked Ethereum wallets:':'No linked Ethereum wallet yet.'}</p>
 <ul>{account.wallets.map(w=><li key={w.walletId||w.address}>{w.address} — {w.clientType||'external'}</li>)}</ul><Wallets key={account.userId+attempt} account={account} getAccessToken={getAccessToken} onChanged={()=>setAttempt(x=>x+1)}/><Funding key={'funding-'+account.userId} account={account} getAccessToken={getAccessToken}/><Research key={account.userId} getAccessToken={getAccessToken}/></>}
 </>}
 <p className="muted">Login does not grant transaction authority. Wallet creation requires your explicit click. Funding, signing and delegated management remain disabled.</p></>;
}
const root=createRoot(document.getElementById('auth-root'));
fetch('/api/config',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();return r.json();}).then(config=>{
 if(!config.privyAppId){root.render(<p>Privy is not configured. Public read-only analysis remains available.</p>);return;}
 root.render(<PrivyProvider appId={config.privyAppId} config={{loginMethods:['email'],externalWallets:{disableAllExternalWallets:true,walletConnect:{enabled:false}},embeddedWallets:{ethereum:{createOnLogin:'off'}}}}><Account/></PrivyProvider>);
}).catch(()=>root.render(<p role="alert">Account configuration unavailable. Reload to retry.</p>));
