import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {createApp} from '../server.mjs';import {simulationService} from '../src/simulation-http.mjs';
const boot=async(enabled)=>{const s=createApp({simulation:simulationService({enabled,path:':memory:',interval:20})});await new Promise(r=>s.listen(0,'127.0.0.1',r));return {s,url:`http://127.0.0.1:${s.address().port}`};};
test('lab opt-in, loopback host, cross-origin and malformed input gates do not affect real auth',async()=>{
 const {s,url}=await boot(true);try{
 assert.equal((await fetch(url+'/lab')).status,200);const hostProbe=await new Promise((resolve,reject)=>{import('node:http').then(({get})=>get(url+'/lab',{headers:{host:'evil.example'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject));});assert.equal(hostProbe,404);
 assert.equal((await fetch(url+'/api/simulation')).status,401);assert.equal((await fetch(url+'/api/me')).status,503);
 const post=(body,headers={})=>fetch(url+'/api/simulation',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
 assert.equal((await post({action:'INIT'},{origin:'https://evil.example'})).status,403);
 assert.equal((await post({action:'INIT',address:'anything'})).status,400);
 const a=await post({action:'INIT'}),cookie=a.headers.get('set-cookie').split(';')[0];assert.match(a.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);assert.equal((await a.json()).mode,'SIMULATION');
 const b=await post({action:'INIT'}),cookieB=b.headers.get('set-cookie').split(';')[0];assert.notEqual(cookie,cookieB);
 const req={requestId:randomUUID(),action:'FUND',amount:10000};assert.equal((await post(req,{cookie})).status,200);assert.equal((await post(req,{cookie})).status,200);
 const resultB=await (await fetch(url+'/api/simulation',{headers:{cookie:cookieB}})).json();assert.equal(resultB.cash,0);assert.equal(resultB.job,null);
 assert.equal((await fetch(url+'/api/me',{headers:{cookie}})).status,503);
 assert.equal((await post({requestId:randomUUID(),action:'FUND',amount:10000,privateKey:'NOT_A_KEY'},{cookie})).status,400);
 assert.equal((await post({requestId:randomUUID(),action:'ENTER',amount:1000},{cookie:'lp_sim=bad'})).status,400);
 }finally{await new Promise(r=>s.close(r));}
});
test('disabled lab rejects page, assets, and API without creating a database',async()=>{const {s,url}=await boot(false);try{for(const path of ['/lab','/lab.js','/lab.css','/api/simulation'])assert.equal((await fetch(url+path)).status,404);}finally{await new Promise(r=>s.close(r));}});
