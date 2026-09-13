import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PrivyProvider,usePrivy} from '@privy-io/react-auth';
import {baseSepolia} from 'viem/chains';
import {Terminal} from './Terminal.jsx';
function Account(){
 const {ready,authenticated,login,logout,getAccessToken,user}=usePrivy();
 const [account,setAccount]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;setAccount(null);setError('');if(ready&&authenticated)(async()=>{try{const token=await getAccessToken(),r=await fetch('/api/me',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.error);if(live)setAccount(data);}catch(e){if(live)setError(e.message);}})();return()=>{live=false;};},[ready,authenticated,user?.id,getAccessToken]);
 return <Terminal account={account} accountError={error} getAccessToken={getAccessToken} login={login} logout={logout} authenticated={authenticated}/>;
}
const root=createRoot(document.getElementById('auth-root'));
fetch('/api/config',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();return r.json();}).then(config=>{
 if(!config.privyAppId){root.render(<p>Configure Privy to open the workspace.</p>);return;}
 root.render(<PrivyProvider appId={config.privyAppId} config={{loginMethods:['email'],defaultChain:baseSepolia,supportedChains:[baseSepolia],externalWallets:{disableAllExternalWallets:true,walletConnect:{enabled:false}},embeddedWallets:{ethereum:{createOnLogin:'users-without-wallets'}}}}><Account/></PrivyProvider>);
}).catch(()=>root.render(<p role="alert">Account configuration unavailable. Reload to retry.</p>));
