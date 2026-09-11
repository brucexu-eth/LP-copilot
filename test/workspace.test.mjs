import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {mkdtempSync,rmSync,statSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {openStore} from '../src/store.mjs';import {createWorkspace} from '../src/workspace.mjs';
const a='did:privy:alice',b='did:privy:bob';
test('durable user separation, idempotency and changed payload rejection',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'lp-store-')),path=join(dir,'app.sqlite');let db=openStore(path);let calls=0;
 const agent={configured:()=>true,run:async()=>{calls++;return {answer:'test fixture only',evidence:[]};}};let ws=createWorkspace({store:db,agent});const input={requestId:randomUUID(),question:'Compare'};
 try{
  await ws.chat(a,input);await ws.chat(a,input);assert.equal(calls,1);assert.equal(ws.history(b).length,0);await assert.rejects(ws.chat(a,{...input,question:'changed'}),{status:409});
  ws.close();db=openStore(path);ws=createWorkspace({store:db,agent});assert.equal(ws.history(a)[0].result.answer,'test fixture only');await ws.chat(a,input);assert.equal(calls,1);assert.equal(statSync(path).mode&0o777,0o600);
 }finally{ws.close();rmSync(dir,{recursive:true,force:true});}
});
test('concurrency and failed investigations do not masquerade as completed answers',async()=>{
 const db=openStore(':memory:');let release;const pending=new Promise(r=>release=r);const ws=createWorkspace({store:db,agent:{configured:()=>true,run:async()=>{await pending;throw Error('test failure');}}});const input={requestId:randomUUID(),question:'q'};
 try{const first=ws.chat(a,input);await assert.rejects(ws.chat(a,input),{status:409});release();await assert.rejects(first);assert.equal(ws.history(a)[0].state,'FAILED');await assert.rejects(ws.chat(a,input),{status:409});}finally{ws.close();}
});
