import {isAddress,parseAbi,formatUnits} from 'viem';
import {client,validateFresh} from './data.mjs';
import {USDC,WETH} from './config.mjs';
const abi=parseAbi(['function balanceOf(address) view returns (uint256)']);
export async function walletBalances(wallets,c=client()){
 if(!Array.isArray(wallets)||wallets.length>20)throw Error('Unsupported wallet count');
 if(wallets.some(w=>!isAddress(w.address)))throw Error('Invalid linked wallet address');
 const [chain,block]=await Promise.all([c.getChainId(),c.getBlock()]);if(chain!==1)throw Error('Wrong RPC chain');validateFresh(Number(block.timestamp));
 const result=await Promise.all(wallets.map(async w=>{
  const [eth,tokens]=await Promise.all([c.getBalance({address:w.address,blockNumber:block.number}),c.multicall({contracts:[USDC,WETH].map(address=>({address,abi,functionName:'balanceOf',args:[w.address]})),blockNumber:block.number,allowFailure:false})]);
  return {...w,balances:{ETH:formatUnits(eth,18),USDC:formatUnits(tokens[0],6),WETH:formatUnits(tokens[1],18)},raw:{ETH:eth.toString(),USDC:tokens[0].toString(),WETH:tokens[1].toString()}};
 }));validateFresh(Number(block.timestamp));return {chainId:1,blockNumber:block.number.toString(),blockTimestamp:Number(block.timestamp),wallets:result,execution:'disabled'};
}
