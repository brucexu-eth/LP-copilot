// Read-only public-testnet acceptance. Never signs or broadcasts.
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {existsSync,writeFileSync} from 'node:fs';
import {PrivyClient} from '@privy-io/node';
import {createPublicClient,http,parseAbi,keccak256} from 'viem';
import {baseSepolia} from 'viem/chains';
import {createTestnet,NETWORK} from '../src/testnet.mjs';
import {managedGraph} from '../src/managed-graph.mjs';
const db=new Database(new URL('../data/management.sqlite',import.meta.url).pathname,{readonly:true});
const m=db.prepare('select body from mandates order by rowid desc').all().map(r=>JSON.parse(r.body)).find(m=>m.status==='COMPLETED'&&m.job?.status==='COMPLETE');db.close();assert.ok(m,'No completed automatic run');
assert.equal(m.operations,1);assert.equal(m.proposal.plan.calls.length,7);assert.equal(m.events.filter(e=>e.event==='STEP_SUBMITTED').length,7);assert.ok(!m.events.some(e=>e.event==='AUTOMATIC_PAUSED'));
const c=createPublicClient({chain:baseSepolia,transport:http(NETWORK.rpc)});assert.equal(await c.getChainId(),84532);const transactions=[];
for(const [index,call] of m.proposal.plan.calls.entries()){assert.equal(call.status,'confirmed');const [tx,r]=await Promise.all([c.getTransaction({hash:call.hash}),c.getTransactionReceipt({hash:call.hash})]);assert.equal(r.status,'success');assert.equal(tx.from.toLowerCase(),m.wallet.toLowerCase());assert.equal(tx.to.toLowerCase(),call.to.toLowerCase());assert.equal(tx.value,0n);assert.equal(tx.input,call.data);assert.equal(keccak256(tx.input),m.proposal.grant.calls[index].dataHash);transactions.push({step:call.label,hash:call.hash,block:String(r.blockNumber),gasWei:String(r.gasUsed*r.effectiveGasPrice+BigInt(r.l1Fee||0))});}
const gasWei=transactions.reduce((a,t)=>a+BigInt(t.gasWei),0n);assert.ok(gasWei<=BigInt(m.maxTotalGasWei));
const abi=parseAbi(['function allowance(address,address) view returns(uint256)']);for(const token of [NETWORK.usdc,NETWORK.weth])assert.equal(await c.readContract({address:token,abi,functionName:'allowance',args:[m.wallet,NETWORK.manager]}),0n);
const privy=new PrivyClient({appId:process.env.PRIVY_APP_ID,appSecret:process.env.PRIVY_APP_SECRET});const wallet=await privy.wallets().get(m.proposal.grant.walletId);assert.equal(wallet.additional_signers.length,0);assert.ok(!existsSync(new URL('../data/temporary-signer-'+m.proposal.plan.id+'.json',import.meta.url)));
const t=createTestnet();try{const state=await t.state({userId:m.userId,wallets:m.wallets},m.wallet);assert.equal(state.positions.find(p=>p.tokenId===m.tokenId).liquidity,'0');const position=state.positions.find(p=>BigInt(p.liquidity)>0n);assert.ok(position);const report={verifiedAt:new Date().toISOString(),chainId:84532,wallet:m.wallet,planId:m.proposal.plan.id,trigger:m.job.trigger,oldTokenId:m.tokenId,newPosition:position,transactions,gasWei:String(gasWei),allowances:'zero',additionalSigners:0,localKeyDeleted:true,balances:state.balances,graph:await managedGraph(),limits:{provider:'Tokens, amounts, recipient, chain and expiry',application:'Exact calldata (including fee and ticks), call order, one operation and gas budget'},note:'Operator triggered; all seven steps then ran through the server without owner-wallet recovery.'};writeFileSync(new URL('../artifacts/automatic-acceptance.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({newTokenId:position.tokenId,transactions:transactions.length,gasWei:report.gasWei,graph:report.graph.status,signers:0}));}finally{t.close();}
