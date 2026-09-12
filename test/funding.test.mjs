import test from 'node:test';import assert from 'node:assert/strict';import {fundingQuote} from '../src/funding.mjs';
const wallet='0x000000000000000000000000000000000000dEaD',account={wallets:[{address:wallet}]},input={wallet,chainId:42161,amount:'100000000'};
test('unlinked identity and malformed quote requests fail before network',async()=>{
 for(const x of [{...input,wallet:'0x0000000000000000000000000000000000000001'},{...input,amount:'1e8'},{...input,chainId:1},{...input,recipient:wallet}])await assert.rejects(fundingQuote(account,x,{fetcher:()=>{throw Error('network must not run');}}),e=>e.status===400);
});
test('provider errors and mismatched envelopes fail closed without leaking data',async()=>{
 await assert.rejects(fundingQuote(account,input,{fetcher:async()=>({ok:false})}),e=>e.status===503);
 await assert.rejects(fundingQuote(account,input,{fetcher:async()=>({ok:true,text:async()=>JSON.stringify({action:{fromChainId:8453},transactionRequest:{data:'secret'}})})}),e=>e.status===503&&!e.message.includes('secret'));
});
