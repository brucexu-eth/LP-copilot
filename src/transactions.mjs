import {encodeFunctionData,isAddress,parseAbi} from 'viem';
import {createRequire} from 'node:module';
import {MANAGER,USDC,WETH,FEE,POOL} from './config.mjs';
import {makePool,amountsRaw,validateTicks} from './math.mjs';
import {validateFresh,validatePositionId} from './data.mjs';
const {Position}=createRequire(import.meta.url)('@uniswap/v3-sdk');
export const executionAbi=parseAbi([
 'function mint((address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline)) payable returns (uint256 tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)',
 'function increaseLiquidity((uint256 tokenId,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) payable returns (uint128 liquidity,uint256 amount0,uint256 amount1)',
 'function decreaseLiquidity((uint256 tokenId,uint128 liquidity,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) payable returns (uint256 amount0,uint256 amount1)',
 'function collect((uint256 tokenId,address recipient,uint128 amount0Max,uint128 amount1Max)) payable returns (uint256 amount0,uint256 amount1)',
 'function ownerOf(uint256) view returns (address)',
 'function positions(uint256) view returns (uint96,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)',
 'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)',
]);
const erc20=parseAbi(['function approve(address spender,uint256 amount) returns (bool)']);
const raw=x=>{if(typeof x!=='string'||! /^(0|[1-9][0-9]{0,77})$/.test(x)||BigInt(x)>((1n<<256n)-1n))throw Error('Exact uint256 decimal amount required');return BigInt(x);};
const same=(a,b)=>a.toLowerCase()===b.toLowerCase();
export function buildUnsignedOperation(input,{state,position,owner,expectedChainId=1,now=Math.floor(Date.now()/1000)}={}){
 if(!input||!['ENTER','INCREASE','DECREASE','COLLECT'].includes(input.action))throw Error('Unsupported LP action');
 if(!isAddress(input.wallet)||!owner||!same(owner,input.wallet))throw Error('Wallet ownership mismatch');
 if(state.chainId!==expectedChainId||state.pool?.toLowerCase()!==POOL.toLowerCase()||state.token0?.toLowerCase()!==USDC.toLowerCase()||state.token1?.toLowerCase()!==WETH.toLowerCase()||state.fee!==FEE)throw Error('Unsupported pool/chain identity');
 validateFresh(state.blockTimestamp,now);
 if(!Number.isInteger(input.slippageBps)||input.slippageBps<0||input.slippageBps>100)throw Error('Slippage must be between 0 and 100 bps');
 if(!Number.isSafeInteger(input.deadline)||input.deadline<=now||input.deadline>now+600)throw Error('Deadline must be within ten minutes');
 const min=x=>x*BigInt(10000-input.slippageBps)/10000n;
 const calls=[],base={chainId:expectedChainId,to:MANAGER,value:'0'};let details;
 if(input.action!=='ENTER'){
  if(!position||position.kind!=='onchain'||position.tokenId!==input.tokenId||!owner)throw Error('Verified owned NFT required');
  validatePositionId(input.tokenId);validateTicks(position.tickLower,position.tickUpper);
 }
 if(['ENTER','INCREASE'].includes(input.action)){
  const amount0=raw(input.usdcRaw),amount1=raw(input.wethRaw);if(amount0===0n&&amount1===0n)throw Error('Empty deposit');
  const lower=input.action==='ENTER'?input.tickLower:position.tickLower,upper=input.action==='ENTER'?input.tickUpper:position.tickUpper;validateTicks(lower,upper);
  if(input.action==='ENTER'&&!(lower<=state.tick&&state.tick<upper))throw Error('Single-sided range orders are outside this product');
  const p=Position.fromAmounts({pool:makePool(state),tickLower:lower,tickUpper:upper,amount0:amount0.toString(),amount1:amount1.toString(),useFullPrecision:true});
  if(p.liquidity.toString()==='0')throw Error('Deposit too small');
  const desired0=BigInt(p.mintAmounts.amount0.toString()),desired1=BigInt(p.mintAmounts.amount1.toString());
  if(desired0>amount0||desired1>amount1)throw Error('Rounding would exceed deposit budget');
  for(const [to,amount] of [[USDC,desired0],[WETH,desired1]])if(amount>0n)calls.push({chainId:expectedChainId,to,value:'0',data:encodeFunctionData({abi:erc20,functionName:'approve',args:[MANAGER,amount]}),kind:'EXACT_APPROVAL',amountRaw:amount.toString(),spender:MANAGER});
  const args={amount0Desired:desired0,amount1Desired:desired1,amount0Min:min(desired0),amount1Min:min(desired1),deadline:BigInt(input.deadline)};
  const method=input.action==='ENTER'?'mint':'increaseLiquidity';
  const params=input.action==='ENTER'?{...args,token0:USDC,token1:WETH,fee:FEE,tickLower:lower,tickUpper:upper,recipient:input.wallet}:{...args,tokenId:BigInt(input.tokenId)};
  calls.push({...base,kind:input.action,data:encodeFunctionData({abi:executionAbi,functionName:method,args:[params]})});
  details={tickLower:lower,tickUpper:upper,usdcRaw:desired0.toString(),wethRaw:desired1.toString(),liquidity:p.liquidity.toString()};
 }else if(input.action==='DECREASE'){
  if(!Number.isInteger(input.fractionBps)||input.fractionBps<1||input.fractionBps>10000)throw Error('Invalid reduction fraction');
  const liquidity=BigInt(position.liquidity)*BigInt(input.fractionBps)/10000n;if(liquidity<=0n)throw Error('Reduction too small');
  const [a0,a1]=amountsRaw(state.sqrtPriceX96,liquidity,position.tickLower,position.tickUpper);
  calls.push({...base,kind:'DECREASE',data:encodeFunctionData({abi:executionAbi,functionName:'decreaseLiquidity',args:[{tokenId:BigInt(input.tokenId),liquidity,amount0Min:min(a0),amount1Min:min(a1),deadline:BigInt(input.deadline)}]})});details={liquidity:liquidity.toString()};
 }else{
  calls.push({...base,kind:'COLLECT',data:encodeFunctionData({abi:executionAbi,functionName:'collect',args:[{tokenId:BigInt(input.tokenId),recipient:input.wallet,amount0Max:(1n<<128n)-1n,amount1Max:(1n<<128n)-1n}]})});details={recipient:input.wallet};
 }
 return {status:'UNSIGNED',action:input.action,wallet:input.wallet,chainId:expectedChainId,sourceBlock:state.blockNumber,deadline:input.deadline,calls,details,execution:'disabled',note:'Unsigned construction only. Requires fresh ownership, mandate, allowance, simulation, fee and wallet-policy checks before any live signing.'};
}
