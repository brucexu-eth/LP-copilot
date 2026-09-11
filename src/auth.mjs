import {PrivyClient,verifyAccessToken} from '@privy-io/node';

function failure(status,message){return Object.assign(new Error(message),{status,expose:true});}
export function createAuth(env=process.env,adapters={}) {
 const appId=env.PRIVY_APP_ID||null;
 const configured=Boolean(appId&&env.PRIVY_APP_SECRET);
 const allowed=new Set((env.PRIVY_ALLOWED_USER_IDS||'').split(',').map(x=>x.trim()).filter(Boolean));
 let client;
 const sdk=()=>client??=new PrivyClient({appId,appSecret:env.PRIVY_APP_SECRET,timeout:10000,maxRetries:0});
 return {
  publicConfig:()=>({privyAppId:configured?appId:null,execution:'disabled',operatorAccessConfigured:allowed.size>0}),
  async session(authorization) {
   if(!configured) throw failure(503,'Privy is not configured.');
   if(typeof authorization!=='string'||!/^Bearer [A-Za-z0-9_.-]+$/.test(authorization)||authorization.length>8192) throw failure(401,'Sign in with Privy.');
   let claims;
   try {
    const token=authorization.slice(7);
    claims=adapters.verificationKey
     ? await verifyAccessToken({access_token:token,app_id:appId,verification_key:adapters.verificationKey})
     : await sdk().utils().auth().verifyAccessToken(token);
    if(typeof claims.user_id!=='string'||!claims.user_id.startsWith('did:privy:')) throw Error('Invalid subject');
   } catch {throw failure(401,'Invalid or expired Privy session.');}
   if(!allowed.has(claims.user_id)) throw failure(403,'Operator access not enabled for this account.');
   let user;
   try {
    user=await (adapters.getUser?adapters.getUser(claims.user_id):sdk().users()._get(claims.user_id));
    if(user.id!==claims.user_id) throw Error('Subject mismatch');
   } catch {throw failure(503,'Wallet lookup unavailable. Retry later.');}
   const wallets=(user.linked_accounts||[]).filter(a=>a.type==='wallet'&&a.chain_type==='ethereum').map(a=>({address:a.address,walletId:a.id||null,clientType:a.wallet_client_type||null}));
   return {userId:claims.user_id,wallets,execution:'disabled'};
  }
 };
}
