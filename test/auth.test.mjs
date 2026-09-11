import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT} from 'jose';
import {createAuth} from '../src/auth.mjs';
import {createApp} from '../server.mjs';
const appId='test-app',userId='did:privy:alice';
const {privateKey,publicKey}=await generateKeyPair('ES256');
async function token(overrides={}) {
 return new SignJWT({sid:'session',...overrides}).setProtectedHeader({alg:'ES256',typ:'JWT'}).setIssuer('privy.io').setAudience(overrides.aud||appId).setSubject(overrides.sub||userId).setIssuedAt().setExpirationTime(overrides.exp||'1h').sign(privateKey);
}
test('HTTP auth boundary ignores supplied wallet identity, forbids writes and conceals secrets',async()=>{
 const s=createApp({auth:auth()});await new Promise(r=>s.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${s.address().port}`;
 try {
  assert.equal((await fetch(url+'/api/me')).status,401);
  const r=await fetch(url+'/api/me?userId=did:privy:bob&walletId=someone-else',{headers:{Authorization:'Bearer '+await token()}});
  assert.equal(r.status,200);assert.equal((await r.json()).userId,userId);
  assert.equal((await fetch(url+'/api/me',{method:'POST'})).status,405);
  assert.equal((await fetch(url+'/api/send',{method:'POST'})).status,404);
  assert.ok(!(await (await fetch(url+'/api/config')).text()).includes('never-return-this'));
  assert.equal((await fetch(url+'/.env')).status,404);
  assert.equal((await fetch(url+'/auth-assets/%2e%2e%2f.env')).status,404);
  assert.equal((await fetch(url+'/',{method:'HEAD'})).status,200);
 }finally{await new Promise(r=>s.close(r));}
});
const env={PRIVY_APP_ID:appId,PRIVY_APP_SECRET:'never-return-this',PRIVY_ALLOWED_USER_IDS:userId};
function auth(extra={}){return createAuth(env,{verificationKey:publicKey,getUser:async id=>({id,linked_accounts:[{type:'wallet',chain_type:'ethereum',address:'0x123',id:'wallet-1',wallet_client_type:'privy'},{type:'email',address:'private@example.com'}]}),...extra});}
test('missing configuration fails closed; public config contains no secret',async()=>{
 const a=createAuth({});assert.equal(a.publicConfig().privyAppId,null);await assert.rejects(a.session('Bearer x'),{status:503});
 assert.ok(!JSON.stringify(auth().publicConfig()).includes(env.PRIVY_APP_SECRET));
});
test('verified subject resolves only its own wallets with minimal data',async()=>{
 let requested;const a=auth({getUser:async id=>{requested=id;return {id,linked_accounts:[{type:'wallet',chain_type:'ethereum',address:'0x123',id:'wallet-1'},{type:'email',address:'private@example.com'}]};}});
 const result=await a.session('Bearer '+await token());assert.equal(requested,userId);assert.equal(result.userId,userId);assert.equal(result.wallets.length,1);assert.equal(result.execution,'disabled');assert.ok(!JSON.stringify(result).includes('private@example.com'));
});
test('reject missing, forged, expired, other-app tokens and unauthorized users',async()=>{
 for(const value of [undefined,'Bearer forged','Basic x','Bearer '+await token({aud:'other-app'}),'Bearer '+await token({exp:1})]) await assert.rejects(auth().session(value),{status:401});
 await assert.rejects(auth().session('Bearer '+await token({sub:'did:privy:bob'})),{status:403});
 await assert.rejects(createAuth({...env,PRIVY_ALLOWED_USER_IDS:''},{verificationKey:publicKey}).session('Bearer '+await token()),{status:403});
});
test('upstream failures and mismatched users fail closed without leaking data',async()=>{
 await assert.rejects(auth({getUser:async()=>{throw Error('credential secret');}}).session('Bearer '+await token()),{status:503,message:'Wallet lookup unavailable. Retry later.'});
 await assert.rejects(auth({getUser:async()=>({id:'did:privy:bob'})}).session('Bearer '+await token()),{status:503});
});
