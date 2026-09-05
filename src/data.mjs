import {createPublicClient, http, parseAbi} from 'viem';
import {mainnet} from 'viem/chains';
import {CHAIN_ID, POOL, FACTORY, MANAGER, USDC, WETH, FEE, SUBGRAPH, MAX_AGE_SECONDS, MAX_GRAPH_LAG} from './config.mjs';
export const poolAbi=parseAbi(['function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)','function liquidity() view returns (uint128)','function token0() view returns (address)','function token1() view returns (address)','function fee() view returns (uint24)','function tickSpacing() view returns (int24)']);
export const managerAbi=parseAbi(['function positions(uint256) view returns (uint96,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)']);
const factoryAbi=parseAbi(['function getPool(address,address,uint24) view returns (address)']);
const erc20Abi=parseAbi(['function decimals() view returns (uint8)']);
const same=(a,b)=>a?.toLowerCase()===b.toLowerCase();
export function validateFresh(timestamp,now=Math.floor(Date.now()/1000)) {
 if(!Number.isSafeInteger(timestamp)||now-timestamp>MAX_AGE_SECONDS||timestamp>now+30) throw new Error('RPC block is stale or future-dated. Analysis stopped; use a current Ethereum RPC.');
}
export function validatePositionId(id) {
 if(!/^[1-9][0-9]{0,77}$/.test(id)||BigInt(id)>((1n<<256n)-1n)) throw new Error('Enter a positive decimal uint256 NFT token ID.');
 return BigInt(id);
}
export function client() {
 return createPublicClient({chain:mainnet,transport:http(process.env.ETH_RPC_URL||'https://1rpc.io/eth',{timeout:15000,retryCount:1})});
}
export async function readPool(c=client()) {
 const [chainId,block]=await Promise.all([c.getChainId(),c.getBlock()]);
 if(chainId!==CHAIN_ID) throw new Error('Wrong RPC chain: Ethereum mainnet (1) is required.');
 validateFresh(Number(block.timestamp));
 const contracts=['slot0','liquidity','token0','token1','fee','tickSpacing'].map(functionName=>({address:POOL,abi:poolAbi,functionName}));
 contracts.push({address:FACTORY,abi:factoryAbi,functionName:'getPool',args:[USDC,WETH,FEE]},...[[USDC,6],[WETH,18]].map(([address])=>({address,abi:erc20Abi,functionName:'decimals'})));
 const [slot,liquidity,t0,t1,fee,spacing,pool,d0,d1]=await c.multicall({contracts,blockNumber:block.number,allowFailure:false});
 if(!same(t0,USDC)||!same(t1,WETH)||Number(fee)!==FEE||Number(spacing)!==60||!same(pool,POOL)||d0!==6||d1!==18) throw new Error('Pool identity mismatch: refusing analysis.');
 if(!slot[6]) throw new Error('Pool is locked.');
 validateFresh(Number(block.timestamp));
 return {chainId,pool:POOL,fee:FEE,tickSpacing:60,token0:USDC,token1:WETH,sqrtPriceX96:slot[0].toString(),tick:slot[1],liquidity:liquidity.toString(),blockNumber:block.number.toString(),blockHash:block.hash,blockTimestamp:Number(block.timestamp),observedAt:new Date().toISOString(),source:'Ethereum RPC (read-only)'};
}
export async function readPosition(id,state,c=client()) {
 const tokenId=validatePositionId(id);
 const p=await c.readContract({address:MANAGER,abi:managerAbi,functionName:'positions',args:[tokenId],blockNumber:BigInt(state.blockNumber)});
 if(!same(p[2],USDC)||!same(p[3],WETH)||Number(p[4])!==FEE) throw new Error('This NFT is not in the supported USDC/WETH 0.3% pool.');
 return {tokenId:id,kind:'onchain',tickLower:p[5],tickUpper:p[6],liquidity:p[7].toString(),storedTokensOwed:{usdcRaw:p[10].toString(),wethRaw:p[11].toString()},note:'Stored tokensOwed is not the full current claimable fee balance. Accrued fees are excluded from comparison.'};
}
export function validateGraph(data,state,now=Math.floor(Date.now()/1000)) {
 if(!data?._meta?.block || data._meta.hasIndexingErrors!==false) throw new Error('Graph indexing metadata unavailable or indexing errors present.');
 const meta=data._meta.block, lag=Number(state.blockNumber)-meta.number;
 if(!Number.isSafeInteger(meta.number)||lag<0||lag>MAX_GRAPH_LAG||!meta.hash||!same(meta.hash,state.blockHash)) throw new Error('Graph block is missing, stale or inconsistent with RPC.');
 const p=data.pool;
 if(!p||!same(p.id,POOL)||!same(p.token0?.id,USDC)||!same(p.token1?.id,WETH)||Number(p.feeTier)!==FEE||p.sqrtPrice!==state.sqrtPriceX96||Number(p.tick)!==state.tick) throw new Error('Graph pool identity or price disagrees with RPC at the pinned block.');
 const rows=data.poolDayDatas;
 if(!Array.isArray(rows)||!rows.length) throw new Error('Graph history is empty.');
 let last=Infinity;
 for(const row of rows) {
  if(!Number.isSafeInteger(row.date)||row.date>=last||row.date>now||now-row.date>10*86400||!['volumeUSD','tvlUSD','feesUSD'].every(k=>typeof row[k]==='string'&&Number.isFinite(Number(row[k]))&&Number(row[k])>=0)) throw new Error('Graph history is invalid or stale.');
  last=row.date;
 }
 if(now-rows[0].date>2*86400) throw new Error('Graph history is stale.');
 return {status:'verified',source:'The Graph',blockNumber:meta.number,lagBlocks:lag,days:rows,observedAt:new Date().toISOString(),note:'Pool-level historical metrics, including the current partial UTC day. Not your fees or future yield.'};
}
export async function readHistory(state,fetcher=fetch) {
 const key=process.env.GRAPH_API_KEY;
 if(!key) return {status:'not_configured',source:'The Graph',message:'GRAPH_API_KEY is not configured. No Graph history or Graph prize readiness is claimed.'};
 try {
  const response=await fetcher(`https://gateway.thegraph.com/api/${encodeURIComponent(key)}/subgraphs/id/${SUBGRAPH}`,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({query:`query History($pool: ID!, $block: Int!) { _meta(block: {number: $block}) { block { number hash } hasIndexingErrors } pool(id: $pool, block: {number: $block}) { id token0 {id} token1 {id} feeTier sqrtPrice tick } poolDayDatas(first: 7, orderBy: date, orderDirection: desc, where: {pool: $pool}, block: {number: $block}) { date volumeUSD tvlUSD feesUSD } }`,variables:{pool:POOL,block:Number(state.blockNumber)}})});
  if(!response.ok) throw new Error('Graph HTTP error');
  const body=await response.json();
  if(body.errors?.length) throw new Error('Graph query failed, possibly not yet indexed to the requested block.');
  return validateGraph(body.data,state);
 } catch { return {status:'unavailable',source:'The Graph',message:'Graph verification failed: check key, indexing, schema and pinned-block consistency. No history is used.'}; }
}
