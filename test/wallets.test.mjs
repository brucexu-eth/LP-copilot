import test from 'node:test';import assert from 'node:assert/strict';import {walletBalances} from '../src/wallets.mjs';
const wallets=[{address:'0x0000000000000000000000000000000000000001'}];
const c={getChainId:async()=>1,getBlock:async()=>({number:42n,timestamp:BigInt(Math.floor(Date.now()/1000))}),getBalance:async()=>1000000000000000000n,multicall:async()=>[1000000n,2000000000000000000n]};
test('wallet balances pin a block, keep integer precision, and reject wrong chain/failure',async()=>{
 const r=await walletBalances(wallets,c);assert.equal(r.blockNumber,'42');assert.deepEqual(r.wallets[0].balances,{ETH:'1',USDC:'1',WETH:'2'});
 await assert.rejects(walletBalances(wallets,{...c,getChainId:async()=>137}));await assert.rejects(walletBalances(wallets,{...c,multicall:async()=>{throw Error('unavailable');}}));await assert.rejects(walletBalances([{address:'invalid'}],c));
});
