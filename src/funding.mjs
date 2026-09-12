import {isAddress} from 'viem';
const tokens={1:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',42161:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831',8453:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'};
const invalid=()=>Object.assign(Error('Choose a linked wallet, supported source chain and 1–10000 USDC in integer micro-units.'),{status:400,expose:true});
export async function fundingQuote(account,input,{fetcher=fetch,clock=Date.now}={}){
 if(!input||Object.keys(input).sort().join(',')!=='amount,chainId,wallet'||![42161,8453].includes(input.chainId)||typeof input.amount!=='string'||!/^\d{7,11}$/.test(input.amount)||BigInt(input.amount)<1000000n||BigInt(input.amount)>10000000000n||!isAddress(input.wallet)||!account.wallets.some(w=>w.address.toLowerCase()===input.wallet.toLowerCase()))throw invalid();
 const url=new URL('https://li.quest/v1/quote');
 const params={fromChain:String(input.chainId),toChain:'1',fromToken:tokens[input.chainId],toToken:tokens[1],fromAmount:input.amount,fromAddress:input.wallet,toAddress:input.wallet,slippage:'0.005',integrator:'lp-copilot'};
 for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
 try{
  const response=await fetcher(url,{signal:AbortSignal.timeout(20000),redirect:'error'});if(!response.ok)throw Error();
  const raw=await response.text();if(raw.length>1000000)throw Error();const q=JSON.parse(raw),a=q.action,e=q.estimate;
  if(a?.fromChainId!==input.chainId||a?.toChainId!==1||a?.fromAmount!==input.amount||a?.fromAddress?.toLowerCase()!==input.wallet.toLowerCase()||a?.toAddress?.toLowerCase()!==input.wallet.toLowerCase()||a?.fromToken?.address?.toLowerCase()!==tokens[input.chainId].toLowerCase()||a?.toToken?.address?.toLowerCase()!==tokens[1].toLowerCase()||a.toToken.decimals!==6||a.fromToken.decimals!==6||typeof q.id!=='string'||!/^\d+$/.test(e?.toAmount||'')||!/^\d+$/.test(e?.toAmountMin||'')||BigInt(e.toAmountMin)>BigInt(e.toAmount))throw Error();
  return {source:'LI.FI_LIVE_QUOTE',id:q.id,tool:q.tool,fromChainId:input.chainId,toChainId:1,amount:input.amount,toAmount:e.toAmount,toAmountMin:e.toAmountMin,recipient:input.wallet,fetchedAt:clock(),refreshAfterMs:30000,execution:'disabled',notice:'Informational quote only. Refresh before any future approval. 30 seconds is local display freshness, not provider-guaranteed validity. Fees may be additional; no balance, allowance or settlement was verified.'};
 }catch{throw Object.assign(Error('LI.FI quote unavailable or inconsistent. No mock substituted.'),{status:503,expose:true});}
}
