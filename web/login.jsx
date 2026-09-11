import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PrivyProvider,usePrivy} from '@privy-io/react-auth';

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
 {error?<p role="alert">{error} <button onClick={()=>setAttempt(x=>x+1)}>Retry account lookup</button></p>:!account?<p role="status">Verifying account…</p>:<>
 <p>Backend-verified account. {account.wallets.length?'Linked Ethereum wallets:':'No linked Ethereum wallet yet.'}</p>
 <ul>{account.wallets.map(w=><li key={w.walletId||w.address}>{w.address} — {w.clientType||'external'}</li>)}</ul></>}
 </>}
 <p className="muted">Login does not authorize wallet operations. Wallet creation, funding and delegated management are not enabled in this build.</p></>;
}
const root=createRoot(document.getElementById('auth-root'));
fetch('/api/config',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();return r.json();}).then(config=>{
 if(!config.privyAppId){root.render(<p>Privy is not configured. Public read-only analysis remains available.</p>);return;}
 root.render(<PrivyProvider appId={config.privyAppId} config={{loginMethods:['email'],externalWallets:{disableAllExternalWallets:true,walletConnect:{enabled:false}},embeddedWallets:{ethereum:{createOnLogin:'off'}}}}><Account/></PrivyProvider>);
}).catch(()=>root.render(<p role="alert">Account configuration unavailable. Reload to retry.</p>));
