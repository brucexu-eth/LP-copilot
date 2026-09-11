import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {createApp} from '../server.mjs';import {createWorkspace} from '../src/workspace.mjs';import {openStore} from '../src/store.mjs';
const auth={publicConfig:()=>({privyAppId:null}),session:async h=>{if(!['Bearer alice','Bearer bob'].includes(h))throw Object.assign(Error('test unauthorized'),{status:401,expose:true});return {userId:'did:privy:'+h.slice(7),wallets:[]};}};
async function withApp(agent,run){const workspace=createWorkspace({store:openStore(':memory:'),agent});const s=createApp({auth,workspace});await new Promise(r=>s.listen(0,'127.0.0.1',r));try{await run(`http://127.0.0.1:${s.address().port}`);}finally{await new Promise(r=>s.close(r));}}
const post=(url,body,headers={})=>fetch(url+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer alice',...headers},body:JSON.stringify(body)});
test('private chat/history auth, subject isolation, explicit body shape and replay',()=>withApp({configured:()=>true,run:async()=>({answer:'fixture',evidence:[]})},async url=>{
 assert.equal((await fetch(url+'/api/conversations')).status,401);assert.equal((await fetch(url+'/api/chat')).status,405);
 const input={question:'question',requestId:randomUUID()};assert.equal((await post(url,input,{Origin:'https://evil.example'})).status,403);assert.equal((await post(url,{...input,userId:'did:privy:bob'})).status,400);
 assert.equal((await post(url,input)).status,200);assert.equal((await post(url,input)).status,200);
 const own=await (await fetch(url+'/api/conversations?userId=did:privy:bob',{headers:{Authorization:'Bearer alice'}})).json();assert.equal(own.items.length,1);
 const other=await (await fetch(url+'/api/conversations?userId=did:privy:alice',{headers:{Authorization:'Bearer bob'}})).json();assert.equal(other.items.length,0);
}));
test('upstream status-bearing errors cannot leak provider secrets',()=>withApp({configured:()=>true,run:async()=>{throw Object.assign(Error('https://provider/secret-key'),{status:503});}},async url=>{const r=await post(url,{question:'q',requestId:randomUUID()});assert.equal(r.status,503);assert.ok(!(await r.text()).includes('secret-key'));}));
