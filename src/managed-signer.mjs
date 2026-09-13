import {PrivyClient} from '@privy-io/node';
import {generateKeyPairSync} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,chmodSync,unlinkSync} from 'node:fs';
import {decodeFunctionData,parseAbi,keccak256} from 'viem';
import {executionAbi} from './transactions.mjs';
import {NETWORK} from './testnet.mjs';
const approveAbi=parseAbi(['function approve(address spender,uint256 amount) returns(bool)']);
const abi=[...approveAbi,...executionAbi.filter(a=>a.type==='function').map(a=>({...a,inputs:a.inputs.map((p,i)=>({...p,name:p.name||'params'+i}))}))];
const stable=x=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export function sameAllowRules(a,b){if(![a,b].every(r=>Array.isArray(r)&&r.every(x=>x.action==='ALLOW')))return false;const canonical=rules=>rules.map(({id,...r})=>stable(r)).sort();return stable(canonical(a))===stable(canonical(b));}
const same=(a,b)=>a?.toLowerCase()===b?.toLowerCase();
function flatten(prefix,input,value){if(input.type==='tuple')return input.components.flatMap((c,i)=>flatten(prefix+'.'+c.name,c,value[c.name]??value[i]));if(input.type.includes('['))throw Error('Array calls are not permitted for delegated signing');if(typeof value==='number'){if(!['mint.params0.fee','mint.params0.tickLower','mint.params0.tickUpper'].includes(prefix))throw Error('Unsupported numeric policy field');return [];}return [{field_source:'ethereum_calldata',field:prefix,abi,operator:'eq',value:String(value)}];}
export function boundedPlanPolicy(account,plan){
 if(plan.chainId!==84532||!account.wallets.some(w=>same(w.address,plan.wallet))||plan.calls.length>10||plan.deadline<=Date.now()/1000||plan.deadline>Date.now()/1000+601)throw Error('Invalid delegated plan');
 const rules=plan.calls.map((call,i)=>{
  if(![NETWORK.manager,NETWORK.usdc,NETWORK.weth].some(a=>same(a,call.to))||BigInt(call.value)!==0n)throw Error('Only zero-value pool-management calls may be delegated');
  const decoded=decodeFunctionData({abi,data:call.data}),fn=abi.find(a=>a.name===decoded.functionName);
  if(!['approve','mint','increaseLiquidity','decreaseLiquidity','collect'].includes(fn.name))throw Error('Unsupported delegated function');
  if(fn.name==='approve'){if(![NETWORK.usdc,NETWORK.weth].some(a=>same(a,call.to))||!same(decoded.args[0],NETWORK.manager)||BigInt(decoded.args[1])>(same(call.to,NETWORK.usdc)?5000000n:4000000000000000n))throw Error('Approval exceeds the fixed token budget');}
  else{if(!same(call.to,NETWORK.manager))throw Error('Wrong position manager');const p=decoded.args[0];if(p.recipient&&!same(p.recipient,plan.wallet))throw Error('Recipient must remain the owner');if(p.tokenId!==undefined&&String(p.tokenId)!==plan.tokenId)throw Error('Wrong NFT');if(p.deadline!==undefined&&Number(p.deadline)>plan.deadline)throw Error('Call outlives authority');if(fn.name==='mint'&&(!same(p.token0,NETWORK.usdc)||!same(p.token1,NETWORK.weth)||p.fee!==500||p.amount0Desired>5000000n||p.amount1Desired>4000000000000000n))throw Error('Mint exceeds supported pool or budget');}
  return {name:`Step ${i+1}: ${call.label}`.slice(0,49),method:'eth_sendTransaction',action:'ALLOW',conditions:[
   {field_source:'ethereum_transaction',field:'chain_id',operator:'eq',value:'84532'},
   {field_source:'ethereum_transaction',field:'to',operator:'eq',value:call.to},
   {field_source:'ethereum_transaction',field:'value',operator:'eq',value:'0'},
   {field_source:'system',field:'current_unix_timestamp',operator:'lt',value:String(plan.deadline)},
   {field_source:'ethereum_calldata',field:'function_name',abi,operator:'eq',value:fn.name},
   ...fn.inputs.flatMap((input,index)=>flatten(fn.name+'.'+input.name,input,decoded.args[index]))]};
 });
 return {version:'1.0',name:`LP plan ${plan.id}`,chain_type:'ethereum',owner:{user_id:account.userId},rules};
}
// Privy currently fails numeric conditions for decoded uint24/int24 values.
// All calldata is pinned locally; provider rules independently bind the other fields.
export function assertGrantedCall(grant,plan,index){
 const expected=grant.calls?.[index],call=plan.calls[index];
 if(plan.chainId!==84532||grant.planId!==plan.id||!expected||!call||expected.to!==call.to.toLowerCase()||expected.value!==String(call.value)||expected.dataHash!==keccak256(call.data))throw Error('Transaction differs from the reviewed signing grant');
}
// Session grants allow a fresh range and amounts, but only for one source NFT,
// one seven-step rebalance, fixed tokens/recipient and the original deadline.
export function sessionPlanPolicy(account,plan){
 const policy=boundedPlanPolicy(account,plan);
 const adjustable=new Set(['mint.params0.amount0Desired','mint.params0.amount1Desired','mint.params0.amount0Min','mint.params0.amount1Min','decreaseLiquidity.params0.amount0Min','decreaseLiquidity.params0.amount1Min']);
 for(const rule of policy.rules)for(const c of rule.conditions){
  if(c.field.endsWith('.deadline')){c.operator='lte';c.value=String(plan.deadline);}
  if(adjustable.has(c.field)){c.operator=c.field.endsWith('Min')?'gte':'lte';c.value=c.field.endsWith('Min')?'0':c.field.includes('amount0')?'5000000':'4000000000000000';}
  if(c.field==='approve.amount'){c.operator='lte';c.value=rule.conditions.find(x=>x.field==='to').value.toLowerCase()===NETWORK.usdc.toLowerCase()?'5000000':'4000000000000000';}
 }
 policy.name=`LP session ${plan.id}`;
 return policy;
}
export function assertSessionPlan(scope,plan){
 if(plan.chainId!==84532||plan.action!=='REBALANCE'||!same(plan.wallet,scope.wallet)||plan.tokenId!==scope.tokenId||plan.deadline>scope.deadline||plan.deadline<=Date.now()/1000||plan.calls.length!==7)throw Error('Plan exceeds the authorized session');
 const names=['decreaseLiquidity','collect','approve','approve','mint','approve','approve'];
 const decoded=plan.calls.map((c,i)=>{const d=decodeFunctionData({abi,data:c.data});if(d.functionName!==names[i]||String(c.value)!=='0'||!same(c.to,[NETWORK.manager,NETWORK.manager,NETWORK.usdc,NETWORK.weth,NETWORK.manager,NETWORK.usdc,NETWORK.weth][i]))throw Error('Invalid session step');return d.args;});
 const removed=decoded[0][0],collect=decoded[1][0],mint=decoded[4][0];
 if(String(removed.tokenId)!==scope.tokenId||String(removed.liquidity)!==scope.liquidity||String(collect.tokenId)!==scope.tokenId||!same(collect.recipient,scope.wallet)||!same(mint.recipient,scope.wallet)||!same(mint.token0,NETWORK.usdc)||!same(mint.token1,NETWORK.weth)||mint.fee!==500)throw Error('Session position or recipient mismatch');
 if(mint.amount0Desired<=0n||mint.amount0Desired>5000000n||mint.amount1Desired<=0n||mint.amount1Desired>4000000000000000n||mint.amount0Min<mint.amount0Desired*995n/1000n||mint.amount1Min<mint.amount1Desired*995n/1000n||Number(mint.deadline)!==plan.deadline||Number(removed.deadline)!==plan.deadline)throw Error('Session amount, slippage or deadline mismatch');
 if(!Number.isInteger(plan.details.observedTick)||mint.tickLower%10||mint.tickUpper%10||mint.tickLower>=plan.details.observedTick||mint.tickUpper<=plan.details.observedTick||mint.tickLower<-887270||mint.tickUpper>887270||mint.tickUpper-mint.tickLower>8140)throw Error('Range does not cover the verified price within the 50% limit');
 for(const i of [2,3,5,6])if(!same(decoded[i][0],NETWORK.manager)||decoded[i][1]!==([2,3].includes(i)?(i===2?mint.amount0Desired:mint.amount1Desired):0n))throw Error('Session approval mismatch');
 return true;
}

export function createManagedSigner({env=process.env}={}){
 let client;const sdk=()=>client??=new PrivyClient({appId:env.PRIVY_APP_ID,appSecret:env.PRIVY_APP_SECRET,timeout:20000,maxRetries:0});
 function file(id){if(!/^[a-z0-9-]{1,64}$/.test(id))throw Error('Invalid plan ID');return new URL('../data/temporary-signer-'+id+'.json',import.meta.url);}
 function key(id){const path=file(id);if(!existsSync(path)){const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});writeFileSync(path,JSON.stringify({privateKey:pair.privateKey.export({format:'der',type:'pkcs8'}).toString('base64'),publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64')}),{mode:0o600,flag:'wx'});}chmodSync(path,0o600);return JSON.parse(readFileSync(path,'utf8'));}
 async function prepare(account,plan,session=false){
  const policy=session?sessionPlanPolicy(account,plan):boundedPlanPolicy(account,plan),k=key(plan.id);
  const wallet=account.wallets.find(w=>same(w.address,plan.wallet));if(!wallet?.walletId)throw Error('Privy wallet ID unavailable');
  const linked=await sdk().wallets().get(wallet.walletId);
  if(linked.additional_signers.some(s=>s.signer_id!==k.signerId))throw Error('Another signer is present. Preserve it and configure this policy separately.');
  if(!k.signerId){const quorum=await sdk().keyQuorums().create({authorization_threshold:1,display_name:'LP Copilot temporary exact-plan signer',public_keys:[k.publicKey]});k.signerId=quorum.id;writeFileSync(file(plan.id),JSON.stringify(k),{mode:0o600});}
  const created=await sdk().policies().create({...policy,idempotency_key:`lp-policy-${plan.id}`});
  return {keyId:plan.id,scope:session?{wallet:plan.wallet,tokenId:plan.tokenId,deadline:plan.deadline,liquidity:String(decodeFunctionData({abi,data:plan.calls[0].data}).args[0].liquidity)}:undefined,signerId:k.signerId,policyId:created.id,walletId:wallet.walletId,planId:plan.id,expiresAt:plan.deadline*1000,rules:policy.rules,calls:plan.calls.map(c=>({to:c.to.toLowerCase(),value:String(c.value),dataHash:keccak256(c.data)})),applicationEnforced:['fee','tickLower','tickUpper','stepOrder','operationCount','gasBudget']};
 }
 async function verify(grant){const wallet=await sdk().wallets().get(grant.walletId);const signer=wallet.additional_signers.find(s=>s.signer_id===grant.signerId);if(!signer||signer.override_policy_ids?.length!==1||signer.override_policy_ids[0]!==grant.policyId)throw Error('The exact signer policy has not been attached to this wallet.');const policy=await sdk().policies().get(grant.policyId);if(!sameAllowRules(policy.rules,grant.rules))throw Error('Signing policy changed; new review required.');return true;}
 async function send(grant,plan,index,prepared){
  if(Date.now()>=grant.expiresAt||grant.planId!==plan.id)throw Error('Signer grant expired or plan mismatch');await verify(grant);
  assertGrantedCall(grant,plan,index);if(grant.scope)assertSessionPlan(grant.scope,plan);const k=key(grant.keyId||plan.id);if(k.signerId!==grant.signerId)throw Error('Signer mismatch');const call=plan.calls[index];
  const response=await sdk().wallets().ethereum().sendTransaction(grant.walletId,{caip2:'eip155:84532',params:{transaction:{to:call.to,data:call.data,value:'0x0',chain_id:84532,gas_limit:'0x'+BigInt(prepared.gas).toString(16),nonce:call.nonce}},authorization_context:{authorization_private_keys:[k.privateKey]},idempotency_key:`lp-managed-${plan.id}-${index}`,request_expiry:Math.min(grant.expiresAt,Date.now()+60000)});
  return response.hash;
 }
 function destroy(planId){const path=file(planId);if(existsSync(path))unlinkSync(path);}
 async function exclusive(grant){const wallet=await sdk().wallets().get(grant.walletId);return wallet.additional_signers.length===1&&wallet.additional_signers[0].signer_id===grant.signerId;}
 async function attachment(grant){const wallet=await sdk().wallets().get(grant.walletId);if(!wallet.additional_signers.some(s=>s.signer_id===grant.signerId))return false;await verify(grant);return true;}
 return {prepare,verify,send,destroy,exclusive,attachment,bind(grant,plan){if(!grant.scope)throw Error('A bounded session is required');assertSessionPlan(grant.scope,plan);return {...grant,planId:plan.id,calls:plan.calls.map(c=>({to:c.to.toLowerCase(),value:String(c.value),dataHash:keccak256(c.data)}))};}};
}
