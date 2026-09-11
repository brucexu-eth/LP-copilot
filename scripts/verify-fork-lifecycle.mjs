// Local fork only. No private keys and no configurable remote execution endpoint.
import assert from 'node:assert/strict';
import {createPublicClient,http,encodeFunctionData,parseAbi,parseEventLogs} from 'viem';
import {readPool,readPosition} from '../src/data.mjs';
import {buildUnsignedOperation,executionAbi} from '../src/transactions.mjs';
import {USDC,WETH,POOL,MANAGER} from '../src/config.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const rpc='http://127.0.0.1:18549';
const c=createPublicClient({transport:http(rpc,{timeout:30000,retryCount:0}),pollingInterval:100});
const chain=await c.getChainId();assert.equal(chain,31337,'Refuse any non-fork chain');
const version=await c.request({method:'web3_clientVersion'});assert.match(version,/anvil/i);
const [wallet]=await c.request({method:'eth_accounts'});assert.ok(wallet);
const receipts=[];
async function send(from,to,data,value='0x0'){
 assert.equal(await c.getChainId(),31337);await c.call({account:from,to,data,value:BigInt(value)});
 const hash=await c.request({method:'eth_sendTransaction',params:[{from,to,data,value,gas:'0x989680'}]});
 const receipt=await c.waitForTransactionReceipt({hash,timeout:45000});assert.equal(receipt.status,'success');receipts.push({hash,block:receipt.blockNumber.toString(),gasUsed:receipt.gasUsed.toString()});return receipt;
}
const tokenAbi=parseAbi(['function transfer(address,uint256) returns(bool)','function balanceOf(address) view returns(uint256)','function approve(address,uint256) returns(bool)']);
// Bootstrap disposable balances by impersonating a contract only inside Anvil.
await c.request({method:'anvil_impersonateAccount',params:[POOL]});
await c.request({method:'anvil_setBalance',params:[POOL,'0xde0b6b3a7640000']});
await send(POOL,USDC,encodeFunctionData({abi:tokenAbi,functionName:'transfer',args:[wallet,2000000000n]}));
await c.request({method:'anvil_stopImpersonatingAccount',params:[POOL]});
await send(wallet,WETH,'0xd0e30db0','0xde0b6b3a7640000');
let tokenId;
const steps=[];
async function operation(action,extra={}){
 const state=await readPool(c,{expectedChainId:31337});
 const position=tokenId?await readPosition(tokenId,state,c):undefined;
 const owner=tokenId?await c.readContract({address:MANAGER,abi:executionAbi,functionName:'ownerOf',args:[BigInt(tokenId)]}):wallet;
 const center=Math.round(state.tick/60)*60;
 const plan=buildUnsignedOperation({action,wallet,tokenId,slippageBps:50,deadline:Math.floor(Date.now()/1000)+300,tickLower:center-1200,tickUpper:center+1200,usdcRaw:'500000000',wethRaw:'300000000000000000',...extra},{state,position,owner,expectedChainId:31337});
 let receipt;for(const call of plan.calls)receipt=await send(wallet,call.to,call.data);
 if(action==='ENTER'){
  const events=parseEventLogs({abi:executionAbi,logs:receipt.logs,eventName:'Transfer'}).filter(e=>e.address.toLowerCase()===MANAGER.toLowerCase()&&e.args.to.toLowerCase()===wallet.toLowerCase());assert.equal(events.length,1);tokenId=events[0].args.tokenId.toString();
 }
 const current=await readPosition(tokenId,await readPool(c,{expectedChainId:31337}),c);
 assert.equal((await c.readContract({address:MANAGER,abi:executionAbi,functionName:'ownerOf',args:[BigInt(tokenId)]})).toLowerCase(),wallet.toLowerCase());
 steps.push({action,tokenId,liquidity:current.liquidity,storedTokensOwed:current.storedTokensOwed});return current;
}
const entry=await operation('ENTER');assert.ok(BigInt(entry.liquidity)>0n);
const reduced=await operation('DECREASE',{fractionBps:5000});assert.ok(BigInt(reduced.liquidity)<BigInt(entry.liquidity));
await operation('COLLECT');
const increased=await operation('INCREASE',{usdcRaw:'100000000',wethRaw:'100000000000000000'});assert.ok(BigInt(increased.liquidity)>BigInt(reduced.liquidity));
await operation('DECREASE',{fractionBps:10000});const exited=await operation('COLLECT');assert.equal(exited.liquidity,'0');assert.deepEqual(exited.storedTokensOwed,{usdcRaw:'0',wethRaw:'0'});
// A new entry after full exit rehearses the non-atomic same-pool reposition boundary.
tokenId=undefined;const reentry=await operation('ENTER',{usdcRaw:'100000000',wethRaw:'100000000000000000'});assert.ok(BigInt(reentry.liquidity)>0n);
await operation('DECREASE',{fractionBps:10000});await operation('COLLECT');
for(const token of [USDC,WETH])await send(wallet,token,encodeFunctionData({abi:tokenAbi,functionName:'approve',args:[MANAGER,0n]}));
const balances={};for(const [symbol,address] of [['USDC',USDC],['WETH',WETH]])balances[symbol]=(await c.readContract({address,abi:tokenAbi,functionName:'balanceOf',args:[wallet]})).toString();
const report={environment:'isolated Anvil Ethereum fork, chain 31337; test-only funding/impersonation',wallet,steps,receipts,remainingBalancesRaw:balances,mainnetTransactions:0,privySigningTested:false};
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});await writeFile(new URL('../artifacts/fork-lifecycle.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
