// Read-only acceptance: no private keys, wallet providers or send methods.
import assert from 'node:assert/strict';
import {createPublicClient,http,parseAbi} from 'viem';
import {baseSepolia} from 'viem/chains';
import Database from 'better-sqlite3';
import {mkdir,writeFile} from 'node:fs/promises';
import {NETWORK} from '../src/testnet.mjs';
const wallet='0xEB22BD75B27F1Ae0557EC67F8b3f064955079102',tokenId=82157n;
const c=createPublicClient({chain:baseSepolia,transport:http(NETWORK.rpc,{timeout:15000,retryCount:1})});assert.equal(await c.getChainId(),84532);
const abi=parseAbi(['function ownerOf(uint256) view returns(address)','function positions(uint256) view returns(uint96,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)','function allowance(address,address) view returns(uint256)','function balanceOf(address) view returns(uint256)']);
const [owner,p,usdcAllowance,wethAllowance,usdc,weth,eth]=await Promise.all([
 c.readContract({address:NETWORK.manager,abi,functionName:'ownerOf',args:[tokenId]}),c.readContract({address:NETWORK.manager,abi,functionName:'positions',args:[tokenId]}),...['usdc','weth'].map(k=>c.readContract({address:NETWORK[k],abi,functionName:'allowance',args:[wallet,NETWORK.manager]})),...['usdc','weth'].map(k=>c.readContract({address:NETWORK[k],abi,functionName:'balanceOf',args:[wallet]})),c.getBalance({address:wallet})]);
assert.equal(owner.toLowerCase(),wallet.toLowerCase());assert.equal(p[2].toLowerCase(),NETWORK.usdc.toLowerCase());assert.equal(p[3].toLowerCase(),NETWORK.weth.toLowerCase());assert.equal(p[4],500);assert.equal(p[7],0n);assert.equal(p[10],0n);assert.equal(p[11],0n);assert.equal(usdcAllowance,0n);assert.equal(wethAllowance,0n);
const db=new Database(new URL('../data/testnet.sqlite',import.meta.url).pathname,{readonly:true});const plans=db.prepare('SELECT body FROM testnet_plans ORDER BY rowid').all().map(r=>JSON.parse(r.body)).filter(p=>p.wallet.toLowerCase()===wallet.toLowerCase()&&p.calls.some(c=>c.hash));db.close();
const transactions=[];for(const plan of plans){for(const call of plan.calls){assert.ok(call.hash,'Unfinished operation');const [tx,r]=await Promise.all([c.getTransaction({hash:call.hash}),c.getTransactionReceipt({hash:call.hash})]);assert.equal(tx.from.toLowerCase(),wallet.toLowerCase());assert.equal(tx.to.toLowerCase(),call.to.toLowerCase());assert.equal(tx.input,call.data);assert.equal(tx.value,BigInt(call.value));assert.equal(r.status,'success');transactions.push({action:plan.action,step:call.label,hash:call.hash,block:String(r.blockNumber),status:r.status});}}
for(const action of ['WRAP','ENTER','INCREASE','DECREASE','EXIT'])assert.ok(transactions.some(t=>t.action===action));
const report={verifiedAt:new Date().toISOString(),network:'Base Sepolia',chainId:84532,pool:NETWORK.pool,wallet,tokenId:String(tokenId),transactions,final:{liquidity:String(p[7]),owedUsdcRaw:String(p[10]),owedWethRaw:String(p[11]),usdcAllowance:String(usdcAllowance),wethAllowance:String(wethAllowance),balancesRaw:{eth:String(eth),usdc:String(usdc),weth:String(weth)}},recovery:'A Privy timeout was reconciled using the exact successful onchain transaction; no duplicate exit was sent.',mainnetTransactions:0};
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});await writeFile(new URL('../artifacts/testnet-acceptance.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
