// Discovery is read-only; execution remains restricted to the verified demo pool.
import {createPublicClient,http,parseAbi,parseAbiItem,formatUnits} from 'viem';
import {baseSepolia} from 'viem/chains';
import {NETWORK} from './testnet.mjs';
const abi=parseAbi(['function getPool(address,address,uint24) view returns(address)','function token0() view returns(address)','function token1() view returns(address)','function fee() view returns(uint24)','function slot0() view returns(uint160,int24,uint16,uint16,uint16,uint8,bool)','function liquidity() view returns(uint128)','function symbol() view returns(string)','function decimals() view returns(uint8)','function balanceOf(address) view returns(uint256)']);
export function createPoolCatalog(client=createPublicClient({chain:baseSepolia,batch:{multicall:{wait:30,batchSize:4096}},transport:http(NETWORK.rpc,{timeout:12000,retryCount:1})})){
 let cached,loading;const read=(address,functionName,args=[],blockNumber)=>client.readContract({address,abi,functionName,args,blockNumber});
 async function discover(){
  if(cached&&Date.now()-cached.at<60000)return cached.value;if(loading)return loading;
  loading=(async()=>{const block=await client.getBlock();if(await client.getChainId()!==84532||Date.now()/1000-Number(block.timestamp)>120)throw Error('Pool data is temporarily unavailable.');
   const addresses=new Set([NETWORK.pool.toLowerCase()]);
   const known=await Promise.allSettled([100,500,3000,10000].map(f=>read(NETWORK.factory,'getPool',[NETWORK.usdc,NETWORK.weth,f],block.number)));
   for(const r of known)if(r.status==='fulfilled'&&!/^0x0{40}$/i.test(r.value))addresses.add(r.value.toLowerCase());
   let discoveryLimited=false;
   try{const logs=await client.getLogs({address:NETWORK.factory,event:parseAbiItem('event PoolCreated(address indexed token0,address indexed token1,uint24 indexed fee,int24 tickSpacing,address pool)'),fromBlock:block.number-10000n,toBlock:block.number});for(const l of logs.slice(-12).reverse())addresses.add(l.args.pool.toLowerCase());}catch{discoveryLimited=true;}
   const results=await Promise.allSettled([...addresses].slice(0,12).map(async address=>{
    const [t0,t1,fee,slot,liquidity]=await Promise.all(['token0','token1','fee','slot0','liquidity'].map(fn=>read(address,fn,[],block.number)));
    if((await read(NETWORK.factory,'getPool',[t0,t1,fee],block.number)).toLowerCase()!==address)throw Error('Factory mismatch');
    const tokens=await Promise.all([t0,t1].map(async token=>{const [symbol,decimals,balance]=await Promise.all([read(token,'symbol',[],block.number),read(token,'decimals',[],block.number),read(token,'balanceOf',[address],block.number)]);if(decimals>36)throw Error('Unsupported decimals');return {address:token,symbol:String(symbol).slice(0,24),decimals,balance:formatUnits(balance,decimals)};}));
    const raw=(Number(slot[0])/2**96)**2*10**(tokens[0].decimals-tokens[1].decimals),reverse=t0.toLowerCase()===NETWORK.usdc.toLowerCase();const price=reverse?1/raw:raw;
    return {address,tokens,fee,price:Number.isFinite(price)&&price>0?price:null,base:tokens[reverse?1:0].symbol,quote:tokens[reverse?0:1].symbol,active:liquidity>0n,initialized:slot[0]>0n,executable:address===NETWORK.pool.toLowerCase(),blockNumber:String(block.number)};
   }));const items=results.filter(r=>r.status==='fulfilled').map(r=>r.value);if(!items.length)throw Error('Pool discovery is temporarily unavailable. Please retry.');const value={items,chainId:84532,observedAt:new Date().toISOString(),discoveryLimited:discoveryLimited||known.some(r=>r.status==='rejected')||results.some(r=>r.status==='rejected'),scope:'Known USDC/WETH fee tiers and recently created factory pools. Not a complete network listing.'};cached={at:Date.now(),value};return value;
  })().finally(()=>{loading=null;});return loading;
 }
 return {discover};
}
