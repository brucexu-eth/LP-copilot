import test from 'node:test';import assert from 'node:assert/strict';import {createApp} from '../server.mjs';
test('funding quote retains auth, method and origin gates',async()=>{
 let calls=0;const app=createApp({auth:{session:async()=>{throw Object.assign(Error('denied'),{status:401,expose:true});}},fundingQuote:async()=>{calls++;}});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${app.address().port}/api/funding-quote`;
 try{assert.equal((await fetch(url)).status,405);assert.equal((await fetch(url,{method:'POST',headers:{origin:'https://evil.example'}})).status,403);assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);assert.equal(calls,0);}finally{await new Promise(r=>app.close(r));}
});
