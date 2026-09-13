// Assisted execution is restricted to one verified public testnet pool.
import {createPublicClient,http,parseAbi,encodeFunctionData,decodeEventLog,formatUnits,parseUnits} from 'viem';
import {baseSepolia} from 'viem/chains';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import Database from 'better-sqlite3';
import {mkdirSync} from 'node:fs';
import {executionAbi} from './transactions.mjs';
const require=createRequire(import.meta.url),{Token}=require('@uniswap/sdk-core'),{Pool,Position}=require('@uniswap/v3-sdk');
export const NETWORK={chainId:84532,name:'Base Sepolia',rpc:'https://sepolia.base.org',factory:'0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',manager:'0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2',pool:'0x94bfc0574FF48E92cE43d495376C477B1d0EEeC0',usdc:'0x036CbD53842c5426634e7929541eC2318f3dCF7e',weth:'0x4200000000000000000000000000000000000006',fee:500,spacing:10,explorer:'https://sepolia.basescan.org'};
const token0=new Token(84532,NETWORK.usdc,6,'USDC'),token1=new Token(84532,NETWORK.weth,18,'WETH');
const abi=parseAbi(['function slot0() view returns(uint160,int24,uint16,uint16,uint16,uint8,bool)','function liquidity() view returns(uint128)','function token0() view returns(address)','function token1() view returns(address)','function fee() view returns(uint24)','function tickSpacing() view returns(int24)','function getPool(address,address,uint24) view returns(address)','function decimals() view returns(uint8)','function balanceOf(address) view returns(uint256)','function tokenOfOwnerByIndex(address,uint256) view returns(uint256)','function approve(address,uint256) returns(bool)']);
const same=(a,b)=>a?.toLowerCase()===b?.toLowerCase();
const fail=message=>Object.assign(Error(message),{status:400,expose:true});
const json=x=>JSON.stringify(x,(_k,v)=>typeof v==='bigint'?v.toString():v);
export function isAllowanceCleanup(call){return !!call&&[NETWORK.usdc,NETWORK.weth].some(a=>same(a,call.to))&&String(call.value)==='0'&&call.data===encodeFunctionData({abi,functionName:'approve',args:[NETWORK.manager,0n]});}
export function ownedWallet(account,address){if(!account.wallets.some(w=>same(w.address,address)))throw fail('Select a wallet linked to this account.');return address;}
export function validateDraft(input){
 if(!['ENTER','INCREASE','DECREASE','EXIT','COLLECT','WRAP'].includes(input.action))throw fail('Unsupported action.');
 if(['ENTER','INCREASE'].includes(input.action)&&(!/^\d{1,3}(\.\d{1,6})?$/.test(input.amountUsdc)||Number(input.amountUsdc)<=0||Number(input.amountUsdc)>20))throw fail('Use more than 0 and at most 20 test USDC per deposit.');
 if(input.action==='ENTER'&&(input.lowerPrice!==undefined||input.upperPrice!==undefined)&&(!Number.isFinite(input.lowerPrice)||!Number.isFinite(input.upperPrice)||input.lowerPrice<=0||input.upperPrice<=input.lowerPrice))throw fail('Enter valid lower and upper prices.');
 if(input.action==='ENTER'&&input.lowerPrice===undefined&&(!Number.isFinite(input.widthPct)||input.widthPct<1||input.widthPct>50))throw fail('Range width must be between 1% and 50%.');
 if(!['ENTER','WRAP'].includes(input.action)&&! /^[1-9]\d{0,20}$/.test(input.tokenId||''))throw fail('Select an owned position.');
 if(input.action==='DECREASE'&&(!Number.isInteger(input.fractionBps)||input.fractionBps<1||input.fractionBps>10000))throw fail('Invalid reduction percentage.');
 if(input.action==='WRAP'&&(!/^0\.\d{1,18}$/.test(input.amountEth)||Number(input.amountEth)<=0||Number(input.amountEth)>0.01))throw fail('Wrap at most 0.01 test ETH.');
}
export function calculateDeposit(state,input,existing){
 const pool=new Pool(token0,token1,500,state.sqrtPriceX96,state.liquidity,state.tick);
 const delta=Math.ceil(Math.log(1+input.widthPct/100)/Math.log(1.0001)/10)*10;
 const custom=input.lowerPrice!==undefined||input.upperPrice!==undefined;
 if(!existing&&custom&&(!Number.isFinite(input.lowerPrice)||!Number.isFinite(input.upperPrice)||input.lowerPrice<=0||input.upperPrice<=input.lowerPrice))throw fail('Enter valid lower and upper prices.');
 const lower=existing?.tickLower??(custom?Math.floor(Math.log(1e12/input.upperPrice)/Math.log(1.0001)/10)*10:Math.floor((state.tick-delta)/10)*10),upper=existing?.tickUpper??(custom?Math.ceil(Math.log(1e12/input.lowerPrice)/Math.log(1.0001)/10)*10:Math.ceil((state.tick+delta)/10)*10);
 if(lower<-887270||upper>887270||lower>=upper||state.tick<=lower||state.tick>=upper)throw fail('Deposit requires an active, two-sided range.');
 const p=Position.fromAmount0({pool,tickLower:lower,tickUpper:upper,amount0:parseUnits(input.amountUsdc,6).toString(),useFullPrecision:true});
 if(p.liquidity.toString()==='0')throw fail('Deposit is too small.');
 const {amount0,amount1}=p.mintAmounts;
 if(BigInt(amount0.toString())>parseUnits(input.amountUsdc,6))throw fail('Deposit rounding exceeded the budget.');
 return {tickLower:lower,tickUpper:upper,amount0:amount0.toString(),amount1:amount1.toString(),usdc:formatUnits(BigInt(amount0.toString()),6),weth:formatUnits(BigInt(amount1.toString()),18),low:1e12/1.0001**upper,high:1e12/1.0001**lower};
}
export function createTestnet({client=createPublicClient({chain:baseSepolia,transport:http(NETWORK.rpc,{timeout:15000,retryCount:1})}),database}={}){
 mkdirSync(new URL('../data/',import.meta.url),{recursive:true});
 const db=database||new Database(new URL('../data/testnet.sqlite',import.meta.url).pathname);
 db.exec('CREATE TABLE IF NOT EXISTS testnet_plans (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,body TEXT NOT NULL)');
 const save=p=>db.prepare('INSERT OR REPLACE INTO testnet_plans VALUES (?,?,?)').run(p.id,p.userId,json(p));
 const load=(id,user)=>{const r=db.prepare('SELECT body FROM testnet_plans WHERE id=? AND user_id=?').get(id,user);if(!r)throw fail('Plan not found.');return JSON.parse(r.body);};
 const read=(address,functionName,args=[],blockNumber)=>client.readContract({address,abi:[...abi,...executionAbi],functionName,args,blockNumber});
 async function snapshot(){
  const [chain,block]=await Promise.all([client.getChainId(),client.getBlock()]);
  if(chain!==84532||Math.abs(Date.now()/1000-Number(block.timestamp))>120)throw fail('Testnet RPC identity or freshness check failed.');
  const b=block.number;const [slot,liquidity,t0,t1,fee,spacing,pool,d0,d1]=await Promise.all([read(NETWORK.pool,'slot0',[],b),read(NETWORK.pool,'liquidity',[],b),read(NETWORK.pool,'token0',[],b),read(NETWORK.pool,'token1',[],b),read(NETWORK.pool,'fee',[],b),read(NETWORK.pool,'tickSpacing',[],b),read(NETWORK.factory,'getPool',[NETWORK.usdc,NETWORK.weth,500],b),read(NETWORK.usdc,'decimals',[],b),read(NETWORK.weth,'decimals',[],b)]);
  if(!same(t0,NETWORK.usdc)||!same(t1,NETWORK.weth)||!same(pool,NETWORK.pool)||fee!==500||spacing!==10||d0!==6||d1!==18||!slot[6])throw fail('Testnet pool verification failed.');
  return {sqrtPriceX96:String(slot[0]),tick:slot[1],liquidity:String(liquidity),price:1e12/(Number(slot[0])/2**96)**2,blockNumber:String(b),blockHash:block.hash};
 }
 async function position(id,wallet,blockNumber){
  const [owner,p]=await Promise.all([read(NETWORK.manager,'ownerOf',[BigInt(id)],blockNumber),read(NETWORK.manager,'positions',[BigInt(id)],blockNumber)]);
  if(!same(owner,wallet)||!same(p[2],NETWORK.usdc)||!same(p[3],NETWORK.weth)||p[4]!==500)throw fail('Position ownership or pool mismatch.');
  return {tokenId:String(id),tickLower:p[5],tickUpper:p[6],liquidity:String(p[7]),owedUsdc:formatUnits(p[10],6),owedWeth:formatUnits(p[11],18),low:1e12/1.0001**p[6],high:1e12/1.0001**p[5]};
 }
 async function balances(wallet){const [eth,usdc,weth]=await Promise.all([client.getBalance({address:wallet}),read(NETWORK.usdc,'balanceOf',[wallet]),read(NETWORK.weth,'balanceOf',[wallet])]);return {eth:formatUnits(eth,18),usdc:formatUnits(usdc,6),weth:formatUnits(weth,18)};}
 async function state(account,wallet){
  const s=await snapshot();if(!wallet)return {network:NETWORK,state:s};ownedWallet(account,wallet);
  const [funds,count]=await Promise.all([balances(wallet),read(NETWORK.manager,'balanceOf',[wallet])]);
  const positions=[];for(let i=0n;i<count&&i<50n;i++){const id=await read(NETWORK.manager,'tokenOfOwnerByIndex',[wallet,i]);try{const p=await position(id,wallet,BigInt(s.blockNumber));const holding=new Position({pool:new Pool(token0,token1,500,s.sqrtPriceX96,s.liquidity,s.tick),liquidity:p.liquidity,tickLower:p.tickLower,tickUpper:p.tickUpper});positions.push({...p,activeUsdc:holding.amount0.toExact(),activeWeth:holding.amount1.toExact()});}catch(e){if(!e.expose)throw e;}}
  const plans=db.prepare('SELECT body FROM testnet_plans WHERE user_id=? ORDER BY rowid DESC LIMIT 20').all(account.userId).map(r=>JSON.parse(r.body)).filter(p=>same(p.wallet,wallet));
  return {network:NETWORK,state:s,balances:funds,positions,positionsTruncated:count>50n,plans};
 }
 async function preview(account,input){
  validateDraft(input);const wallet=ownedWallet(account,input.wallet),s=await snapshot(),funds=await balances(wallet);
  const p=!['ENTER','WRAP'].includes(input.action)?await position(input.tokenId,wallet):null;
  const deadline=Math.min(Math.floor(Date.now()/1000)+600,input.deadline??Infinity),calls=[];let details={};
  const push=(label,to,data,value='0')=>calls.push({label,to,data,value});
  const encoded=(method,args)=>encodeFunctionData({abi:executionAbi,functionName:method,args:[args]});
  if(['ENTER','INCREASE'].includes(input.action)){
   details=calculateDeposit(s,input,p);const a0=BigInt(details.amount0),a1=BigInt(details.amount1);
   if(a0>parseUnits(funds.usdc,6)||a1>parseUnits(funds.weth,18))return {needsFunding:true,details,balances:funds,network:NETWORK};
   for(const [symbol,to,amount] of [['USDC',NETWORK.usdc,a0],['WETH',NETWORK.weth,a1]])push(`Approve exactly ${symbol==='USDC'?details.usdc:details.weth} ${symbol}`,to,encodeFunctionData({abi,functionName:'approve',args:[NETWORK.manager,amount]}));
   const args={amount0Desired:a0,amount1Desired:a1,amount0Min:a0*995n/1000n,amount1Min:a1*995n/1000n,deadline:BigInt(deadline)};
   push(input.action==='ENTER'?'Create position':'Increase liquidity',NETWORK.manager,encoded(input.action==='ENTER'?'mint':'increaseLiquidity',input.action==='ENTER'?{...args,token0:NETWORK.usdc,token1:NETWORK.weth,fee:500,tickLower:details.tickLower,tickUpper:details.tickUpper,recipient:wallet}:{...args,tokenId:BigInt(input.tokenId)}));
   for(const [symbol,to] of [['USDC',NETWORK.usdc],['WETH',NETWORK.weth]])push(`Clear ${symbol} allowance`,to,encodeFunctionData({abi,functionName:'approve',args:[NETWORK.manager,0n]}));
  }else if(input.action==='WRAP'){
   const value=parseUnits(input.amountEth,18);if(value>=parseUnits(funds.eth,18))throw fail('Insufficient test ETH. Keep ETH available for gas.');
   push('Wrap test ETH',NETWORK.weth,'0xd0e30db0',String(value));details={eth:input.amountEth};
  }else{
   if(['EXIT','DECREASE'].includes(input.action)){
    const liquidity=BigInt(p.liquidity)*BigInt(input.action==='EXIT'?10000:input.fractionBps)/10000n;if(!liquidity)throw fail('Position has no liquidity to remove.');
    const pos=new Position({pool:new Pool(token0,token1,500,s.sqrtPriceX96,s.liquidity,s.tick),liquidity:liquidity.toString(),tickLower:p.tickLower,tickUpper:p.tickUpper});
    push('Remove liquidity',NETWORK.manager,encoded('decreaseLiquidity',{tokenId:BigInt(input.tokenId),liquidity,amount0Min:BigInt(pos.amount0.quotient.toString())*995n/1000n,amount1Min:BigInt(pos.amount1.quotient.toString())*995n/1000n,deadline:BigInt(deadline)}));
    details={usdc:pos.amount0.toExact(),weth:pos.amount1.toExact(),liquidity:String(liquidity)};
   }
   push('Collect tokens',NETWORK.manager,encoded('collect',{tokenId:BigInt(input.tokenId),recipient:wallet,amount0Max:(1n<<128n)-1n,amount1Max:(1n<<128n)-1n}));
  }
  const plan={id:randomUUID(),userId:account.userId,wallet,action:input.action,tokenId:input.tokenId,chainId:84532,deadline,sourceBlock:s.blockNumber,details,calls,createdAt:new Date().toISOString()};save(plan);return plan;
 }
 async function repositionPlan(account,input){
  const wallet=ownedWallet(account,input.wallet),s=await snapshot(),p=await position(input.tokenId,wallet);
  if(BigInt(p.liquidity)<=0n)throw fail('Select an active position.');
  const pool=new Pool(token0,token1,500,s.sqrtPriceX96,s.liquidity,s.tick),current=new Position({pool,liquidity:p.liquidity,tickLower:p.tickLower,tickUpper:p.tickUpper});
  const released0=BigInt(current.amount0.quotient.toString()),released1=BigInt(current.amount1.quotient.toString());
  if(!input.useReserve&&(released0>5000000n||released1>4000000000000000n))throw fail('This automatic test exceeds the approved 5 USDC / 0.004 WETH limits.');
  if(input.widthPct!==undefined&&(!Number.isFinite(input.widthPct)||input.widthPct<5||input.widthPct>50))throw fail('AI range width must be 5–50%.');
  const center=Math.round(s.tick/10)*10,half=input.widthPct!==undefined?Math.ceil(Math.log(1+input.widthPct/100)/Math.log(1.0001)/10)*10:Math.max(200,Math.ceil((p.tickUpper-p.tickLower)*0.75/10)*10),lower=Math.max(-887270,center-half),upper=Math.min(887270,center+half);
  const funds=input.useReserve?await balances(wallet):{usdc:'0',weth:'0'};
  const cap=(a,b)=>a<b?a:b;
  const available0=cap(released0+parseUnits(funds.usdc,6),5000000n),available1=cap(released1+parseUnits(funds.weth,18),4000000000000000n);
  // Keep a rounding/slippage reserve in the wallet; never add fresh capital.
  const wider=Position.fromAmounts({pool,tickLower:lower,tickUpper:upper,amount0:(available0*995n/1000n).toString(),amount1:(available1*995n/1000n).toString(),useFullPrecision:true});
  if(wider.liquidity.toString()==='0')throw fail('Not enough USDC and WETH to restore an active range. Add test tokens to the authorized wallet reserve; no swap was sent.');
  const a0=BigInt(wider.mintAmounts.amount0.toString()),a1=BigInt(wider.mintAmounts.amount1.toString()),deadline=Math.min(Math.floor(Date.now()/1000)+600,input.deadline??Infinity),calls=[];
  const push=(label,to,method,args)=>calls.push({label,to,value:'0',data:encodeFunctionData({abi:method==='approve'?abi:executionAbi,functionName:method,args})});
  push('Remove original liquidity',NETWORK.manager,'decreaseLiquidity',[{tokenId:BigInt(input.tokenId),liquidity:BigInt(p.liquidity),amount0Min:released0*995n/1000n,amount1Min:released1*995n/1000n,deadline:BigInt(deadline)}]);
  push('Collect to owner',NETWORK.manager,'collect',[{tokenId:BigInt(input.tokenId),recipient:wallet,amount0Max:(1n<<128n)-1n,amount1Max:(1n<<128n)-1n}]);
  push('Approve exactly '+formatUnits(a0,6)+' USDC',NETWORK.usdc,'approve',[NETWORK.manager,a0]);
  push('Approve exactly '+formatUnits(a1,18)+' WETH',NETWORK.weth,'approve',[NETWORK.manager,a1]);
  push('Mint wider position',NETWORK.manager,'mint',[{token0:NETWORK.usdc,token1:NETWORK.weth,fee:500,tickLower:lower,tickUpper:upper,amount0Desired:a0,amount1Desired:a1,amount0Min:a0*995n/1000n,amount1Min:a1*995n/1000n,recipient:wallet,deadline:BigInt(deadline)}]);
  for(const [symbol,address] of [['USDC',NETWORK.usdc],['WETH',NETWORK.weth]])push('Clear '+symbol+' allowance',address,'approve',[NETWORK.manager,0n]);
  const plan={id:randomUUID(),userId:account.userId,wallet,tokenId:input.tokenId,action:'REBALANCE',chainId:84532,deadline,sourceBlock:s.blockNumber,details:{usdc:formatUnits(a0,6),weth:formatUnits(a1,18),low:1e12/1.0001**upper,high:1e12/1.0001**lower,observedTick:s.tick,widthPct:input.widthPct,reserveAllowed:!!input.useReserve,reserveUsdc:formatUnits(a0>released0?a0-released0:0n,6),reserveWeth:formatUnits(a1>released1?a1-released1:0n,18)},provenance:input.provenance||'OPERATOR',calls,createdAt:new Date().toISOString()};save(plan);return plan;
 }
 async function prepare(account,id,index){
  const p=load(id,account.userId);ownedWallet(account,p.wallet);if(p.discardedAt)throw fail('This plan was cancelled. Create a new preview to continue.');await snapshot();
  if(!Number.isInteger(index)||!p.calls[index]||(p.calls[index].hash||p.calls[index].status==='awaiting_wallet')||p.calls.slice(0,index).some(c=>c.status!=='confirmed'))throw fail('Reconcile earlier transactions before continuing.');
  if(p.deadline<=Date.now()/1000&&!isAllowanceCleanup(p.calls[index]))throw fail('Preview expired. Reconcile submitted transactions and create a fresh preview.');
  if(p.tokenId)await position(p.tokenId,p.wallet);
  const c=p.calls[index],request={account:p.wallet,to:c.to,data:c.data,value:BigInt(c.value)};
  await client.call(request);const gas=await client.estimateGas(request),gasPrice=await client.getGasPrice();
  if(await client.getBalance({address:p.wallet})<BigInt(c.value)+gas*gasPrice*12n/10n)throw fail('Insufficient test ETH for gas.');
  return {...c,chainId:84532,wallet:p.wallet,gas:String(gas*12n/10n),estimatedGasEth:formatUnits(gas*gasPrice,18)};
 }
 async function intent(account,id,index){
  await prepare(account,id,index);const p=load(id,account.userId);
  if(p.discardedAt)throw fail('This plan was cancelled.');
  if(p.calls[index].status==='awaiting_wallet'||p.calls[index].hash)throw fail('Transaction already awaiting wallet confirmation.');
  p.calls[index].status='awaiting_wallet';save(p);
  p.calls[index].nonce=await client.getTransactionCount({address:p.wallet,blockTag:'pending'});save(p);return p;
 }
 async function discard(account,id){
  const p=load(id,account.userId);ownedWallet(account,p.wallet);
  if(p.discardedAt)return p;
  if(p.calls.some(c=>c.status==='awaiting_wallet'||c.status==='pending'||(c.hash&&!['confirmed','reverted'].includes(c.status))))throw fail('A transaction may already be in flight. Refresh receipts or recover its hash before cancelling the plan.');
  if(p.calls.every(c=>c.status==='confirmed'))throw fail('Completed operations remain in history.');
  p.discardedAt=new Date().toISOString();save(p);return p;
 }
 async function cancel(account,id,index){
  const p=load(id,account.userId);ownedWallet(account,p.wallet);const call=p.calls[index];
  if(!call||call.hash||call.status!=='awaiting_wallet')throw fail('Reconcile this transaction first.');
  const nonce=await client.getTransactionCount({address:p.wallet,blockTag:'pending'});
  if(nonce!==call.nonce)throw fail('Wallet nonce changed. Recover the transaction hash before continuing.');
  call.status='cancelled';save(p);return p;
 }
 async function record(account,id,index,hash){
  if(!/^0x[0-9a-fA-F]{64}$/.test(hash))throw fail('Invalid transaction hash.');const p=load(id,account.userId),call=p.calls[index];ownedWallet(account,p.wallet);
  if(!call||p.calls.slice(0,index).some(c=>c.status!=='confirmed')||(call.hash&&call.hash!==hash))throw fail('Transaction order mismatch.');
  const used=db.prepare('SELECT id,body FROM testnet_plans').all().some(r=>{const other=JSON.parse(r.body);return other.calls.some((c,i)=>c.hash===hash&&(r.id!==id||i!==index));});
  if(used)throw fail('This transaction hash already belongs to another step.');
  // Save the hash before RPC lookup: an uncertain response must never cause a resend.
  call.hash=hash;call.status='pending';save(p);return reconcile(account,id);
 }
 async function reconcile(account,id){
  const p=load(id,account.userId);ownedWallet(account,p.wallet);if(await client.getChainId()!==84532)throw fail('Wrong RPC chain.');
  for(const c of p.calls.filter(c=>c.hash&&c.status!=='confirmed')){
   try{
    const tx=await client.getTransaction({hash:c.hash});
    if(!same(tx.from,p.wallet)||!same(tx.to,c.to)||tx.input!==c.data||String(tx.value)!==c.value)throw fail('Submitted transaction does not match this preview.');
    const r=await client.getTransactionReceipt({hash:c.hash});
    if(r.blockNumber<BigInt(p.sourceBlock)||(c.nonce!==undefined&&tx.nonce!==c.nonce))throw fail('Transaction predates or does not match this wallet intent.');
    if(r.status==='success'&&same(c.to,NETWORK.manager))for(const log of r.logs||[]){
     if(!same(log.address,NETWORK.manager))continue;
     try{const event=decodeEventLog({abi:parseAbi(['event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)']),data:log.data,topics:log.topics});if(event.args.from==='0x0000000000000000000000000000000000000000'&&same(event.args.to,p.wallet))p.newTokenId=String(event.args.tokenId);}catch{}
    }
    c.status=r.status==='success'?'confirmed':'reverted';c.blockNumber=String(r.blockNumber);c.gasWei=String(r.gasUsed*r.effectiveGasPrice+BigInt(r.l1Fee||0));
   }catch(e){if(e.expose)throw e; c.status='pending';}
  }
  save(p);return p;
 }
 return {state,preview,repositionPlan,getPlan:(account,id)=>load(id,account.userId),prepare,intent,cancel,discard,record,reconcile,snapshot,close:()=>db.close()};
}
