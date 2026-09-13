import {createPublicClient,http,parseAbi} from 'viem';
import {baseSepolia} from 'viem/chains';
import {NETWORK} from './testnet.mjs';
const c=createPublicClient({chain:baseSepolia,transport:http(NETWORK.rpc,{timeout:15000,retryCount:0})});
const abi=parseAbi(['function slot0() view returns(uint160,int24,uint16,uint16,uint16,uint8,bool)','function liquidity() view returns(uint128)']);
export async function managedGraph(){
 const endpoint=process.env.BASE_SEPOLIA_GRAPH_URL;
 if(!endpoint)return {status:'not_configured',chainId:84532,hashVerified:false,note:'Configure BASE_SEPOLIA_GRAPH_URL for the deployed pool indexer. No mainnet history is substituted.'};
 try{
  const url=new URL(endpoint);if(url.protocol!=='https:'||!['api.studio.thegraph.com','gateway.thegraph.com','testnet.gateway.thegraph.com'].includes(url.hostname)||url.username||url.password)throw Error();
  const headers={'Content-Type':'application/json'};if(url.hostname.includes('gateway.')&&process.env.GRAPH_API_KEY)headers.Authorization=`Bearer ${process.env.GRAPH_API_KEY}`;
  const response=await fetch(url,{method:'POST',headers,signal:AbortSignal.timeout(15000),body:JSON.stringify({query:'{ _meta { hasIndexingErrors block { number hash } } poolState(id:"'+NETWORK.pool.toLowerCase()+'") { chainId pool fee sqrtPriceX96 tick liquidity } swaps(first:10,orderBy:blockNumber,orderDirection:desc) { id blockNumber timestamp amount0 amount1 } }'})});
  if(!response.ok)throw Error();const body=await response.json();if(body.errors?.length)throw Error();const {poolState:p,_meta:meta,swaps}=body.data||{};
  if(!p||meta.hasIndexingErrors||p.chainId!==84532||p.pool.toLowerCase()!==NETWORK.pool.toLowerCase()||p.fee!==500||!meta.block.hash)throw Error();
  const block=await c.getBlock({blockNumber:BigInt(meta.block.number)});if(block.hash.toLowerCase()!==meta.block.hash.toLowerCase())throw Error();
  const lagSeconds=Math.max(0,Math.round(Date.now()/1000-Number(block.timestamp)));if(lagSeconds>120)return {status:'syncing',chainId:84532,hashVerified:false,blockNumber:meta.block.number,lagSeconds,note:'The indexer is catching up. Automatic execution waits for fresh pool data.'};
  const [slot,liquidity]=await Promise.all([c.readContract({address:NETWORK.pool,abi,functionName:'slot0',blockNumber:block.number}),c.readContract({address:NETWORK.pool,abi,functionName:'liquidity',blockNumber:block.number})]);
  if(String(slot[0])!==p.sqrtPriceX96||slot[1]!==p.tick||String(liquidity)!==p.liquidity)throw Error();
  return {status:'verified',chainId:84532,hashVerified:true,blockNumber:meta.block.number,blockHash:meta.block.hash,observedAt:new Date().toISOString(),swaps,note:'The Graph provider data matched Base Sepolia RPC at the indexed block.'};
 }catch{return {status:'unavailable',chainId:84532,hashVerified:false,note:'Graph identity, freshness or block-state verification failed. Automatic execution is blocked.'};}
}
